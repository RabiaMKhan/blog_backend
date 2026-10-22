import createHttpError from "http-errors";
import PostModel from "../models/posts.model.js";
import { PostValidations } from "../validations/post.validation.js";
import { makeExcerpt, slugify, slugSuffix } from "../utils/post.utils.js";

// public author fields - never send the author's email or password with a post
export const AUTHOR_FIELDS = "firstName lastName profileImg";

export const createPostService = async (authorId, postData) => {
  const { error, value } = PostValidations.createPost(postData);
  if (error) {
    throw createHttpError.BadRequest(error.details[0].message);
  }

  const baseSlug = slugify(value.title);
  let slug = (await PostModel.exists({ slug: baseSlug }))
    ? `${baseSlug}-${slugSuffix()}`
    : baseSlug;

  // two posts with the same title saved at the same moment can still both pick
  // the same slug - the unique index rejects one, so retry it with a new suffix
  for (let attempt = 1; ; attempt++) {
    try {
      const post = await PostModel.create({
        ...value,
        excerpt: value.excerpt || makeExcerpt(value.content),
        slug,
        author: authorId,
      });
      return post.populate("author", AUTHOR_FIELDS);
    } catch (err) {
      if (err.code !== 11000 || !err.keyValue?.slug || attempt === 3) throw err;
      slug = `${baseSlug}-${slugSuffix()}`;
    }
  }
};
