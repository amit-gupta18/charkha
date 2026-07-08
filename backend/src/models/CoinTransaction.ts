import { InferSchemaType, Schema, model, models } from "mongoose";

const coinTransactionSchema = new Schema(
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
    reason: {
      type: String,
      required: true,
    },
    referenceId: {
      type: String,
      default: "",
    },
    referenceType: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  },
);

export type CoinTransactionDocument = InferSchemaType<typeof coinTransactionSchema> & {
  _id: string;
};

export const CoinTransaction = models.CoinTransaction || model("CoinTransaction", coinTransactionSchema);

export function serializeCoinTransaction(doc: CoinTransactionDocument) {
  return {
    id: String(doc._id),
    userId: String(doc.userId),
    date: doc.date,
    amount: doc.amount,
    reason: doc.reason,
    referenceId: doc.referenceId,
    referenceType: doc.referenceType,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}
