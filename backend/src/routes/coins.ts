import { Router } from "express";
import { CoinTransaction, serializeCoinTransaction } from "../models/CoinTransaction";

const router = Router();

router.get("/", async (request, response, next) => {
  try {
    const userId = request.user!.userId;

    const transactions = await CoinTransaction.find({ userId }).sort({ createdAt: -1 }).lean();
    const balanceAgg = await CoinTransaction.aggregate([
      { $match: { userId } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);

    const balance = balanceAgg[0]?.total ?? 0;

    response.json({
      balance,
      transactions: transactions.map((t) => serializeCoinTransaction(t as any)),
    });
  } catch (error) {
    next(error);
  }
});

export default router;
