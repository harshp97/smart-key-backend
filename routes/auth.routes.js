import { Router } from "express";
import { loginUser, logoutUser, refreshAccessToken, resetPin } from "../controllers/auth.controller.js";
import { verifyJWT, verifyManager } from "../middlewares/auth.middleware.js";


const router = Router();



// Public Routes (No token required)
router.post("/login", loginUser);
router.post("/refresh-token", refreshAccessToken);

// Secured Routes (Requires a valid Access Token)
router.post("/logout", verifyJWT, logoutUser);

router.post("/resetPin", resetPin);


export default router;