import mongoose from "mongoose";

const tempAuthStateSchema = new mongoose.Schema({
  state: { type: String, required: true, unique: true },
  role: { type: String, required: true },
  createdAt: { type: Date, required: true, expires: "10m" }, // Expires after 10 minutes
});

export default mongoose.models.TempAuthState ||
  mongoose.model("TempAuthState", tempAuthStateSchema);
