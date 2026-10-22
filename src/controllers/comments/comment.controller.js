import {
  createCommentService,
  deleteCommentService,
  getCommentsService,
  updateCommentService,
} from "../../services/comments.services.js";

// A post's comments with their replies
export const getComments = async (req, res) => {
  const { comments, pagination } = await getCommentsService(req.params.id, req.query);
  res.status(200).json({ comments, pagination });
};

// Comment on a post, or reply to a comment by sending its id as "parent"
export const createComment = async (req, res) => {
  const comment = await createCommentService(req.params.id, req.user.id, req.body);
  res.status(201).json({ message: "Comment added successfully.", comment });
};

// Comment author only
export const updateComment = async (req, res) => {
  const comment = await updateCommentService(req.params.id, req.user.id, req.body);
  res.status(200).json({ message: "Comment updated successfully.", comment });
};

// Comment author or post author
export const deleteComment = async (req, res) => {
  const { deletedCount } = await deleteCommentService(req.params.id, req.user.id);
  res.status(200).json({ message: "Comment deleted successfully.", deletedCount });
};
