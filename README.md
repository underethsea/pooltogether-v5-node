# v5-bot

This repo includes prize calculations and database population for a postgres DB.

Also included are bots for liquidating yield from V5 vaults, claiming prizes from the prize pool, completing the RNG and relay auctions.

Theres some other mess laying around too!

warning: These bots execute financial transactions and can result in a loss. Use at your own risk. To minimize risk you can keep a lower amount of funds on the wallet being used to send transactions. 

# Getting started

You will need
-Node JS > v18 https://nodejs.org/en/download
-Yarn https://classic.yarnpkg.com/lang/en/docs/install/
-Free Alchemy RPC key https://www.alchemy.com/

`git clone` this repo, or download

`yarn` to install dependencies

`cp .env.example .env` to copy environment variable setup

put key for ALCHEMY in .env

to create a wallet use `node tools/newWallet.js`

add wallet address and private key to .env

you will need ETH gas on your new wallet. Alchemy has free faucets for testnets

you will need the prize token (POOL) to liquidate yield. for testnets you can use the faucet and drip to your wallet specified in config.js. do so by running `node drip.js`

you will need to approve of the prize token spend by the liquidation router, this can be done by running `node tools/approveLiquidationRouter.js`

new prize network deployments/chains can be added in constants/address.js

## `node claimer.js`

- Recent claim events are checked to avoid duplicate claims
- Tier timestamps are used to fetch the Poolers for each tier using the TWAB subgraph
- The script uses multicall to check if Poolers won (or API) and if they have not already claimed
- Checks for profitability of claim
- Sends claims if conditions are met
- Logs claims which can be read back with claimerResults.js

## `node liquidator.js`

- Iterrates through the vaults on the configured chain to search for profitable swaps
- If conditions are met sends the swap
- Logs liquidations which can be read back with liquidatorResults.js (has bug)

## `node rngAuction.js`
- runs the bot to complete the RNG auction by providing LINK for a random number
- approve LINK spend with approveLinkAuction.js

## `node relayAuction.js`
- runs the bot to relay the random number across the bridge to L2

## `node listener.js`
- listens for complete draw and claim events to trigger prize calcs and update prize database with draws and claims
- requires additional setup

## winBooster
- the win booster contract is gated to the service provider, to use this you will need to deploy your own booster contract and app

## this is an evolving set of scripts. some improvements to make...

- More pricing and swap
- Decimal parsing
- Better play by play
- Relay should check that the recent relay actually worked
- General cleanup
- Organize prize DB
- Docs
