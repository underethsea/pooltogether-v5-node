const fs = require('fs');
const { PROVIDERS } =  require( "../constants/providers")

const { ADDRESS }= require( "../constants/address")

const { CONFIG } = require( "../constants/config")
const { CONTRACTS } = require("../constants/contracts")

async function GetClaimEvents(chain) {
    const chainName = CONFIG.CHAINNAME;
    const contracts = CONTRACTS;

    // Function to fetch logs for a given block range
    const fetchLogs = async (fromBlock, toBlock) => {
        const claimFilter = {
            address: ADDRESS[chainName].PRIZEPOOL,
            topics: [
                "0x81d4e3306aa30f56dc9c3949abd8c27539b445f9ef380425f39f3f7114888e4f",
            ],
            fromBlock,
            toBlock,
        };

        const claimLogs = await PROVIDERS[chainName].getLogs(claimFilter);
return claimLogs.map(claim => {
            const decodedLog = contracts.PRIZEPOOL[chainName].interface.parseLog(claim);
            const args = decodedLog.args;
            return {
                drawId: args.drawId,
                vault: args.vault,
                winner: args.winner,
                tier: args.tier,
                payout: args.payout,
                fee: args.fee,
                feeRecipient: args.feeRecipient,
                index: args.prizeIndex,
                txHash: claim.transactionHash,
		        blockNumber: claim.blockNumber, // Accessing the block number

            };
        });
    };

    // Dynamic block range creation
    const startBlock = 111036195;
    const blockInterval = 1000000;
    const currentBlock = await PROVIDERS[chainName].getBlockNumber();
    let blockRanges= [];
    for (let fromBlock = startBlock; fromBlock < currentBlock; fromBlock += blockInterval) {
        let toBlock = Math.min(fromBlock + blockInterval - 1, currentBlock);
        blockRanges.push([fromBlock, toBlock]);
    }

    // Create promises for each block range
    const logPromises = blockRanges.map((range) => fetchLogs(...range));

    try {
        // Resolve all promises concurrently
        const allLogs = await Promise.all(logPromises);

        // Combine and flatten logs
        return allLogs.flat();
    } catch (error) {
        console.error("Error fetching logs:", error);
        return [];
    }
}

(async () => {
    try {
        const eventsData = await GetClaimEvents(CONFIG.CHAINID);

        fs.writeFileSync('claimEvents.json', JSON.stringify(eventsData, null, 2));
        console.log('Data written to claimEvents.json');
    } catch (error) {
        console.error('Error:', error);
    }
})();

