import {
  createPostService,
  deletePostService,
  getMyPostsService,
  getPostBySlugService,
  getPostsService,
  likePostService,
  unlikePostService,
  updatePostService,
} from "../../services/posts.services.js";

// Public feed of published posts
export const getPosts = async (req, res) => {
  const { posts, pagination } = await getPostsService(req.query);
  res.status(200).json({ posts, pagination });
};

// The logged-in user's own posts, drafts included
export const getMyPosts = async (req, res) => {
  const { posts, pagination } = await getMyPostsService(req.user.id, req.query);
  res.status(200).json({ posts, pagination });
};

// One post by its slug
export const getPostBySlug = async (req, res) => {
  const post = await getPostBySlugService(req.params.slug, req.user?.id);
  res.status(200).json({ post });
};

// Create a post for the logged-in user - saved as a draft unless status is "published"
export const createPost = async (req, res) => {
  const post = await createPostService(req.user.id, req.body);
  res.status(201).json({
    message:
      post.status === "published"
        ? "Post published successfully."
        : "Post saved as draft.",
    post,
  });
};

// Author only
export const updatePost = async (req, res) => {
  const post = await updatePostService(req.params.id, req.user.id, req.body);
  res.status(200).json({ message: "Post updated successfully.", post });
};

// Author only
export const deletePost = async (req, res) => {
  await deletePostService(req.params.id, req.user.id);
  res.status(200).json({ message: "Post deleted successfully." });
};

export const likePost = async (req, res) => {
  const { liked, likesCount } = await likePostService(req.params.id, req.user.id);
  res.status(200).json({ liked, likesCount });
};

export const unlikePost = async (req, res) => {
  const { liked, likesCount } = await unlikePostService(req.params.id, req.user.id);
  res.status(200).json({ liked, likesCount });
};
