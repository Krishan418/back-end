import GymPass from '../models/gymPass.js';
import GymAttendance from '../models/gymAttendance.js';
import GymMember from '../models/gymMember.js';

export const createGymPass = async (req, res) => {
  try {
    const {
      passType,
      guestName,
      guestPhone,
      roomNumber = '',
      paymentStatus = 'Paid',
      validDays = 1
    } = req.body || {};

    if (!passType || !guestName || !guestPhone) {
      return res.status(400).json({
        success: false,
        message: 'passType, guestName, and guestPhone are required.'
      });
    }

    // Generate validDate
    const validDate = new Date();
    validDate.setDate(validDate.getDate() + Number(validDays));

    // Generate unique qrCodeKey
    const qrCodeKey = `JANRO-GYM-${Date.now().toString().slice(-6)}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    
    // Generate unique passId
    const passId = `JANRO-PASS-${Math.floor(1000 + Math.random() * 9000)}`;

    const pass = await GymPass.create({
      passId,
      passType,
      guestName,
      guestPhone,
      roomNumber,
      qrCodeKey,
      paymentStatus,
      validDate,
      status: 'Active'
    });

    return res.status(201).json({
      success: true,
      message: 'Gym pass created successfully.',
      pass
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const listGymPasses = async (req, res) => {
  try {
    const passes = await GymPass.find().sort({ createdAt: -1 });
    return res.status(200).json({
      success: true,
      passes
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const verifyGymScan = async (req, res) => {
  try {
    const { qrCodeKey } = req.body || {};

    if (!qrCodeKey) {
      return res.status(400).json({
        success: false,
        message: 'qrCodeKey is required.'
      });
    }

    // Lookup pass
    const pass = await GymPass.findOne({ qrCodeKey });

    if (!pass) {
      return res.status(404).json({
        success: false,
        message: 'Pass not recognized. QR Code is invalid!'
      });
    }

    // Verify Payment
    if (pass.paymentStatus !== 'Paid') {
      return res.status(400).json({
        success: false,
        message: `Payment pending! Access denied for guest ${pass.guestName}.`
      });
    }

    // Verify Expiry
    const today = new Date();
    if (new Date(pass.validDate) < today) {
      if (pass.status !== 'Expired') {
        pass.status = 'Expired';
        await pass.save();
      }
      return res.status(400).json({
        success: false,
        message: `Pass expired on ${new Date(pass.validDate).toLocaleDateString()}! Access denied for guest ${pass.guestName}.`
      });
    }

    // If cancelled
    if (pass.status === 'Cancelled') {
      return res.status(400).json({
        success: false,
        message: 'This pass has been cancelled. Access denied.'
      });
    }

    // Validation successful! Record attendance
    const attendance = await GymAttendance.create({
      passId: pass._id,
      guestName: pass.guestName,
      passType: pass.passType,
      roomNumber: pass.roomNumber
    });

    return res.status(200).json({
      success: true,
      message: `Welcome, ${pass.guestName}! Access Granted.`,
      attendance,
      pass
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const listGymAttendance = async (req, res) => {
  try {
    const attendance = await GymAttendance.find().sort({ checkInTime: -1 });
    return res.status(200).json({
      success: true,
      attendance
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const deleteGymPass = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedPass = await GymPass.findByIdAndDelete(id);
    if (!deletedPass) {
      return res.status(404).json({ success: false, message: 'Pass not found' });
    }
    return res.status(200).json({
      success: true,
      message: 'Gym pass deleted successfully.'
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const updateGymPass = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      passType,
      guestName,
      guestPhone,
      roomNumber,
      paymentStatus,
      status,
      validDays
    } = req.body || {};

    const pass = await GymPass.findById(id);
    if (!pass) {
      return res.status(404).json({
        success: false,
        message: 'Gym pass not found.'
      });
    }

    if (passType) pass.passType = passType;
    if (guestName) pass.guestName = guestName;
    if (guestPhone) pass.guestPhone = guestPhone;
    if (roomNumber !== undefined) pass.roomNumber = roomNumber;
    if (paymentStatus) pass.paymentStatus = paymentStatus;
    if (status) pass.status = status;
    
    if (validDays) {
      const validDate = new Date();
      validDate.setDate(validDate.getDate() + Number(validDays));
      pass.validDate = validDate;
    }

    await pass.save();

    return res.status(200).json({
      success: true,
      message: 'Gym pass updated successfully.',
      pass
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const createGymMember = async (req, res) => {
  try {
    const { 
      name, 
      phone, 
      email = '', 
      nic = '', 
      gender = 'Male', 
      dob = '', 
      address = '', 
      emergencyName = '', 
      emergencyPhone = '', 
      medicalNotes = '', 
      status = 'Active' 
    } = req.body || {};

    if (!name || !phone) {
      return res.status(400).json({
        success: false,
        message: 'Name and phone number are required.'
      });
    }

    const memberId = `JANRO-MEM-${Math.floor(1000 + Math.random() * 9000)}`;

    const member = await GymMember.create({
      memberId,
      name,
      phone,
      email,
      nic,
      gender,
      dob,
      address,
      emergencyName,
      emergencyPhone,
      medicalNotes,
      status
    });

    return res.status(201).json({
      success: true,
      message: 'Gym member registered successfully.',
      member
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const listGymMembers = async (req, res) => {
  try {
    const members = await GymMember.find().sort({ joinedDate: -1 });
    return res.status(200).json({
      success: true,
      members
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const updateGymMember = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      name, 
      phone, 
      email, 
      nic, 
      gender, 
      dob, 
      address, 
      emergencyName, 
      emergencyPhone, 
      medicalNotes, 
      status 
    } = req.body || {};

    const member = await GymMember.findById(id);
    if (!member) {
      return res.status(404).json({
        success: false,
        message: 'Gym member not found.'
      });
    }

    if (name) member.name = name;
    if (phone) member.phone = phone;
    if (email !== undefined) member.email = email;
    if (nic !== undefined) member.nic = nic;
    if (gender !== undefined) member.gender = gender;
    if (dob !== undefined) member.dob = dob;
    if (address !== undefined) member.address = address;
    if (emergencyName !== undefined) member.emergencyName = emergencyName;
    if (emergencyPhone !== undefined) member.emergencyPhone = emergencyPhone;
    if (medicalNotes !== undefined) member.medicalNotes = medicalNotes;
    if (status) member.status = status;

    await member.save();

    return res.status(200).json({
      success: true,
      message: 'Gym member updated successfully.',
      member
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const deleteGymMember = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedMember = await GymMember.findByIdAndDelete(id);
    if (!deletedMember) {
      return res.status(404).json({ success: false, message: 'Member not found.' });
    }
    return res.status(200).json({
      success: true,
      message: 'Gym member deleted successfully.'
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
