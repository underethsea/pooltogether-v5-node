const GetChainName = (chain) => {
  if(chain === 11155111){return "SEPOLIA"}
  else if(chain === 10){return "OPTIMISM"}
  else if(chain === 420){return "OPGOERLI"}
  
}


const ADDRESS_AUCTION = {
  MAINNET: {
    RNGAUCTION: "0x539A76507F18505cA696d618F8A684814c867F41",
    RNGAUCTIONRELAY: "0xEC9460c59cCA1299b0242D6AF426c21223ccCD24",
    CHAINLINKDIRECTAUCTIONHELPER: "0x453f8714935F564DE2E8aF3C00D52447A58b2c14",
    CHAINLINKDIRECT: "0xE3DF5b001575a4ce800f6f3770B7f22cBe95d8F9",
    LINK: "0x514910771AF9Ca656af840dff83E8264EcF986CA",
    MESSAGEDISPATCHER: "0x2A34E6cae749876FB8952aD7d2fA486b00F0683F",
  },
};

const ADDRESS = {
      OPTIMISM: {
        TWABSUBGRAPH: "https://api.studio.thegraph.com/query/50959/pt-v5-op/version/latest",
        PRIZEPOOLSUBGRAPH: "https://api.studio.thegraph.com/query/41211/pt-v5-optimism-prize-pool/v0.0.1",
        LIQUIDATIONROUTER: "0xB9Fba7B2216167DCdd1A7AE0a564dD43E1b68b95",
        SWAPPER: "0x649f2Ff8867BD8f9300615c1963118B9ceeB515d",
        PRIZESANTA: "0x86047ddd91a2ef0ae75329c7941796d618e24894",
        VAULTFACTORY: "0xF65FA202907D6046D1eF33C521889B54BdE08081",
        LIQUIDATIONPAIRFACTORY: "0x555BD8Fc65E57139C9F405980C7A9526A7De8093",
        CLAIMSERVICEFACTORY: "0x37c4a40f4abfa199ef8cb8e06e3df0a6f8552a7f",      
        WINBOOST: "0x85Ae031a2D74e3d87Aa416D7E542d87D78ed8FA3",
	WINBOOSTER: "0x53644cC2C78CD821b7507d6e1882e996dEB6B671",
        TOKENFAUCET: "",
        //    POOLTOKEN: "",
        POOL: "0x395Ae52bB17aef68C2888d941736A71dC6d4e125",
        TWABCONTROLLER: "0x499a9F249ec4c8Ea190bebbFD96f9A83bf4F6E52",
         RNGRELAYAUCTION: "0x87d3D9afeD1702728B7F280ba5c4b4c55DEfa557",
	REMOTEOWNER: "0x503de67553edce0af5f02ABDD980b0Fe7Cc3BF65",      
  WETH: "0x4200000000000000000000000000000000000006",
        PRIZETOKEN: {
          ADDRESS: "0x395Ae52bB17aef68C2888d941736A71dC6d4e125",
          SYMBOL: "POOL",
          NAME: "POOL",
          DECIMALS: 18,
          GECKO: "pooltogether",
        },
        CLAIMER: "0xdc6aB38f9590cB8e4357e0a391689a7C5Ef7681E",
        PRIZEPOOL: "0xe32e5E1c5f0c80bD26Def2d0EA5008C107000d6A",
        VAULTS:[
          {
            VAULT: '0xE3B3a464ee575E8E25D2508918383b89c832f275',
            LIQUIDATIONPAIR: '0xe7680701a2794E6E0a38aC72630c535B9720dA5b',
            SYMBOL: 'pUSDC.e',
            NAME: 'Prize USDC.e - Aave',
            DECIMALS: 6,
            ASSET: '0x7F5c764cBc14f9669B88837ca1490cCa17c31607',
            ASSETSYMBOL: "USDC",
        GECKO: "usd-coin",
        ICON: "https://assets.coingecko.com/coins/images/6319/small/USD_Coin_icon.png?1547042389",
          },
          {
            VAULT: '0x29Cb69D4780B53c1e5CD4D2B817142D2e9890715',
            LIQUIDATIONPAIR: '0xde5deFa124faAA6d85E98E56b36616d249e543Ca',
            SYMBOL: 'pWETH',
            NAME: 'Prize WETH - Aave',
            DECIMALS: 18,
            ASSET: '0x4200000000000000000000000000000000000006',
            ASSETSYMBOL: "WETH",
        GECKO: "weth",
        ICON: "https://uploads-ssl.webflow.com/631993187031511c025c721d/633c1ccea93ff4709ab091c2_633be870ec7f86530e8e5419_WETH.png",
     
          },
          {
            VAULT: "0xce8293f586091d48a0ce761bbf85d5bcaa1b8d2b",
            LIQUIDATIONPAIR: "0x7169526dabfd1cdde174a0a7d8c75deb582d0990",
            SYMBOL: "pDAI",
            NAME: "Prize DAI - Aave",
            DECIMALS: 18,
            ASSET: "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1",
            ASSETSYMBOL: "DAI",
            GECKO: "dai",
            ICON: "https://assets.coingecko.com/coins/images/9956/standard/Badge_Dai.png?1696509996",
          },

          {
            VAULT: "0x77935F2c72b5eB814753a05921aE495aa283906B",
            LIQUIDATIONPAIR: "0x217ef9C355f7eb59C789e0471dc1f4398e004EDc",
            SYMBOL: 'pUSDC',
            NAME: 'Prize USDC - Aave',
            DECIMALS: 6,
            ASSET: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
            ASSETSYMBOL: "USDC",
        GECKO: "usd-coin",
        ICON: "https://assets.coingecko.com/coins/images/6319/small/USD_Coin_icon.png?1547042389"},
{
            VAULT: "0xf0b19f02c63d51b69563a2b675e0160e1c34397c",
            LIQUIDATIONPAIR: "0x22C33b869Afda26514B8d18132e1548Da200a592",
            SYMBOL: 'pWETHv2',
            NAME: 'Prize WETHv2 - Aave',
            DECIMALS: 18,
            ASSET: '0x4200000000000000000000000000000000000006',
            ASSETSYMBOL: "WETH",
        GECKO: "weth",
        ICON: "https://uploads-ssl.webflow.com/631993187031511c025c721d/633c1ccea93ff4709ab091c2_633be870ec7f86530e8e5419_WETH.png"}
],

        
        BOOSTS: [
          {
            VAULT: "",
            LIQUIDATIONPAIR: "0x4a367a4910Bb6759aA618464713C46Ee3D24835b",
            DECIMALS: 18,
            SYMBOL: "POOL",
            NAME: "POOL boosting USDC",

            ASSET: "0x395Ae52bB17aef68C2888d941736A71dC6d4e125",
            ASSETSYMBOL: "POOL",
            GECKO: "pooltogether",
            ICON: "https://assets.coingecko.com/coins/images/6319/small/USD_Coin_icon.png?1547042389",
          },
          {
            VAULT: "",
            LIQUIDATIONPAIR: "0x7D0f99bB82EC093306C86b7E596F313e39Ca7cfF",
            DECIMALS: 18,
            SYMBOL: "POOL",
            NAME: "POOL Boosting WETH",
            ASSET: "0x395Ae52bB17aef68C2888d941736A71dC6d4e125",
            ASSETSYMBOL: "POOL",
            GECKO: "pooltogether",
            ICON: "https://assets.coingecko.com/coins/images/6319/small/USD_Coin_icon.png?1547042389",
          },

        ],
      },
  OPGOERLI: {
    //TWABSUBGRAPH: "https://api.studio.thegraph.com/query/50959/pt-v5-op-goerli-twab-control/v0.0.1",
    // PRIZEPOOLSUBGRAPH:
    //   "https://api.studio.thegraph.com/query/50959/pt-v5-op-goerli-prize-pool/v0.0.1",
    LIQUIDATIONROUTER: "0x31dCb9Ff8AfA40e1F8683eDBD31184aaAA97a835",
    // VAULTFACTORY: "0x7A8f1413B44F7346EAb36c4793Bd54148Ca916A5",
    // LIQUIDATIONPAIRFACTORY: "0x4a798649F6AA23D6a3a1cab65fc0a8fa772E0a40",
    TOKENFAUCET: "0x4dFbf2A0D807c3282FD27b798e9c1C47E101AFD4",
    //    POOLTOKEN: "0x722701e470b556571A7a3586ADaFa2E866CFD1A1",
    POOL: "0x722701e470b556571A7a3586ADaFa2E866CFD1A1",
    TWABCONTROLLER: "0xE7dc3F91D2682a99e40c98aC5a8791461418234F",
    RNGRELAYAUCTION: "0x7C77fE5a4261fe27e9219410c65f9d42747e5F69",

    PRIZETOKEN: {
      ADDRESS: "0x722701e470b556571A7a3586ADaFa2E866CFD1A1",
      NAME: "POOL",
      DECIMALS: 18,
      GECKO: "pooltogether",
    },
    CLAIMER: "0x1a339190FCf8E7715d80FfDb32c97B9d065032b6",
    PRIZEPOOL: "0xb91194FB89561c2Bd7fC26bE68e5EAe5b00f5320",

    VAULTS: [
      {
        VAULT: "0x21925199568C8bd5623622FF31d719749f920A8D",
        LIQUIDATIONPAIR: "0xca07B265354ee6742984dbCF33bc18005982102F",
        SYMBOL: "PDAI-LY-T",
        NAME: "Prize DAI Low Yield",
        DECIMALS: 18,
        ASSET: "0x2b311E07bCE542A73bB4887D0f503f0b6ea70711",
        ASSETSYMBOL: "DAI",
        GECKO: "dai",
        ICON: "https://assets.coingecko.com/coins/images/9956/standard/Badge_Dai.png?1696509996",
      },
      {
        VAULT: "0x32C45E4596931eC5900eA4D2703E7CF961Ce2ad6",
        LIQUIDATIONPAIR: "0x27736339D75A0344912c39ce926694a70591e879",
        SYMBOL: "PDAI-HY-T",
        NAME: "Prize DAI High Yield",
        DECIMALS: 18,
        ASSET: "0x2b311E07bCE542A73bB4887D0f503f0b6ea70711",
        ASSETSYMBOL: "DAI",
        GECKO: "dai",
        ICON: "https://assets.coingecko.com/coins/images/9956/standard/Badge_Dai.png?1696509996",
      },
      {
        VAULT: "0x61682FBA8394970CE014bcDE8ae0eC149c29757c",
        LIQUIDATIONPAIR: "0x708aaE53B8D0D368087CDFBf42b575E0CAD93975",
        SYMBOL: "PUSDC-LY-T",
        NAME: "Prize USDC Low Yield",
        DECIMALS: 6,
        ASSET: "0x880027cc134A07Ddc9E5c7e7659A11ecfD828705",
        ASSETSYMBOL: "USDC",
        GECKO: "usd-coin",
        ICON: "https://assets.coingecko.com/coins/images/6319/small/USD_Coin_icon.png?1547042389",
      },
      {
        VAULT: "0x171df7a2D8547322de5BA27FD9856B04620A3562",
        LIQUIDATIONPAIR: "0xfFC3dc7C5547FC1385eAB2C36e5b6e3180Fa77aE",
        SYMBOL: "PUSDC-HY-T",
        NAME: "Prize USDC High Yield",
        DECIMALS: 6,
        ASSET: "0x880027cc134A07Ddc9E5c7e7659A11ecfD828705",
        ASSETSYMBOL: "USDC",
        GECKO: "usd-coin",
        ICON: "https://assets.coingecko.com/coins/images/6319/small/USD_Coin_icon.png?1547042389",
      },
      {
        VAULT: "0x0B87bF0822AFAecDEb367cfAaCcf40c0e895F3AD",
        LIQUIDATIONPAIR: "0x241911a08F36bA3370DE45079DC6d77768695D43",
        SYMBOL: "PGUSD-T",
        NAME: "Prize GUSD",
        DECIMALS: 2,
        ASSET: "0x206acF3BBEC50972880e665EE7D03342A2fF9F5d",
        ASSETSYMBOL: "GUSD",
        GECKO: "gemini-dollar",
        ICON: "https://assets.coingecko.com/coins/images/5992/standard/gemini-dollar-gusd.png?1696506408",
      },
      {
        VAULT: "0x7Ea2e76587962c526B60492bd8342AAe859f1219",
        LIQUIDATIONPAIR: "0x731aA90d8281EbC205448338224aF3f3dea3AD70",
        SYMBOL: "PWBTC-T",
        NAME: "Prize WBTC",
        DECIMALS: 8,
        ASSET: "0x8778DA5Ed4B586960094d43c5a3a52da3a4aE613",
        ASSETSYMBOL: "WBTC",
        GECKO: "wrapped-bitcoin",
        ICON: "https://assets.coingecko.com/coins/images/7598/standard/wrapped_bitcoin_wbtc.png?1696507857",
      },
      {
        VAULT: "0x7da2c9C9F3147275837Be99029A2437f8d7b54D6",
        LIQUIDATIONPAIR: "0x428b3d2a3CCd3E97DEE5E667c3BE914c19ee174e",
        SYMBOL: "PWETH-T",
        NAME: "Prize WETH",
        DECIMALS: 18,
        ASSET: "0xE62aC4184f04f0BA3C99DD2fe931cDc4D0489ac9",
        ASSETSYMBOL: "WETH",
        GECKO: "weth",
        ICON: "https://uploads-ssl.webflow.com/631993187031511c025c721d/633c1ccea93ff4709ab091c2_633be870ec7f86530e8e5419_WETH.png",
      },
    ],
    BOOSTERS: [],
  },
};

  module.exports = { ADDRESS, ADDRESS_AUCTION, GetChainName };
