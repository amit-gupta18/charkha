import { Router } from "express";
import { Types } from "mongoose";
import { KnowledgeNote, serializeKnowledgeNote } from "../models/KnowledgeNote";
import { awardKnowledgeCoins } from "../services/coins";
import {
  KNOWLEDGE_SOURCE_TYPES,
  KNOWLEDGE_TOPICS,
  oneOf,
} from "../utils/categories";
import { isNonEmptyString } from "../utils/validators";

const router = Router();

router.get("/", async (request, response, next) => {
  try {
    const userId = request.user!.userId;
    const { topic, search } = request.query;

    const filter: Record<string, unknown> = { userId };

    if (typeof topic === "string" && topic) filter.topic = topic;

    if (typeof search === "string" && search) {
      filter.$or = [
        { title: { $regex: search, $options: "i" } },
        { note: { $regex: search, $options: "i" } },
      ];
    }

    const notes = await KnowledgeNote.find(filter).sort({ createdAt: -1 }).lean();
    response.json({ notes: notes.map((n) => serializeKnowledgeNote(n as any)) });
  } catch (error) {
    next(error);
  }
});

router.post("/", async (request, response, next) => {
  try {
    const userId = request.user!.userId;
    const { title, sourceUrl, sourceType, topic, note } = request.body ?? {};

    if (!isNonEmptyString(title)) {
      response.status(400).json({ message: "title is required." });
      return;
    }

    if (!isNonEmptyString(sourceType) || !oneOf(sourceType, KNOWLEDGE_SOURCE_TYPES)) {
      response.status(400).json({ message: "Valid sourceType is required." });
      return;
    }

    if (!isNonEmptyString(topic) || !oneOf(topic, KNOWLEDGE_TOPICS)) {
      response.status(400).json({ message: "Valid topic is required." });
      return;
    }

    if (!isNonEmptyString(note)) {
      response.status(400).json({ message: "note is required." });
      return;
    }

    const created = await KnowledgeNote.create({
      userId,
      title,
      sourceUrl: typeof sourceUrl === "string" ? sourceUrl : "",
      sourceType,
      topic,
      note,
    });

    await awardKnowledgeCoins(userId, created.id);

    response.status(201).json({ note: serializeKnowledgeNote(created) });
  } catch (error) {
    next(error);
  }
});

router.get("/:id", async (request, response, next) => {
  try {
    const userId = request.user!.userId;
    const { id } = request.params;

    if (!Types.ObjectId.isValid(id)) {
      response.status(400).json({ message: "Invalid id." });
      return;
    }

    const note = await KnowledgeNote.findOne({ _id: id, userId }).lean();

    if (!note) {
      response.status(404).json({ message: "Note not found." });
      return;
    }

    response.json({ note: serializeKnowledgeNote(note as any) });
  } catch (error) {
    next(error);
  }
});

router.put("/:id", async (request, response, next) => {
  try {
    const userId = request.user!.userId;
    const { id } = request.params;

    if (!Types.ObjectId.isValid(id)) {
      response.status(400).json({ message: "Invalid id." });
      return;
    }

    const note = await KnowledgeNote.findOne({ _id: id, userId });

    if (!note) {
      response.status(404).json({ message: "Note not found." });
      return;
    }

    const { title, sourceUrl, sourceType, topic, note: noteBody } = request.body ?? {};

    if (title !== undefined) {
      if (!isNonEmptyString(title)) {
        response.status(400).json({ message: "title must be a string." });
        return;
      }
      note.title = title;
    }
    if (sourceType !== undefined) {
      if (!isNonEmptyString(sourceType) || !oneOf(sourceType, KNOWLEDGE_SOURCE_TYPES)) {
        response.status(400).json({ message: "Invalid sourceType." });
        return;
      }
      note.sourceType = sourceType;
    }
    if (topic !== undefined) {
      if (!isNonEmptyString(topic) || !oneOf(topic, KNOWLEDGE_TOPICS)) {
        response.status(400).json({ message: "Invalid topic." });
        return;
      }
      note.topic = topic;
    }
    if (noteBody !== undefined) {
      if (!isNonEmptyString(noteBody)) {
        response.status(400).json({ message: "note must be a string." });
        return;
      }
      note.note = noteBody;
    }
    if (sourceUrl !== undefined) {
      note.sourceUrl = typeof sourceUrl === "string" ? sourceUrl : "";
    }

    await note.save();

    response.json({ note: serializeKnowledgeNote(note) });
  } catch (error) {
    next(error);
  }
});

router.delete("/:id", async (request, response, next) => {
  try {
    const userId = request.user!.userId;
    const { id } = request.params;

    if (!Types.ObjectId.isValid(id)) {
      response.status(400).json({ message: "Invalid id." });
      return;
    }

    const note = await KnowledgeNote.findOneAndDelete({ _id: id, userId });

    if (!note) {
      response.status(404).json({ message: "Note not found." });
      return;
    }

    response.json({ success: true });
  } catch (error) {
    next(error);
  }
});

export default router;
