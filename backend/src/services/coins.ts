import { CoinTransaction } from "../models/CoinTransaction";
import { Settings } from "../models/Settings";
import { Expense } from "../models/Expense";
import { spendAmountExpression } from "../utils/spend";
import { ExpenseDocument, serializeExpense } from "../models/Expense";

export async function applyCoinRulesForExpense(userId: string, expense: ExpenseDocument) {
  const serialized = serializeExpense(expense);

  if (serialized.type === "Want") {
    const spendAmount = serialized.userShare ?? serialized.amount;
    const amount = -Math.max(1, Math.round(spendAmount / 100));

    await CoinTransaction.create({
      userId,
      date: new Date(),
      amount,
      reason: "Want expense",
      referenceId: serialized.id,
      referenceType: "expense",
    });
  }
}

export async function awardKnowledgeCoins(userId: string, noteId: string) {
  await CoinTransaction.create({
    userId,
    date: new Date(),
    amount: 10,
    reason: "Knowledge note logged",
    referenceId: noteId,
    referenceType: "knowledge",
  });
}

export async function ensureWeeklyUnderBudgetBonus(userId: string, weekStartISO: string) {
  const settings = await Settings.findOne({ userId });
  const weeklyLimit = settings?.weeklyLimit ?? 2500;

  const start = new Date(weekStartISO);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);

  const weekKey = `week:${userId}:${weekStartISO}`;

  const existing = await CoinTransaction.findOne({
    userId,
    reason: "Under budget week",
    referenceId: weekKey,
  });

  if (existing) {
    return;
  }

  const result = await Expense.aggregate([
    {
      $match: {
        userId,
        date: { $gte: start, $lt: end },
      },
    },
    {
      $group: {
        _id: null,
        total: { $sum: spendAmountExpression() },
      },
    },
  ]);

  const weeklySpend = result[0]?.total ?? 0;

  if (weeklySpend <= weeklyLimit) {
    await CoinTransaction.create({
      userId,
      date: new Date(),
      amount: 50,
      reason: "Under budget week",
      referenceId: weekKey,
      referenceType: "week",
    });
  }
}
