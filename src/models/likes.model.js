import mongoose, { Schema } from "mongoose";

const likeSchema = new Schema(
  {
    post: {
      type: Schema.Types.ObjectId,
      ref: "PostModel",
      required: true,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: "UserModel",
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
    collection: "likes",
  },
);

// one like per user per post - a second like is rejected by mongo itself,
// even if two requests arrive at the same moment
likeSchema.index({ post: 1, user: 1 }, { unique: true });

const LikeModel =
  mongoose.models.LikeModel || mongoose.model("LikeModel", likeSchema);

export default LikeModel;
