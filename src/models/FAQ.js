import mongoose from "mongoose";

const faqSchema = new mongoose.Schema(
  {
    question: {
      type: String,
      required: [true, "Question is required"],
      trim: true,
      minlength: [5, "Question must be at least 5 characters"],
      maxlength: [200, "Question cannot exceed 200 characters"],
    },
    answer: {
      type: String,
      required: [true, "Answer is required"],
      trim: true,
      minlength: [10, "Answer must be at least 10 characters"],
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Author is required"],
    },
  },
  { timestamps: true }
);

export default mongoose.models.FAQ || mongoose.model("FAQ", faqSchema);
