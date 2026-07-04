
import mongoose from "mongoose";

const gymAttendanceSchema = new mongoose.Schema({
  passId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'GymPass',
    required: false
  },
  memberId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'GymMember',
    required: false
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
  },
  checkOutTime: {
    type: Date,
    required: false
  }
});

const GymAttendance = mongoose.model("GymAttendance", gymAttendanceSchema);
export default GymAttendance;
