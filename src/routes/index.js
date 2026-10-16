import express from "express";
import AuthRoute from "./Authentication/auth.route.js";

const routes = express.Router();

routes.use("/auth", AuthRoute);

export default routes;