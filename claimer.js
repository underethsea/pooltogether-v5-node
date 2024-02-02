const ethers = require("ethers");
const { CONTRACTS } = require("./constants/contracts.js");
// const { CONTRACTS, PROVIDERS, SIGNER, ABI } = require("./constants/index")
const { PROVIDERS, SIGNER } = require("./constants/providers.js");
const { ADDRESS } = require("./constants/address.js");
const { ABI } = require("./constants/abi.js");
const { CONFIG } = require("./constants/config.js");
const { FetchApiPrizes } = require("./functions/fetchApiPrizes.js");
const { GetWinners } = require("./functions/winners.js")
const { GetRecentClaims } = require("./functions/getRecentClaims.js")
const { SendClaims } = require("./functions/sendClaims.js")
const chalk = require("chalk");
const { GetPrizePoolData } = require("./functions/getPrizePoolData.js");
const { GeckoIDPrices } = require("./utilities/geckoFetch.js");
const { GetPricesForToken } = require("./utilities/1inch.js")
const { CollectRewards } = require("./collectRewards.js")
//const settings = require('./constants/liquidator-config'); 

const {minTimeInMilliseconds, maxTimeInMilliseconds, useCoinGecko } = CONFIG;


// covalent, not accurate to get twab players
// const FetchPlayers = require("./utilities/players.js");

const section = chalk.hex("#47FDFB");

const claimerContract = new ethers.Contract(
  ADDRESS[CONFIG.CHAINNAME].CLAIMER,
  ABI.CLAIMER,
  SIGNER
);

async function go() {
  console.log(section("----- starting claim bot ------"));
  console.log("fetching recent claim events");

  let claims = await GetRecentClaims(CONFIG.CHAINID);
  console.log("got " + claims.length + " claim events ", "\n");

  const ethAndPoolPrices = await GeckoIDPrices(["pooltogether", "ethereum"]);
 
  let prizeTokenPrice

  if(useCoinGecko){prizeTokenPrice = ethAndPoolPrices[0];}
  else  {prizeTokenPrice = await GetPricesForToken(ADDRESS[CONFIG.CHAINNAME].PRIZETOKEN.ADDRESS)}

  const ethPrice = ethAndPoolPrices[1];

  console.log(section("----- calling contract data ------"));
  const {lastDrawId, numberOfTiers, tierTimestamps, prizesForTier, maxFee, tierPrizeValues, tierRemainingLiquidites, reserve} = await GetPrizePoolData()

  maxFee.forEach((fee,index)=>{console.log("max fee for tier ",index, " -> ",parseInt(fee)/1e18)})
  // console.log("prizes for Tier ",prizesForTier)

  let newWinners;
  console.log(section("----- getting winners -----"));

  if (!CONFIG.USEAPI) {
  
    // await SendClaims(claimerContract, lastDrawId, []);

    newWinners = await GetWinners(
      CONFIG.CHAINNAME,
      numberOfTiers,
      lastDrawId,
      tierTimestamps,
      CONFIG.TIERSTOCLAIM,
      prizesForTier,
      "latest"
    );
  }

  else {
    console.log("using api for winner calculations");
    newWinners = await FetchApiPrizes(
      CONFIG.CHAINID,
      lastDrawId,
      CONFIG.TIERSTOCLAIM,
      claims
    );
  }
  console.log("winners before removing claims", newWinners.length);

  newWinners = removeAlreadyClaimed(newWinners, claims, lastDrawId);
  console.log("winners after removing claims", newWinners.length);

//  console.log(section("---- checking profitability -----"));

  await SendClaims(claimerContract, lastDrawId, newWinners, maxFee, prizeTokenPrice, ethPrice);
  console.log(section("----- rewards check and claim ------"));

await CollectRewards(prizeTokenPrice,ethPrice)
}


function removeAlreadyClaimed(winners, claims, drawId) {
  // Filter the claims for the specified drawId and tier 
  const relevantClaims = claims.filter(claim => claim.drawId === drawId);
    
  return winners   
      .map(winner => {
          const [vault, person,tier , prizeIndices] = winner;
    
          // Check each prize index to see if it's been claimed
          const unclaimedPrizeIndices = prizeIndices.filter(prizeIndex =>
              !relevantClaims.some(claim =>
                  claim.vault.toLowerCase() === vault.toLowerCase() &&
                  claim.winner.toLowerCase() === person.toLowerCase() &&
                  claim.index === prizeIndex
              )
          );
    
          // Return the winner with only unclaimed prize indices
          return [vault, person, tier, unclaimedPrizeIndices];
      })
      .filter(winner => winner[3].length > 0); // Remove winners with no unclaimed prizes
}


async function executeAfterRandomTime(minTime, maxTime) {
  // Calculate a random time between minTime and maxTime
  const randomTime = minTime + Math.random() * (maxTime - minTime);

  setTimeout(async () => { 
try{   
 await go(); 
} catch (error) {
    console.error('Error occurred:', error);
  }
     console.log("---------------------------------------------------------do it again------------ ",Date.now())
    // Recursively call the function to continue the cycle
    executeAfterRandomTime(minTime, maxTime);
  }, randomTime);
}

// go once
go();

// go randomly after init
executeAfterRandomTime(minTimeInMilliseconds, maxTimeInMilliseconds);
