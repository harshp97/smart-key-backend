import mongoose, { Schema } from "mongoose"; // Fix: Proper default import for mongoose
import aggregatePaginate from "mongoose-aggregate-paginate-v2"; // Fix: Default import for the plugin

const tripSchema = new Schema(
  {
    driver_id: { type: Schema.Types.ObjectId, ref: "User", required: true },
    vehicle_id: { type: Schema.Types.ObjectId, ref: "Vehicle", required: true },
    manager_id: { type: Schema.Types.ObjectId, ref: "User", default: null },
    destination: { type: String, required: true },
    purpose: { type: String, required: true },
    crew_members: { type: String, required: true },
    status: { type: String, enum: ["requested", "approved", "active", "completed", "rejected"], default: "requested" },
    odo_start: { type: Number },
    odo_end: { type: Number },
    timestamps: {
      requested_at: { type: Date, default: Date.now },
      approved_at: { type: Date },
      released_at: { type: Date }, 
      returned_at: { type: Date }  
    }
  },
  { timestamps: true }
);

// Inject the pagination plugin into the schema
tripSchema.plugin(aggregatePaginate);

export const Trip = mongoose.model("Trip", tripSchema);