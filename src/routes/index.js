import express from "express";
import AuthRoute from "./Authentication/auth.route.js";
import PostRoute from "./Posts/post.route.js";

const routes = express.Router();

routes.use("/auth", AuthRoute);
routes.use("/posts", PostRoute);

export default routes;