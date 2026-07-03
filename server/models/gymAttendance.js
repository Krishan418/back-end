
import mongoose from "mongoose";

const gymAttendanceSchema = new mongoose.Schema({
  passId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'GymPass',
    required: true
  },
  guestName: {
    type: String,
    required: true
  },
  passType: {
    type: String,
    required: true
  },
  roomNumber: {
    type: String,
    default: ''
  },
  checkInTime: {
    type: Date,
    default: Date.now
  }
});

const GymAttendance = mongoose.model("GymAttendance", gymAttendanceSchema);
export default GymAttendance;
