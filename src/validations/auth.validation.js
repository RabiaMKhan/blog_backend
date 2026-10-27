import Joi from "joi";

// rules for any new password. bcrypt ignores everything after 72 bytes, so that's the max
const newPassword = Joi.string().min(8).max(72);

export class AuthValidations {
  static signUpUser(params) {
    const schema = Joi.object({
      firstName: Joi.string().required().min(3).max(30),
      lastName: Joi.string().required().min(3).max(30),
      email: Joi.string().email().required(),
      password: newPassword.required(),
    });
    const result = schema.validate(params, {
      errors: { wrap: { label: false } },
    });
    return result;
  }
  static loginUser(params) {
    const schema = Joi.object({
      email: Joi.string().email().required(),
      // no minimum here - accounts made before the 8-character rule must still log in
      password: Joi.string().required().max(72),
    });
    const result = schema.validate(params, {
      errors: { wrap: { label: false } },
    });
    return result;
  }

  static verifyOtp(params) {
    const schema = Joi.object({
      email: Joi.string().email().required(),
      otp: Joi.string()
        .length(6)
        .pattern(/^\d+$/)
        .required()
        .messages({ "string.pattern.base": "otp must contain only digits" }),
    });
    return schema.validate(params, { errors: { wrap: { label: false } } });
  }

  static resendOtp(params) {
    const schema = Joi.object({
      email: Joi.string().email().required(),
    });
    return schema.validate(params, { errors: { wrap: { label: false } } });
  }

  static forgotPassword(params) {
    const schema = Joi.object({
      email: Joi.string().email().required(),
    });
    return schema.validate(params, { errors: { wrap: { label: false } } });
  }

  static resetPassword(params) {
    const schema = Joi.object({
      email: Joi.string().email().required(),
      otp: Joi.string()
        .length(6)
        .pattern(/^\d+$/)
        .required()
        .messages({ "string.pattern.base": "otp must contain only digits" }),
      newPassword: newPassword.required(),
    });
    return schema.validate(params, { errors: { wrap: { label: false } } });
  }

  static changePassword(params) {
    const schema = Joi.object({
      currentPassword: Joi.string().required(),
      newPassword: newPassword
        .required()
        .invalid(Joi.ref("currentPassword"))
        .messages({
          "any.invalid": "newPassword must be different from currentPassword",
        }),
    });
    return schema.validate(params, { errors: { wrap: { label: false } } });
  }
}
