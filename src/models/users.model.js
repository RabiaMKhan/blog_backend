import mongoose, { Schema } from "mongoose";

const userSchema = new Schema(
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
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
    profileImg: {
      type: Schema.Types.Mixed,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    refreshToken: {
      type: String,
      select: false // never return untill asked
    }
  },
  {
    timestamps: true,
    collection: "users",
  },
);

const UserModel =
  mongoose.models.UserModel || mongoose.model("UserModel", userSchema);

export default UserModel;
