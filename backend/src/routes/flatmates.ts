import { Router } from "express";
import { Types } from "mongoose";
import { Flatmate, serializeFlatmate } from "../models/Flatmate";
import { isNonEmptyString } from "../utils/validators";

const router = Router();

router.get("/", async (request, response, next) => {
  try {
    const userId = request.user!.userId;
    const flatmates = await Flatmate.find({ userId }).sort({ name: 1 }).lean();
    response.json({ flatmates: flatmates.map((f) => serializeFlatmate(f as any)) });
  } catch (error) {
    next(error);
  }
});

router.post("/", async (request, response, next) => {
  try {
    const userId = request.user!.userId;
    const { name, phone } = request.body ?? {};

    if (!isNonEmptyString(name)) {
      response.status(400).json({ message: "name is required." });
      return;
    }

    const existing = await Flatmate.findOne({
      userId,
      name: { $regex: new RegExp(`^${name.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") },
    });
    if (existing) {
      response.status(409).json({ message: "A flatmate with this name already exists." });
      return;
    }

    const flatmate = await Flatmate.create({
      userId,
      name: name.trim(),
      phone: typeof phone === "string" ? phone.trim() : "",
    });

    response.status(201).json({ flatmate: serializeFlatmate(flatmate) });
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

    const flatmate = await Flatmate.findOne({ _id: id, userId });
    if (!flatmate) {
      response.status(404).json({ message: "Flatmate not found." });
      return;
    }

    const { name, phone } = request.body ?? {};
    if (name !== undefined) {
      if (!isNonEmptyString(name)) {
        response.status(400).json({ message: "name must be a string." });
        return;
      }
      flatmate.name = name.trim();
    }
    if (phone !== undefined) {
      flatmate.phone = typeof phone === "string" ? phone.trim() : "";
    }

    await flatmate.save();
    response.json({ flatmate: serializeFlatmate(flatmate) });
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

    const flatmate = await Flatmate.findOneAndDelete({ _id: id, userId });
    if (!flatmate) {
      response.status(404).json({ message: "Flatmate not found." });
      return;
    }

    response.json({ success: true });
  } catch (error) {
    next(error);
  }
});

export default router;
