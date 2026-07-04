import Settings from '../models/Settings.js';

// Get settings
export const getSettings = async (req, res) => {
  try {
    let settings = await Settings.findOne();
    if (!settings) {
      // Create default settings if none exist
      settings = await Settings.create({});
    }
    res.status(200).json({ success: true, data: settings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update settings
export const updateSettings = async (req, res) => {
  try {
    const { hotelName, email, address, phone, website, currency, language, timezone, dateFormat, notifications, bankAccounts } = req.body;
    
    let settings = await Settings.findOne();
    
    if (!settings) {
      settings = await Settings.create({ hotelName, email, address, phone, website, currency, language, timezone, dateFormat, notifications, bankAccounts });
    } else {
      if (hotelName !== undefined) settings.hotelName = hotelName;
      if (email !== undefined) settings.email = email;
      if (address !== undefined) settings.address = address;
      if (phone !== undefined) settings.phone = phone;
      if (website !== undefined) settings.website = website;
      if (currency !== undefined) settings.currency = currency;
      if (language !== undefined) settings.language = language;
      if (timezone !== undefined) settings.timezone = timezone;
      if (dateFormat !== undefined) settings.dateFormat = dateFormat;
      if (notifications !== undefined) settings.notifications = notifications;
      if (bankAccounts !== undefined) settings.bankAccounts = bankAccounts;
      await settings.save();
    }
    
    res.status(200).json({ success: true, data: settings, message: 'Settings updated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
