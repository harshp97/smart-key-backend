import mongoose from "mongoose";
import dns from "dns";

// Force IPv4 DNS resolution for local router compatibility
dns.setDefaultResultOrder("ipv4first");

const connectDB = async () => {
  try {
    const connectionInstance = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`MongoDB connected! Host: ${connectionInstance.connection.host}`);
  } catch (error) {
    console.error("MongoDB connection error:", error);
    process.exit(1);
  }
};

export default connectDB;