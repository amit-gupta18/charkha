import { Router } from "express";
import { Types } from "mongoose";
import { Expense } from "../models/Expense";
import { Income } from "../models/Income";
import { Settings } from "../models/Settings";
import { CoinTransaction } from "../models/CoinTransaction";
import { serializeExpense } from "../models/Expense";
import {
  addDaysUTC,
  startOfDayFromDate,
  startOfMonthFromDate,
  startOfNextMonthFromDate,
  startOfWeekMondayFromDate,
} from "../utils/dates";

const router = Router();

router.get("/", async (request, response, next) => {
  try {
    const userId = new Types.ObjectId(request.user!.userId);
    const now = new Date();

    const monthStart = startOfMonthFromDate(now);
    const monthEnd = startOfNextMonthFromDate(now);
    const todayStart = startOfDayFromDate(now);
    const todayEnd = addDaysUTC(todayStart, 1);
    const weekStart = startOfWeekMondayFromDate(now);
    const weekEnd = addDaysUTC(weekStart, 7);

    const settings = (await Settings.findOne({ userId })) ?? null;
    const weeklyLimit = settings?.weeklyLimit ?? 2500;
    const startingBalance = settings?.startingBalance ?? 0;

    const [totalIncomeAgg, totalExpensesAgg] = await Promise.all([
      Income.aggregate([{ $match: { userId } }, { $group: { _id: null, total: { $sum: "$amount" } } }]),
      Expense.aggregate([{ $match: { userId } }, { $group: { _id: null, total: { $sum: "$amount" } } }]),
    ]);
    const totalIncome = totalIncomeAgg[0]?.total ?? 0;
    const totalExpenses = totalExpensesAgg[0]?.total ?? 0;
    const currentBalance = startingBalance + totalIncome - totalExpenses;

    const lastWeekStart = addDaysUTC(weekStart, -7);
    const { ensureWeeklyUnderBudgetBonus } = await import("../services/coins");
    await ensureWeeklyUnderBudgetBonus(String(userId), lastWeekStart.toISOString());

    const [incomeAgg, weeklyIncomeAgg, incomeBySourceAgg, weeklySpendAgg, monthlySpendAgg, todaySpendAgg, typeSplitAgg] =
      await Promise.all([
        Income.aggregate([
          { $match: { userId, date: { $gte: monthStart, $lt: monthEnd } } },
          { $group: { _id: null, total: { $sum: "$amount" } } },
        ]),
        Income.aggregate([
          { $match: { userId, date: { $gte: weekStart, $lt: weekEnd } } },
          { $group: { _id: null, total: { $sum: "$amount" } } },
        ]),
        Income.aggregate([
          { $match: { userId, date: { $gte: monthStart, $lt: monthEnd } } },
          { $group: { _id: "$source", total: { $sum: "$amount" } } },
        ]),
        Expense.aggregate([
          { $match: { userId, date: { $gte: weekStart, $lt: weekEnd } } },
          { $group: { _id: null, total: { $sum: "$amount" } } },
        ]),
        Expense.aggregate([
          { $match: { userId, date: { $gte: monthStart, $lt: monthEnd } } },
          { $group: { _id: null, total: { $sum: "$amount" } } },
        ]),
        Expense.aggregate([
          { $match: { userId, date: { $gte: todayStart, $lt: todayEnd } } },
          { $group: { _id: null, total: { $sum: "$amount" } } },
        ]),
        Expense.aggregate([
          { $match: { userId, date: { $gte: monthStart, $lt: monthEnd } } },
          { $group: { _id: "$type", total: { $sum: "$amount" } } },
        ]),
      ]);

    const monthlyIncome = incomeAgg[0]?.total ?? 0;
    const weeklyIncome = weeklyIncomeAgg[0]?.total ?? 0;
    const incomeBySource: Record<string, number> = {};
    for (const row of incomeBySourceAgg) {
      if (row._id) incomeBySource[row._id as string] = row.total;
    }

    const weeklySpend = weeklySpendAgg[0]?.total ?? 0;
    const monthlySpend = monthlySpendAgg[0]?.total ?? 0;
    const todaySpend = todaySpendAgg[0]?.total ?? 0;

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
      weeklyIncome,
      incomeBySource,
      weeklySpend,
      weeklyLimit,
      weeklyRatio,
      monthlySpend,
      todaySpend,
      typeSplit,
      recentExpenses: recentExpenses.map((e) => serializeExpense(e as any)),
      coinBalance,
      currentBalance,
      startingBalance,
      totalIncome,
      totalExpenses,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
