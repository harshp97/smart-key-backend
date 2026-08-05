import dotenv from "dotenv";
import http from "http";                 
import { Server } from "socket.io";      
import connectDB from "./db/index.js";
import { app } from "./app.js";

// Load environment variables into process.env before anything else runs
dotenv.config({
    path: "./.env",
});


// 3. Create the HTTP server using your Express app
const server = http.createServer(app);

// 4. Initialize Socket.IO and link it to the HTTP server
// We reuse your CORS origins from the environment variables here too!
const allowedOrigins = process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : [];

const io = new Server(server, {
    cors: {
        origin: allowedOrigins,
        methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
        credentials: true
    }
});

// 5. Attach the 'io' instance to Express so your controllers can access it
// Inside any controller, you can grab this via: req.app.get("io")
app.set("io", io);

// 6. Handle socket connections (Rooms setup)
io.on("connection", (socket) => {
    console.log(`🔌 Client connected to Socket: ${socket.id}`);

    // Managers join a shared dashboard room
    socket.on("join_manager_room", () => {
        socket.join("managers");
        console.log(`Manager socket ${socket.id} joined 'managers' room`);
    });

    // Drivers join their own private room using their User ID
    socket.on("join_driver_room", (driverId) => {
        if (driverId) {
            socket.join(`driver_${driverId}`);
            console.log(`Driver socket ${socket.id} joined private room: driver_${driverId}`);
        }
    });

    socket.on("disconnect", () => {
        console.log(`❌ Client disconnected: ${socket.id}`);
    });
});



// 7. Establish connection to MongoDB
connectDB()
    .then(() => {
        const port = process.env.PORT || 8000;
        
        // 8. CRITICAL: Start the HTTP SERVER (not the app)
        server.listen(port, () => {
            console.log(`⚙️ Server is running on Port: ${port}`);
        });
    })
    .catch((err) => {
        console.log("MongoDB connection failed! ❌", err);
    });