import mongoose, { Schema } from "mongoose";

const otpSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "UserModel",
      required: true,
      index: true,
    },
    otp: {
      type: String, // bcrypt hash of the code, never the plain code
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 }, // mongo deletes the document once expiresAt is reached
    },
  },
  {
    timestamps: true,
    collection: "otp",
  },
);

const OTPModel = mongoose.models.OTPModel || mongoose.model("OTPModel", otpSchema);
export default OTPModel;
