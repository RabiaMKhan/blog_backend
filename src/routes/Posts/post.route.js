import express from "express";
import trimRequest from "trim-request";
import {
  createPost,
  deletePost,
  getMyPosts,
  getPostBySlug,
  getPosts,
  likePost,
  unlikePost,
  updatePost,
} from "../../controllers/posts/post.controller.js";
import { createComment, getComments } from "../../controllers/comments/comment.controller.js";
import { OptionalAuthMiddleware, UserOnly } from "../../middlewares/auth.middleware.js";

const router = express.Router();
router.route("/").get(getPosts).post(UserOnly, trimRequest.all, createPost);
// must stay above "/:slug", or "me" would be treated as a slug
router.route("/me").get(UserOnly, getMyPosts);
router.route("/:slug").get(OptionalAuthMiddleware, getPostBySlug);
router.route("/:id").patch(UserOnly, trimRequest.all, updatePost).delete(UserOnly, deletePost);
router.route("/:id/like").post(UserOnly, likePost).delete(UserOnly, unlikePost);
router.route("/:id/comments").get(getComments).post(UserOnly, trimRequest.all, createComment);

export default router;
