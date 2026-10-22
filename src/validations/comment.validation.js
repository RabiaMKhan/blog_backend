import Joi from "joi";

const content = Joi.string().trim().min(1).max(1000);

const objectId = Joi.string()
  .hex()
  .length(24)
  .messages({
    "string.hex": "{#label} is not valid",
    "string.length": "{#label} is not valid",
  });

// post and author are set by the server, so they are not accepted here
export class CommentValidations {
  static createComment(params) {
    const schema = Joi.object({
      content: content.required(),
      parent: objectId.allow(null), // set to reply to a comment
    });
    return schema.validate(params, { errors: { wrap: { label: false } } });
  }

  static updateComment(params) {
    const schema = Joi.object({
      content: content.required(),
    });
    return schema.validate(params, { errors: { wrap: { label: false } } });
  }

  // query string for a post's comments, e.g. ?page=2&limit=10
  static listComments(params) {
    const schema = Joi.object({
      page: Joi.number().integer().min(1).default(1),
      limit: Joi.number().integer().min(1).max(50).default(10),
    });
    return schema.validate(params, { errors: { wrap: { label: false } } });
  }

  static commentId(params) {
    const schema = Joi.object({ id: objectId.required() });
    return schema.validate(params, { errors: { wrap: { label: false } } });
  }
}
