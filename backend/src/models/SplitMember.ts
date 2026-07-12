import { InferSchemaType, Schema, model, models } from "mongoose";

const SPLIT_STATUSES = ["pending", "settled"] as const;

const splitMemberSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    expenseId: {
      type: Schema.Types.ObjectId,
      ref: "Expense",
      default: null,
    },
    splitBillId: {
      type: Schema.Types.ObjectId,
      ref: "SplitBill",
      default: null,
    },
    flatmateId: {
      type: Schema.Types.ObjectId,
      ref: "Flatmate",
      required: true,
      index: true,
    },
    amountOwed: {
      type: Number,
      required: true,
    },
    amountSettled: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: SPLIT_STATUSES,
      default: "pending",
    },
    entryType: {
      type: String,
      enum: ["receivable", "payable"],
      default: "receivable",
    },
  },
  {
    timestamps: true,
  },
);

splitMemberSchema.index({ userId: 1, expenseId: 1 });
splitMemberSchema.index({ userId: 1, flatmateId: 1, status: 1 });

export type SplitMemberDocument = InferSchemaType<typeof splitMemberSchema> & {
  _id: string;
};

export const SplitMember = models.SplitMember || model("SplitMember", splitMemberSchema);

export function serializeSplitMember(doc: SplitMemberDocument) {
  const amountPending = Math.max(0, doc.amountOwed - doc.amountSettled);
  return {
    id: String(doc._id),
    userId: String(doc.userId),
    expenseId: doc.expenseId ? String(doc.expenseId) : null,
    splitBillId: doc.splitBillId ? String(doc.splitBillId) : null,
    flatmateId: String(doc.flatmateId),
    amountOwed: doc.amountOwed,
    amountSettled: doc.amountSettled,
    amountPending,
    status: doc.status as (typeof SPLIT_STATUSES)[number],
    entryType: (doc.entryType ?? "receivable") as "receivable" | "payable",
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}
