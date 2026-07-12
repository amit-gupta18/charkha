import { InferSchemaType, Schema, model, models } from "mongoose";

const allocationSchema = new Schema(
  {
    splitMemberId: { type: Schema.Types.ObjectId, ref: "SplitMember", required: true },
    amountApplied: { type: Number, required: true },
  },
  { _id: false },
);

const splitSettlementSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    flatmateId: {
      type: Schema.Types.ObjectId,
      ref: "Flatmate",
      required: true,
      index: true,
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
    direction: {
      type: String,
      enum: ["received", "paid"],
      default: "received",
    },
    allocations: {
      type: [allocationSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  },
);

splitSettlementSchema.index({ userId: 1, flatmateId: 1 });
splitSettlementSchema.index({ userId: 1, date: -1 });

export type SplitSettlementDocument = InferSchemaType<typeof splitSettlementSchema> & {
  _id: string;
};

export const SplitSettlement = models.SplitSettlement || model("SplitSettlement", splitSettlementSchema);

export function serializeSplitSettlement(doc: SplitSettlementDocument) {
  return {
    id: String(doc._id),
    userId: String(doc.userId),
    flatmateId: String(doc.flatmateId),
    amount: doc.amount,
    reason: doc.reason,
    date: doc.date,
    direction: (doc.direction ?? "received") as "received" | "paid",
    allocations: doc.allocations.map((a) => ({
      splitMemberId: String(a.splitMemberId),
      amountApplied: a.amountApplied,
    })),
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}
