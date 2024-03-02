const fetch = require("cross-fetch");
const {CONFIG} = require("../constants/config")

const FetchApiPrizes = async (chain, draw, tiersToClaim, claims) => {
  ///testnet-80001-draw42
//  console.log("tiers to claim",tiersToClaim)
try{
  const url = "https://poolexplorer.xyz/" + chain + "-" + CONFIG.PRIZEPOOL + "-draw" + draw;
  //console.log(url)
  const fetchPrizes = await fetch(url);
  const prizesResult = await fetchPrizes.json();
  //console.log("prizes",prizesResult)
  // Filter wins for tiers to claim
const filteredWins = prizesResult.wins.filter((win) => {
    const tierToClaim = win.t;
    if (tiersToClaim.length === 0) {
        // If tiersToClaim is empty, claim all tiers
        return true;
    } else {
        // Claim specific tiers based on tiersToClaim array
        return tiersToClaim.includes(tierToClaim);
    }
});
  // Return vault, playeraddress, tier for claim

//console.log("filtered wins",filteredWins)
  const winsToClaim = filteredWins.map((win) => [win.v, win.p, win.t, win.i]);

//   console.log("wins to claim ", filteredWins.length);
//   const filteredWinsToClaim = winsToClaim.filter((win) => {
//     const [v, p, t] = win;
//     return !claims.some(
//       (claim) =>
//         claim.drawId.toString() === draw.toString() &&
//         claim.vault.toLowerCase() === v &&
//         claim.winner.toLowerCase() === p &&
//         claim.tier === t
//     );
//   });
//   console.log("wins after filtering out claims ", filteredWinsToClaim.length);
  return winsToClaim;

  //check that its not putting wins on same vault on api that are actually diff vaults
  // need to exclude already claimed prizes
}catch(e){console.log(e);return null}
}

module.exports = { FetchApiPrizes };
//testing
//FetchApiPrizes(10,35,[])
