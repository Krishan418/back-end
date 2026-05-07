import MenuItem from "../models/MenuItem.js";

// 1. GET ALL ITEMS (Search, Filter, Pagination, Populate)
export const getMenuItems = async (req, res) => {
  try {
    const { category, search, page, limit, populate } = req.query;
    let query = {};

    if (category) query.category = category;
    if (search) query.name = { $regex: search, $options: "i" };

    // If no page/limit, return all (useful for dropdowns/simple lists)
    if (!page && !limit) {
      let q = MenuItem.find(query).sort({ name: 1 });
      if (populate) q = q.populate(populate);
      const items = await q.lean();
      return res.status(200).json(items);
    }

    const p = Number(page) || 1;
    const l = Number(limit) || 10;
    const skip = (p - 1) * l;

    let q = MenuItem.find(query).sort({ createdAt: -1 }).skip(skip).limit(l);
    if (populate) q = q.populate(populate);
    
    const items = await q.lean();
    const totalItems = await MenuItem.countDocuments(query);

    res.status(200).json({
      items,
      totalPages: Math.ceil(totalItems / l),
      currentPage: p,
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
    const { name, category, price, isAvailable, description, inventoryItem, prepTime } = req.body;

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
      name,
      category,
      price: Number(price),
      isAvailable: isAvailable === "true" || isAvailable === true,
      description,
      image,
      inventoryItem: inventoryItem || null,
      prepTime: Number(prepTime) || 15,
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

    // Handle inventoryItem mapping and numeric casting for updates
    if (req.body.inventoryItem === "") req.body.inventoryItem = null;
    if (req.body.price != null) req.body.price = Number(req.body.price);
    if (req.body.prepTime != null) req.body.prepTime = Number(req.body.prepTime);
    if (req.body.isAvailable !== undefined) {
      req.body.isAvailable = req.body.isAvailable === 'true' || req.body.isAvailable === true;
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