import mongoose, { Schema } from "mongoose";

const commentSchema = new Schema(
  {
    post: {
      type: Schema.Types.ObjectId,
      ref: "PostModel",
      required: true,
    },
    author: {
      type: Schema.Types.ObjectId,
      ref: "UserModel",
      required: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
    // null for a comment on the post, or the top-level comment this is a reply to.
    // replies are one level deep - a reply to a reply goes under the same top-level comment
    parent: {
      type: Schema.Types.ObjectId,
      ref: "CommentModel",
      default: null,
    },
  },
  {
    timestamps: true,
    collection: "comments",
  },
);

// loading a post's top-level comments, and the replies under each of them
commentSchema.index({ post: 1, parent: 1, createdAt: -1 });

const CommentModel =
  mongoose.models.CommentModel || mongoose.model("CommentModel", commentSchema);

export default CommentModel;
