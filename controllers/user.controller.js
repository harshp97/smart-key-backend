import { User } from "../models/user.models.js";
import jwt from "jsonwebtoken"
import mongoose from "mongoose";


//Create or Register a new user
export const registerUser = async (req, res) => {
    const { name, mobileNumber, pin, dob, gender, role } = req.body;

    try {
        if (!name || !mobileNumber || !pin || !dob || !gender || !role) {
            return res.status(400).json({ message: "All fields are required" });
        }

        const existedUser = await User.findOne({ mobileNumber });
        if (existedUser) {
            return res.status(409).json({ message: "Mobile number already registered" });
        }

        const user = await User.create({
            name,
            mobileNumber,
            pin,
            dob,
            gender,
            role: role || "driver"
        });

        const createdUser = await User.findById(user._id).select("-pin -refreshToken");


        // if after creating new user successfull in db, it didn't came then
        if (!createdUser) {
            throw new ApiError(500, "Something went wrong while regestring user!!")
        }


        return res.status(201).json({
            message: "User registered successfully",
            user: createdUser
        });
    } catch (error) {
        return res.status(500).json({ message: error.message || "Registration failed" });
    }
};


//get user details or profile
export const getUserProfile = async (req, res) => {
    try {
        // req.user is already available because of verifyJWT middleware
        const user = req.user;

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // Return the user details (the sensitive fields were already 
        // excluded in your verifyJWT middleware via .select("-pin -refreshToken"))
        return res.status(200).json({
            message: "User profile fetched successfully",
            user: user
        });
    } catch (error) {
        return res.status(500).json({ message: error.message || "Failed to fetch profile" });
    }
};



// export {
//     registerUser,
//     getUserProfile
// }