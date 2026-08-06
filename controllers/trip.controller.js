import { Trip } from "../models/trip.models.js";
import { Vehicle } from "../models/vehicle.models.js";
import { User } from "../models/user.models.js";
import mongoose from "mongoose";




// 1. Request a Key (Create a Trip)
// driver makes req for key when for first time
// when trip id is created then driver Waites for manager approval.
// This is the purose of this function
export const requestTrip = async (req, res) => {
    // Note: Assuming driver_id is sent in req.body per your request, 
    // though in production you might prefer pulling it from req.user._id (the JWT token)
    const { vehicle_id, driver_id, destination, purpose, crew_members } = req.body;

    try {
        // 1. Validate incoming data
        if (!vehicle_id || !driver_id || !destination || !purpose) {
            return res.status(400).json({ message: "Vehicle ID, Driver ID, Destination, and Purpose are required." });
        }

        // 2. Fetch the vehicle and run availability checks
        const vehicle = await Vehicle.findById(vehicle_id);
        if (!vehicle) {
            return res.status(404).json({ message: "Vehicle not found." });
        }
        if (!vehicle.is_active) {
            return res.status(403).json({ message: "This vehicle is currently inactive." });
        }
        if (vehicle.status !== "available") {
            return res.status(409).json({
                message: `Cannot request key. Vehicle is currently ${vehicle.status}.`
            });
        }
        if (vehicle.key_physically_present !== true) {
            return res.status(409).json({
                message: `Cannot request key. Vehicle key is currently ${vehicle.key_physically_present ? "available" : "not available"}.`
            });
        }

        // 3. Odometer Logic: Find the last completed trip for this specific vehicle
        const lastTrip = await Trip.findOne({ vehicle_id }).sort({ createdAt: -1 });

        // If a last trip exists and has an odo_end, use it. Otherwise, default to 0.
        const odo_start = (lastTrip && lastTrip.odo_end) ? lastTrip.odo_end : 0;

        // 4. Create the new Trip document
        const newTrip = await Trip.create({
            driver_id,
            vehicle_id,
            destination,
            purpose,
            crew_members,
            odo_start,
            status: "requested" // Status defaults to requested
            // manager_id remains null for now
        });

        // 5. Update the Vehicle status to 'pending' to lock it for this driver
        await Vehicle.updateOne(
            { _id: vehicle._id },
            { $set: { status: "pending" } }
        );


        //io- non refresh functionality for manager to get the new trip request instantly without refreshing the page
        // A. Fetch the trip again to populate driver and vehicle details
        const populatedTrip = await Trip.findById(newTrip._id)
            .populate("driver_id", "name")
            .populate("vehicle_id", "name plate_number slot");

        // B. Get the 'io' instance we set up in index.js
        const io = req.app.get("io");

        // C. Push the data to the managers instantly over WebSockets
        io.to("managers").emit("new_trip_request", populatedTrip);

        return res.status(201).json({
            message: "Key request submitted successfully. Waiting for manager approval.",
            trip: newTrip
        });

    } catch (error) {
        return res.status(500).json({ message: error.message || "Failed to submit trip request." });
    }
};



// 2. Approve a Trip Request (this is for Manager's Action)
// This is called when a manager approves a trip request. It updates the trip status to 'approved' and the vehicle status to 'approved'.
export const approveTrip = async (req, res) => {
    const { trip_id } = req.body; 
    const manager_id = req.user?._id || req.body.manager_id; // Matches your updated schema field

    try {
        if (!trip_id) {
            return res.status(400).json({ message: "Trip ID is required." });
        }

        // Atomic update: only updates if the current status is 'requested'
        const trip = await Trip.findOneAndUpdate(
            { _id: trip_id, status: "requested" },
            { 
                $set: { 
                    status: "approved",
                    manager_id: manager_id,
                    "timestamps.approved_at": Date.now()
                } 
            },
            { new: true }
        );

        if (!trip) {
            return res.status(400).json({ 
                message: "Trip not found, or it has already been processed." 
            });
        }

        // Update Vehicle status to 'approved'
        await Vehicle.updateOne(
            { _id: trip.vehicle_id },
            { $set: { status: "approved" } }
        );

        // Fetch populated data for the real-time push
        const populatedTrip = await Trip.findById(trip_id)
            .populate("driver_id", "name")
            .populate("vehicle_id", "name plate_number slot");

        // --- REAL-TIME WEBSOCKETS ---
        const io = req.app.get("io");
        
        // Notify the specific driver
        io.to(`driver_${trip.driver_id}`).emit("trip_status_update", {
            status: "approved",
            message: "Your key request has been approved!",
            trip: populatedTrip
        });

        // Clear from other managers' screens
        io.to("managers").emit("remove_pending_request", trip_id);

        return res.status(200).json({
            message: "Trip approved successfully.",
            trip: populatedTrip
        });

    } catch (error) {
        return res.status(500).json({ message: error.message || "Failed to approve trip." });
    }
};

// 3. Reject a Trip Request (Manager Action)
export const rejectTrip = async (req, res) => {
    const { trip_id, rejection_reason } = req.body; // reason comes from body, but won't be saved to DB
    const manager_id = req.user?._id || req.body.manager_id;

    try {
        if (!trip_id) {
            return res.status(400).json({ message: "Trip ID is required." });
        }

        // Atomic update: sets status to 'rejected' and records the manager who did it
        const trip = await Trip.findOneAndUpdate(
            { _id: trip_id, status: "requested" },
            { 
                $set: { 
                    status: "rejected",
                    manager_id: manager_id
                } 
            },
            { new: true }
        );

        if (!trip) {
            return res.status(400).json({ 
                message: "Trip not found, or it has already been processed." 
            });
        }

        // Release the vehicle lock: make it 'available' again for other drivers
        await Vehicle.updateOne(
            { _id: trip.vehicle_id },
            { $set: { status: "available" } }
        );

        // --- REAL-TIME WEBSOCKETS ---
        const io = req.app.get("io");

        // We pipe the rejection_reason straight into the WebSocket event!
        io.to(`driver_${trip.driver_id}`).emit("trip_status_update", {
            status: "rejected",
            message: rejection_reason || "Your key request was denied by management.",
            tripId: trip_id
        });

        // Clear from other managers' screens
        io.to("managers").emit("remove_pending_request", trip_id);

        return res.status(200).json({
            message: "Trip request rejected. Vehicle is available again."
        });

    } catch (error) {
        return res.status(500).json({ message: error.message || "Failed to reject trip." });
    }
};



// 4. Driver clicks "Open Box & Take Key" on their phone screen
export const requestCabinetUnlock = async (req, res) => {
    const { trip_id } = req.body;
    const driver_id = req.user?._id || req.body.driver_id; // Stays consistent with body/JWT design

    console.log(trip_id);
    
    try {
        if (!trip_id) {
            return res.status(400).json({ message: "Trip ID is required in request body." });
        }

        // 1. ATOMIC TRIP UPDATE: Move status to 'active' and set the release timestamp
        // Only executes if the trip belongs to this driver and is currently 'approved'
        const trip = await Trip.findOneAndUpdate(
            { _id: trip_id, driver_id, status: "approved" },
            {
                $set: {
                    status: "active",
                    cabinet_status: "open_requested",
                    "timestamps.released_at": Date.now()
                }
            },
            { returnDocument: 'after' } // Returns the newly modified trip document
        );

        if (!trip) {
            return res.status(400).json({ 
                message: "No approved trip found, or the key has already been unlocked." 
            });
        }

        // 2. ATOMIC VEHICLE UPDATE: Change status to 'on_road' and mark key as false
        await Vehicle.updateOne(
            { _id: trip.vehicle_id },
            {
                $set: {
                    status: "on_road",
                    key_physically_present: false
                }
            }
        );

        // 3. POPULATE DATA: Get full driver and vehicle info for the manager dashboard
        const populatedTrip = await Trip.findById(trip._id)
            .populate("driver_id", "name")
            .populate("vehicle_id", "name plate_number slot");

        // 4. REAL-TIME SOCKET PUSH: Tell the manager the vehicle is officially on the road
        const io = req.app.get("io");
        io.to("managers").emit("vehicle_left_cabinet", {
            message: `Vehicle ${populatedTrip.vehicle_id.plate_number} has been unlocked and is on the road.`,
            trip: populatedTrip
        });



        // ==========================================
        // 5. TRIGGER THE ESP32 HARDWARE
        // Pop the physical lock (simulated by LED right now)
        // ==========================================
        // const ESP32_IP = process.env.ESP32_IP;
        // const slotNumber = populatedTrip.vehicle_id.slot || 1; // Fallback to 1
        
        // try {
        //     // We use fetch to send a GET request to the ESP32
        //     await fetch(`http://${ESP32_IP}/open?slot=${slotNumber}`, { 
        //         method: 'GET',
        //         signal: AbortSignal.timeout(3000) // Timeout after 3s so the backend doesn't hang if ESP32 is off
        //     });
        //     console.log(`[HARDWARE] Successfully sent open command to ESP32 for slot ${slotNumber}`);
        // } catch (hardwareError) {
        //     console.error("[HARDWARE] Trigger failed. Is the ESP32 online?", hardwareError.message);
        //     // We do NOT return an error to the frontend here, because the DB updates were already successful.
        // }


        // 6. RETURN HTTP RESPONSE: Send slot data back to open the physical cabinet box
        return res.status(200).json({
            message: "Unlock command authorized. Trip is now active.",
            slot: populatedTrip.vehicle_id.slot,
            instruction: `Cabinet slot ${populatedTrip.vehicle_id.slot} is open. Please take the key.`
        });

    } catch (error) {
        return res.status(500).json({ message: error.message || "Failed to process key box unlock." });
    }
};




export const checkCabinetRequest = async (req, res) => {
    try {

        const trip = await Trip.findOne({
            status: "active",
            cabinet_status: "open_requested"
        })
        .populate("vehicle_id", "slot");

        if (!trip) {
            return res.status(200).json({
                success: false,
                message: "No request"
            });
        }

        return res.status(200).json({
            success: true,
            trip_id: trip._id,
            slot: trip.vehicle_id.slot
        });

    } catch (err) {

        return res.status(500).json({
            success: false,
            message: err.message
        });

    }
};

export const cabinetOpened = async (req, res) => {

    try {

        const { trip_id } = req.body;

        if (!trip_id) {
            return res.status(400).json({
                success: false,
                message: "trip_id required"
            });
        }

        const trip = await Trip.findByIdAndUpdate(
            trip_id,
            {
                $set: {
                    cabinet_status: "opened"
                }
            },
            {
                returnDocument: "after"
            }
        );

        if (!trip) {
            return res.status(404).json({
                success: false,
                message: "Trip not found"
            });
        }

        return res.json({
            success: true,
            message: "Cabinet marked opened"
        });

    } catch (err) {

        return res.status(500).json({
            success: false,
            message: err.message
        });

    }

};



// 5. Complete Trip & Return Key (Driver Action)
export const completeTrip = async (req, res) => {
    const { trip_id, odo_end } = req.body;
    const driver_id = req.user?._id || req.body.driver_id;

    try {
        // 1. Basic validation
        if (!trip_id || odo_end === undefined) {
            return res.status(400).json({ message: "Trip ID and final odometer reading are required." });
        }

        // 2. Fetch current trip to validate odometer logic
        const activeTrip = await Trip.findOne({ _id: trip_id, driver_id, status: "active" });
        if (!activeTrip) {
            return res.status(404).json({ message: "No active trip found for this driver." });
        }

        // Prevent entering a final odometer lower than the start odometer
        if (Number(odo_end) < activeTrip.odo_start) {
            return res.status(400).json({ 
                message: `Invalid odometer. Final reading cannot be less than starting reading (${activeTrip.odo_start}).` 
            });
        }

        // 3. ATOMIC TRIP UPDATE: Change status to 'completed' and set end details
        const trip = await Trip.findOneAndUpdate(
            { _id: trip_id, status: "active" },
            {
                $set: {
                    status: "completed",
                    odo_end: Number(odo_end),
                    "timestamps.returned_at": Date.now()
                }
            },
            { new: true }
        );

        // 4. ATOMIC VEHICLE UPDATE: Return status to 'available', sync odometer, bring key home
        await Vehicle.updateOne(
            { _id: trip.vehicle_id },
            {
                $set: {
                    status: "available", // Maps to your schema enum to make it ready for the next user
                    odometer: Number(odo_end), // Keeps vehicle master odometer accurate
                    key_physically_present: true
                }
            }
        );

        // 5. POPULATE DATA: Gather details to push over WebSockets
        const populatedTrip = await Trip.findById(trip._id)
            .populate("driver_id", "name mobileNumber")
            .populate("vehicle_id", "name plate_number slot status key_physically_present");

        // --- REAL-TIME WEBOCSETS ---
        const io = req.app.get("io");

        // Update the driver's screen instantly
        io.to(`driver_${trip.driver_id}`).emit("trip_status_update", {
            status: "completed",
            message: "Trip completed successfully. Lock secured.",
            trip: populatedTrip
        });

        // Update the manager dashboard instantly to show the vehicle is back and available
        io.to("managers").emit("vehicle_returned", {
            message: `Vehicle ${populatedTrip.vehicle_id.plate_number} has returned to slot ${populatedTrip.vehicle_id.slot}.`,
            trip: populatedTrip
        });

        return res.status(200).json({
            message: "Trip completed and key returned successfully.",
            trip: populatedTrip
        });

    } catch (error) {
        return res.status(500).json({ message: error.message || "Failed to complete trip." });
    }
};

// Get pending trips for the Manager screen on refresh
export const getPendingTrips = async (req, res) => {
    try {
        const pendingTrips = await Trip.find({ status: "requested" })
            .populate("driver_id", "name")
            .populate("vehicle_id", "name plate_number slot");
        res.status(200).json({ data: pendingTrips });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get the driver's current active/pending trip on refresh
export const getMyActiveTrip = async (req, res) => {
    const driver_id = req.user._id;
    try {
        const trip = await Trip.findOne({ 
            driver_id, 
            status: { $in: ["requested", "approved", "active"] } 
        });
        res.status(200).json({ trip });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// In trip.controller.js
export const getOnlyActiveTrips = async (req, res) => {
    try {
        const trips = await Trip.find({ status: "active" })
            .populate("driver_id", "name") // Fetch driver name
            .populate("vehicle_id", "slot"); // Ensure we have the slot/id info

        return res.status(200).json({
            count: trips.length,
            trips
        });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};
// export const getOnlyActiveTrips = async (req, res) => {
//      try {
//         // Fetch all active trips
//         const trips = await Trip.find({
//             status: "active"
//         });
        
//         return res.status(200).json({
//             message: "All active trips retrieved successfully",
//             count: trips.length,
//             trips
//         });
//     } catch (error) {
//         return res.status(500).json({ message: error.message || "Failed to fetch active trips" });
//     }
// };





export const getVehicleTripHistory = async (req, res) => {
  try {
    const { vehicle_id } = req.body;
    if (!vehicle_id) {
      return res.status(400).json({ message: 'Vehicle ID is required in the body' });
    }

    const trips = await Trip.find({ vehicle_id })
      .populate('driver_id', 'name email')
      .populate('manager_id', 'name email')
      .sort({ createdAt: -1 });
      
    res.status(200).json({ trips });
  } catch (err) {
    console.error('Error fetching vehicle trips:', err);
    res.status(500).json({ message: 'Server error fetching vehicle trips' });
  }
};

// export {
//     requestTrip,
//     approveTrip,
//     rejectTrip,
//     requestCabinetUnlock

// }