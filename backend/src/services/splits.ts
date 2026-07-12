import { Types, HydratedDocument } from "mongoose";
import { Expense, ExpenseDocument } from "../models/Expense";
import { Flatmate } from "../models/Flatmate";
import { SplitMember, serializeSplitMember } from "../models/SplitMember";
import { SplitSettlement, serializeSplitSettlement } from "../models/SplitSettlement";

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Equal shares for flatmates; divisor includes the user (+1). */
export function computeEqualShares(total: number, flatmateCount: number): number[] {
  if (flatmateCount <= 0) return [];
  const perPerson = round2(total / (flatmateCount + 1));
  const shares = Array(flatmateCount).fill(perPerson) as number[];
  const flatmateSum = round2(shares.reduce((s, v) => s + v, 0));
  const remainder = round2(total - perPerson - flatmateSum);
  if (remainder !== 0 && shares.length > 0) {
    shares[shares.length - 1] = round2(shares[shares.length - 1] + remainder);
  }
  return shares;
}

export function matchFlatmateNames(
  names: string[],
  flatmates: { id: string; name: string }[],
): { matched: { id: string; name: string }[]; unmatched: string[] } {
  const matched: { id: string; name: string }[] = [];
  const unmatched: string[] = [];
  const used = new Set<string>();

  for (const raw of names) {
    const needle = raw.trim().toLowerCase();
    if (!needle) continue;
    const hit = flatmates.find(
      (f) => !used.has(f.id) && f.name.toLowerCase() === needle,
    ) ?? flatmates.find(
      (f) => !used.has(f.id) && f.name.toLowerCase().startsWith(needle),
    ) ?? flatmates.find(
      (f) => !used.has(f.id) && f.name.toLowerCase().includes(needle),
    );
    if (hit) {
      matched.push(hit);
      used.add(hit.id);
    } else {
      unmatched.push(raw.trim());
    }
  }

  return { matched, unmatched };
}

export async function createSplitMembers(
  userId: string,
  expense: HydratedDocument<ExpenseDocument>,
  flatmateIds: string[],
  shares?: number[],
): Promise<ReturnType<typeof serializeSplitMember>[]> {
  const total = expense.amount;
  const ids = flatmateIds.map((id) => new Types.ObjectId(id));

  const flatmates = await Flatmate.find({ userId, _id: { $in: ids } }).lean();
  if (flatmates.length !== ids.length) {
    throw new Error("One or more flatmates not found.");
  }

  let memberShares = shares?.map(round2);
  if (!memberShares || memberShares.length !== ids.length) {
    memberShares = computeEqualShares(total, ids.length);
  }

  const flatmateSum = round2(memberShares.reduce((s, v) => s + v, 0));
  if (flatmateSum <= 0 || flatmateSum > total) {
    throw new Error("Invalid split shares.");
  }

  const userShare = round2(total - flatmateSum);
  if (userShare < 0) {
    throw new Error("Flatmate shares exceed total amount.");
  }

  expense.isSplit = true;
  expense.userShare = userShare;
  await expense.save();

  const created = await SplitMember.insertMany(
    ids.map((flatmateId, i) => ({
      userId,
      expenseId: expense._id,
      flatmateId,
      amountOwed: memberShares![i],
      amountSettled: 0,
      status: "pending",
    })),
  );

  return created.map((m) => serializeSplitMember(m as any));
}

export async function getFlatmatePendingTotal(userId: string, flatmateId: string): Promise<number> {
  const result = await SplitMember.aggregate([
    {
      $match: {
        userId: new Types.ObjectId(userId),
        flatmateId: new Types.ObjectId(flatmateId),
        status: "pending",
      },
    },
    {
      $project: {
        pending: { $subtract: ["$amountOwed", "$amountSettled"] },
      },
    },
    { $group: { _id: null, total: { $sum: "$pending" } } },
  ]);
  return round2(result[0]?.total ?? 0);
}

export async function applySettlement(
  userId: string,
  flatmateId: string,
  amount: number,
  reason: string,
  date: Date,
) {
  if (amount <= 0) throw new Error("Amount must be positive.");

  const pendingTotal = await getFlatmatePendingTotal(userId, flatmateId);
  if (amount > pendingTotal + 0.001) {
    throw new Error(`Cannot clear more than pending (₹${pendingTotal}).`);
  }

  const members = await SplitMember.find({
    userId,
    flatmateId,
    status: "pending",
  })
    .sort({ createdAt: 1 })
    .exec();

  let remaining = round2(amount);
  const allocations: { splitMemberId: Types.ObjectId; amountApplied: number }[] = [];

  for (const member of members) {
    if (remaining <= 0) break;
    const memberPending = round2(member.amountOwed - member.amountSettled);
    if (memberPending <= 0) continue;

    const applied = round2(Math.min(remaining, memberPending));
    member.amountSettled = round2(member.amountSettled + applied);
    if (member.amountSettled >= member.amountOwed - 0.001) {
      member.amountSettled = member.amountOwed;
      member.status = "settled";
    }
    await member.save();

    allocations.push({ splitMemberId: member._id as Types.ObjectId, amountApplied: applied });
    remaining = round2(remaining - applied);
  }

  const settlement = await SplitSettlement.create({
    userId,
    flatmateId,
    amount,
    reason,
    date,
    allocations,
  });

  return serializeSplitSettlement(settlement);
}

export async function reverseSettlement(userId: string, settlementId: string) {
  const settlement = await SplitSettlement.findOne({ _id: settlementId, userId });
  if (!settlement) throw new Error("Settlement not found.");

  for (const alloc of settlement.allocations) {
    const member = await SplitMember.findOne({ _id: alloc.splitMemberId, userId });
    if (!member) continue;
    member.amountSettled = round2(Math.max(0, member.amountSettled - alloc.amountApplied));
    member.status = member.amountSettled >= member.amountOwed - 0.001 ? "settled" : "pending";
    await member.save();
  }

  await settlement.deleteOne();
  return { success: true };
}

export async function settleMemberRemaining(userId: string, memberId: string) {
  const member = await SplitMember.findOne({ _id: memberId, userId });
  if (!member) throw new Error("Split member not found.");

  const pending = round2(member.amountOwed - member.amountSettled);
  if (pending <= 0) {
    return serializeSplitMember(member as any);
  }

  return applySettlement(
    userId,
    String(member.flatmateId),
    pending,
    "Full settle",
    new Date(),
  );
}

export async function deleteSplitMembersForExpense(userId: string, expenseId: string) {
  const members = await SplitMember.find({ userId, expenseId });
  for (const m of members) {
    if (m.amountSettled > 0) {
      throw new Error("Cannot delete expense with settled split amounts. Reverse settlements first.");
    }
  }
  await SplitMember.deleteMany({ userId, expenseId });
}

export async function expenseHasSettlements(userId: string, expenseId: string): Promise<boolean> {
  const count = await SplitMember.countDocuments({
    userId,
    expenseId,
    amountSettled: { $gt: 0 },
  });
  return count > 0;
}
