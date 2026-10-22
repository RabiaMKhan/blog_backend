import { createPostService } from "../../services/posts.services.js";

// Public feed of published posts
export const getPosts = async (req, res) => {};

// The logged-in user's own posts, drafts included
export const getMyPosts = async (req, res) => {};

// One post by its slug
export const getPostBySlug = async (req, res) => {};

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
export const updatePost = async (req, res) => {};

// Author only
export const deletePost = async (req, res) => {};
