const ethers = require("ethers");
const { CONTRACTS } = require("../constants/contracts.js");
const { PROVIDERS, SIGNER } = require("../constants/providers.js");
const { ADDRESS } = require("../constants/address.js");
const { ABI } = require("../constants/abi.js");
const { CONFIG } = require("../constants/config.js");
const { GetChainName } = require("../constants/address.js")
const GetTwabPlayers = require("../functions/playersSubgraph.js")

// const { GetLogs } = require("../utilities/getLogs.js");
const { AddWin, AddDraw, AddPoolers } = require("../functions/dbDonkey.js");
const { GetWinners } = require("../functions/winners.js");
const chalk = require("chalk");
const {GetPrizePoolData} = require("../functions/getPrizePoolData.js")


// const goBlock = 3712757+3;
const goBlock = "latest"
                
const section = chalk.hex("#47FDFB");
const batchSize = 100;

async function PrizeWinsToDb(chainId,block="latest") { 
console.log("block",block)
  console.log("chain id to name",chainId," name ",GetChainName(chainId))
  console.log(section("----- calling contract data ------"));
  const {lastDrawId, numberOfTiers, tierTimestamps,lastCompletedDrawStartedAt, 
    drawPeriodSeconds,grandPrizePeriod, tierPrizeValues, prizesForTier} = await GetPrizePoolData(block)

  
  console.log("");
  await AddDraw(
    chainId,
    lastDrawId.toString(),
    lastCompletedDrawStartedAt,
    drawPeriodSeconds,
    numberOfTiers,
    grandPrizePeriod,
    tierPrizeValues.map(value => +value),
    prizesForTier,
    block
  
);

  // for (z = 0; z < ADDRESS[CONFIG.CHAINNAME].VAULTS.length; z++) {
  //   console.log("vault ", ADDRESS[CONFIG.CHAINNAME].VAULTS[z].VAULT);
  const startTime = new Date();
  console.log("Start Time", startTime);

  console.log(section("----- getting winners -----"));
  let newWinners = await GetWinners(
    GetChainName(chainId),
    numberOfTiers,
    lastDrawId,
    tierTimestamps,
    [], // CONFIG.TIERSTOCLAIM, 
    prizesForTier,
  );
const oneDrawStartTimeStamp = tierTimestamps[numberOfTiers-1].startTimestamp.toString()
const oneDrawEndTimeStamp = tierTimestamps[numberOfTiers-1].endTimestamp.toString()
console.log("fetching 1 draw of players for db ",oneDrawStartTimeStamp," - ",oneDrawEndTimeStamp)
  let oneDrawPlayers = await GetTwabPlayers(oneDrawStartTimeStamp,oneDrawEndTimeStamp)
console.log("got ",oneDrawPlayers.length," players, writing to db")
await AddPoolers(chainId,lastDrawId.toString(),oneDrawPlayers)

  // console.log(newWinners)

  const combinedArray = []
  for (const [vault, winner, tier, index] of newWinners) {
    const existingEntry = combinedArray.find(([v, w, t]) => v === vault && w === winner && t === tier);
  
    if (existingEntry) {
      existingEntry[3].push(index);
    } else {
      combinedArray.push([vault, winner, tier, [index]]);
    }
  }
  
  const addWinPromises = combinedArray.map(([vault, pooler, tier, indices]) =>
  AddWin(chainId, lastDrawId.toString(), vault, pooler, tier, indices)
);

await Promise.all(addWinPromises);

for (let x = 0; x < combinedArray.length; x++) {
  const [vault, pooler, tier, indices] = combinedArray[x];
  console.log(
    pooler,
    " won tier",
    tier,
    " indices",
    indices,
     "on vault",
    vault,
  );
}

  const endTime = new Date();
console.log("End Time ", endTime);

const timeDifference = endTime - startTime;
console.log("Time elapsed (seconds)", timeDifference/1000);
}

// not working because no complete draw event
async function getCompletedDrawLogs() {
  const claimFilter = {
    address: ADDRESS[CONFIG.CHAINNAME].PRIZEPOOL,
    topics: [
      "0x4dfe1bbbcf077ddc3e01291eea2d5c70c2b422b415d95645b9adcfd678cb1d63",
    ],
    fromBlock: -200000,
    toBlock: "latest",
  };

  const claimLogs = await PROVIDERS[CONFIG.CHAINNAME].getLogs(
    claimFilter,
    -20000,
    "latest"
  );

  console.log(claimLogs);
  const decodedClaimLogs = claimLogs.map((claim, index) => {
    const decodedLog =
      CONTRACTS.PRIZEPOOL[CONFIG.CHAINNAME].interface.parseLog(claim);
    console.log(decodedLog);
    // return {
    //   drawId: decodedLog.args.drawId,
    //   vault: decodedLog.args.vault,
    //   winner: decodedLog.args.winner,
    //   tier: decodedLog.args.tier,
    // };
  });

  //   return decodedClaimLogs;
  // }
}

const calculateTierFrequency = (t, n, g) => {
  const e = Math.E;
  const odds = e ** ((t - n + 1) * Math.log(1 / g)) / (1 - n);
  return odds;
};

async function doAll() {
  let nowBlock = await PROVIDERS[CONFIG.CHAINNAME].getBlock();
  nowBlock = nowBlock.number;
  console.log("now block", nowBlock.toString());
  // let goBlock = completeBlocks[0]

  /*do{
await go(goBlock+2)
goBlock += drawTime
}while(goBlock < nowBlock)*/
  /*
for (let x = 0; x <= completeBlocks.length; x++) {
    await go(completeBlocks[x] + 2);
  }*/
await PrizeWinsToDb(CONFIG.CHAINID,nowBlock);
}
 doAll();

module.exports = {PrizeWinsToDb}

// getCompletedDrawLogs()


