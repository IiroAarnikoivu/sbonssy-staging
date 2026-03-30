import mongoose from "mongoose";
const localizedTitleSchema = new mongoose.Schema(
  {
    en: {
      type: String,
      required: [true, "English title is required"],
      trim: true,
      minlength: [3, "Title must be at least 5 characters"],
      maxlength: [100, "Question cannot exceed 100 characters"],
    },
    fi: {
      type: String,
      required: [true, "Finnish title is required"],
      trim: true,
      minlength: [3, "Title must be at least 5 characters"],
      maxlength: [100, "Question cannot exceed 100 characters"],
    },
  },
  { _id: false }
);

const localizedContentSchema = new mongoose.Schema(
  {
    en: {
      type: String,
      required: [true, "English content is required"],
      trim: true,
      minlength: [10, "content must be at least 10 characters"],
    },
    fi: {
      type: String,
      required: [true, "Finnish content is required"],
      trim: true,
      minlength: [10, "Title must be at least 5 characters"],
    },
  },
  { _id: false }
);

const blogSchema = new mongoose.Schema(
  {
    title: {
      type: localizedTitleSchema,
      required: true,
    },
    content: {
      type: localizedContentSchema,
      required: true,
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Author is required"],
    },
    image: {
      url: { type: String },
      publicId: { type: String, default: "" },
    },
    tags: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Tag",
      },
    ],
    status: {
      type: String,
      enum: ["draft", "published"],
      default: "draft",
    },
  },
  { timestamps: true }
);

export default mongoose.models.Blog || mongoose.model("Blog", blogSchema);
