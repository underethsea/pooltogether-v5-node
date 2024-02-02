const { CONTRACTS } = require("./constants/contracts");
const { ADDRESS } = require("./constants/address.js");
const { ethers } = require("ethers")
const { CONFIG } = require("./constants/config")

// drip POOL to use for liquidating on testnet
   async function drip() {
    console.log("requesting POOL from faucet..")
    try {
      let drip = await CONTRACTS.TOKENFAUCET[CONFIG.CHAINNAME].drip(
        ADDRESS[CONFIG.CHAINNAME].POOL
      );
      let dripReceipt = await drip.wait();
      console.log("POOL dripped to wallet");
      console.log("tx hash ", dripReceipt.transactionHash);
  
    } catch (e) {
      console.log("POOL drip failed.");
      console.log(e);

    }
}
drip()