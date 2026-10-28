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
    // "user" writes posts. "admin" is the single app admin, created by `npm run seed-admin`
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },
  },
  {
    timestamps: true,
    collection: "users",
  },
);

// there can only ever be one admin - mongo rejects a second document with role "admin"
userSchema.index(
  { role: 1 },
  { unique: true, partialFilterExpression: { role: "admin" } },
);

const UserModel =
  mongoose.models.UserModel || mongoose.model("UserModel", userSchema);

export default UserModel;
