import mongoose, { Schema } from "mongoose";

const vehicleSchema = new Schema(
  {
    name: { 
      type: String, 
      required: true,
      trim: true 
    },
    plate_number: { 
      type: String, 
      required: true, 
      unique: true,
      uppercase: true,
      trim: true 
    },
    slot: { 
      type: Number, 
      required: true, 
      unique: true // Must map to a single specific key slot in the hardware cabinet
    }, 
    status: { 
      type: String, 
      enum: ["available", "pending", "approved", "on_road"], 
      default: "available" 
    },
    
        // available: user can requset for vehicle
        // pending: user has requested for vehicle and waiting for manager approval
        // approved: manager has approved the request and user can take the vehicle(but not yet taken the vehicle physically)
        // on_road: user has taken the vehicle and is on road, vehicle is not available for other users

    odometer: { 
      type: Number, 
      required: true, 
      default: 0 
    },
    key_physically_present: { 
      type: Boolean, 
      default: true // This is updated by the cabinet's physical limit switch
    }, 
    // true  :- avail
    // false :- not avail


    is_active: { 
      type: Boolean, 
      default: true 
    },
    puc_expiry_date: {
      type: Date,
      required: true
    },
    insurance_expiry_date: {
      type: Date,
      required: true
    },
    upcoming_service_date: {
      type: Date,
      required: true
    },
  },
  { timestamps: true }
);

export const Vehicle = mongoose.model("Vehicle", vehicleSchema);