import { User } from "../models/user.models.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production", // false on localhost
    sameSite: 'lax', // Add this: Allows cookies on cross-origin (different ports)
    path: '/'        // Ensure the cookie is available for all routes
};

/**
 * UTILITY: Token pipeline runner
 * Generates fresh signatures and handles database state persistence
 */
const generateAccessAndRefreshTokens = async (userId) => {
    try {
        const user = await User.findById(userId);
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false });

        return { accessToken, refreshToken };
    } catch (error) {
        throw new Error("Failed to process security tokens");
    }
};

/**
 * CONTROLLER: User Login via Mobile Number & 4-Digit PIN
 */
export const loginUser = async (req, res) => {
    const { mobileNumber, pin } = req.body;

    if (!mobileNumber || !pin) {
        return res.status(400).json({ message: "Mobile number and PIN are required" });
    }

    try {
        // 1. Check if user exists
        const user = await User.findOne({ mobileNumber });
        if (!user) {
            return res.status(404).json({ message: "User profile not found" });
        }

        // 2. Account Suspension Check (Soft Deletion)
        if (!user.is_active) {
            return res.status(403).json({ message: "Your account is inactive. Contact management." });
        }

        // 3. Check if the 4-digit PIN is correct
        const isPinValid = await user.isPinCorrect(pin);
        if (!isPinValid) {
            return res.status(401).json({ message: "Invalid PIN credentials entered" });
        }

        // 4. Issue tokens and enforce the Single-Session login rule
        const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id);

        // Strip pin hash and database tokens before pushing to UI layer
        const loggedInUser = await User.findById(user._id).select("-pin -refreshToken");

        console.log("Loggedn in ");
        
        return res
            .status(200)
            .cookie("accessToken", accessToken, cookieOptions)
            .cookie("refreshToken", refreshToken, cookieOptions)
            .json({
                user: loggedInUser,
                accessToken,
                refreshToken,
                message: "Authentication successful"
            });

    } catch (error) {
        return res.status(500).json({ message: error.message || "Internal Login Exception" });
    }
};

/**
 * CONTROLLER: Silent Session Multi-week Renewer
 */
export const refreshAccessToken = async (req, res) => {
    const incomingRefreshToken = req.body.refreshToken || req.cookies?.refreshToken;

    if (!incomingRefreshToken) {
        return res.status(401).json({ message: "Access Denied: Missing session token" });
    }

    try {
        const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET);
        const user = await User.findById(decodedToken?._id);

        if (!user) {
            return res.status(401).json({ message: "Session token belongs to an invalid user" });
        }

        // DOUBLE-LOGIN CHECK:
        // If a duplicate device logging in has modified the token in MongoDB, reject this old runner
        if (incomingRefreshToken !== user.refreshToken) {
            return res.status(401).json({ message: "Session expired: Logged in on a different terminal." });
        }

        const newAccessToken = user.generateAccessToken();

        return res
            .status(200)
            .cookie("accessToken", newAccessToken, cookieOptions)
            .json({
                accessToken: newAccessToken,
                message: "Access token silently renewed"
            });

    } catch (error) {
        return res.status(401).json({ message: error?.message || "Invalid signature parameters" });
    }
};

/**
 * CONTROLLER: Session Logout
 */
export const logoutUser = async (req, res) => {
    try {
        // Expecting auth middleware to populate req.user context safely
        await User.findByIdAndUpdate(
            req.user._id,
            { $set: { refreshToken: undefined } },
            { new: true }
        );

        return res
            .status(200)
            .clearCookie("accessToken", cookieOptions)
            .clearCookie("refreshToken", cookieOptions)
            .json({ message: "Session dropped. Logged out successfully." });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};



// Inside your auth.controller.js (Reset/Change PIN function)
export const resetPin = async (req, res) => {
  try {
    const { mobileNumber, oldPin, newPin } = req.body;

    // 1. Find the User
    const user = await User.findOne({ mobileNumber });
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    // 2. Verify the Old PIN (Using your schema's custom method!)
    const isMatch = await user.isPinCorrect(oldPin.toString());
    if (!isMatch) {
      return res.status(401).json({ message: 'The old PIN is incorrect.' });
    }

    // 3. CRUCIAL FIX: Assign the plain-text PIN directly.
    // DO NOT manually hash it here. 
    user.pin = newPin.toString(); 

    // 4. Save the document. 
    // The userSchema.pre("save") hook will automatically single-hash it now!
    await user.save(); 

    return res.status(200).json({ message: 'PIN changed successfully.' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};