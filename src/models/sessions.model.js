import mongoose, { Schema } from "mongoose";

// One document per logged-in device, so logging in on a phone doesn't log out the laptop
const sessionSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "UserModel",
      required: true,
      index: true,
    },
    // sha256 of this device's current refresh token - replaced on every refresh
    tokenHash: {
      type: String,
      required: true,
    },
    userAgent: {
      type: String,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 }, // mongo deletes the session once the refresh token has expired
    },
  },
  {
    timestamps: true,
    collection: "sessions",
  },
);

const SessionModel =
  mongoose.models.SessionModel || mongoose.model("SessionModel", sessionSchema);

export default SessionModel;
