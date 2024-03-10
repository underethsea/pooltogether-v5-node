require("../env-setup.js")
const CONFIG = {
  // General Constants
  CHAINNAME: "OPTIMISM", // Name of the blockchain network
  CHAINID: 10, // Chain ID for Optimism
  WALLET: process.env.WALLET, // Signing wallet address
  PRIZEPOOL: "0xe32e5E1c5f0c80bD26Def2d0EA5008C107000d6A", // Address of the prize pool

  // Prize Calculator Configuration
  BATCHSIZE: 100, // Number of wins to calculate per multicall
  useCoinGecko: true, // Use CoinGecko for pricing (false uses 1inch)

  // Timing Configuration for looping claimer and liquidator apps
  // retries will be a random time between min and max
  minTimeInMilliseconds: 5 * 60 * 1000, // Minimum polling interval (5 * 60 = 5 minutes)
  maxTimeInMilliseconds: 12 * 60 * 1000, // Maximum polling interval (12 * 60 = 12 minutes)

  // Claimer Configuration
  USEAPI: true, // Use the prize API for winner calculations
  TIERSTOCLAIM: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  TXDELAY: 10000, // Delay between transactions in milliseconds
  MINPROFIT: 0.03, // Minimum acceptable profit in $ for a claim transaction
  MINPROFITPERCENTAGE: 1.001, // Minimum profit percentage for acceptance, 1.01 = 101%
  MAXWINNERS: 10, // Maximum number of winners to claim per transaction
  MAXINDICES: 15, // Maximum number of prize indices to claim per transaction
  GASCOSTFACTOR: 1.2, // Multiplier for estimated gas cost calculation
  USESANTA: false, // Use contract for claims with contract to sell claim fees back to WETH
  MINTOCLAIM: 30, // the claimer will collect rewards once the minimum is reached (10 = 10 or more prize tokens)
  LAST_IN_LINE: [ // these addresses are pushed to back of claim list (deprioritized)
  "0xb1b9dcb9f3a25e390fb37f597c2bf90b16889e41",
  "0xfbf4f89c7a9ecee48f65033097fecea257eb4049",
  "0xf9baa3cd7b8c1f205fd3a6861dca693fed683684",
  "0x71409285d5b324a082e761e54ea0aa413da51db9",
  "0xf93329e78feff1145fce03a79d5b356588dea215",
  "0x3989cbc1fb0eb278601c018ed7627b07be9de4cb",
  "0xede761955c4f11589282051a340823d613bbc654",
],
  // Liquidator Configuration
  slippage: 5, // Slippage tolerance for transactions (basis points)
  maxGas: 600000, // Estimated gas amount per transaction
  profitThreshold: 0.02, // Profit threshold in $ for considering a transaction
  profitPercentage: 1.001, // Required profit percentage over cost
  ONLYLIQUIDATE: [], // array of pairs to liquidate
  DONTLIQUIDATE: [], // array of pairs to exclude

  // WinBooster Configuration
  FEE: 4, // claimer fee (ex 5 = 5%)   
  MAX_INDICES: 22, // max indices claim in one tx
  PERCENTAGE_CLAIM_COST: 80, // 80 = 80% maximum claim cost as % of prize value
  MIN_PERCENTAGE_CLAIM_COST: 8, // 12 = 12% min "  "  
  MIN_TO_SEND_CLAIM : ".05" , // minimum balance of user needed to attempt a claim
  MAX_GAS: 32,
  MAX_CLAIM_INDICES: 22, // max indices to claim in one tx
  RETRY: 4, // minutes to retry winbooster claims
  CLAIM_WINDOW_OPEN: 0, 
  CLAIM_WINDOW_CLOSED: 24, // 14 is 2pm
  SECOND_CLAIM_WINDOW_OPEN: 22,
  SECOND_CLAIM_WINDOW_CLOSED: 24,
  BLACKLIST: [],
};

module.exports = { CONFIG };

// Additional network and wallet configurations
// MUMBAI Testnet CHAINID: 80001
// SEPOLIA Testnet CHAINID: 11155111
