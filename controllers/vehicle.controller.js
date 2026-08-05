import { Vehicle } from "../models/vehicle.models.js";


// 1. Create a New Vehicle (Manager Only)
export const createVehicle = async (req, res) => {
    const { 
        name, 
        plate_number, 
        slot, 
        odometer, 
        puc_expiry_date, 
        insurance_expiry_date, 
        upcoming_service_date 
    } = req.body;

    try {
        // Validate required fields matching schema constraints
        if (!name || !plate_number || slot === undefined || !puc_expiry_date || !insurance_expiry_date || !upcoming_service_date) {
            return res.status(400).json({ 
                message: "Name, plate number, slot, PUC expiry date, insurance expiry date, and upcoming service date are required." 
            });
        }

        // Check if plate number already exists
        const existingPlate = await Vehicle.findOne({ plate_number: plate_number.toUpperCase() });
        if (existingPlate) {
            return res.status(409).json({ message: "A vehicle with this plate number already exists." });
        }

        // Check if the physical key cabinet slot is already occupied by another vehicle
        const existingSlot = await Vehicle.findOne({ slot });
        if (existingSlot) {
            return res.status(409).json({ message: `Cabinet slot #${slot} is already assigned to another vehicle.` });
        }

        // Create the new vehicle document in MongoDB
        const vehicle = await Vehicle.create({
            name,
            plate_number: plate_number.toUpperCase(),
            slot,
            odometer: odometer || 0,
            puc_expiry_date,
            insurance_expiry_date,
            upcoming_service_date
        });

        return res.status(201).json({
            message: "Vehicle registered successfully",
            vehicle
        });
    } catch (error) {
        return res.status(500).json({ message: error.message || "Failed to create vehicle" });
    }
};

// 2. Get All Active Vehicles (For selection screen/dashboard) -> Driver screen
export const getAllActiveVehicles = async (req, res) => {
    try {
        // Fetch active vehicles, sorted by cabinet slot number
        const vehicles = await Vehicle.find({ is_active: true }).sort({ slot: 1 });
        
        return res.status(200).json({
            message: "Vehicles retrieved successfully",
            count: vehicles.length,
            vehicles
        });
    } catch (error) {
        return res.status(500).json({ message: error.message || "Failed to fetch vehicles" });
    }
};



// 3. Get All Vehicles (Including inactive ones, for admin/manager view)  -> Manager Screen
export const getAllVehicles = async (req, res) => {
    try {
        // Fetch all vehicles, sorted by cabinet slot number
        const vehicles = await Vehicle.find().sort({ slot: 1 });
        
        return res.status(200).json({
            message: "All vehicles retrieved successfully",
            count: vehicles.length,
            vehicles
        });
    } catch (error) {
        return res.status(500).json({ message: error.message || "Failed to fetch vehicles" });
    }
};



// 4. Get a Single Vehicle by ID or Physical Slot Number
export const getaVehicleDetails = async (req, res) => {
    const { identifier } = req.body; // Can be mongo ID or physical slot number

    try {
        let vehicle;
        
        // Check if the parameter is a valid MongoDB ObjectId, otherwise search by slot number
        if (identifier.match(/^[0-9a-fA-F]{24}$/)) {
            vehicle = await Vehicle.findById(identifier);
        } else {
            vehicle = await Vehicle.findOne({ slot: Number(identifier) });
        }

        if (!vehicle) {
            return res.status(404).json({ message: "Vehicle not found" });
        }

        return res.status(200).json({ vehicle });
    } catch (error) {
        return res.status(500).json({ message: error.message || "Error retrieving vehicle details" });
    }
};


// 5. Delete Vehicle (Soft delete to preserve trip/cabinet history)
export const deleteVehicle = async (req, res) => {
    const { _id } = req.body;

    try {
        const vehicle = await Vehicle.findById(_id);
        if (!vehicle) {
            return res.status(404).json({ message: "Vehicle not found" });
        }

        // We soft-delete by setting is_active to false so existing trips don't break
        vehicle.is_active = false;
        await vehicle.save();

        return res.status(200).json({
            message: "Vehicle deactivated successfully (Soft deleted)"
        });
    } catch (error) {
        return res.status(500).json({ message: error.message || "Failed to delete vehicle" });
    }
};


// 6. update Vehicle odometer 
export const updateVehicleOdometer = async (req, res) => {
    const { _id, odometer } = req.body;

    try {
        const vehicle = await Vehicle.findById(_id);
        if (!vehicle) {
            return res.status(404).json({ message: "Vehicle not found" });
        }

        // Update the odometer reading
        vehicle.odometer = odometer;
        await vehicle.save();

        return res.status(200).json({
            message: "Vehicle odometer updated successfully"
        });
    } catch (error) {
        return res.status(500).json({ message: error.message || "Failed to update vehicle odometer" });
    }
};

// 7. update Vehicle status 
export const updateVehicleStatus = async (req, res) => {
    const { _id, status } = req.body;

    try {
        const vehicle = await Vehicle.findById(id);
        if (!vehicle) {
            return res.status(404).json({ message: "Vehicle not found" });
        }

        // Update the status
        vehicle.status = status;
        await vehicle.save();

        return res.status(200).json({
            message: "Vehicle status updated successfully"
        });
    } catch (error) {
        return res.status(500).json({ message: error.message || "Failed to update vehicle status" });
    }
};


// 8. update key physically present status
export const updateVehicleKeyStatus = async (req, res) => {
    const { _id, key_physically_present } = req.body;

    try {
        const vehicle = await Vehicle.findById(_id);
        if (!vehicle) {
            return res.status(404).json({ message: "Vehicle not found" });
        }

        // Update the key physically present status
        vehicle.key_physically_present = key_physically_present;
        await vehicle.save();

        return res.status(200).json({
            message: "Vehicle key status updated successfully"
        });
    } catch (error) {
        return res.status(500).json({ message: error.message || "Failed to update vehicle key status" });
    }
};

// 9. Update Vehicle Details (Manager Only - Excludes slot, key_physically_present, is_active, and status)
export const updateVehicleDetails = async (req, res) => {
    const { 
        _id, 
        name, 
        plate_number, 
        odometer, 
        puc_expiry_date, 
        insurance_expiry_date, 
        upcoming_service_date 
    } = req.body;

    try {
        if (!_id) {
            return res.status(400).json({ message: "Vehicle ID (_id) is required" });
        }

        // Find existing vehicle
        const vehicle = await Vehicle.findById(_id);
        if (!vehicle) {
            return res.status(404).json({ message: "Vehicle not found" });
        }

        // Check if plate_number is changed and if the new one already exists on another vehicle
        if (plate_number && plate_number.toUpperCase() !== vehicle.plate_number) {
            const existingPlate = await Vehicle.findOne({ 
                plate_number: plate_number.toUpperCase(), 
                _id: { $ne: _id } 
            });
            if (existingPlate) {
                return res.status(409).json({ message: "Another vehicle is already using this plate number" });
            }
            vehicle.plate_number = plate_number.toUpperCase();
        }

        // Update allowed fields if provided in request
        if (name) vehicle.name = name;
        if (odometer !== undefined && odometer !== null) vehicle.odometer = odometer;
        if (puc_expiry_date) vehicle.puc_expiry_date = puc_expiry_date;
        if (insurance_expiry_date) vehicle.insurance_expiry_date = insurance_expiry_date;
        if (upcoming_service_date) vehicle.upcoming_service_date = upcoming_service_date;

        await vehicle.save();

        return res.status(200).json({
            message: "Vehicle details updated successfully",
            vehicle
        });
    } catch (error) {
        return res.status(500).json({ message: error.message || "Failed to update vehicle details" });
    }
};

// 10. delete vehicle (change is_active ) i.e. soft delete (for manager only)
// Soft Delete: Toggle is_active field (true = Active, false = Soft Deleted/Inactive)
export const softDeleteVehicle = async (req, res) => {
    const { _id, is_active } = req.body;

    try {
        if (!_id || is_active === undefined) {
            return res.status(400).json({ message: "Vehicle ID and is_active status are required" });
        }

        const vehicle = await Vehicle.findByIdAndUpdate(
            _id,
            { is_active: Boolean(is_active) },
            { new: true }
        );

        if (!vehicle) {
            return res.status(404).json({ message: "Vehicle not found" });
        }

        return res.status(200).json({
            message: `Vehicle active status updated to ${is_active ? 'Active' : 'Inactive (Soft Deleted)'}`,
            vehicle
        });
    } catch (error) {
        return res.status(500).json({ message: error.message || "Failed to update vehicle status" });
    }
};

// Hard Delete: Permanently remove vehicle from DB (expects _id in req.body)
export const hardDeleteVehicle = async (req, res) => {
    const { _id } = req.body;

    try {
        if (!_id) {
            return res.status(400).json({ message: "Vehicle ID (_id) is required in request body" });
        }

        const vehicle = await Vehicle.findByIdAndDelete(_id);

        if (!vehicle) {
            return res.status(404).json({ message: "Vehicle not found" });
        }

        return res.status(200).json({ message: "Vehicle permanently deleted from database" });
    } catch (error) {
        return res.status(500).json({ message: error.message || "Failed to delete vehicle" });
    }
};



// export {
//     createVehicle,
//     getAllActiveVehicles,
//     getAllVehicles,
//     getaVehicleDetails,
//     deleteVehicle,
//     updateVehicleOdometer,
//     updateVehicleStatus,
//     updateVehicleKeyStatus
// }