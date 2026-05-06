import MenuItem from "../models/MenuItem.js";

// 1. GET ALL ITEMS (Search, Filter, Pagination)
export const getMenuItems = async (req, res) => {
  try {
    const { category, search, page = 1, limit = 10 } = req.query;
    let query = {};

    if (category) query.category = category;
    if (search) query.name = { $regex: search, $options: "i" };

    const skip = (page - 1) * limit;

    // .lean() added for faster reads (returns plain JS objects)
    const items = await MenuItem.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean();

    const totalItems = await MenuItem.countDocuments(query);

    res.status(200).json({
      items,
      totalPages: Math.ceil(totalItems / limit),
      currentPage: Number(page),
      totalItems
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 2. GET SINGLE ITEM
export const getMenuItemById = async (req, res) => {
  try {
    const item = await MenuItem.findById(req.params.id).lean();
    if (!item) return res.status(404).json({ message: "Menu item not found" });
    
    res.status(200).json(item);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 3. CREATE ITEM
export const createMenuItem = async (req, res) => {
  try {
    const { name, category, price, isAvailable, description, inventoryId } = req.body;

    if (!name || !category || price == null) {
      return res.status(400).json({ message: "Name, category, and price are required" });
    }
    if (Number(price) <= 0) {
      return res.status(400).json({ message: "Price must be greater than zero" });
    }

    let image = "";
    if (req.file) {
      image = req.file.path.replace(/\\/g, "/"); 
    } else if (req.body.image) {
      image = req.body.image; 
    }

    const item = await MenuItem.create({
      name, category, price: Number(price), isAvailable, description, image, inventoryId
    });

    res.status(201).json(item);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 4. UPDATE ITEM
export const updateMenuItem = async (req, res) => {
  try {
    if (req.body.price != null && Number(req.body.price) <= 0) {
      return res.status(400).json({ message: "Price must be greater than zero" });
    }

    if (req.file) {
      req.body.image = req.file.path.replace(/\\/g, "/");
    }

    // runValidators: true added to ensure schema rules are checked on update
    const item = await MenuItem.findByIdAndUpdate(req.params.id, req.body, { 
      new: true, 
      runValidators: true 
    });
    
    if (!item) return res.status(404).json({ message: "Menu item not found" });
    res.status(200).json(item);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 5. DELETE ITEM
export const deleteMenuItem = async (req, res) => {
  try {
    const item = await MenuItem.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ message: "Menu item not found" });
    
    res.status(200).json({ message: "Menu item successfully deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};