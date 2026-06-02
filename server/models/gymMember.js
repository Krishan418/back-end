import mongoose from "mongoose";

const gymMemberSchema = new mongoose.Schema({
  memberId: {
    type: String,
    required: true,
    unique: true
  },
  
  name: {
    type: String,
    required: true
  },
  phone: {
    type: String,
    required: true
  },
  email: {
    type: String,
    default: ''
  },
  nic: {
    type: String,
    default: ''
  },
  gender: {
    type: String,
    default: 'Male'
  },
  dob: {
    type: String,
    default: ''
  },
  address: {
    type: String,
    default: ''
  },
  emergencyName: {
    type: String,
    default: ''
  },
  emergencyPhone: {
    type: String,
    default: ''
  },
  medicalNotes: {
    type: String,
    default: ''
  },
  joinedDate: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['Active', 'Inactive'],
    default: 'Active'
  }
});

const GymMember = mongoose.model("GymMember", gymMemberSchema);
export default GymMember;
