import { InferSchemaType, Schema, model, models } from "mongoose";

const flatmateSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      default: "",
      trim: true,
    },
  },
  {
    timestamps: true,
  },
);

flatmateSchema.index({ userId: 1, name: 1 }, { unique: true });

export type FlatmateDocument = InferSchemaType<typeof flatmateSchema> & {
  _id: string;
};

export const Flatmate = models.Flatmate || model("Flatmate", flatmateSchema);

export function serializeFlatmate(doc: FlatmateDocument) {
  return {
    id: String(doc._id),
    userId: String(doc.userId),
    name: doc.name,
    phone: doc.phone,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}
