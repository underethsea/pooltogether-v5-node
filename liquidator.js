require("dotenv").config();
const { CONTRACTS } = require("./constants/contracts.js");
const { ADDRESS } = require("./constants/address.js");
const { PROVIDERS, SIGNER } = require("./constants/providers.js");
const { ABI } = require("./constants/abi.js");
const { CONFIG } = require("./constants/config.js");
const { GetLogs } = require("./utilities/getLogs.js");
const { Multicall } = require("./utilities/multicall.js");
const { GeckoIDPrices } = require("./utilities/geckoFetch.js");
const { web3GasEstimate } = require("./utilities/web3");
const { AlchemyTransactionReceipt } = require("./utilities/alchemy");
const { GetPricesForToken } = require("./utilities/1inch");
const { BuildTxForSwap } = require("./utilities/1inchSwap.js");

const ethers = require("ethers");
const chalk = require("chalk");

const USESWAPPER = false;
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const {
  useCoinGecko,
  slippage,
  profitThreshold,
  profitPercentage,
  minTimeInMilliseconds,
  maxTimeInMilliseconds,
  ONLYLIQUIDATE,
  DONTLIQUIDATE,
} = CONFIG;
const fs = require("fs");

const percentProfitThreshold = 0.02;
const minimumGasCost = 0.03;
const calculateWithSlippage = (amount, slippageBps = slippage) => {
  // Convert basis points to a multiplier.
  // For example, 0.5% slippage is 50 basis points.
  const multiplier = ethers.BigNumber.from(10000 + slippageBps) // 10000 basis points = 100%
    .mul(ethers.constants.WeiPerEther)
    .div(10000);

  // Apply the multiplier to the amount
  const amountWithSlippage = amount
    .mul(multiplier)
    .div(ethers.constants.WeiPerEther);

  return amountWithSlippage;
};

const section = chalk.hex("#47FDFB").bgBlack;

async function go() {
  //const isAwarding = await CONTRACTS.PRIZEPOOL[CONFIG.CHAINNAME].hasOpenDrawFinished()
  const isAwarding = false;
  if (!isAwarding) {
    let totalGasSpent = 0;
    let totalPoolSpent = 0;
    let assetsReceived = [];
    let pairs = [];
    let bestOptionIn;
    let bestOptionOut;
    let bestOutValue;

    let walletPrizeTokenBalance = await CONTRACTS.POOL[
      CONFIG.CHAINNAME
    ].balanceOf(CONFIG.WALLET);

    const myBalanceFormatted = ethers.utils.formatUnits(
      walletPrizeTokenBalance,
      ADDRESS[CONFIG.CHAINNAME].PRIZETOKEN.DECIMALS
    );
    console.log("my prize token balance ", myBalanceFormatted);

    // --------- use factory to find vaults to liquidate ------------------
    //     let vaults = [];
    // const vaultFactoryContract = new ethers.Contract(ADDRESS["SEPOLIA"].VAULTFACTORY,ABI.VAULTFACTORY,PROVIDERS["SEPOLIA"])
    // const allVaults = await vaultFactoryContract.totalVaults()
    // console.log("total vaults ",allVaults.toString())

    // for(vault=0;vault<parseInt(allVaults);vault++) {
    // const vaultAddress = await vaultFactoryContract.allVaults(vault)
    // console.log("vault address ",vaultAddress)
    // const vaultContract = new ethers.Contract(vaultAddress,ABI.VAULT,PROVIDERS["SEPOLIA"])
    // const liquidationPairAddress = await vaultContract.liquidationPair()
    // console.log("liq pair ",liquidationPairAddress)
    // vaults.push({VAULT:vaultAddress,LIQUIDATIONPAIR:liquidationPairAddress})
    // }

    // build pairs from factory
    // const numPairs = await CONTRACTS.LIQUIDATIONPAIRFACTORY[
    //   CONFIG.CHAINNAME
    // ].totalPairs();
    // console.log("num pairs", numPairs.toString());

    // for (x = 0; x < numPairs; x++) {
    //   const pairAddress = await CONTRACTS.LIQUIDATIONPAIRFACTORY[
    //     CONFIG.CHAINNAME
    //   ].allPairs(x);
    //   pairs.push(pairAddress);
    // }

    pairs = [
      ...ADDRESS[CONFIG.CHAINNAME].VAULTS,
      ...ADDRESS[CONFIG.CHAINNAME].BOOSTS,
    ];

    if (ONLYLIQUIDATE.length > 0) {
      pairs = pairs.filter((pair) =>
        ONLYLIQUIDATE.map((addr) => addr.toLowerCase()).includes(
          pair.LIQUIDATIONPAIR.toLowerCase()
        )
      );
    } else if (DONTLIQUIDATE.length > 0) {
      pairs = pairs.filter(
        (pair) =>
          !DONTLIQUIDATE.map((addr) => addr.toLowerCase()).includes(
            pair.LIQUIDATIONPAIR.toLowerCase()
          )
      );
    }

    //console.log(pairs)
    geckos = pairs.map((pair) => pair.GECKO);
    //    console.log(geckos);

    let combinedPrices;
    try {
      // Combine 'pooltogether', 'ethereum' with the geckos array and fetch all prices at once
      const ids = [...geckos, "pooltogether", "ethereum"];
      combinedPrices = await GeckoIDPrices(ids);
    } catch (error) {
      console.error("Error fetching combined prices:", error);
      return;
    }

    const ethPrice = combinedPrices[combinedPrices.length - 1];
    const geckoPrices = combinedPrices.slice(0, -2); // This extracts all but the last two elements

    let prizeTokenPrice;
    if (useCoinGecko) {
      prizeTokenPrice = combinedPrices[combinedPrices.length - 2];
    } else {
      prizeTokenPrice = await GetPricesForToken(
        ADDRESS[CONFIG.CHAINNAME].PRIZETOKEN.ADDRESS
      );
      await delay(900); // Delays for 1.1 seconds
    }

    if (
      prizeTokenPrice === null ||
      prizeTokenPrice === undefined ||
      prizeTokenPrice === 0
    ) {
      console.log("cannot get prize token price");
      return;
    }
    console.log("prize token $", prizeTokenPrice, " eth $", ethPrice);
    console.log("total pairs ", pairs.length);

    const multiCallMaxOutArray = [];

    // Construct an array of call data for each pair
    for (const pair of pairs) {
      const contract = new ethers.Contract(
        pair.LIQUIDATIONPAIR,
        ABI.LIQUIDATIONPAIR,
        PROVIDERS[CONFIG.CHAINNAME]
      );
      multiCallMaxOutArray.push(contract.callStatic.maxAmountOut());
    }

    let maxOutResults = [];

    try {
      maxOutResults = await Multicall(multiCallMaxOutArray);
    } catch (error) {
      console.error("Multicall error:", error.message);
    }

    if (maxOutResults.length === 0) {
      // Handle the case where maxOutResults is empty
      console.log("No max out results available. Skipping related operations.");
      // Implement any fallback logic or skip certain operations as needed
    } else {
      // Continue with the normal flow, assuming maxOutResults contains data
      // loop through pairs
      //(z<pairs.length)
      for (let z = 0; z < pairs.length; z++) {
        console.log(section("\n------- reading pair ---------"));
        const pairAddress = pairs[z].LIQUIDATIONPAIR;
        const pairDecimals = pairs[z].DECIMALS;
        const pairOutSymbol = pairs[z].SYMBOL;
        const pairOutAsset = pairs[z].ASSET;
        const vaultAddress = pairs[z].VAULT;
        const pairOutPrice = geckoPrices[z];
        console.log("token out ", pairOutSymbol, " price ", pairOutPrice);
        // console.log("address ", ADDRESS[chainName].VAULTS[z].VAULT);
        // const contract = CONTRACTS.VAULTS[chainName][z].LIQUIDATIONPAIR;

        const contract = new ethers.Contract(
          pairAddress,
          ABI.LIQUIDATIONPAIR,
          PROVIDERS[CONFIG.CHAINNAME]
        );
        const contractWSigner = new ethers.Contract(
          pairAddress,
          ABI.LIQUIDATIONPAIR,
          SIGNER
        );

        // old code to get decimals and symbol from contract
        //const tokenOutDecimals = await CONTRACTS.VAULTS[chainName][z].VAULT.decimals()
        //const tokenOutSymbol = await CONTRACTS.VAULTS[chainName][z].VAULT.symbol()

        const maxOut = maxOutResults[z];
        // console.log("max out", maxOut);

        let tx;

        if (parseFloat(maxOut) === 0) {
          console.log("Pair ", pairAddress, " maxout = 0");
        } else {
          try {
            let mostProfitableIndex = -1;
            let bestProfit = -Infinity; // Initialize with a value that will be surpassed

            // let percentageIncrements = Array.from({ length: 10 }, () => Math.random()); // Generate 10 random percentages between 0 and 1
            percentageIncrements = Array.from(
              { length: 20 },
              (_, i) => (i + 1) * 0.05
            );

            percentageIncrements.push(1);
            percentageIncrements.sort((a, b) => b - a);
            // console.log(percentageIncrements)

            const multiCallArray = [];

            for (const percentage of percentageIncrements) {
              const amountOutForPercentage = maxOut
                .mul(Math.round(percentage * 100))
                .div(100);
              multiCallArray.push(
                contractWSigner.callStatic.computeExactAmountIn(
                  amountOutForPercentage
                )
              );
            }

            const results = await Multicall(multiCallArray);

            let bestPercentageProfit = 0;
            let bestPercentageIndex = 0;

            console.log(section(">> tx params | pair", pairAddress));

            // Override the console.table function temporarily
            console.defaultTable = console.table;
            console.table = (data, properties) => {
              const newTableData = data.map((item, index) => ({
                ...item,
                [""]: index,
              }));
              console.defaultTable(newTableData, properties);
            };

            const tableData = []; // Initialize an array to hold the data

            for (let i = 0; i < results.length; i++) {
              const amountInOption = results[i];
              const amountOutForPercentage = maxOut
                .mul(Math.round(percentageIncrements[i] * 100))
                .div(100);

              const actualOutValue =
                ethers.utils.formatUnits(amountOutForPercentage, pairDecimals) *
                pairOutPrice;
              const actualInValue =
                ethers.utils.formatUnits(
                  amountInOption,
                  ADDRESS[CONFIG.CHAINNAME].PRIZETOKEN.DECIMALS
                ) * prizeTokenPrice;

              // Calculate the $ profit for this swap
              const profit = actualOutValue - actualInValue;

              // Calculate the % profit for this swap
              const percentageProfit =
                (actualOutValue - actualInValue) / actualInValue;

              if (profit > bestProfit) {
                bestProfit = profit;
                mostProfitableIndex = i;
              }

              if (
                percentageProfit > bestPercentageProfit &&
                amountInOption.lte(walletPrizeTokenBalance)
              ) {
                bestPercentageProfit = percentageProfit;
                bestPercentageIndex = i;
              }

              // Push data into tableData
              tableData.push({
                "Max Out %": parseFloat(
                  (percentageIncrements[i] * 100).toFixed(2)
                ),
                "Amount Out": parseFloat(amountOutForPercentage.toString()),
                "Amount In": parseFloat(amountInOption.toString()),
                "Profit ($)": parseFloat(profit.toFixed(4)),
                "% Profit": parseFloat((percentageProfit * 100).toFixed(2)),
              });
            }

            // Restore the default console.table function
            console.table = console.defaultTable;

            // Define the columns to display
            const columns = [
              "Max Out %",
              "Amount Out",
              "Amount In",
              "Profit ($)",
              "% Profit",
            ];

            // Print the tableData
            console.table(tableData, columns);

            bestOptionOut = maxOut
              .mul(Math.round(percentageIncrements[mostProfitableIndex] * 100))
              .div(100);
            bestOptionIn = results[mostProfitableIndex];

            bestOptionOutPercentage = maxOut
              .mul(Math.round(percentageIncrements[bestPercentageIndex] * 100))
              .div(100);

            console.log(
              "Most profitable swap in $ terms is for ",
              (percentageIncrements[mostProfitableIndex] * 100).toFixed(2),
              "% of maxOut with a profit of ",
              bestProfit.toFixed(4)
            );

            console.log(
              "Most profitable swap in % terms is for ",
              (percentageIncrements[bestPercentageIndex] * 100).toFixed(2),
              "% of maxOut with a percentage profit of ",
              (bestPercentageProfit * 100).toFixed(2) + "%",
              " and a profit of ",
              (
                ethers.utils.formatUnits(
                  bestOptionOutPercentage,
                  pairDecimals
                ) *
                  pairOutPrice -
                ethers.utils.formatUnits(
                  results[bestPercentageIndex],
                  ADDRESS[CONFIG.CHAINNAME].PRIZETOKEN.DECIMALS
                ) *
                  prizeTokenPrice
              ).toFixed(4)
            );

            // The condition now checks against both $ profit and % profit thresholds
            if (
              bestProfit >= profitThreshold - profitThreshold * 0.1 &&
              bestPercentageProfit >= percentProfitThreshold &&
              bestProfit > minimumGasCost
            ) {
              console.log(
                "Optimizing further due to profit exceeding thresholds."
              );

              const basePercentage = percentageIncrements[mostProfitableIndex];
              percentageIncrements = Array.from(
                { length: 21 },
                (_, i) => basePercentage + (i - 10) * 0.005
              ).filter((percentage) => percentage >= 0 && percentage <= 1);

              const refinedMultiCallArray = [];
              for (const percentage of percentageIncrements) {
                const amountOutForPercentage = maxOut
                  .mul(Math.round(percentage * 100))
                  .div(100);
                refinedMultiCallArray.push(
                  contractWSigner.callStatic.computeExactAmountIn(
                    amountOutForPercentage
                  )
                );
              }

              const results = await Multicall(refinedMultiCallArray); // overwrite the results array

              bestProfit = -Infinity; // Reset best profit for refined calculations
              console.log(section(">> Refined tx params | pair ", pairAddress));
              /*	for (let i = 0; i < results.length; i++) {
            const amountInOption = results[i];
            const amountOutForPercentage = maxOut
              .mul(Math.round(percentageIncrements[i] * 100))
              .div(100);

            // Calculate the profit for this swap
            const profit =
              ethers.utils.formatUnits(amountOutForPercentage, pairDecimals) *
                pairOutPrice -
              ethers.utils.formatUnits(
                amountInOption,
                ADDRESS[CONFIG.CHAINNAME].PRIZETOKEN.DECIMALS
              ) *
                prizeTokenPrice;

            if (profit > bestProfit) {
              bestProfit = profit;
              mostProfitableIndex = i;
            }

            console.log(
              " max out percentage ",
              (percentageIncrements[i] * 100).toFixed(2),
              "amount out for percentage",
              amountOutForPercentage.toString(),
              "amount in",
              amountInOption.toString(),
              "profit",
              profit.toFixed(2)
            );
          }
          */
              const tableData = []; // Initialize an array to hold the data
              for (let i = 0; i < results.length; i++) {
                const amountInOption = results[i];
                const amountOutForPercentage = maxOut
                  .mul(Math.round(percentageIncrements[i] * 100))
                  .div(100);

                // Calculate the profit for this swap
                const profit =
                  ethers.utils.formatUnits(
                    amountOutForPercentage,
                    pairDecimals
                  ) *
                    pairOutPrice -
                  ethers.utils.formatUnits(
                    amountInOption,
                    ADDRESS[CONFIG.CHAINNAME].PRIZETOKEN.DECIMALS
                  ) *
                    prizeTokenPrice;

                const actualOutValue =
                  ethers.utils.formatUnits(
                    amountOutForPercentage,
                    pairDecimals
                  ) * pairOutPrice;
                const actualInValue =
                  ethers.utils.formatUnits(
                    amountInOption,
                    ADDRESS[CONFIG.CHAINNAME].PRIZETOKEN.DECIMALS
                  ) * prizeTokenPrice;

                const percentageProfit =
                  ((actualOutValue - actualInValue) / actualInValue) * 100;

                if (profit > bestProfit) {
                  bestProfit = profit;
                  mostProfitableIndex = i;
                }

                // Push data into tableData instead of logging
                tableData.push({
                  "Max Out %": (percentageIncrements[i] * 100).toFixed(2),
                  "Amount Out": amountOutForPercentage.toString(),
                  "Amount In": amountInOption.toString(),
                  "Profit ($)": profit.toFixed(2),
                  "% Profit": percentageProfit.toFixed(2) + "%", // Percentage profit
                });
              }
              const columns = [
                "Max Out %",
                "Amount Out",
                "Amount In",
                "Profit ($)",
                "% Profit",
              ];

              console.table(tableData, columns);

              bestOptionOut = maxOut
                .mul(
                  Math.round(percentageIncrements[mostProfitableIndex] * 100)
                )
                .div(100);
              bestOutValue =
                ethers.utils.formatUnits(bestOptionOut, pairDecimals) *
                pairOutPrice;
              bestOptionIn = results[mostProfitableIndex];
              console.log(
                "Most profitable swap (refined) is for ",
                (percentageIncrements[mostProfitableIndex] * 100).toFixed(2),
                "% of maxOut with a profit of ",
                bestProfit.toFixed(2)
              );
              console.log(
                "Refined Parameters for the most profitable swap: Amount Out: ",
                bestOptionOut.toString(),
                ", Amount In: ",
                bestOptionIn.toString()
              );
            }
          } catch (e) {
            console.log(e);

            const firstParagraph = error.toString().split("\n")[0];

            // Logging the extracted details
            console.error("Message:", firstParagraph);
          }

          let web3TotalGasCost, web3TotalGasCostUSD;
          try {
            // const amountOutEstimate = await contract.callStatic.estimateAmountOut(amountIn)

            const now = new Date();
            const oneMinuteFromNow = new Date(now.getTime() + 60000); // Add 60,000 milliseconds (1 minute)
            const unixTimestamp = Math.floor(oneMinuteFromNow.getTime() / 1000); // Convert to UNIX timestamp

            //console.log("now ",now," one min from now ",unixTimestamp);

            console.log(
              "tx params | pair",
              pairAddress,
              "  max out ",
              bestOptionOut.toString() / 1e6,
              "amount in ",
              bestOptionIn.toString() / 1e18,
              " deadline ",
              unixTimestamp
            );

            const maxToSendWithSlippage = calculateWithSlippage(bestOptionIn);

            // Specify the function and its arguments
            const functionName = "swapExactAmountOut";
            console.log("config wallet", CONFIG.WALLET);
            const poolFromAddress =
              "0xe0e7b7C5aE92Fe94D2ae677D81214D6Ad7A11C27";
            const args = [
              pairAddress,
              //ADDRESS[CONFIG.CHAINNAME].SWAPPER,
              poolFromAddress,
              bestOptionOut,
              maxToSendWithSlippage,
              unixTimestamp,
            ];
            //console.log("args",args)
            // Encode the function call
            const data = CONTRACTS.LIQUIDATIONROUTERSIGNER[
              CONFIG.CHAINNAME
            ].interface.encodeFunctionData(functionName, args);
            // calculate total gas cost in wei

            web3TotalGasCost = await web3GasEstimate(
              data,
              CONFIG.CHAINID,
              poolFromAddress,
              ADDRESS[CONFIG.CHAINNAME].LIQUIDATIONROUTER
            );

            console.log(
              "Gas Estimate " + Number(web3TotalGasCost) / 1e18 + " ETH"
            );
            web3TotalGasCostUSD =
              (Number(web3TotalGasCost).toFixed(2) * ethPrice) / 1e18;
            //console.log("Real Gas Estimate through Web3: $" + web3TotalGasCostUSD.toFixed(2))

            const USDC =
              "0x7F5c764cBc14f9669B88837ca1490cCa17c31607".toLowerCase(); // bridged
            const WETH = "0x4200000000000000000000000000000000000006";
            const PTUSDC =
              "0xE3B3a464ee575E8E25D2508918383b89c832f275".toLowerCase(); // bridged usdc vault #1
            const POOL =
              ADDRESS[CONFIG.CHAINNAME].PRIZETOKEN.ADDRESS.toLowerCase();

            const poolOutFormatted = maxToSendWithSlippage / 1e18;
            const maxOutFormatted = bestOptionOut / Math.pow(10, pairDecimals);

            const poolValue = poolOutFormatted * prizeTokenPrice;
            const outValue = maxOutFormatted * pairOutPrice;

            // const gasCouldBe = web3TotalGasCostUSD * 5.3
            const gasCouldBe = web3TotalGasCostUSD * 0.2;

            //console.log("gas could BE $",gasCouldBe.toFixed(4))
            //console.log("out value",outValue)
            //console.log("greater than zero??",outValue - (poolValue +gasCouldBe))

            if (
              USESWAPPER &&
              (pairOutAsset.toLowerCase() === PTUSDC ||
                pairOutAsset.toLowerCase() === WETH ||
                pairOutAsset.toLowerCase() === USDC ||
                pairOutAsset.toLowerCase() === POOL) &&
              outValue - (poolValue + gasCouldBe) > 0
            ) {
              //console.log("profitable with cray gas, returning");return
              console.log("yes USDC/PTUSDC OR POOL");
              console.log("best option out amount", bestOptionOut.toString());
              const bestOptionOutValue = bestOptionOut / 1e6;
              console.log("best option out value", bestOptionOutValue);

              // multiply by 5 to get estimated cost for entire arb with SWAPPER contrract
              const gasPercentageOfOutValue =
                (web3TotalGasCostUSD * 4.5) / bestOptionOutValue;

              console.log(
                "gas percentage of out value",
                (gasPercentageOfOutValue * 100).toFixed(2),
                "%"
              );

              // Convert the percentage to a BigNumber representation with precision up to 4 decimal places (0.0001%)
              const PERCENT_10000 = ethers.BigNumber.from("10000"); // 100.0000%
              let gasPercentageBigNumber = ethers.BigNumber.from(
                Math.round(gasPercentageOfOutValue * 10000).toString()
              );

              // Calculate wethOut first
              let yieldForWeth = bestOptionOut
                .mul(gasPercentageBigNumber)
                .div(PERCENT_10000);

              // Calculate poolOut by subtracting wethOut from bestOptionOut
              let yieldForPool = bestOptionOut.sub(yieldForWeth);

              console.log("yield for pool", yieldForPool.toString());
              console.log("yield for weth", yieldForWeth.toString());

              let holderAddress = "0x649f2Ff8867BD8f9300615c1963118B9ceeB515d";
              // swap prize assset back to pool with 1" router and return to contract
              let swapThis = vaultAddress;
              /*
            holderAddress = "0x93146d9978d286EE085ba68eE1786a0b6EDA64EC"
            if(pairOutAsset.toLowerCase() === "USDC"){swapThis = ""}
            if(pairOutAsset.toLowerCase() === "POOL"){swapThis = ADDRESS[CONFIG.CHAINNAME].PRIZETOKEN.ADDRESS.toLowerCase()}
            if(pairOutAsset.toLowerCase() === "WETH"){swapThis = "0x29Cb69D4780B53c1e5CD4D2B817142D2e9890715"}
            */
              const poolSwapParams = {
                src: swapThis, // Token address of  PRIZE TOKEN
                dst: ADDRESS[CONFIG.CHAINNAME].PRIZETOKEN.ADDRESS,
                amount: yieldForPool, // Amount to swap (in wei),
                from: holderAddress,
                //from: CONFIG.WALLET,
                slippage: 1, // Maximum acceptable slippage percentage for the swap (e.g., 1 for 1%)
                disableEstimate: false, // Set to true to disable estimation of swap details
                allowPartialFill: false, // Set to true to allow partial filling of the swap order
              };

              console.log(
                "swap params for 1inch swap back to pool",
                poolSwapParams
              );
              const poolSwap = await BuildTxForSwap(poolSwapParams);
              console.log("pool swap data for 1inch", poolSwap);

              console.log("waiting for 1inch api to let us have another go");
              await delay(1100); // Delays for 1.1 seconds

              // swap prize asset to weth and send to caller with 1" router
              // need some of asset to perform quote?  hold on sending wallet prob best for now

              const gasSwapParams = {
                src: swapThis, // Token address of  PRIZE TOKEN
                dst: WETH, // Token address of WETH
                amount: yieldForWeth, // Amount to swap (in wei),
                from: ADDRESS[CONFIG.CHAINNAME].SWAPPER,
                slippage: 1, // Maximum acceptable slippage percentage for the swap (e.g., 1 for 1%)
                disableEstimate: false, // Set to true to disable estimation of swap details
                allowPartialFill: false, // Set to true to allow partial filling of the swap order
              };

              console.log(
                "swap params for 1inch to reimburse gas",
                gasSwapParams
              );
              const wethSwap = await BuildTxForSwap(gasSwapParams);

              console.log("weth for gas data for 1inch", wethSwap);

              const myAddress = CONFIG.WALLET;
              const contractAddress = ADDRESS[CONFIG.CHAINNAME].SWAPPER;
              const newPoolCalldata = replaceAddressInCalldata(
                poolSwap.data,
                holderAddress,
                contractAddress
              );
              console.log("pool data after address swap", newPoolCalldata);

              const newWethCalldata = replaceAddressInCalldata(
                wethSwap.data,
                holderAddress,
                contractAddress
              );
              console.log("weth swap data after address swap", newWethCalldata);

              const swapfunctionName = "processSwaps";
              const swapargs = [
                pairAddress,
                bestOptionOut,
                maxToSendWithSlippage,
                // poolSwap.data,
                newPoolCalldata,
                // wethSwap.data,
                newWethCalldata,
              ];

              console.log("swap args", swapargs);
              // Encode the function call
              const swapdata = CONTRACTS.SWAPPERSIGNER[
                CONFIG.CHAINNAME
              ].interface.encodeFunctionData(swapfunctionName, swapargs);
              // calculate total gas cost in wei

              const swapweb3TotalGasCost = await web3GasEstimate(
                swapdata,
                CONFIG.CHAINID,
                ADDRESS[CONFIG.CHAINNAME].SWAPPER,
                ADDRESS[CONFIG.CHAINNAME].SWAPPER
              );

              console.log(
                "SWAPPER Gas Estimate  " +
                  Number(swapweb3TotalGasCost) / 1e18 +
                  " ETH"
              );
              swapweb3TotalGasCostUSD =
                (Number(swapweb3TotalGasCost).toFixed(2) * ethPrice) / 1e18;

              const profit = outValue - poolValue - swapweb3TotalGasCostUSD;
              const totalCost = poolValue + swapweb3TotalGasCostUSD;
              console.log("not sending right now");
              return;
              const sendIt = await CONTRACTS.SWAPPERSIGNER[
                CONFIG.CHAINNAME
              ].processSwaps(
                pairAddress,
                bestOptionOut,
                maxToSendWithSlippage,
                poolSwap.data,
                wethSwap.data,
                { maxPriorityFeePerGas: "1000011", gasLimit: "1700000" }
              );
              const result = await sendIt.wait();
              console.log("success tx hash", result.transactionHash);

              return;
            }

            const profit = outValue - poolValue - web3TotalGasCostUSD;
            const totalCost = poolValue + web3TotalGasCostUSD;

            console.log(
              poolOutFormatted.toFixed(4),
              " POOL ($",
              poolValue.toFixed(2),
              ") for ",
              maxOutFormatted.toFixed(4),
              " ",
              pairOutSymbol,
              " ($",
              outValue.toFixed(2),
              ") = $",
              profit.toFixed(2),
              " profit after $",
              web3TotalGasCostUSD,
              " in est gas cost"
            );

            if (
              profit < profitThreshold ||
              totalCost * profitPercentage > outValue
            ) {
              console.log(
                "not meeting profit threshold of $",
                profitThreshold,
                " AND > ",
                (profitPercentage * 100).toFixed(0),
                "%"
              );
              continue;
            }
            console.log("ok we got enough profit, lets go");

            //return // BREAK BEFORE SENDING SWAP
            let txReceipt;
            if (maxToSendWithSlippage.gt(walletPrizeTokenBalance)) {
              console.log("not enough prize token to send liquidation");
              continue;
            }
            // check that swap conditions are as expected before sending
            const swapCheck =
              await contractWSigner.callStatic.computeExactAmountIn(
                bestOptionOut
              );
            if (swapCheck.gt(bestOptionIn)) {
              console.log("swap conditions have changed. need to recalculate.");
              continue;
            }
            // else{console.log("swap check",swapCheck.toString(),"best option in",bestOptionIn.toString())}
            try {
              tx = await CONTRACTS.LIQUIDATIONROUTERSIGNER[
                CONFIG.CHAINNAME
              ].swapExactAmountOut(
                pairAddress,
                CONFIG.WALLET,
                bestOptionOut,
                maxToSendWithSlippage,
                unixTimestamp,
                { maxPriorityFeePerGas: "1000011", gasLimit: "700000" }
              );
              /*
            tx = await CONTRACTS.LIQUIDATIONROUTERSIGNER[
          CONFIG.CHAINNAME
          ].swapExactAmountOut(
          pairAddress,
          ADDRESS[CONFIG.CHAINNAME].SWAPPER,
          bestOptionOut,
          maxToSendWithSlippage,
          unixTimestamp,
          { maxPriorityFeePerGas: "1000011", 	gasLimit: "700000" }
          );*/

              txReceipt = await tx.wait();

              // subtract max amount sent from balance (todo replace with actual instead of max for accuracy)
              walletPrizeTokenBalance = walletPrizeTokenBalance.sub(
                maxToSendWithSlippage
              );
            } catch (e) {
              console.log(e);
              break;
            }
            console.log(section("---- liquidated tx complete -------"));
            console.log("liquidated tx", txReceipt.transactionHash);

            //return // RETURN AFTER SWAP to only send 1 in testing

            const L2transactionCost =
              Number(txReceipt.gasUsed * txReceipt.effectiveGasPrice) / 1e18;

            const alchemyReceipt = await AlchemyTransactionReceipt(
              txReceipt.transactionHash
            );

            const L1transactionCost =
              Number(alchemyReceipt.result.l1Fee) / 1e18;
            console.log(
              "L2 Gas fees (in ETH) " +
                L2transactionCost +
                " L1 Gas fees (in ETH) " +
                L1transactionCost
            );

            totalTransactionCost = L2transactionCost + L1transactionCost;
            totalTransasactionCostDollar = totalTransactionCost * ethPrice;
            console.log(
              "Total Gas fees (in ETH) " +
                totalTransactionCost +
                "  $" +
                totalTransasactionCostDollar
            );

            const gasSpent = parseFloat(
              ethers.utils.formatUnits(
                txReceipt.gasUsed.mul(txReceipt.effectiveGasPrice),
                18
              )
            );

            // todo this gas junk is no bueno
            console.log(
              "gas used",
              txReceipt.gasUsed.toString(),
              " effective gas price",
              ethers.utils.formatUnits(txReceipt.effectiveGasPrice, 18),
              " gas cost ",
              gasSpent
            );

            totalGasSpent += gasSpent;
            // console.log("tx receipt",txReceipt.getTransactionReceipt)
            // console.log("get tx",txReceipt.getTransaction)

            // txReceipt.logs.map((log,index)=>{console.log("log ",index," ",log,interface.parseLog(log))}

            // more parsing than getting
            const logs = GetLogs(txReceipt, ABI.LIQUIDATIONPAIR);
            let poolSpent, amountReceived;
            logs.forEach((log) => {
              if (log.name === "SwappedExactAmountOut") {
                const args = log.args;
                console.log(section("--- swapped log ---"));
                // console.log("account in ", args.account);
                poolSpent = args.amountIn;
                amountReceived = args.amountOut;
                totalPoolSpent += poolSpent;
                assetsReceived.push({
                  asset: pairOutSymbol,
                  amount: ethers.utils.formatUnits(
                    args.amountOut,
                    pairDecimals
                  ),
                });

                console.log("received ", args.amountOut.toString());
              }
            });

            // File path
            const dataFilePath = "./data/liquidator-history.json";

            // Initialization
            let fileData = [];
            if (fs.existsSync(dataFilePath)) {
              try {
                fileData = JSON.parse(fs.readFileSync(dataFilePath, "utf-8"));
                /*console.log(
                "Initial data read from file:",
                JSON.stringify(fileData, null, 2)
              );*/
              } catch (error) {
                console.error("Error reading or parsing file data:", error);
              }
            } else {
              console.log(
                `File at path ${dataFilePath} does not exist. Starting with empty data.`
              );
            }

            // Logging each property before constructing newData

            const newData = {
              txHash: txReceipt.transactionHash,
              gasEstimateETH: web3TotalGasCost.toString(),
              gasCostETH: totalTransactionCost,
              amountReceived: amountReceived.toString(),
              amountReceivedSymbol: pairOutSymbol,
              amountReceivedDecimals: pairDecimals,
              amountSent: poolSpent.toString(),
              gasUsed: txReceipt.gasUsed.toString(),
              poolPrice: prizeTokenPrice,
              pairOutPrice: pairOutPrice,
              ethPrice: ethPrice,
              date: Date.now(),
            };
            /*console.log("new data for file write", newData);
          console.log(
            "New data to be added:",
            JSON.stringify(newData, null, 2)
          );*/

            fileData.push(newData);

            try {
              fs.writeFileSync(
                dataFilePath,
                JSON.stringify(fileData, null, 2),
                "utf-8"
              );
              console.log(
                `Data successfully written to file at ${dataFilePath}.`
              );
            } catch (error) {
              console.error("Error writing data to file:", error);
            }
          } catch (e) {
            // Extracting the primary error message
            const firstParagraph = e.toString().split("\n")[0];

            // Logging the extracted details
            console.error("Message:", firstParagraph);
            if (e.args && e.args.length) {
              for (let i = 0; i < e.args.length; i++) {
                console.log(`arg[${i}] ->`, e.args[i].toString());
              }
            }
          }
        }
      }
    }

    console.log("");
    if (totalPoolSpent > 0) {
      console.log(section("------ liquidation summary -------"));
      console.log("total gas spent ", totalGasSpent);
      console.log("total pool spent ", totalPoolSpent);
      // receivedString = ""
      // assetsReceived.forEach(asset=>receivedString+=asset.symbol + asset.amount + " , ")
      console.log(assetsReceived);
    } else {
      console.log(section("No liquidations completed"));
    }
  } else {
    console.log("liquidations are off while draw is being awarded");
  }
}

function executeAfterRandomTime(minTime, maxTime) {
  // Calculate a random time between minTime and maxTime
  const randomTime = minTime + Math.random() * (maxTime - minTime);

  setTimeout(() => {
    go(); // Execute your function

    // Recursively call the function to continue the cycle
    executeAfterRandomTime(minTime, maxTime);
  }, randomTime);
}

// go once
go();

// go randomly after
executeAfterRandomTime(minTimeInMilliseconds, maxTimeInMilliseconds);
const LiquidateNow = async () => {
  go();
};
module.exports = LiquidateNow;
