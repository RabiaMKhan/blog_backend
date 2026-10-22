import createHttpError from "http-errors";
import CommentModel from "../models/comments.model.js";
import PostModel from "../models/posts.model.js";
import { CommentValidations } from "../validations/comment.validation.js";
import { PostValidations } from "../validations/post.validation.js";
import { AUTHOR_FIELDS } from "./posts.services.js";

const validate = (validations, schema, data) => {
  const { error, value } = validations[schema](data);
  if (error) {
    throw createHttpError.BadRequest(error.details[0].message);
  }
  return value;
};

// comments are only shown on, and only added to, published posts
const findPublishedPost = async (postId) => {
  const { id } = validate(PostValidations, "postId", { id: postId });
  const post = await PostModel.findOne({ _id: id, status: "published" });
  if (!post) throw createHttpError.NotFound("Post not found.");
  return post;
};

const findComment = async (commentId) => {
  const { id } = validate(CommentValidations, "commentId", { id: commentId });
  const comment = await CommentModel.findById(id);
  if (!comment) throw createHttpError.NotFound("Comment not found.");
  return comment;
};

const changeCommentsCount = (postId, by) =>
  PostModel.updateOne({ _id: postId }, { $inc: { commentsCount: by } });

// Top-level comments, newest first, each with all of its replies oldest first
export const getCommentsService = async (postId, query) => {
  const post = await findPublishedPost(postId);
  const { page, limit } = validate(CommentValidations, "listComments", query);
  const filter = { post: post._id, parent: null };

  const [comments, total] = await Promise.all([
    CommentModel.find(filter)
      .populate("author", AUTHOR_FIELDS)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    CommentModel.countDocuments(filter),
  ]);

  // one query for the replies of every comment on this page
  const replies = await CommentModel.find({
    post: post._id,
    parent: { $in: comments.map((c) => c._id) },
  })
    .populate("author", AUTHOR_FIELDS)
    .sort({ createdAt: 1 })
    .lean();

  return {
    comments: comments.map((comment) => ({
      ...comment,
      replies: replies.filter((r) => String(r.parent) === String(comment._id)),
    })),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
};

export const createCommentService = async (postId, userId, data) => {
  const post = await findPublishedPost(postId);
  const { content, parent } = validate(CommentValidations, "createComment", data);

  let parentId = null;
  if (parent) {
    const parentComment = await CommentModel.findById(parent);
    if (!parentComment || String(parentComment.post) !== String(post._id)) {
      throw createHttpError.NotFound("The comment you are replying to was not found.");
    }
    // replying to a reply puts it under the same top-level comment
    parentId = parentComment.parent || parentComment._id;
  }

  const comment = await CommentModel.create({
    post: post._id,
    author: userId,
    content,
    parent: parentId,
  });
  await changeCommentsCount(post._id, 1);
  return comment.populate("author", AUTHOR_FIELDS);
};

// Only the person who wrote the comment can edit it
export const updateCommentService = async (commentId, userId, data) => {
  const comment = await findComment(commentId);
  if (String(comment.author) !== String(userId)) {
    throw createHttpError.Forbidden("You can only edit your own comments.");
  }
  const { content } = validate(CommentValidations, "updateComment", data);
  comment.content = content;
  await comment.save();
  return comment.populate("author", AUTHOR_FIELDS);
};

// The comment's author, or the author of the post it is on, can delete it.
// Deleting a top-level comment deletes its replies too.
export const deleteCommentService = async (commentId, userId) => {
  const comment = await findComment(commentId);
  if (String(comment.author) !== String(userId)) {
    const post = await PostModel.findById(comment.post).select("author");
    if (!post || String(post.author) !== String(userId)) {
      throw createHttpError.Forbidden("You can only delete your own comments.");
    }
  }

  const { deletedCount } = await CommentModel.deleteMany({
    $or: [{ _id: comment._id }, { parent: comment._id }],
  });
  await changeCommentsCount(comment.post, -deletedCount);
  return { deletedCount };
};
