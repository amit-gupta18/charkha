import { InferSchemaType, Schema, model, models } from "mongoose";
import { CATEGORIES, PAYMENT_MODES, EXPENSE_TYPES, ExpenseType } from "../utils/categories";

const expenseSchema = new Schema(
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
    },
    category: {
      type: String,
      required: true,
      enum: CATEGORIES,
    },
    amount: {
      type: Number,
      required: true,
    },
    paymentMode: {
      type: String,
      required: true,
      enum: PAYMENT_MODES,
    },
    type: {
      type: String,
      enum: EXPENSE_TYPES,
    },
    notes: {
      type: String,
      default: "",
    },
    isSplit: {
      type: Boolean,
      default: false,
    },
    userShare: {
      type: Number,
    },
  },
  {
    timestamps: true,
  },
);

expenseSchema.pre("validate", function () {
  if (this.userShare == null || Number.isNaN(this.userShare)) {
    this.userShare = this.amount;
  }
  if (!this.isSplit) {
    this.userShare = this.amount;
  }
});

export type ExpenseDocument = InferSchemaType<typeof expenseSchema> & {
  _id: string;
};

export const Expense = models.Expense || model("Expense", expenseSchema);

export function serializeExpense(doc: ExpenseDocument) {
  return {
    id: String(doc._id),
    userId: String(doc.userId),
    date: doc.date,
    description: doc.description,
    category: doc.category,
    amount: doc.amount,
    userShare: doc.userShare ?? doc.amount,
    isSplit: Boolean(doc.isSplit),
    paymentMode: doc.paymentMode,
    type: doc.type as ExpenseType,
    notes: doc.notes,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}
