import jwt from "jsonwebtoken";
import { User } from "../models/user.models.js";

export const verifyJWT = async (req, res, next) => {
    try {
        // Grab token from either cookies or the Authorization header (Bearer token)
        const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "");

        if (!token) {
            return res.status(401).json({ message: "Unauthorized request: No access token provided" });
        }

        // Decode the token using your secret key
        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

        // Find the user in the DB (excluding sensitive fields)
        const user = await User.findById(decodedToken?._id).select("-pin -refreshToken");

        if (!user) {
            return res.status(401).json({ message: "Invalid Access Token: User not found" });
        }

        // Attach the user object to the request so the next controller can use it
        req.user = user;
        next();

    } catch (error) {
        return res.status(401).json({ message: error.message || "Invalid or expired access token" });
    }
};

export const verifyManager = async (req, res, next) => {
    try {
        // Get token from cookies or authorization header
        const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "");
        
        if (!token) return res.status(401).json({ message: "Unauthorized: No token provided" });

        const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
        const user = await User.findById(decoded._id);

        // Check if user exists and is a manager
        if (!user || user.role !== "manager") {
            return res.status(403).json({ message: "Access Denied: Managers only" });
        }

        req.user = user; // Attach manager info to request
        next();
    } catch (error) {
        return res.status(401).json({ message: "Invalid or expired access token" });
    }
};