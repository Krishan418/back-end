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
    const { email, address, phone, website, currency, language, timezone, dateFormat } = req.body;
    
    let settings = await Settings.findOne();
    
    if (!settings) {
      settings = await Settings.create({ email, address, phone, website, currency, language, timezone, dateFormat });
    } else {
      settings.email = email || settings.email;
      settings.address = address || settings.address;
      settings.phone = phone || settings.phone;
      settings.website = website || settings.website;
      settings.currency = currency || settings.currency;
      settings.language = language || settings.language;
      settings.timezone = timezone || settings.timezone;
      settings.dateFormat = dateFormat || settings.dateFormat;
      await settings.save();
    }
    
    res.status(200).json({ success: true, data: settings, message: 'Settings updated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
