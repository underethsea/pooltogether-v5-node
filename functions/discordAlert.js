// cron to alert winners
require('../env-setup');
const { Client, Intents } = require("discord.js");
const Discord = require("discord.js");
// const { DISCORDID } = require("./constants/discordId.js")

const pgp = require("pg-promise")(/* initialization options */);
const ethers = require("ethers");
//const fs = require("fs");
const fetch = require("cross-fetch");
const { MessageEmbed } = require("discord.js");

// override for manual draw processing
//const drawToProcess = 663

// test with no public alerts (true)
const testModeNoAlerts = false

// blackList for addresses to not alert - array of strings!
const tempBlacklist = [];

// user to receive notifiation that alerts have completed
const userReportsId = "662117180158246926";

const client = new Discord.Client({
  partials: ["CHANNEL"],
  intents: ["GUILDS", "GUILD_MESSAGES", "DIRECT_MESSAGES"],
});

const fourteenUsdc = (amount) => {
  let newNum = amount / 1e14;
  if (newNum < 1) {
    return newNum.toFixed(2);
  } else {
    return newNum.toFixed();
  }
};

 const networks = [{symbol:"OPGOERLI",name:"Optimism Goerli",id:420}];


const cn = {
  host: "localhost", // server name or IP address;
  port: 5432,
  database: "birdcall",
  user: process.env.USER,
  password: process.env.PASSWORD,
};
const db = pgp(cn);

async function DiscordNotifyClaimPrize(claim) {
  try {
	const subscriber = await db.oneOrNone(`
   	 SELECT wallet, discord, label FROM addresses 
    	WHERE LOWER(wallet) = LOWER($1)
	`, [claim.winner.toLowerCase()]);

      if (!subscriber || !subscriber.discord) {
          console.log(`Wallet ${claim.winner} is not subscribed for alerts or doesn't have a Discord ID.`);
          return;
      }
const labelMessage = subscriber.label ? `${subscriber.label}` : "";
const payAmount = parseInt(claim.payout) / 1e18
//const payMessage = payAmount < .02 ? payAmount : payAmount.toFixed(2)


 const existingClaim = await db.oneOrNone(`
          SELECT 1 FROM v5claims 
          WHERE network = $1 AND block = $2 AND hash = $3 AND draw = $4 AND vault = $5 
          AND winner = $6 AND payout = $7 AND miner = $8 AND fee = $9 AND tier = $10 AND index = $11
      `, [claim.network, claim.block, claim.hash, claim.drawId, claim.vault, claim.winner, claim.payout, claim.miner, claim.fee, claim.tier, claim.index]);

      if (!existingClaim) {
          await db.none(`
              INSERT INTO v5claims (network, block, hash, draw, vault, winner, payout, miner, fee, tier, index) 
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          `, [claim.network, claim.block, claim.hash, claim.drawId, claim.vault, claim.winner, claim.payout, claim.miner, claim.fee, claim.tier, claim.index]);
const message = " 🏆 WINNER `" + subscriber.wallet.substring(0,6) + "` WON " + payAmount.toFixed(2) + " POOL " + labelMessage;
      await tellUser(subscriber.discord, message);



}else{console.log("Claim previously alerted for ",claim.winner," draw ", claim.drawId," vault ",claim.vault," tier ",claim.tier)}

  } catch(error) {
      console.log(error);
  }
}

async function tellUser(user, message) {
  try {
      const discordUser = await client.users.fetch(user, false);
      if (testModeNoAlerts !== true) {
          await discordUser.send(message);
          console.log("Message sent to user:", user, " Message:", message);
      }
  } catch (error) {
      console.log("Could not alert user:", error);
      throw new Error("Failed to send alert to user.");  // Propagate the error to be caught in DiscordNotifyClaimPrize
  }
}




client.login(process.env.BOT_KEY);

module.exports = {DiscordNotifyClaimPrize}
