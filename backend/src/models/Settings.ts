import { Schema, model, models } from "mongoose";

const settingsSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    monthlyIncome: {
      type: Number,
      default: 10000,
    },
    weeklyLimit: {
      type: Number,
      default: 2500,
    },
    needsPct: {
      type: Number,
      default: 0.5,
    },
    wantsPct: {
      type: Number,
      default: 0.3,
    },
    savingsPct: {
      type: Number,
      default: 0.2,
    },
    startingBalance: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  },
);

export const Settings = models.Settings || model("Settings", settingsSchema);
