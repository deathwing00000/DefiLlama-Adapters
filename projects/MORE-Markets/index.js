const { getLogs } = require("../helper/cache/getLogs");
const abi = require("../helper/abis/moreMarkets.json");

module.exports = {
  methodology: `Collateral (supply minus borrows) in the balance of the MORE Markets contracts`,
};

const config = {
  flow: {
    moreMarkets: "0x94A2a9202EFf6422ab80B6338d41c89014E5DD72",
    fromBlock: 2871764,
  },
};

Object.keys(config).forEach((chain) => {
  const { moreMarkets, fromBlock, blackList = [] } = config[chain];
  module.exports[chain] = {
    tvl: async (api) => {
      const marketIds = await getMarkets(api);
      const tokens = (
        await api.multiCall({
          target: moreMarkets,
          calls: marketIds,
          abi: abi.moreMarketsFunctions.idToMarketParams,
        })
      )
        .map((i) => [i.collateralToken, i.loanToken])
        .flat();
      return api.sumTokens({
        owner: moreMarkets,
        tokens,
        blacklistedTokens: blackList,
      });
    },
    borrowed: async (api) => {
      const marketIds = await getMarkets(api);
      const marketInfo = await api.multiCall({
        target: moreMarkets,
        calls: marketIds,
        abi: abi.moreMarketsFunctions.idToMarketParams,
      });
      const marketData = await api.multiCall({
        target: moreMarkets,
        calls: marketIds,
        abi: abi.moreMarketsFunctions.market,
      });
      marketData.forEach((i, idx) => {
        api.add(marketInfo[idx].loanToken, i.totalBorrowAssets);
      });
      return api.getBalances();
    },
  };

  async function getMarkets(api) {
    const logs = await getLogs({
      api,
      target: moreMarkets,
      eventAbi:
        "event CreateMarket(bytes32 indexed id, (bool,address,address,address,address,uint256,address,uint96,uint256[]) marketParams)",
      onlyArgs: true,
      fromBlock,
      topics: [
        "0xe961a99d22c2d7925e0adaaa7b4ae02b8a178cd5efacac7f74fbcf36c49136b0",
      ],
    });
    return logs.map((i) => i.id);
  }
});
