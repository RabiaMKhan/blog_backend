import express from "express";
import trimRequest from "trim-request";
import { deleteComment, updateComment } from "../../controllers/comments/comment.controller.js";
import { UserOnly } from "../../middlewares/auth.middleware.js";

// a post's comments are listed and added under /posts/:id/comments
const router = express.Router();
router.route("/:id").patch(UserOnly, trimRequest.all, updateComment).delete(UserOnly, deleteComment);

export default router;
