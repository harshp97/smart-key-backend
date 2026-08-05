import { Router } from "express";
import { createVehicle, getAllActiveVehicles, getAllVehicles, getaVehicleDetails, deleteVehicle, updateVehicleOdometer, updateVehicleStatus, updateVehicleKeyStatus, updateVehicleDetails, softDeleteVehicle, hardDeleteVehicle } from "../controllers/vehicle.controller.js"; 
import { verifyJWT, verifyManager } from "../middlewares/auth.middleware.js";

const router = Router();


// The request flows left to right:
// 1. verifyJWT confirms the token and sets req.user
// 2. verifyManager confirms req.user.role === "manager"
// 3. registerUser creates the new vehicle entry in the database
router.route("/createVehicle").post(verifyJWT, verifyManager, createVehicle);

//get user all vehicle details
router.route("/getAllActiveVehicles").get(verifyJWT, getAllActiveVehicles);

router.route("/getAllVehicles").get(verifyJWT,  getAllVehicles);

router.route("/getaVehicleDetails").post(verifyJWT, getaVehicleDetails); 

// soft delete 
router.route("/deleteVehicle").post(verifyJWT, verifyManager, deleteVehicle);

router.route("/updateVehicleOdometer").put(verifyJWT, updateVehicleOdometer);

router.route("/updateVehicleStatus").put(verifyJWT, updateVehicleStatus);

router.route("/updateVehicleKeyStatus").put(verifyJWT, updateVehicleKeyStatus);

router.route("/updateVehicleDetails").put(verifyJWT, verifyManager, updateVehicleDetails); // New route for updating vehicle details

router.route('/softDeleteVehicle').post(verifyJWT, verifyManager, softDeleteVehicle);

router.route('/hardDeleteVehicle').delete(verifyJWT, verifyManager, hardDeleteVehicle)




export default router;