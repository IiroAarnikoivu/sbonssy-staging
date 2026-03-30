import mongoose from "mongoose";

const localizedNameSchema = new mongoose.Schema(
  {
    en: {
      type: String,
      required: [true, "English tag name is required"],
      trim: true,
      minlength: [2, "Tag name must be at least 5 characters"],
      maxlength: [50, "Tag name cannot exceed 100 characters"],
    },
    fi: {
      type: String,
      required: [true, "Finnish tag name is required"],
      trim: true,
      minlength: [2, "Title must be at least 5 characters"],
      maxlength: [50, "Question cannot exceed 100 characters"],
    },
  },
  { _id: false }
);

const tagSchema = new mongoose.Schema(
  {
    name: {
      type: localizedNameSchema,
      required: true,
      unique: true,
    },
  },
  { timestamps: true }
);

export default mongoose.models.Tag || mongoose.model("Tag", tagSchema);
