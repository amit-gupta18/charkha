import { InferSchemaType, Schema, model, models } from "mongoose";

const LENDING_STATUSES = ["pending", "settled"] as const;

const lendingSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    personName: {
      type: String,
      required: true,
      trim: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    reason: {
      type: String,
      default: "",
    },
    date: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: LENDING_STATUSES,
      default: "pending",
    },
  },
  {
    timestamps: true,
  },
);

export type LendingDocument = InferSchemaType<typeof lendingSchema> & {
  _id: string;
};

export const Lending = models.Lending || model("Lending", lendingSchema);

export function serializeLending(doc: LendingDocument) {
  return {
    id: String(doc._id),
    userId: String(doc.userId),
    personName: doc.personName,
    amount: doc.amount,
    reason: doc.reason,
    date: doc.date,
    status: doc.status as (typeof LENDING_STATUSES)[number],
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}
