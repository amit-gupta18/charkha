import { InferSchemaType, Schema, model, models } from "mongoose";

export const SAVINGS_KINDS = ["invested", "saved"] as const;
export const SAVINGS_STATUSES = ["active", "withdrawn"] as const;

const savingSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    kind: {
      type: String,
      enum: SAVINGS_KINDS,
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    destination: {
      type: String,
      default: "",
      trim: true,
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
      enum: SAVINGS_STATUSES,
      default: "active",
    },
    withdrawnAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

export type SavingDocument = InferSchemaType<typeof savingSchema> & {
  _id: string;
};

export const Saving = models.Saving || model("Saving", savingSchema);

export function serializeSaving(doc: SavingDocument) {
  return {
    id: String(doc._id),
    userId: String(doc.userId),
    kind: doc.kind as (typeof SAVINGS_KINDS)[number],
    amount: doc.amount,
    destination: doc.destination ?? "",
    reason: doc.reason ?? "",
    date: doc.date,
    status: doc.status as (typeof SAVINGS_STATUSES)[number],
    withdrawnAt: doc.withdrawnAt ?? null,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}
