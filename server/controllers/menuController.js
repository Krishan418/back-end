import MenuItem from "../models/MenuItem.js";

// Fetch all menu items with optional filtering and pagination
export const getMenuItems = async (req, res) => {
  try {
    const { category, search, page, limit, populate } = req.query;
    let query = {};

    if (category) query.category = category;
    if (search) query.name = { $regex: search, $options: "i" };

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

// Fetch a single menu item by ID
export const getMenuItemById = async (req, res) => {
  try {
    const item = await MenuItem.findById(req.params.id).lean();
    if (!item) return res.status(404).json({ message: "Menu item not found" });
    
    res.status(200).json(item);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Create a new menu item
export const createMenuItem = async (req, res) => {
  try {
    let { name, category, price, isAvailable, description, inventoryItem, prepTime, hasPortions, portions } = req.body;

    const isPortionsEnabled = hasPortions === "true" || hasPortions === true;
    
    if (!name || !category) {
      return res.status(400).json({ message: "Name and category are required" });
    }

    if (!isPortionsEnabled && price == null) {
      return res.status(400).json({ message: "Price is required when portions are disabled" });
    }

    let parsedPortions = [];
    if (isPortionsEnabled && portions) {
      parsedPortions = typeof portions === "string" ? JSON.parse(portions) : portions;
      parsedPortions = parsedPortions.map(p => ({ ...p, price: Number(p.price) }));
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
      price: isPortionsEnabled ? undefined : Number(price),
      hasPortions: isPortionsEnabled,
      portions: parsedPortions,
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

// Update an existing menu item
export const updateMenuItem = async (req, res) => {
  try {
    const updateData = { ...req.body };

    if (req.file) {
      updateData.image = req.file.path.replace(/\\/g, "/");
    }

    if (updateData.hasPortions !== undefined) {
      updateData.hasPortions = updateData.hasPortions === 'true' || updateData.hasPortions === true;
    }

    if (updateData.portions && typeof updateData.portions === "string") {
      try {
        updateData.portions = JSON.parse(updateData.portions);
      } catch (e) {
        console.error("Portions parse error:", e);
      }
    }

    if (updateData.hasPortions) {
      if (Array.isArray(updateData.portions)) {
        updateData.portions = updateData.portions.map(p => ({ 
          portionType: p.portionType, 
          price: Number(p.price) 
        }));
      }
    } else {
      updateData.portions = []; 
      if (updateData.price != null) {
        updateData.price = Number(updateData.price);
      }
    }

    if (updateData.inventoryItem === "") updateData.inventoryItem = null;
    if (updateData.prepTime != null) updateData.prepTime = Number(updateData.prepTime);
    if (updateData.isAvailable !== undefined) {
      updateData.isAvailable = updateData.isAvailable === 'true' || updateData.isAvailable === true;
    }

    const item = await MenuItem.findByIdAndUpdate(req.params.id, updateData, { 
      new: true, 
      runValidators: true 
    });
    
    if (!item) return res.status(404).json({ message: "Menu item not found" });
    res.status(200).json(item);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete a menu item
export const deleteMenuItem = async (req, res) => {
  try {
    const item = await MenuItem.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ message: "Menu item not found" });
    
    res.status(200).json({ message: "Menu item successfully deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};