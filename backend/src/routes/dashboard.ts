import { Router } from "express";
import { Expense } from "../models/Expense";
import { Income } from "../models/Income";
import { Settings } from "../models/Settings";
import { CoinTransaction } from "../models/CoinTransaction";
import { serializeExpense } from "../models/Expense";

function startOfDayUTC(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function startOfWeekMondayUTC(d: Date): Date {
  const x = startOfDayUTC(d);
  const day = x.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  x.setUTCDate(x.getUTCDate() + diff);
  return x;
}

const router = Router();

router.get("/", async (request, response, next) => {
  try {
    const userId = request.user!.userId;
    const now = new Date();

    // Boundaries are UTC midnight because expense/income dates are stored as UTC midnight.
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const monthEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
    const todayStart = startOfDayUTC(now);
    const todayEnd = new Date(todayStart);
    todayEnd.setUTCDate(todayEnd.getUTCDate() + 1);

    const weekStart = startOfWeekMondayUTC(now);
    const weekEnd = new Date(weekStart);
    weekEnd.setUTCDate(weekEnd.getUTCDate() + 7);

    const settings = (await Settings.findOne({ userId })) ?? null;
    const weeklyLimit = settings?.weeklyLimit ?? 2500;

    // Evaluate last week's budget bonus
    const lastWeekStart = new Date(weekStart);
    lastWeekStart.setUTCDate(lastWeekStart.getUTCDate() - 7);
    const { ensureWeeklyUnderBudgetBonus } = await import("../services/coins");
    await ensureWeeklyUnderBudgetBonus(userId, lastWeekStart.toISOString());

    const incomeAgg = await Income.aggregate([
      { $match: { userId, date: { $gte: monthStart, $lt: monthEnd } } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    const monthlyIncome = incomeAgg[0]?.total ?? 0;

    const weeklySpendAgg = await Expense.aggregate([
      { $match: { userId, date: { $gte: weekStart, $lt: weekEnd } } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    const weeklySpend = weeklySpendAgg[0]?.total ?? 0;

    const monthlySpendAgg = await Expense.aggregate([
      { $match: { userId, date: { $gte: monthStart, $lt: monthEnd } } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    const monthlySpend = monthlySpendAgg[0]?.total ?? 0;

    const todaySpendAgg = await Expense.aggregate([
      { $match: { userId, date: { $gte: todayStart, $lt: todayEnd } } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    const todaySpend = todaySpendAgg[0]?.total ?? 0;

    const typeSplitAgg = await Expense.aggregate([
      { $match: { userId, date: { $gte: monthStart, $lt: monthEnd } } },
      { $group: { _id: "$type", total: { $sum: "$amount" } } },
    ]);
    const typeSplit = { Need: 0, Want: 0, Saving: 0 };
    for (const row of typeSplitAgg) {
      if (row._id in typeSplit) {
        typeSplit[row._id as keyof typeof typeSplit] = row.total;
      }
    }

    const recentExpenses = await Expense.find({ userId }).sort({ date: -1 }).limit(10).lean();

    const balanceAgg = await CoinTransaction.aggregate([
      { $match: { userId } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    const coinBalance = balanceAgg[0]?.total ?? 0;

    const weeklyRatio = weeklyLimit > 0 ? (weeklySpend / weeklyLimit) * 100 : 0;

    response.json({
      monthlyIncome,
      weeklySpend,
      weeklyLimit,
      weeklyRatio,
      monthlySpend,
      todaySpend,
      typeSplit,
      recentExpenses: recentExpenses.map((e) => serializeExpense(e as any)),
      coinBalance,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
