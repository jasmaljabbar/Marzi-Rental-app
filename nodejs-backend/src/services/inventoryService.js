const InventoryTransaction = require("../models/InventoryTransaction");
const { round2 } = require("../lib/money");

// Money spent acquiring stock (initial stock + stock-ins). Scrap and sale rows
// are movements out, not costs, so they're excluded (they used to be summed in).
async function stockCostSummary(req) {
  const [row] = await InventoryTransaction.aggregate([
    {
      $match: {
        accountId: req.tenant.accountId,
        shopId: req.tenant.shopId,
        transactionType: { $in: ["INITIAL_STOCK", "STOCK_IN"] },
      },
    },
    { $group: { _id: null, total: { $sum: "$totalCost" } } },
  ]);
  return { total_stock_cost: round2(row?.total || 0) };
}

module.exports = { stockCostSummary };
