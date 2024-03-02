const { CONTRACTS } = require("./constants/contracts");
const { CONFIG } = require("./constants/config");
const { PROVIDERS, MAINNETSIGNER } = require("./constants/providers.js");
const { ADDRESS, ADDRESS_AUCTION } = require("./constants/address.js");
const ethers = require("ethers");
const { GeckoIDPrices } = require("./utilities/geckoFetch.js");
const { Multicall } = require("./utilities/multicall.js");
const profitMarginUsd = 1.1

let transactionAttempted = false;

console.log("relay address ", ADDRESS_AUCTION["MAINNET"].RNGAUCTIONRELAY);

// ----------------------------------------------------------------- RELAY
async function checkAndCompleteRelay() {
  if (transactionAttempted) {
    console.log("Transaction already attempted, exiting.");
    return;
  }

  let isAuctionOpen = await CONTRACTS.RNGAUCTION.MAINNET.isAuctionOpen();
  isAuctionOpen = true;
  if (isAuctionOpen) {
    console.log("auction is open");

    const relayEvents = await getRelayEvents();
    if (relayEvents > 1) {
      console.log("relay already compelted", relayEvents);
    } else {
      const calls = [
        CONTRACTS.PRIZEPOOL[CONFIG.CHAINNAME].reserve(),
        CONTRACTS.PRIZEPOOL[CONFIG.CHAINNAME].pendingReserveContributions(),
      ];
      const [prices, fetchedCalls] = await Promise.all([
        GeckoIDPrices(["pooltogether", "weth"]),
        Multicall(calls, [CONFIG.CHAINNAME]),
      ]);

      const poolPrice = prices[0];
      const ethPrice = prices[1];
      const [reserveForOpenDraw, reserve] = fetchedCalls;

      //console.log("reserve open draw",reserveForOpenDraw)
      const totalReserve = reserve.add(reserveForOpenDraw);
      console.log(
        "total reserve",
        ethers.utils.formatUnits(
          totalReserve,
          ADDRESS[CONFIG.CHAINNAME].PRIZETOKEN.DECIMALS
        )
      );
      const totalReserveFormatted = ethers.utils.formatUnits(
        totalReserve,
        ADDRESS[CONFIG.CHAINNAME].PRIZETOKEN.DECIMALS
      );
      console.log("token pricing - POOL $", poolPrice, " ETH $", ethPrice);
      //[0] looks like the token required

      const relayAuction = await relayRewards();
  
      const reserveRemaining =
        totalReserveFormatted - relayAuction.lastAuction / 1e18;
      console.log(
        "reserve remaining after last auction",
        reserveRemaining.toFixed(2),
        " POOL"
      );
      const relayEstimateReward =
        reserveRemaining * (relayAuction.rewardFraction / 1e18);
      console.log("");
      const poolRewardUsd = relayEstimateReward * poolPrice;

      console.log(
        "estimated reward for relay",
        relayEstimateReward.toFixed(2),
        " POOL",
        " | $",
        poolRewardUsd.toFixed(2)
      );

      const relayGasLimit = 69420;
      //const relayTx = await CONTRACTS.RNGAUCTIONRELAYWITHSIGNER.MAINNET.populateTransaction.relay("0xa8f85bAB964D7e6bE938B54Bf4b29A247A88CD9d",CONFIG.CHAINID.toString(),"0x38449a6b7bb76638452273925c9a2BA818bD130d","0xF4c47dacFda99bE38793181af9Fd1A2Ec7576bBF",CONFIG.WALLET)
      const relayGas =
        await CONTRACTS.RNGAUCTIONRELAYWITHSIGNER.MAINNET.estimateGas.relay(
          ADDRESS_AUCTION.MAINNET.MESSAGEDISPATCHER,
          CONFIG.CHAINID.toString(),
          ADDRESS[CONFIG.CHAINNAME].REMOTEOWNER,
          ADDRESS[CONFIG.CHAINNAME].RNGRELAYAUCTION,
          CONFIG.WALLET,
          relayGasLimit
        );
      const mainnetGasNow = await PROVIDERS.MAINNET.getGasPrice();

      /*
// 1159 tx
let feeData = await PROVIDERS.MAINNET.getFeeData();
const lastBaseFeePerGas = Number(feeData.lastBaseFeePerGas);
const maxFeePerGas = Number(feeData.maxFeePerGas);
const maxPriorityFeePerGas = Number(feeData.maxPriorityFeePerGas);
const gasPrice = Number(feeData.gasPrice);


// Calculate the gas cost in Ether
const gasCost = relayGas.mul(feeData.maxFeePerGas);

// Convert gas cost to USD
const gasCostUsd = (parseFloat(ethers.utils.formatEther(gasCost)) * ethPrice);

console.log(
    "relay gas ",
    relayGas.toString(),
    " ",
    ethers.utils.formatEther(gasCost),
    " ETH | ",
    gasCostUsd.toFixed(4),
    " USD"
);

const poolRewardUsd = relayEstimateReward * poolPrice;
console.log("pool reward value $", poolRewardUsd.toFixed(2));

if (poolRewardUsd > gasCostUsd + profitMarginUsd) {
    try {
        console.log("profitable yea");
return
        // Replace 'return' with the transaction sending logic if the condition is true
        let tx = await CONTRACTS.RNGAUCTIONRELAYWITHSIGNER.MAINNET.relay(
            ADDRESS_AUCTION.MAINNET.MESSAGEDISPATCHER,
            CONFIG.CHAINID.toString(),
            ADDRESS[CONFIG.CHAINNAME].REMOTEOWNER,
            ADDRESS[CONFIG.CHAINNAME].RNGRELAYAUCTION,
            CONFIG.WALLET,
            relayGasLimit,
            {
                maxFeePerGas: ethers.utils.parseUnits(maxFeePerGas.toString(), 'gwei'),
                maxPriorityFeePerGas: ethers.utils.parseUnits(maxPriorityFeePerGas.toString(), 'gwei'),
                type: 2, // Indicate EIP-1559 transaction
                gasLimit: 600000 
	   }
        );
*/

      //pre 1159 tx

      const gasCost = relayGas.mul(mainnetGasNow);
      const gasCostUsd = (gasCost / 1e18) * ethPrice;

      console.log(
        "relay gas ",
        (mainnetGasNow / 1e9).toFixed(2),
        "gwei | ",
        (gasCost / 1e18).toFixed(5),
        " ETH | $",
        gasCostUsd.toFixed(2)
      );

      if (poolRewardUsd > gasCostUsd + profitMarginUsd) {
        try {
          console.log("profitable yehhaaaaaaaa");
return
          let tx = await CONTRACTS.RNGAUCTIONRELAYWITHSIGNER.MAINNET.relay(
            ADDRESS_AUCTION.MAINNET.MESSAGEDISPATCHER,

            CONFIG.CHAINID.toString(),
            ADDRESS[CONFIG.CHAINNAME].REMOTEOWNER,
            ADDRESS[CONFIG.CHAINNAME].RNGRELAYAUCTION,
            CONFIG.WALLET,
            relayGasLimit,
            { gasPrice: mainnetGasNow, gasLimit: 600000 }
          );

          const receipt = await tx.wait();
          // console.log("relayed!", receipt);
          console.log("relayed!", receipt.transactionHash);
          transactionAttempted = true;
        } catch (e) {
          console.log(e);
          transactionAttempted = true;
        }
      } else {
        console.log("");
        console.log(
          "$",
          (poolRewardUsd - gasCostUsd).toFixed(2),
          "not enough profit to send relay, threshold $",
          profitMarginUsd
        );
      }
    }
  } else {
    console.log("auction is closed");
  }
}

async function relayRewards() {
  const recentRngEvent = await getMostRecentEvent();
  //console.log("most recent event block number", recentRngEvent.blockNumber);
  const eventBlock = await getTimestampForBlock(recentRngEvent.blockNumber);
  const timeElapsed = Math.round(Date.now() / 1000 - eventBlock);

  try {

const [rewardFraction, lastResult] = await Promise.all([
  CONTRACTS.RNGRELAYAUCTION[CONFIG.CHAINNAME].computeRewardFraction(timeElapsed),
  CONTRACTS.RNGAUCTION.MAINNET.getLastAuctionResult()
]);

    /* console.log(
      "reward fraction:",
      rewardFraction.toString(),
      parseInt(rewardFraction) / 1e18
    );*/

    //console.log("last result", lastResult);

    const auctionResult = {
      rewardFraction: rewardFraction,
      recipient: CONFIG.WALLET,
    };

    const auctionResults = [];
    auctionResults[0] = lastResult;
    auctionResults[1] = auctionResult;
    const reward = await CONTRACTS.RNGRELAYAUCTION[
      CONFIG.CHAINNAME
    ].computeRewards(auctionResults);
    const results = {
      lastAuction: reward[0],
      newAuction: reward[1],
      rewardFraction: rewardFraction,
    };
    //console.log("last auction result fraction (rng)",lastAuctionResult, " ",lastAuctionResult/1e18)
    //console.log("relay auction fraction ",relayAuctionResult," ",relayAuctionResult/1e18)
    return results;
  } catch (e) {
    console.log("error getting relay reward fraction", e);
  }
}

async function getRelayEvents() {
  const relayFilter = {
    address: ADDRESS_AUCTION["MAINNET"].RNGAUCTIONRELAY,
    topics: [
      "0x0aaaf9835b678c952fbddc44da49e66cffaa813453ff984c4b8d497a1e5708dc",
    ],
    fromBlock: -3000, //blocks to search for events
    toBlock: "latest",
  };

  const relayLogs = await PROVIDERS["MAINNET"].getLogs(relayFilter);
  // console.log("relay logs",relayLogs)

  return relayLogs.length;
}

async function getMostRecentEvent() {
  const RNGAUCTION_ADDRESS = ADDRESS[CONFIG.CHAINNAME].RNGAUCTION;
  const topic =
    "0xf037bfa85a373d893a047acc295492dfc8adaa0e779a717827e4ac1f67aca9b5";

  const logs = await PROVIDERS.MAINNET.getLogs({
    address: RNGAUCTION_ADDRESS,
    topics: [topic],
    fromBlock: 0, // adjust as needed
    toBlock: "latest",
  });

  if (logs.length === 0) return null;
  const mostRecentEvent = logs[logs.length - 1];
  //    console.log(mostRecentEvent)
  return mostRecentEvent;
}

async function getTimestampForBlock(blockNumber) {
  const block = await PROVIDERS.MAINNET.getBlock(blockNumber);
  return block.timestamp;
}

// USE THESE FUNCTIONS TO RUN AUCTION
checkAndCompleteRelay();

// Call the async function every 30 seconds
setInterval(async () => {
  try {
    await checkAndCompleteRelay();
  } catch (error) {
    console.error("Error executing function:", error);
  }
}, 120000);
// If you ever want to stop the interval, you can use:
// clearInterval(intervalId);
