import { InferSchemaType, Schema, model, models } from "mongoose";
import { KNOWLEDGE_SOURCE_TYPES, KNOWLEDGE_TOPICS } from "../utils/categories";

const knowledgeNoteSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
    },
    sourceUrl: {
      type: String,
      default: "",
    },
    sourceType: {
      type: String,
      required: true,
      enum: KNOWLEDGE_SOURCE_TYPES,
    },
    topic: {
      type: String,
      required: true,
      enum: KNOWLEDGE_TOPICS,
    },
    note: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

export type KnowledgeNoteDocument = InferSchemaType<typeof knowledgeNoteSchema> & {
  _id: string;
};

export const KnowledgeNote = models.KnowledgeNote || model("KnowledgeNote", knowledgeNoteSchema);

export function serializeKnowledgeNote(doc: KnowledgeNoteDocument) {
  return {
    id: String(doc._id),
    userId: String(doc.userId),
    title: doc.title,
    sourceUrl: doc.sourceUrl,
    sourceType: doc.sourceType,
    topic: doc.topic,
    note: doc.note,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}
