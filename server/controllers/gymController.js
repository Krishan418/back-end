import GymPass from '../models/gymPass.js';
import GymAttendance from '../models/gymAttendance.js';
import GymMember from '../models/gymMember.js';
import sendEmail from '../utils/email.js';
import Settings from '../models/Settings.js';

export const createGymPass = async (req, res) => {
  try {
    const {
      passType,
      guestName,
      guestPhone,
      guestEmail = '',
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

    // Generate valid Date
    const validDate = new Date();
    validDate.setDate(validDate.getDate() + Number(validDays));

    // Generate unique qrCodeKey
    const qrCodeKey = `JANRO-GYM-${Date.now().toString().slice(-6)}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    
    // Generate unique passId
    const passId = `JANRO-PASS-${Math.floor(1000 + Math.random() * 9000)}`;

    console.log("createGymPass invoked. req.body:", req.body);

    const pass = await GymPass.create({
      passId,
      passType,
      guestName,
      guestPhone,
      guestEmail,
      roomNumber,
      qrCodeKey,
      paymentStatus,
      validDate,
      status: 'Active'
    });

    console.log("Gym pass created. ID:", pass._id, "Email:", guestEmail);

    // Send Welcome Email with QR Code if guestEmail is provided
    if (guestEmail) {
      console.log("Attempting to send pass QR code email to:", guestEmail);
      try {
        const settings = await Settings.findOne() || { hotelName: 'Hotel Janro' };
        const hotelName = settings.headerName || settings.hotelName || 'Hotel Janro';

        const subject = `${hotelName} Gym - Your Access Pass QR Code!`;
        const textMessage = `Dear ${guestName},\n\nYour Gym Pass has been issued successfully.\n\nPass ID: ${passId}\nPass Type: ${passType}\nValid Until: ${validDate.toLocaleString()}\n\nPlease scan your Pass QR code at the gate to check in.`;

        const html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
            <div style="background-color: #0F172A; padding: 24px; text-align: center; color: white;">
              <h1 style="margin: 0; color: #D4AF37; font-size: 24px;">Your Gym Access Pass</h1>
              <p style="margin: 4px 0 0 0; font-size: 14px; text-transform: uppercase; letter-spacing: 2px;">Pass Issued Successfully</p>
            </div>
            <div style="padding: 24px; color: #334155;">
              <p>Dear <strong>${guestName}</strong>,</p>
              <p>Your Gym Access Pass has been issued successfully. Below are your pass details and access QR code.</p>
              
              <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 24px 0;">
                <h3 style="margin-top: 0; color: #0F172A; font-size: 16px; border-bottom: 1px solid #cbd5e1; padding-bottom: 8px;">Pass Details</h3>
                <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                  <tr>
                    <td style="padding: 6px 0; color: #64748b; width: 40%;">Pass ID:</td>
                    <td style="padding: 6px 0; font-weight: bold; color: #0F172A;">${passId}</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; color: #64748b;">Pass Type:</td>
                    <td style="padding: 6px 0; font-weight: bold; color: #D4AF37; text-transform: uppercase;">${passType}</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; color: #64748b;">Phone:</td>
                    <td style="padding: 6px 0; color: #0F172A;">${guestPhone}</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; color: #64748b;">Valid Until:</td>
                    <td style="padding: 6px 0; color: #0F172A; font-weight: bold;">${validDate.toLocaleString()}</td>
                  </tr>
                </table>
              </div>

              <div style="text-align: center; margin: 32px 0;">
                <p style="margin-bottom: 12px; font-weight: bold; color: #0F172A;">Your Gate Access QR Code</p>
                <div style="display: inline-block; padding: 16px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
                  <img src="https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${qrCodeKey}" alt="Gym Pass QR Code" style="display: block; width: 200px; height: 200px;" />
                </div>
                <p style="font-size: 12px; color: #64748b; margin-top: 8px;">Scan this QR code at the entrance gate to check in.</p>
              </div>

              <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
              <p style="font-size: 14px; line-height: 1.5;">If you have any questions, please contact the gym reception desk or front office.</p>
              <p style="font-size: 14px; margin-top: 24px;">Best regards,<br/><strong>Management Team</strong><br/>${hotelName}</p>
            </div>
            <div style="background-color: #f8fafc; padding: 16px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0;">
              &copy; ${new Date().getFullYear()} ${hotelName}. All rights reserved.
            </div>
          </div>
        `;

        await sendEmail({
          email: guestEmail,
          subject,
          message: textMessage,
          html,
          hotelName
        });
        console.log("Pass QR code email sent successfully to:", guestEmail);
      } catch (emailError) {
        console.error('Failed to send pass QR code email:', emailError);
      }
    } else {
      console.log("No guestEmail provided, skipping email sending.");
    }

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
    let pass = await GymPass.findOne({ qrCodeKey });
    let member = null;

    if (!pass) {
      // Lookup gym member
      member = await GymMember.findOne({ memberId: qrCodeKey });
      
      if (!member) {
        return res.status(404).json({
          success: false,
          message: 'Pass or Member not recognized. QR Code is invalid!'
        });
      }

      // Verify Member status
      if (member.status !== 'Active') {
        return res.status(400).json({
          success: false,
          message: `Access denied! Member ${member.name} is Inactive.`
        });
      }

      // Validation successful! Record attendance
      const attendance = await GymAttendance.create({
        memberId: member._id,
        guestName: member.name,
        passType: 'Membership',
        roomNumber: ''
      });

      return res.status(200).json({
        success: true,
        message: `Welcome, ${member.name}! Access Granted.`,
        attendance,
        member
      });
    }

    // Verify Payment for Pass
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

    // Send Welcome Email if email is provided
    if (email) {
      try {
        const settings = await Settings.findOne() || { hotelName: 'Hotel Janro' };
        const hotelName = settings.hotelName;

        const subject = `Welcome to ${hotelName} Gym - Successfully Registered!`;
        const textMessage = `Dear ${name},\n\nWelcome to ${hotelName} Gym! Your membership has been registered successfully.\n\nMember ID: ${memberId}\n\nThank you for choosing us!`;

        const html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
            <div style="background-color: #0F172A; padding: 24px; text-align: center; color: white;">
              <h1 style="margin: 0; color: #D4AF37; font-size: 24px;">Welcome to ${hotelName} Gym!</h1>
              <p style="margin: 4px 0 0 0; font-size: 14px; text-transform: uppercase; letter-spacing: 2px;">Membership Registered Successfully</p>
            </div>
            <div style="padding: 24px; color: #334155;">
              <p>Dear <strong>${name}</strong>,</p>
              <p>We are excited to welcome you as a registered member of our Gym! Your membership registration is now active.</p>
              
              <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 24px 0;">
                <h3 style="margin-top: 0; color: #0F172A; font-size: 16px; border-bottom: 1px solid #cbd5e1; padding-bottom: 8px;">Membership Details</h3>
                <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                  <tr>
                    <td style="padding: 6px 0; color: #64748b; width: 40%;">Member ID:</td>
                    <td style="padding: 6px 0; font-weight: bold; color: #0F172A;">${memberId}</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; color: #64748b;">Phone:</td>
                    <td style="padding: 6px 0; color: #0F172A;">${phone}</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; color: #64748b;">NIC:</td>
                    <td style="padding: 6px 0; color: #0F172A;">${nic || 'N/A'}</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; color: #64748b;">Gender:</td>
                    <td style="padding: 6px 0; color: #0F172A;">${gender}</td>
                  </tr>
                </table>
              </div>

              <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
              <p style="font-size: 14px; line-height: 1.5;">If you have any questions or require assistance, please feel free to reach out to the gym reception counter or contact hotel management.</p>
              <p style="font-size: 14px; margin-top: 24px;">Best regards,<br/><strong>Management Team</strong><br/>${hotelName}</p>
            </div>
            <div style="background-color: #f8fafc; padding: 16px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0;">
              &copy; ${new Date().getFullYear()} ${hotelName}. All rights reserved.
            </div>
          </div>
        `;

        await sendEmail({
          email,
          subject,
          message: textMessage,
          html,
          hotelName
        });
      } catch (emailError) {
        console.error('Failed to send welcome email to gym member:', emailError);
      }
    }

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
