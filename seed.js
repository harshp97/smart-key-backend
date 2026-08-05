// import mongoose from "mongoose";
// import dotenv from "dotenv";
// import { User } from "./models/user.models.js"; // Make sure this matches your exact filename

// dotenv.config();

// const seedDatabase = async () => {
//     try {
//         // 1. Connect to the local database
//         await mongoose.connect(`${process.env.MONGODB_URI}/${process.env.DB_NAME}`);
//         console.log("🌱 Connected to database for seeding...");

//         // 2. Clear out any old test data to start fresh
//         await User.deleteMany({});
//         console.log("🧹 Cleared old users...");

//         // 3. Create a Test Manager
//        const manager = new User({
//     name: "Manager Dave",
//     mobileNumber: "9876543210",
//     pin: "1234",
//     dob: new Date("1990-01-01"),
//     gender: "Male",
//     role: "manager"
// });

// // The .save() method triggers the pre("save") hook defined in user.models.js
// await manager.save();

       

//         console.log("✅ Test users injected successfully!");
//         process.exit(0); // Exit the script cleanly

//     } catch (error) {
//         console.error("❌ Seeding failed:", error);
//         process.exit(1);
//     }
// };

// seedDatabase();/





import mongoose from "mongoose";
import dotenv from "dotenv";
import { User } from "./models/user.models.js";       // ⚠️ Double check if your folder is 'model' or 'models'
import { Vehicle } from "./models/vehicle.models.js"; // ⚠️ Double check if your file is .model.js or .models.js

dotenv.config({ path: "./.env" });

// ── 1. MOCK USERS DATA ───────────────────────────────────────────────
const usersData = [
    {
        name: "Maiya",
        mobileNumber: "9050089750",
        pin: "4040", // Will be auto-hashed by your schema's pre-save middleware
        dob: new Date("1985-05-15"),
        gender: "Female",
        role: "manager"
    },
    {
        name: "Vijay Bhai",
        mobileNumber: "9033500686",
        pin: "4040",
        dob: new Date("1988-10-22"),
        gender: "Female",
        role: "manager"
    },
    {
        name: "Harsh",
        mobileNumber: "9833499574",
        pin: "4040",
        dob: new Date("1992-03-10"),
        gender: "Male",
        role: "driver"
    },
    {
        name: "Sohan",
        mobileNumber: "7828446742",
        pin: "4040",
        dob: new Date("1995-07-25"),
        gender: "Male",
        role: "driver"
    }
];

// ── 2. MOCK VEHICLES DATA ────────────────────────────────────────────
const vehiclesData = [
    { name: "Tata Punch", plate_number: "MH-12-TL-4521", slot: 1 },
    { name: "Grand i10", plate_number: "DL-3C-AY-8892", slot: 2 },
    { name: "Ertiga", plate_number: "HR-26-DK-1102", slot: 3 },
    { name: "Tata Intra Pickup", plate_number: "MH-14-EU-5534", slot: 4 },
    { name: "Mahindra E-Rickshaw", plate_number: "UP-16-ER-9910", slot: 5 },
    { name: "Force Cruiser", plate_number: "KA-51-MB-6781", slot: 6 },
    { name: "White Activa", plate_number: "MH-12-QW-2345", slot: 7 },
    { name: "Blue Activa", plate_number: "MH-12-RE-6789", slot: 8 },
    { name: "Blue Jupiter", plate_number: "DL-8S-TR-4321", slot: 9 },
    { name: "White Duet", plate_number: "HR-20-AA-5566", slot: 10 },
    { name: "Burgman", plate_number: "MH-02-BZ-9012", slot: 11 },
    { name: "Alcazar", plate_number: "KA-03-MM-4455", slot: 12 },
    { name: "Hero Splender", plate_number: "UP-32-JK-7788", slot: 13 },
    { name: "Suzuki Hayate", plate_number: "GJ-01-XY-3344", slot: 14 }
].map(vehicle => ({
    ...vehicle,
    status: "available",
    odometer: 5000,
    key_physically_present: true,
    is_active: true,
    puc_expiry_date: new Date("2027-02-15"),
    insurance_expiry_date: new Date("2027-06-20"),
    upcoming_service_date: new Date("2026-11-10")
}));

// ── 3. EXECUTE SEEDING FUNCTION ──────────────────────────────────────
const runSeeder = async () => {
    try {
        console.log("Connecting to Database...");
        await mongoose.connect(`${process.env.MONGODB_URI}/${process.env.DB_NAME}`);
        console.log("DB Connected successfully.");

        // Clean up old collections to avoid unique validation/index clashes
        console.log("Cleaning up old user and vehicle records...");
        await User.deleteMany({});
        await Vehicle.deleteMany({});

        // Insert Users (using .create loops through items to execute pre-save hashing)
        console.log("Inserting and hashing users...");
        await User.create(usersData);
        console.log("✓ Managers and Drivers seeded successfully.");

        // Insert Vehicles
        console.log("Inserting vehicle fleet...");
        await Vehicle.insertMany(vehiclesData);
        console.log("✓ All 14 vehicles seeded successfully.");

        console.log("\n✨ Database is successfully prepared for Postman testing! ✨");
        process.exit(0);
    } catch (error) {
        console.error("❌ Seeding Operation Failed:", error);
        process.exit(1);
    }
};

runSeeder();






























