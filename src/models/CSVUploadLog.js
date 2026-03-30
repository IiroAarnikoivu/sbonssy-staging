import mongoose from "mongoose";

const csvUploadLogSchema = new mongoose.Schema(
  {
    fileName: {
      type: String,
      required: true,
    },
    fileSize: {
      type: Number,
      required: true,
    },
    uploadedBy: {
      type: String, // Admin user ID or email
      required: true,
    },
    uploadStatus: {
      type: String,
      enum: ["completed", "partial", "failed"],
      required: true,
    },
    totalRecords: {
      type: Number,
      required: true,
    },
    successfulRecords: {
      type: Number,
      required: true,
    },
    failedRecords: {
      type: Number,
      required: true,
    },
    errorDetails: [
      {
        row: Number,
        email: String,
        error: String,
        errorType: {
          type: String,
          enum: ["validation", "supabase", "mongodb", "duplicate", "unexpected"],
        },
        timestamp: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    createdUsers: [
      {
        email: String,
        role: String,
        supabaseId: String,
        mongoId: String,
        timestamp: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    processingTime: {
      type: Number, // in milliseconds
    },
    csvHeaders: [String],
    sampleData: mongoose.Schema.Types.Mixed, // First few rows for reference
  },
  {
    timestamps: true,
  }
);

// Index for efficient queries
csvUploadLogSchema.index({ uploadedBy: 1, createdAt: -1 });
csvUploadLogSchema.index({ uploadStatus: 1 });
csvUploadLogSchema.index({ fileName: 1 });

const CSVUploadLog = mongoose.models.CSVUploadLog || mongoose.model("CSVUploadLog", csvUploadLogSchema);

export default CSVUploadLog;
