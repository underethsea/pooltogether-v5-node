const { ethers } = require("ethers");
const { CONTRACTS } = require("../constants/contracts");
const { ADDRESS } = require("../constants/address.js");
const { CONFIG } = require("../constants/config")

const chainName = CONFIG.CHAINNAME

async function go() {
  let vaults = [];
  for (let index = 0; index < ADDRESS[chainName].VAULTS.length; index++) {
    const vault = ADDRESS[chainName].VAULTS[index];
    const name = await CONTRACTS.VAULTS[chainName][index].VAULT.name();
    const symbol = await CONTRACTS.VAULTS[chainName][index].VAULT.symbol();
    const decimals = await CONTRACTS.VAULTS[chainName][index].VAULT.decimals();
    const asset = await CONTRACTS.VAULTS[chainName][index].VAULT.asset();

    vaults.push({
      VAULT: vault.VAULT,
      LIQUIDATIONPAIR: vault.LIQUIDATIONPAIR,
      SYMBOL: symbol,
      NAME: name,
      DECIMALS: decimals,
      ASSET: asset,
    });
  }
  console.log(vaults)
}

go().catch((error) => {
  console.error(error);
});
