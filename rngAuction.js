const { CONTRACTS } = require("./constants/contracts");
const { CONFIG } = require("./constants/config");
const { PROVIDERS } = require("./constants/providers.js");
const { ADDRESS, ADDRESS_AUCTION } = require("./constants/address.js");
const ethers = require("ethers");
const { GeckoIDPrices } = require("./utilities/geckoFetch.js");
const { Multicall } = require("./utilities/multicall.js");

const rngProfitMargin = .94;
const rngErrorMargin = 1.02; // 1.03 = 3%
const maxSpendPercentage = 65 // 65 would mean the RNG cannot exceed spending 65% of the reserve because that could mean the relay could exceeding available funding

console.log(
  "rng tx address ",
  ADDRESS_AUCTION["MAINNET"].CHAINLINKDIRECTAUCTIONHELPER
);

async function checkAndCompleteRng() {
  const callsMain = [
    CONTRACTS.RNGAUCTION.MAINNET.isAuctionOpen(),
    CONTRACTS.RNGAUCTION.MAINNET.currentFractionalReward(),
  ];

  // Execute the multicall
  let isAuctionOpen, rewardFraction;
  try {
    [isAuctionOpen, rewardFraction] = await Multicall(callsMain, "MAINNET");
  } catch (e) {
    console.log("error getting auction status and reward fraction", e);
  }
  if (isAuctionOpen) {
    console.log("rng auction is open");
    console.log("")

    const prices = await GeckoIDPrices(["pooltogether", "weth", "chainlink"]);
    const poolPrice = prices[0];
    const ethPrice = prices[1];
    const linkPrice = prices[2];

    // console.log("Reward Fraction: ", rewardFraction.toString());

const calls = [
  CONTRACTS.PRIZEPOOL[CONFIG.CHAINNAME].reserve(),
  CONTRACTS.PRIZEPOOL[CONFIG.CHAINNAME].pendingReserveContributions()
];

// Use Promise.all to execute Multicall, getGasPrice, and getFeeData in parallel
const [multicallResults, mainnetGasNow, feeData] = await Promise.all([
  Multicall(calls, CONFIG.CHAINNAME),
  PROVIDERS.MAINNET.getGasPrice(),
  PROVIDERS.MAINNET.getFeeData()
]);

// Destructure the results from the multicall
const [reserve, reserveForOpenDraw] = multicallResults;

    //console.log("Fee Data: ", feeData)
    const lastBaseFeePerGas = Number(feeData.lastBaseFeePerGas);
    const maxFeePerGas = Number(feeData.maxFeePerGas);
    const maxPriorityFeePerGas = Number(feeData.maxPriorityFeePerGas);
    const gasPrice = Number(feeData.gasPrice);
    /*
console.log("gasPrice",gasPrice)
console.log("lastBaseFeePerGas",lastBaseFeePerGas)
console.log("maxPriorityFeePerGas",maxPriorityFeePerGas)
console.log("maxFeePerGas",maxFeePerGas)
 
*/
    //console.log("reserve open draw",reserveForOpenDraw)
    const totalReserve = reserve.add(reserveForOpenDraw);
    console.log(
      "total reserve",
      Number(
        ethers.utils.formatUnits(
          totalReserve,
          ADDRESS[CONFIG.CHAINNAME].PRIZETOKEN.DECIMALS
        )
      ).toFixed(4)," POOL"
    );
    const totalReserveFormatted = ethers.utils.formatUnits(
      totalReserve,
      ADDRESS[CONFIG.CHAINNAME].PRIZETOKEN.DECIMALS
    );
    //console.log(poolPrice)
    //console.log(ethPrice)
    //console.log(linkPrice)
    console.log(
      "token pricing - POOL $",
      poolPrice,
      " ETH $",
      ethPrice,
      "  LINK $",
      linkPrice
    );

    console.log("");
    const { rngAuctionReward, rewardInDollars } = calculateAuctionRewards(rewardFraction, totalReserveFormatted, poolPrice);
 if(rngAuctionReward > (totalReserveFormatted * (maxSpendPercentage/100))) {console.log("auction cost has exceeded projected reserve funding, exiting....");return}
    const linkRequired =
      await CONTRACTS.CHAINLINKDIRECTAUCTIONHELPER.MAINNET.estimateRequestFee(
        mainnetGasNow
      );
    //console.log("link required",linkRequired.toString() / 1e18)

    //[0] looks like the token required
    const linkCost = (parseInt(linkRequired[1]) / 1e18) * linkPrice;
    //  console.log("link required", (linkRequired[1]/1e18).toFixed(4));


    console.log(
      "rng auction reward in POOL",
      rngAuctionReward.toFixed(4),
      " $",
      (rngAuctionReward * poolPrice).toFixed(2)
    );

    // add check to see if has LINK balance and approval

    const gasCostUsd = await calculateGasCost(mainnetGasNow, ethPrice);

    console.log(
      "link required",
      (linkRequired[1] / 1e18).toFixed(4),
      " link cost $",
      linkCost.toFixed(2)
    );

    console.log("estimated gas cost $", gasCostUsd.toFixed(2)," @ ",(mainnetGasNow/1e9).toFixed(2),"gwei");
    const rngCosts = (linkCost + gasCostUsd) * rngErrorMargin;
console.log("netting $",((rngAuctionReward * poolPrice)-rngCosts).toFixed(2)) 
   if (rngCosts + rngProfitMargin < rngAuctionReward * poolPrice) {
      console.log(
        "profitable!! pool reward$",
        rngAuctionReward * poolPrice,
        " - link cost ",
        linkCost,
        " gas cost",
        gasCostUsd,
        " profit margin required ",
        rngProfitMargin
      );
     // console.log("return for debug");return
      const rngTx = await CONTRACTS.CHAINLINKDIRECTAUCTIONHELPERWITHSIGNER[
        "MAINNET"
      ].transferFeeAndStartRngRequest(CONFIG.WALLET, {
        gasLimit: 360000,
        gasPrice: mainnetGasNow,
      });
      console.log("pending tx confirmation....");
      const rngReceipt = await rngTx.wait();
      console.log("success tx hash ", rngReceipt.transactionHash);
      console.log("gas used ", rngReceipt.gasUsed);
    } else {
      console.log("not a $",rngProfitMargin.toFixed(2), " profit, yet...");
    }
  } else {
    console.log("auction closed");
  }
}


async function calculateGasCost(mainnetGasNow, ethPrice) {
    try {
        const rngGas = await CONTRACTS.CHAINLINKDIRECTAUCTIONHELPERWITHSIGNER["MAINNET"].estimateGas.transferFeeAndStartRngRequest(CONFIG.WALLET);
        const gasCost = rngGas.mul(mainnetGasNow);
        return (gasCost / 1e18) * ethPrice;
    } catch (e) {
        const gasCost = GAS_ESTIMATION * Number(mainnetGasNow);
        console.log("Error estimating gas: ", e.message);
        return (gasCost / 1e18) * ethPrice;
    }
}

 function calculateAuctionRewards(rewardFraction, totalReserveFormatted, poolPrice) {
    const auctionFraction = rewardFraction / 1e18;
    const rngAuctionReward = auctionFraction * totalReserveFormatted;
    return {
        rngAuctionReward: rngAuctionReward,
        rewardInDollars: rngAuctionReward * poolPrice
    };
}



// USE THESE FUNCTIONS TO RUN AUCTION
 checkAndCompleteRng()

// Call the async function every 30 seconds
setInterval(async () => {
  try {
    await checkAndCompleteRng();
  } catch (error) {
    console.error("Error executing function:", error);
  }
}, 30000);
// If you ever want to stop the interval, you can use:
// clearInterval(intervalId);

