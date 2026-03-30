import mongoose from "mongoose";
// Localized string schemas for bilingual content (English and Finnish)
const localizedTitleSchema = new mongoose.Schema(
  {
    en: {
      type: String,
      required: [true, "English title is required"],
      trim: true,
      minlength: [5, "Title must be at least 5 characters"],
      maxlength: [100, "Question cannot exceed 100 characters"],
    },
    fi: {
      type: String,
      required: [true, "Finnish title is required"],
      trim: true,
      minlength: [5, "Title must be at least 5 characters"],
      maxlength: [100, "Question cannot exceed 100 characters"],
    },
  },
  { _id: false }
);

const localizedDescriptionSchema = new mongoose.Schema(
  {
    en: {
      type: String,

      trim: true,

      maxlength: [500, "Description cannot exceed 500 characters"],
    },
    fi: {
      type: String,

      trim: true,

      maxlength: [500, "Description cannot exceed 500 characters"],
    },
  },
  { _id: false }
);

const localizedLabelSchema = new mongoose.Schema(
  {
    en: {
      type: String,

      trim: true,
    },
    fi: {
      type: String,

      trim: true,
    },
  },
  { _id: false }
);

const ctaSchema = new mongoose.Schema(
  {
    label: { type: localizedLabelSchema, required: false },
    path: {
      type: String,
      default: "",
      trim: true,
    },
  },
  { _id: false }
);
const bannerSchema = new mongoose.Schema(
  {
    title: { type: localizedTitleSchema, required: true },
    description: { type: localizedDescriptionSchema, required: true },
    image: { type: String, required: true },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Author is required"],
    },
    ctaOne: { type: ctaSchema },
    ctaTwo: { type: ctaSchema },
  },
  { timestamps: true }
);

// Helper to return locale-resolved fields based on provided locale from frontend
bannerSchema.methods.toLocaleObject = function (locale = "en") {
  const safeLocale = ["en", "fi"].includes(locale) ? locale : "en";
  const pick = (loc) => (loc && (loc[safeLocale] || loc.en || loc.fi)) || "";
  const mapCta = (cta) =>
    cta
      ? {
          label: pick(cta.label),
          path: cta.path || "",
        }
      : undefined;

  return {
    _id: this._id,
    title: pick(this.title),
    description: pick(this.description),
    image: this.image,
    author: this.author,
    ctaOne: mapCta(this.ctaOne),
    ctaTwo: mapCta(this.ctaTwo),
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

export default mongoose.models.Banner || mongoose.model("Banner", bannerSchema);
