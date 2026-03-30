import mongoose from "mongoose";

const localizedStringSchema = new mongoose.Schema(
  {
    en: {
      type: String,
      required: [true, "English value is required"],
      trim: true,
    },
    fi: {
      type: String,
      trim: true,
    },
  },
  { _id: false }
);

const helpSchema = new mongoose.Schema(
  {
    title: localizedStringSchema,
    userType: {
      type: String,
    },
    description: localizedStringSchema,
  },
  { timestamps: true }
);
export default mongoose.models.Help || mongoose.model("Help", helpSchema);
