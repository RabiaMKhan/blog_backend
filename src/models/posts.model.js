import mongoose, { Schema } from "mongoose";

const postSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },
    slug: {
      type: String, // url-friendly version of the title, e.g. "my-first-post"
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    content: {
      type: String,
      required: true,
    },
    excerpt: {
      type: String, // short summary shown on the post list
      trim: true,
      maxlength: 300,
    },
    coverImg: {
      type: Schema.Types.Mixed,
    },
    author: {
      type: Schema.Types.ObjectId,
      ref: "UserModel",
      required: true,
      index: true,
    },
    tags: [
      {
        type: String,
        lowercase: true,
        trim: true,
      },
    ],
    status: {
      type: String,
      enum: ["draft", "published"],
      default: "draft",
    },
    publishedAt: {
      type: Date,
    },
    // kept in step with the likes collection, so lists can show counts without counting
    likesCount: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
    collection: "posts",
  },
);

// the public feed lists published posts, newest first
postSchema.index({ status: 1, publishedAt: -1 });
postSchema.index({ tags: 1 });

// stamp the date the first time a post goes live, and keep it if it's edited later
postSchema.pre("save", function () {
  if (this.status === "published" && !this.publishedAt) {
    this.publishedAt = new Date();
  }
});

const PostModel =
  mongoose.models.PostModel || mongoose.model("PostModel", postSchema);

export default PostModel;
