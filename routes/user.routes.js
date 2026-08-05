import { Router } from "express";
import { registerUser, getUserProfile } from "../controllers/user.controller.js"; 
import { verifyJWT, verifyManager } from "../middlewares/auth.middleware.js";

const router = Router();


// The request flows left to right:
// 1. verifyJWT confirms the token and sets req.user
// 2. verifyManager confirms req.user.role === "manager"
// 3. registerUser creates the new account in the database
router.route("/register").post(verifyJWT, verifyManager, registerUser);

//get user profile details
router.route("/profile").get(verifyJWT, getUserProfile);



export default router;