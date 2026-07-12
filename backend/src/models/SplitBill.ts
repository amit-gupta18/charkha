import { InferSchemaType, Schema, model, models } from "mongoose";

const splitBillSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    date: {
      type: Date,
      required: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    totalAmount: {
      type: Number,
      required: true,
    },
    userShare: {
      type: Number,
      required: true,
    },
    /** "user" when you paid; otherwise flatmate ObjectId string who paid */
    paidBy: {
      type: String,
      required: true,
    },
    expenseId: {
      type: Schema.Types.ObjectId,
      ref: "Expense",
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

export type SplitBillDocument = InferSchemaType<typeof splitBillSchema> & {
  _id: string;
};

export const SplitBill = models.SplitBill || model("SplitBill", splitBillSchema);

export function serializeSplitBill(doc: SplitBillDocument) {
  return {
    id: String(doc._id),
    userId: String(doc.userId),
    date: doc.date,
    description: doc.description,
    totalAmount: doc.totalAmount,
    userShare: doc.userShare,
    paidBy: doc.paidBy,
    expenseId: doc.expenseId ? String(doc.expenseId) : null,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}
