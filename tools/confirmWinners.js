const {CONTRACTS} = require("../constants/contracts")
const {CONFIG} = require("../constants/config")

async function confirmWinner(vault, winners, tier, indicesArray) {
    for (let i = 0; i < winners.length; i++) {
        let pooler = winners[i];
        let indices = indicesArray[i];

        for (let index of indices) {
            await checkWinnerForIndex(vault, pooler, tier, index);
        }
    }
}

async function checkWinnerForIndex(vault, pooler, tier, index) {
    console.log("Checking for pooler:", pooler, "index:", index);

    const didWin = await CONTRACTS.PRIZEPOOL[CONFIG.CHAINNAME].isWinner(vault, pooler, tier, index);
    console.log( didWin, "vault", vault, "add:", pooler, "tier", tier, "index", index);

}

/*
//{"v":"0x31515cfc4550d9c83e2d86e8a352886d1364e2d9","p":"0xde107b82e3e47ed281d276644b8115548c085c24","t":4,"i":[10,83,127],"c":[]},
const vault= '0x31515cfc4550d9c83e2d86e8a352886d1364e2d9'
const tier = 4
const winners = [
'0xde107b82e3e47ed281d276644b8115548c085c24']
const prizeIndicesBeingClaimed =  [ [ 10, 83, 127 ]]

*/
const vault = "0x29cb69d4780b53c1e5cd4d2b817142d2e9890715"
const tier =  4
const winners=  [
  '0xa184aa8488908b43ccf43b5ef13ae528693dfd00',
  '0x174cab72ff9bf6ba3733ebc819fadb4df2903235',
  '0xe48dd2a322a7ebfdaa9680fd2e8cec27cbb7a765',
  '0x4a3e6e66f8c32bc05a50879f872b1177a1573cdf',
  '0xf5375b04d32b553a8813de3ce76ea625803c60f7',
  '0xa0a4337ceb8017091bbfdef31e12984bb1678187',
  '0x6f0244f4647bbac130a2aad00c776eae7fbbb4ac',
  '0xbe4feae32210f682a41e1c41e3eaf4f8204cd29e',
  '0x9f36a6bb398118bdcd5b1bc3343d8feb6d7d02b9'
]
const prizeIndicesBeingClaimed = [
  [ 170 ],
  [ 66 ],
  [ 193, 223 ],
  [ 45 ],
  [ 224 ],
  [
      3,  16,  56,  71,  72,
    105, 120, 144, 177, 208,
    224, 242
  ],
  [ 236 ],
  [ 26, 57, 205 ],
  [ 130 ]
]




confirmWinner(vault, winners, tier, prizeIndicesBeingClaimed);
