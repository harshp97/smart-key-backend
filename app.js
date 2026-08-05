import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";

dotenv.config();

const app = express();

// Construct the CORS options dynamically from the environment variable
const allowedOrigins = process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : [];
console.log("Allowed origins", allowedOrigins);

const corsOptions = {
    origin: (origin, callback) => {
        if (allowedOrigins.includes('*') || allowedOrigins.indexOf(origin) !== -1 || !origin) {  // also allow requests with no origin
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
    optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));

// Standard middleware for processing payloads and cookies
app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(cookieParser());



// ⬇️ NEW ROUTE IMPORTS ⬇️
import authRouter from './routes/auth.routes.js';
import userRouter from './routes/user.routes.js';
import tripRouter from './routes/trip.routes.js';   
import vehicleRouter from './routes/vehicle.routes.js';



// ⬇️ NEW ROUTE DECLARATIONS ⬇️
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/users", userRouter);
app.use("/api/v1/trips", tripRouter);
app.use("/api/v1/vehicles", vehicleRouter);

export { app };