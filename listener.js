
// const { CONTRACTS, ADDRESS, PROVIDERS } = require("./constants/index.js")
const { ADDRESS } = require("./constants/address")
const {WS_PROVIDERS, PROVIDERS } = require("./constants/providers")
const { CONTRACTS } = require("./constants/contracts")
const { CONFIG } = require("./constants/config")
const { PrizeWinsToDb } = require("./functions/prizeWinsToDb.js")
//const LiquidateNow  = require("./liquidator.js")
const { AddClaim } = require("./functions/dbDonkey.js")
const ethers = require("ethers")
const { DiscordNotifyClaimPrize } = require("./functions/discordAlert.js")

const chain = CONFIG.CHAINNAME
const chainId = CONFIG.CHAINID

const FILTERS = {
// draw awarded
  DRAWAWARDED: {
    address: ADDRESS[chain].PRIZEPOOL,
    topics: ["0x60785c409db91938793d3f74013b06843f82ea0588265495b262b016fe5323ae"]
  },
/*
  DRAWCLOSED: {
    address: ADDRESS[chain].PRIZEPOOL,
    topics: ["0x330a72bcfcfc5c9a30ef8bdce22a7499068847d7e5ad7330f3a81fdd1e6e996d"]
},
// old for sepolia
/*  CLAIMEDPRIZE: {
    address: ADDRESS[chain].PRIZEPOOL,
    topics: ["0xc31bc4fb7f1c35cfd7aa34780f09c3f0a97653a70920593b2284de94a4772957"]
  },*/
 CLAIMEDPRIZE: {
    address: ADDRESS[chain].PRIZEPOOL,
    topics: ["0x81d4e3306aa30f56dc9c3949abd8c27539b445f9ef380425f39f3f7114888e4f"]
  },
}

async function listen() {
    console.log("listening for complete award and claim events")
     PROVIDERS[chain].on(FILTERS.DRAWAWARDED, (drawCompletedEvent) => {
         try {
             console.log("draw completed event", drawCompletedEvent)
             PrizeWinsToDb(chainId,drawCompletedEvent.blockNumber).then((finished)=>{console.log("db updated")})
                      
}catch(error){console.log(error)}
//try{LiquidateNow()}catch(e){console.log(e)}     
})
//console.log(WS_PROVIDERS[chain])
    PROVIDERS[chain].on(FILTERS.CLAIMEDPRIZE, (claimEvent) => {
      try {
          // console.log("prize claimed event ", claimEvent)
          const decodedLog =
        CONTRACTS.PRIZEPOOL[chain].interface.parseLog(claimEvent);
console.log("claim event",decodedLog)        
const args = decodedLog.args
        const claim = {
          network: chainId,
          drawId: args.drawId,
          vault: args.vault.toLowerCase(),
          winner: args.winner.toLowerCase(),
          tier: args.tier,
          index: args.prizeIndex,
          payout: args.payout,
          fee: args.fee,
          miner: args.feeRecipient.toLowerCase(),
          hash: claimEvent.transactionHash.toLowerCase(),
          block: claimEvent.blockNumber
        };
        AddClaim(chainId,claim).then((finished)=>{})
        
       DiscordNotifyClaimPrize(claim).then((finished)=>{})    

      }catch(error){console.log(error)}
  })
}

listen()

