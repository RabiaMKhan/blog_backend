// Creates the one admin account from ADMIN_* in .env, or updates it if it exists.
// Usage: npm run seed-admin
import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import Joi from "joi";
import UserModel from "../models/users.model.js";
import SessionModel from "../models/sessions.model.js";

const fail = (message) => {
  console.error(message);
  process.exit(1);
};

const { error, value } = Joi.object({
  ADMIN_EMAIL: Joi.string().trim().lowercase().email().required(),
  ADMIN_PASSWORD: Joi.string().min(8).max(72).required(),
  ADMIN_FIRST_NAME: Joi.string().trim().default("Admin"),
  ADMIN_LAST_NAME: Joi.string().trim().default("Admin"),
})
  .unknown()
  .validate(process.env, { errors: { wrap: { label: false } } });
if (error) fail(`Check the admin settings in .env: ${error.details[0].message}`);

const {
  ADMIN_EMAIL: email,
  ADMIN_PASSWORD: password,
  ADMIN_FIRST_NAME: firstName,
  ADMIN_LAST_NAME: lastName,
} = value;

await mongoose.connect(process.env.DATABASE_URL);
try {
  const admin = await UserModel.findOne({ role: "admin" });

  // never turn someone's existing account into the admin
  const emailOwner = await UserModel.findOne({ email });
  if (emailOwner && String(emailOwner._id) !== String(admin?._id)) {
    fail(`${email} already belongs to a user account. Use a different ADMIN_EMAIL.`);
  }

  const fields = {
    firstName,
    lastName,
    email,
    password: await bcrypt.hash(password, 12),
    isVerified: true,
  };

  if (admin) {
    admin.set(fields);
    await admin.save();
    // the password may have changed, so log the admin out everywhere
    await SessionModel.deleteMany({ user: admin._id });
    console.log(`Admin account updated: ${email}`);
  } else {
    await UserModel.create({ ...fields, role: "admin" });
    console.log(`Admin account created: ${email}`);
  }
} finally {
  await mongoose.disconnect();
}
