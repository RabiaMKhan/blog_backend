import Joi from 'joi';

export class AuthValidations {
  static signUpUser(params) {
    const schema = Joi.object({
      firstName: Joi.string().required().min(3).max(30),
      lastName: Joi.string().required().min(3).max(30),
      email: Joi.string().email().required(),
      password: Joi.string().required().min(4).max(20)
    });
    const result = schema.validate(params, { errors: { wrap: { label: false } } });
    return result;
  }
  static loginUser(params) {
    const schema = Joi.object({
      email: Joi.string().email().required(),
      password: Joi.string().required().min(4).max(20)
    });
    const result = schema.validate(params, { errors: { wrap: { label: false } } });
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
}