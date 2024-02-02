const fs = require("fs");
const { CONTRACTS } = require("../constants/contracts");
const { PROVIDERS } = require("../constants/providers");
const { CONFIG } = require("../constants/config");
const { ADDRESS } = require("../constants/address.js");
const { GetLogs } = require("../utilities/getLogs");
const { ABI } = require("../constants/abi");
const chalk = require("chalk");
const ethers = require("ethers");
const { BuildTxForSwap } = require("../utilities/1inchSwap.js");
const { AlchemyTransactionReceipt } = require("../utilities/alchemy");
const { web3GasEstimate } = require("../utilities/web3");

const dotenv = require("dotenv").config({ path: "../.env" });
const section = chalk.hex("#47FDFB");

const { MINPROFIT, MINPROFITPERCENTAGE, MAXWINNERS, MAXINDICES, USESANTA, LAST_IN_LINE } =
  CONFIG;

const PRIZETOKEN_ADDRESS = ADDRESS[CONFIG.CHAINNAME].PRIZETOKEN.ADDRESS;
const PRIZETOKEN_SYMBOL = ADDRESS[CONFIG.CHAINNAME].PRIZETOKEN.SYMBOL


const chalkProfit = (message) => {
  console.log(chalk.green(message));
};

const chalkLoss = (message) => {
  console.log(chalk.red(message));
};

// todo batch claims to CONFIG.BATCHSIZE
const SendClaims = async (
  contract,
  drawId,
  vaultWins,
  maxFee,
  prizeTokenPrice,
  ethPrice
) => {
  console.log(PRIZETOKEN_SYMBOL+" price $", prizeTokenPrice, " eth price $", ethPrice);

  let feeRecipient = CONFIG.WALLET;
  console.log("total wins to claim ", vaultWins.length);
  // console.log("vault wins",vaultWins)

  // Group data by vault and tier
  const groupedData = groupDataByVaultAndTier(vaultWins);
  // console.log(groupedData);

  for (const key in groupedData) {
    const group = groupedData[key];
    let { vault, tier, winners, prizeIndices } = group;

    // Separate the last-in-line winners
    let lastInLineWinners = [];
    let regularWinners = [];
    let lastInLinePrizeIndices = [];
    let regularPrizeIndices = [];

    for (let i = 0; i < winners.length; i++) {
      const winner = winners[i];
      const indices = prizeIndices[i];

      if (LAST_IN_LINE.includes(winner)) {
        console.log(winner, " moved to back of the line");
        lastInLineWinners.push(winner);
        lastInLinePrizeIndices.push(indices);
      } else {
        regularWinners.push(winner);
        regularPrizeIndices.push(indices);
      }
    }

    // Sort regular winners as needed

    // Append last-in-line winners to the end
    winners = [...regularWinners, ...lastInLineWinners];
    prizeIndices = [...regularPrizeIndices, ...lastInLinePrizeIndices];

    winners = winners.slice(0, MAXWINNERS);
    prizeIndices = prizeIndices.slice(0, MAXWINNERS);
    const totalPrizes = prizeIndices.flat().length;
    const originIndiceLength = prizeIndices.flat().length;

    // Calculate the number of batches needed
    const numBatches = Math.ceil(totalPrizes / MAXINDICES);

    // Calculate prizes per batch (as evenly distributed as possible)
    const basePrizesPerBatch = Math.floor(totalPrizes / numBatches);
    let extraPrizes = totalPrizes % numBatches;

    let finalWinners = [];
    let finalPrizeIndices = [];
    let currentTotalIndices = 0;

    for (let i = 0; i < winners.length; i++) {
      let prizesForThisBatch = basePrizesPerBatch;
      if (extraPrizes > 0) {
        prizesForThisBatch++;
        extraPrizes--;
      }

      const currentIndices = prizeIndices[i];

      if (currentTotalIndices + currentIndices.length <= prizesForThisBatch) {
        finalWinners.push(winners[i]);
        finalPrizeIndices.push(currentIndices);
        currentTotalIndices += currentIndices.length;
      } else {
        const remainingSpace = prizesForThisBatch - currentTotalIndices;
        finalWinners.push(winners[i]);
        finalPrizeIndices.push(currentIndices.slice(0, remainingSpace));
        currentTotalIndices += remainingSpace;
      }

      if (currentTotalIndices === prizesForThisBatch) {
        currentTotalIndices = 0;
      }
    }

    winners = finalWinners;
    prizeIndices = finalPrizeIndices;

    // console.log(winners)
    // console.log(prizeIndices)


    let minFeeToClaim = await CONTRACTS.CLAIMER[CONFIG.CHAINNAME].functions[
      "computeTotalFees(uint8,uint256)"
    ](tier, prizeIndices.flat().length);
    //minFeeToClaim = minFeeToClaim.div(prizeIndices.flat().length)
    //minFeeToClaim = ethers.BigNumber.from(minFeeToClaim); // ensure it's a BigNumber

    const totalIndices = [].concat(...prizeIndices).length;
    const totalIndicesBN = ethers.BigNumber.from(totalIndices.toString()); // converting to BigNumber
    minFeeToClaim = ethers.BigNumber.from(minFeeToClaim.toString());

    // console.log(minFeeToClaim, typeof minFeeToClaim, minFeeToClaim._isBigNumber);

    minFeeToClaim = minFeeToClaim.div(totalIndicesBN);

    console.log(section("   ---- transaction parameters -----"));

    if (prizeIndices.flat().length < originIndiceLength) {
      console.log("prize claims cropped to max indices of ", MAXINDICES);
    }

    console.log("vault ", vault);
    console.log("tier ", tier);
    console.log("winners ", winners);
    console.log("prize indices being claimed", prizeIndices);
    console.log("fee recipient", feeRecipient);
    console.log("min fee", minFeeToClaim.toString());

    //console.log("gas limit with +2%",gasLimitWithBuffer)
    console.log(
      "..... winners ",
      winners.length,
      " indices ",
      prizeIndices.flat().length
    );

    console.log(section("     ---- profitability -----"));

    let feeEstimate = await CONTRACTS.CLAIMER[
      CONFIG.CHAINNAME
    ].callStatic.claimPrizes(
      vault,
      tier,
      winners,
      prizeIndices,
      feeRecipient,
      minFeeToClaim
    );

    //console.log("fee estimate",feeEstimate)
    const estimatedPrizeTokenReward = parseInt(feeEstimate) / 1e18;

    // backtest winners
    /*for (const key in groupedData) {
    const group = groupedData[key];
    const { vault, tier, winners, prizeIndices } = group;

    for (let i = 0; i < winners.length; i++) {
        const winner = winners[i];
        const winnerPrizeIndices = prizeIndices[i];

        for (const prizeIndex of winnerPrizeIndices) {
            // Call the isWinner function
            const isActualWinner = await CONTRACTS.PRIZEPOOL["OPGOERLI"].isWinner(vault, winner, tier, prizeIndex);

            if (!isActualWinner) {
                console.error(`Error: Winner ${winner} with prize index ${prizeIndex} in vault ${vault} and tier ${tier} was not an actual winner!`);
            } else {
                console.log(`Confirmed: Winner ${winner} with prize index ${prizeIndex} in vault ${vault} and tier ${tier} is a valid winner.`);
            }
        }
    }
        }*/

    /*const gasPrice = await gasPriceNow()

        const gasPriceToSend = ethers.utils.parseUnits(
          gasPrice.toString(),
          "gwei"
        );
        */

    // Specify the function and its arguments
    const functionName = "claimPrizes";
    const args = [
      vault,
      tier,
      winners,
      prizeIndices,
      feeRecipient,
      minFeeToClaim,
    ];

    // Encode the function call
    const data = contract.interface.encodeFunctionData(functionName, args);

    // calculate total gas cost in wei
    const web3TotalGasCost = await web3GasEstimate(
      data,
      CONFIG.CHAINID,
      CONFIG.WALLET,
      ADDRESS[CONFIG.CHAINNAME].CLAIMER
    );

    const web3TotalGasCostUSD =
      (Number(web3TotalGasCost).toFixed(2) * ethPrice) / 1e18;

    console.log(
      "Gas Estimate  " +
        web3TotalGasCost.toString() +
        "wei ($" +
        web3TotalGasCostUSD.toFixed(2) +
        ")"
    );

    const estimateNetFromClaims =
      prizeTokenPrice * estimatedPrizeTokenReward - web3TotalGasCostUSD;
    const estimateNetPercentage =
      (prizeTokenPrice * estimatedPrizeTokenReward) / web3TotalGasCostUSD;
    console.log(
      "assuming ETH price ",
      ethPrice," ",PRIZETOKEN_SYMBOL,
      " price",
      prizeTokenPrice
    );
    console.log(PRIZETOKEN_SYMBOL," prize token reward", estimatedPrizeTokenReward);
    console.log(
      " potential ",PRIZETOKEN_SYMBOL," reward $",
      (prizeTokenPrice * estimatedPrizeTokenReward).toFixed(2),
      ` estimated claim cost USD: $${web3TotalGasCostUSD.toFixed(2)}`
    ); //ETH: ${totalGasCostEther.toFixed(2)}

    //  let txToEstimate = contract.populateTransaction.claimPrizes(vault, tier, winners, prizeIndices, feeRecipient, minFeeToClaim);
    //let estimate = await estimateGas(txToEstimate)

    if (
      estimateNetFromClaims > MINPROFIT &&
      estimateNetPercentage > MINPROFITPERCENTAGE
    ) {
      console.log(
        "minimum profit met, estimated net after costs = $",
        estimateNetFromClaims
      );
      console.log(
        "sending claim on vault ",
        vault,
        " for tier ",
        tier,
        " fee recipient",
        feeRecipient,
        " min fee ",
        Number(minFeeToClaim)
      );
      //console.log("winners ",winners)
      //console.log("prize indices being claimed",prizeIndices)
      console.log();

      //return

      // crop to max indices

      let finalWinners = [];
      let finalPrizeIndices = [];

      let currentTotalIndices = 0;

      for (let i = 0; i < winners.length; i++) {
        const currentIndices = prizeIndices[i];

        // Check if adding the entire list of currentIndices would exceed the max limit
        if (currentTotalIndices + currentIndices.length <= MAXINDICES) {
          finalWinners.push(winners[i]);
          finalPrizeIndices.push(currentIndices);
          currentTotalIndices += currentIndices.length;
        } else {
          // Add as many indices as possible without exceeding the limit
          const remainingSpace = MAXINDICES - currentTotalIndices;
          finalWinners.push(winners[i]);
          finalPrizeIndices.push(currentIndices.slice(0, remainingSpace));
          break; // Exit the loop as we've reached the MAXINDICES limit
        }
      }

      let receipt;
      if (USESANTA) {
        console.log("using santa claim contract");
        // const SANTACONTRACT_ADDRESS = '0x82758855c1493037ae07e07ae33c512b5514479e'
        const SANTACONTRACT_ADDRESS =
          "0x86047ddd91A2EF0Ae75329C7941796D618E24894";
        const swapParams = {
          src: PRIZETOKEN_ADDRESS, // Token address of  PRIZE TOKEN
          dst: ADDRESS[CONFIG.CHAINNAME].WETH, // Token address of WETH
          amount: feeEstimate.toString(), // Amount of 1INCH to swap (in wei)
          //from: SANTACONTRACT_ADDRESS,
          from: CONFIG.WALLET,
          slippage: 5, // Maximum acceptable slippage percentage for the swap (e.g., 1 for 1%)
          disableEstimate: false, // Set to true to disable estimation of swap details
          allowPartialFill: false, // Set to true to allow partial filling of the swap order
        };
        // console.log("swap params for 1inch",swapParams)
        const dataFor1Inch = await BuildTxForSwap(swapParams);
        // console.log("data for 1inch",dataFor1Inch)

        // use if wanting to receive the proceeds of 1inch swap on another wallet or contract
        //const myAddress = '0xE5860FF1c57DDCEF024Cb43B37b8A20bfE4c9822';
        const myAddress = CONFIG.WALLET;
        const contractAddress = "0x86047ddd91A2EF0Ae75329C7941796D618E24894";
        const newCalldata = replaceAddressInCalldata(
          dataFor1Inch.data,
          myAddress,
          contractAddress
        );
        console.log("data after address swap", newCalldata);

        // Specify the function and its arguments
        const hofunctionName = "hohoho";
        const hoargs = [
          vault,
          tier,
          finalWinners,
          finalPrizeIndices,
          minFeeToClaim,
          newCalldata,
          //dataFor1Inch.data
        ];

        console.log("ho args", hoargs);

        // Encode the function call
        const hodata = CONTRACTS.PRIZESANTASIGNER[
          CONFIG.CHAINNAME
        ].interface.encodeFunctionData(hofunctionName, hoargs);

        // calculate total gas cost in wei

        const howeb3TotalGasCost = await web3GasEstimate(
          hodata,
          CONFIG.CHAINID,
          CONFIG.WALLET,
          ADDRESS[CONFIG.CHAINNAME].PRIZESANTA
        );

        const howeb3TotalGasCostUSD =
          (Number(howeb3TotalGasCost).toFixed(2) * ethPrice) / 1e18;

        console.log(
          "hohoho Gas Estimate (wei): " +
            howeb3TotalGasCost.toString() +
            "($" +
            howeb3TotalGasCostUSD.toFixed(2) +
            ")"
        );

        const hoestimateNetFromClaims =
          prizeTokenPrice * estimatedPrizeTokenReward - howeb3TotalGasCostUSD;
        const hoestimateNetPercentage =
          (prizeTokenPrice * estimatedPrizeTokenReward) / howeb3TotalGasCostUSD;
        if (
          hoestimateNetFromClaims > MINPROFIT &&
          hoestimateNetPercentage > MINPROFITPERCENTAGE
        ) {
          console.log("profitable santa contract claim");
          let hohoho;
          try {
            const hohoho = await CONTRACTS.PRIZESANTASIGNER[
              CONFIG.CHAINNAME
            ].hohoho(
              vault,
              tier,
              finalWinners,
              finalPrizeIndices,
              minFeeToClaim.toString(),
              newCalldata,
              {
                gasLimit: BigInt(
                  380000 + 500000 + 169000 * (prizeIndices.flat().length - 1)
                ),
                maxPriorityFeePerGas: "1010000",
              }
            );
            console.log("sent hohoho");
            receipt = await hohoho.wait();
          } catch (e) {
            console.log("error on santa send", e);
          }
        } else {
          console.log("not meeting profit threshold for santa claim");
        }
      } else {
        //return // to not send claims
        let tx = await contract.claimPrizes(
          vault,
          tier,
          finalWinners,
          finalPrizeIndices,
          feeRecipient,
          minFeeToClaim,
          {
            gasLimit: BigInt(
              500000 + 169000 * (prizeIndices.flat().length - 1)
            ),
            maxPriorityFeePerGas: "1010000",
          }
        );
        receipt = await tx.wait();
        //console.log("receipt",receipt)
      }
      if (receipt && receipt.gasUsed !== undefined) {
        const L2transactionCost =
          Number(receipt.gasUsed * receipt.effectiveGasPrice) / 1e18;

        const alchemyReceipt = await AlchemyTransactionReceipt(
          receipt.transactionHash
        );

        const L1transactionCost = Number(alchemyReceipt.result.l1Fee) / 1e18;
        console.log("L2 Gas fees (in ETH) " + L2transactionCost);
        console.log("L1 Gas fees (in ETH) " + L1transactionCost);

        totalTransactionCost = L2transactionCost + L1transactionCost;
        totalTransasactionCostDollar = totalTransactionCost * ethPrice;

        console.log(
          "Total Gas fees " +
            totalTransactionCost +
            "($" +
            totalTransasactionCostDollar +
            ")"
        );

        // todo not right
        console.log(
          "tx",
          receipt.transactionHash,
          " gas used",
          receipt.gasUsed.toString()
        ); //, " tx cost $",transactionCost.toFixed(4))
        let totalPayout = 0;
        let totalFee = 0;
        const logs = GetLogs(receipt, ABI.PRIZEPOOL);
        logs.forEach((log) => {
          if (log.name === "ClaimedPrize") {
            const payout = parseInt(log.args.payout);
            const fee = parseInt(log.args.fee);
            totalPayout += payout;
            totalFee += fee;
            console.log(
              "prize payout ",
              (payout / 1e18).toFixed(4),
              " fee collected ",
              (fee / 1e18).toFixed(4)
            );
          }
        });

        // File path for storing claim logs
        const dataFilePath = "./data/claim-history.json";

        // Initialization
        let fileData = [];
        if (fs.existsSync(dataFilePath)) {
          fileData = JSON.parse(fs.readFileSync(dataFilePath, "utf-8"));
        }

        // Store data
        fileData.push({
          txHash: receipt.transactionHash,
          prizes: logs.length,
          totalPayout: totalPayout,
          totalFee: totalFee,
          totalGasETH: totalTransactionCost,
          ethPrice: ethPrice,
          poolPrice: prizeTokenPrice,
          time: Date.now(),
        });

        // Save data back to file
        fs.writeFileSync(dataFilePath, JSON.stringify(fileData, null, 2));

        console.log(
          "total payout ",
          (totalPayout / 1e18).toFixed(4),
          " total fee collected ",
          (totalFee / 1e18).toFixed(4)
        );

        // todo not right, damn gas
        const netFromClaims =
          totalFee * prizeTokenPrice - totalTransasactionCostDollar;
        const netFromClaimMessage =
          "$" +
          (prizeTokenPrice * (totalFee / 1e18)).toFixed(4) +
          " fee collected  - $"; // + transactionCost.toFixed(4) + " tx cost = " + netFromClaims.toFixed(4)
        netFromClaims > 0
          ? console.log(chalkProfit(netFromClaimMessage))
          : console.log(chalkLoss(netFromClaimMessage));
      } else {
        console.log(
          "......not above profit threshold of $",
          MINPROFIT.toFixed(2),
          " & ",
          (MINPROFITPERCENTAGE * 100).toFixed(2),
          "%"
        );
        console.log(
          "......estimateNetFromClaims: $",
          estimateNetFromClaims.toFixed(2),
          //hoestimateNetFromClaims.toFixed(2),
          " & ",
          (estimateNetPercentage * 100).toFixed(2),
          //(hoestimateNetPercentage * 100).toFixed(2),

          "%"
        );
      }
      await delay(3500); // wait 3.5 seconds before next call becaus 1inch api
    }
    await delay(600) // wait .6 seconds so to not overload RPC calls per second
  }
  return;
};

function groupDataByVaultAndTier(vaultWins) {
  return vaultWins.reduce((groups, entry) => {
    const [vault, winner, tier, prizeIndicesForWinner] = entry;

    const key = `${vault}-${tier}`;
    if (!groups[key]) {
      groups[key] = {
        vault,
        tier,
        winners: [],
        prizeIndices: [],
      };
    }

    const group = groups[key];
    const winnerIndex = group.winners.indexOf(winner);
    if (winnerIndex === -1) {
      group.winners.push(winner);
      group.prizeIndices.push(prizeIndicesForWinner);
    } else {
      group.prizeIndices[winnerIndex].push(...prizeIndicesForWinner);
    }

    return groups;
  }, {});
}


// use to send 1inch contract swap to different address than config.wallet
function replaceAddressInCalldata(data, originalAddress, replacementAddress) {
  // Ensure addresses are properly checksummed
  originalAddress = ethers.utils.getAddress(originalAddress);
  replacementAddress = ethers.utils.getAddress(replacementAddress);

  // Convert addresses to stripped, lowercase form (remove '0x' prefix)
  let strippedOriginal = originalAddress.slice(2).toLowerCase();
  let strippedReplacement = replacementAddress.slice(2).toLowerCase();

  // Replace and return the updated calldata
  return data.split(strippedOriginal).join(strippedReplacement);
}


module.exports = { groupDataByVaultAndTier };

const delay = (ms) => new Promise((res) => setTimeout(res, ms));

module.exports = { SendClaims };
