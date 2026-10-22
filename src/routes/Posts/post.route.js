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
import AuthMiddleware, { OptionalAuthMiddleware } from "../../middlewares/auth.middleware.js";

const router = express.Router();
router.route("/").get(getPosts).post(AuthMiddleware, trimRequest.all, createPost);
// must stay above "/:slug", or "me" would be treated as a slug
router.route("/me").get(AuthMiddleware, getMyPosts);
router.route("/:slug").get(OptionalAuthMiddleware, getPostBySlug);
router.route("/:id").patch(AuthMiddleware, trimRequest.all, updatePost).delete(AuthMiddleware, deletePost);
router.route("/:id/like").post(AuthMiddleware, likePost).delete(AuthMiddleware, unlikePost);
router.route("/:id/comments").get(getComments).post(AuthMiddleware, trimRequest.all, createComment);

export default router;
