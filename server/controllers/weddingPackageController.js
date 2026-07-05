import WeddingPackage from '../models/weddingPackage.js';

// @desc    Get all wedding and event packages
// @route   GET /api/wedding/packages
// @access  Public
export const getPackages = async (req, res) => {
  try {
    const packages = await WeddingPackage.find().sort({ type: -1, price: -1 });
    res.status(200).json({
      success: true,
      count: packages.length,
      data: packages
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update a package
// @route   PUT /api/wedding/packages/:id
// @access  Private/Admin
export const updatePackage = async (req, res) => {
  try {
    const { name, type, price, bites, inclusions } = req.body;

    const pkg = await WeddingPackage.findById(req.params.id);
    if (!pkg) {
      return res.status(404).json({
        success: false,
        message: 'Package not found'
      });
    }

    pkg.name = name !== undefined ? name : pkg.name;
    pkg.type = type !== undefined ? type : pkg.type;
    pkg.price = price !== undefined ? Number(price) : pkg.price;
    pkg.bites = bites !== undefined ? bites : pkg.bites;
    pkg.inclusions = inclusions !== undefined ? inclusions : pkg.inclusions;

    await pkg.save();

    res.status(200).json({
      success: true,
      data: pkg,
      message: 'Package updated successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Create a new package
// @route   POST /api/wedding/packages
// @access  Private/Admin
export const createPackage = async (req, res) => {
  try {
    const { name, type, price, bites, inclusions } = req.body;
    if (!name || !price || !type) {
      return res.status(400).json({
        success: false,
        message: 'Name, Type and Price are required'
      });
    }

    const pkg = await WeddingPackage.create({
      name,
      type,
      price: Number(price),
      bites: bites || '',
      inclusions: inclusions || []
    });

    res.status(201).json({
      success: true,
      data: pkg,
      message: 'Package created successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Delete a package
// @route   DELETE /api/wedding/packages/:id
// @access  Private/Admin
export const deletePackage = async (req, res) => {
  try {
    const pkg = await WeddingPackage.findById(req.params.id);
    if (!pkg) {
      return res.status(404).json({
        success: false,
        message: 'Package not found'
      });
    }

    await pkg.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Package deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
