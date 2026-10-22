import createHttpError from "http-errors";
import PostModel from "../models/posts.model.js";
import { PostValidations } from "../validations/post.validation.js";
import { makeExcerpt, slugify, slugSuffix } from "../utils/post.utils.js";

// public author fields - never send the author's email or password with a post
export const AUTHOR_FIELDS = "firstName lastName profileImg";
// lists don't need the full post body
const LIST_FIELDS = "-content";

const validate = (schema, data) => {
  const { error, value } = PostValidations[schema](data);
  if (error) {
    throw createHttpError.BadRequest(error.details[0].message);
  }
  return value;
};

// user input goes into a regex, so characters like "." or "(" must be escaped
const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const paginate = async (filter, { page, limit }, sort) => {
  const [posts, total] = await Promise.all([
    PostModel.find(filter)
      .select(LIST_FIELDS)
      .populate("author", AUTHOR_FIELDS)
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit),
    PostModel.countDocuments(filter),
  ]);
  return {
    posts,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
};

// Saves the post with a slug made from the title, adding a random ending if it's taken
const saveWithUniqueSlug = async (post, title) => {
  const baseSlug = slugify(title);
  const taken = await PostModel.exists({ slug: baseSlug, _id: { $ne: post._id } });
  post.slug = taken ? `${baseSlug}-${slugSuffix()}` : baseSlug;

  // two posts with the same title saved at the same moment can still both pick
  // the same slug - the unique index rejects one, so retry it with a new suffix
  for (let attempt = 1; ; attempt++) {
    try {
      return await post.save();
    } catch (err) {
      if (err.code !== 11000 || !err.keyValue?.slug || attempt === 3) throw err;
      post.slug = `${baseSlug}-${slugSuffix()}`;
    }
  }
};

// Loads a post the user is allowed to change, or throws 404 / 403
const findOwnPost = async (postId, userId) => {
  const { id } = validate("postId", { id: postId });
  const post = await PostModel.findById(id);
  if (!post) throw createHttpError.NotFound("Post not found.");
  if (String(post.author) !== String(userId)) {
    throw createHttpError.Forbidden("You can only change your own posts.");
  }
  return post;
};

export const createPostService = async (authorId, postData) => {
  const value = validate("createPost", postData);
  const post = new PostModel({
    ...value,
    excerpt: value.excerpt || makeExcerpt(value.content),
    author: authorId,
  });
  await saveWithUniqueSlug(post, value.title);
  return post.populate("author", AUTHOR_FIELDS);
};

// Public feed - published posts only, newest first
export const getPostsService = async (query) => {
  const { tag, author, search, ...pageOptions } = validate("listPosts", query);
  const filter = { status: "published" };
  if (tag) filter.tags = tag;
  if (author) filter.author = author;
  if (search) filter.title = { $regex: escapeRegex(search), $options: "i" };
  return paginate(filter, pageOptions, { publishedAt: -1 });
};

// The user's own posts, drafts included, most recently edited first
export const getMyPostsService = async (userId, query) => {
  // ?author= is dropped - this list is always the logged-in user's
  const { tag, status, search, author, ...pageOptions } = validate("listPosts", query);
  const filter = { author: userId };
  if (tag) filter.tags = tag;
  if (status) filter.status = status;
  if (search) filter.title = { $regex: escapeRegex(search), $options: "i" };
  return paginate(filter, pageOptions, { updatedAt: -1 });
};

// userId is set only when the request has a valid token - drafts are shown to their author only
export const getPostBySlugService = async (slug, userId) => {
  const post = await PostModel.findOne({ slug: String(slug).toLowerCase() }).populate(
    "author",
    AUTHOR_FIELDS,
  );
  // a draft looks the same as a missing post to everyone but its author
  const isAuthor = post && userId && String(post.author?._id) === String(userId);
  if (!post || (post.status !== "published" && !isAuthor)) {
    throw createHttpError.NotFound("Post not found.");
  }
  return post;
};

export const updatePostService = async (postId, userId, postData) => {
  const post = await findOwnPost(postId, userId);
  const value = validate("updatePost", postData);

  const titleChanged = value.title && value.title !== post.title;
  post.set(value);
  // an empty excerpt means "generate it again from the content"
  if (value.excerpt === "") post.excerpt = makeExcerpt(post.content);

  // keep the slug of a post that has ever been published, so shared links don't break
  if (titleChanged && !post.publishedAt) {
    await saveWithUniqueSlug(post, post.title);
  } else {
    await post.save();
  }
  return post.populate("author", AUTHOR_FIELDS);
};

export const deletePostService = async (postId, userId) => {
  const post = await findOwnPost(postId, userId);
  await post.deleteOne();
};
