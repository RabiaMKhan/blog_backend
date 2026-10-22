import Joi from "joi";

// slug, author and publishedAt are set by the server, so they are not accepted here -
// joi rejects unknown keys, so a client can't post on behalf of someone else
const fields = {
  title: Joi.string().trim().min(3).max(150),
  content: Joi.string().trim().min(10),
  excerpt: Joi.string().trim().max(300).allow(""),
  coverImg: Joi.alternatives()
    .try(Joi.string().uri(), Joi.object())
    .allow(null),
  tags: Joi.array()
    .items(Joi.string().trim().lowercase().min(2).max(30))
    .max(10)
    .unique((a, b) => a.toLowerCase() === b.toLowerCase())
    .messages({ "array.unique": "tags must not contain duplicates" }),
  status: Joi.string().valid("draft", "published"),
};

const objectId = Joi.string()
  .hex()
  .length(24)
  .messages({
    "string.hex": "{#label} is not valid",
    "string.length": "{#label} is not valid",
  });

export class PostValidations {
  static createPost(params) {
    const schema = Joi.object({
      ...fields,
      title: fields.title.required(),
      content: fields.content.required(),
    });
    return schema.validate(params, { errors: { wrap: { label: false } } });
  }

  // every field is optional, but at least one has to be sent
  static updatePost(params) {
    const schema = Joi.object(fields)
      .min(1)
      .messages({ "object.min": "Provide at least one field to update" });
    return schema.validate(params, { errors: { wrap: { label: false } } });
  }

  // query string for the post list, e.g. ?page=2&limit=10&tag=react
  static listPosts(params) {
    const schema = Joi.object({
      page: Joi.number().integer().min(1).default(1),
      limit: Joi.number().integer().min(1).max(50).default(10),
      tag: Joi.string().trim().lowercase().max(30),
      author: objectId,
      status: fields.status, // only used for the author's own posts
      search: Joi.string().trim().max(100),
    });
    return schema.validate(params, { errors: { wrap: { label: false } } });
  }

  static postId(params) {
    const schema = Joi.object({ id: objectId.required() });
    return schema.validate(params, { errors: { wrap: { label: false } } });
  }
}
