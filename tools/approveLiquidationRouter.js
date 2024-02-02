
const { CONTRACTS } = require("../constants/contracts");
const { ADDRESS } = require("../constants/address.js");
const { ethers } = require("ethers")
const { CONFIG } = require("../constants/config")

// approve the spend of POOL on the liquidation router

async function approve() {
  try {
    console.log("approving max spend of POOL on liquidation router... ")
    let approve = await CONTRACTS.POOLWITHSIGNER[CONFIG.CHAINNAME].approve(
      ADDRESS[CONFIG.CHAINNAME].LIQUIDATIONROUTER,
      ethers.constants.MaxUint256
    );
    console.log("tx sent, waiting for receipt")
    let approveReceipt = await approve.wait();
    console.log("approved spend of POOL on liquidation router");
    console.log("tx ",approveReceipt.transactionHash)
  } catch (e) {
    console.log("approve of POOL on liquidation router failed");
    console.log(e)

  }
 finally {
    process.exit();
  }
}
approve();
