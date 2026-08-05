import mongoose from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

// 1. Define the Schema
const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      index: true,
    },
    mobileNumber: {
      type: String,
      required: true,
      index: true,
      unique: true,
      trim: true,
    },
    pin: {
      type: String,
      required: true,
      index: true,
    },
    dob: {
      type: Date,
      required: true,
    },
    gender: {
      type: String,
      enum: ["Male", "Female"],
      required: true,
    },
    role: {
      type: String,
      enum: ["driver", "manager"],
      default: "driver",
      index: true,
    },
    is_active: {
      type: Boolean,
      default: true,
    },
    refreshToken: {
      type: String,
    },
  },
  { timestamps: true }
);

// 2. Middleware: Hash the 4-digit PIN before saving
// userSchema.pre("save", async function (next) {

//   console.log("DEBUG: pre-save hook triggered for:", this.name); // ADD THIS
//   // Only hash the pin if it has been modified (or is new)
//   if (!this.isModified("pin")) return next();

//   bcrypt.hash(this.pin, 10, (err, hash) => {
//     if (err) return next(err);
//     this.pin = hash;
//     console.log("DEBUG: Final Hashed Value being saved:", this.pin);
//     next();
//   });
// });
// Remove 'next' from the arguments
userSchema.pre("save", async function () {
    // 1. Only hash the pin if it has been modified (or is new)
    if (!this.isModified("pin")) return; 

    // 2. Hash the pin
    this.pin = await bcrypt.hash(this.pin, 10);
    
    // 3. No next() needed when using async/await
});




// 3. Custom Method: Compare entered PIN with the database hash
userSchema.methods.isPinCorrect = async function (enteredPin) {
  return await bcrypt.compare(enteredPin, this.pin);
};

// 4. Custom Method: Generate Access Token
userSchema.methods.generateAccessToken = function () {
  return jwt.sign(
    {
      _id: this._id,
      mobileNumber: this.mobileNumber,
      name: this.name,
      role: this.role,
    },
    process.env.ACCESS_TOKEN_SECRET,
    {
      expiresIn: process.env.ACCESS_TOKEN_EXPIRY || "1d",
    }
  );
};

// 5. Custom Method: Generate Refresh Token
userSchema.methods.generateRefreshToken = function () {
  return jwt.sign(
    {
      _id: this._id,
    },
    process.env.REFRESH_TOKEN_SECRET,
    {
      expiresIn: process.env.REFRESH_TOKEN_EXPIRY || "30d",
    }
  );
};

// 6. Finally, export the Model
export const User = mongoose.model("User", userSchema);