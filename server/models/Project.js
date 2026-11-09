import mongoose from "mongoose";

const projectSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 100 },
    slug: { type: String, required: true, unique: true, trim: true },
    category: { type: String, required: true, trim: true, maxlength: 60 },
    year: { type: String, required: true, trim: true, maxlength: 4 },
    description: { type: String, required: true, trim: true, maxlength: 5000 },
    coverImage: { type: String, required: true },
    gallery: { type: [String], default: [] },
    links: { type: [String], default: [] },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
  },
  { timestamps: true },
);

export default mongoose.model("Project", projectSchema);
