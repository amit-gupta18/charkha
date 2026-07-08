import { InferSchemaType, Schema, model, models } from "mongoose";
import { INCOME_SOURCES } from "../utils/categories";

const incomeSchema = new Schema(
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
    amount: {
      type: Number,
      required: true,
    },
    source: {
      type: String,
      required: true,
      enum: INCOME_SOURCES,
    },
    notes: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  },
);

export type IncomeDocument = InferSchemaType<typeof incomeSchema> & {
  _id: string;
};

export const Income = models.Income || model("Income", incomeSchema);

export function serializeIncome(doc: IncomeDocument) {
  return {
    id: String(doc._id),
    userId: String(doc.userId),
    date: doc.date,
    amount: doc.amount,
    source: doc.source,
    notes: doc.notes,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}
