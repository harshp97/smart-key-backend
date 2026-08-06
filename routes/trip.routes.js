import { Router } from "express";
import { requestTrip, approveTrip, rejectTrip, requestCabinetUnlock, getMyActiveTrip, getPendingTrips, getOnlyActiveTrips, completeTrip, getVehicleTripHistory, checkCabinetRequest, cabinetOpened } from "../controllers/trip.controller.js"; 
import { verifyJWT, verifyManager } from "../middlewares/auth.middleware.js";

const router = Router();


// The request flows left to right:
// 1. verifyJWT confirms the token and sets req.user
// 2. verifyManager confirms req.user.role === "manager"
// 3. registerUser creates the new trip in the database
// Driver endpoint
router.route("/requestTrip").post(verifyJWT, requestTrip);



// Manager endpoints
router.route("/approveTrip").patch(verifyJWT, approveTrip);
router.route("/rejectTrip").patch(verifyJWT, rejectTrip);


// driver endpoint
router.route("/requestCabinetUnlock").post(verifyJWT, requestCabinetUnlock);


//manager endpoint
//get pending trip request (For Manager screen)
router.route("/pending").get(verifyJWT, verifyManager, getPendingTrips);



//driver endpoint
router.route("/my-active-trip").get(verifyJWT, getMyActiveTrip);


router.route("/getOnlyActiveTrips").get(verifyJWT, verifyManager, getOnlyActiveTrips);

router.route("/completeTrip").post(verifyJWT, completeTrip);

router.route("/getVehicleTripHistory").post(verifyJWT, verifyManager, getVehicleTripHistory);




router.route("/checkCabinetRequest").get(checkCabinetRequest);
router.route("/cabinetOpened").post(cabinetOpened);


export default router;