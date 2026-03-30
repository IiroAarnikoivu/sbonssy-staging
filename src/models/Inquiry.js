import mongoose from "mongoose";

const inquirySchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: true,
    },
    lastName: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
    },
    phone: {
      type: String,
    },

    role: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    agree: {
      type: Boolean,
      required: true,
    },
  },
  { timestamps: true }
);

export default mongoose.models.Inquiry ||
  mongoose.model("Inquiry", inquirySchema);
