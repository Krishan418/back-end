import MenuItem from "../models/MenuItem.js";
import asyncHandler from "../middleware/asyncHandler.js";

// View menu items with filter and pagination.
export const getMenuItems = asyncHandler(async (req, res) => {
  const { category, search, page, limit, populate, isAvailable } = req.query;
  let query = {};

  if (category && category !== 'All') query.category = category;
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: "i" } },
      { category: { $regex: search, $options: "i" } }
    ];
  }
  if (isAvailable !== undefined) query.isAvailable = isAvailable === "true";

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
});

// Get menu item by ID
export const getMenuItemById = asyncHandler(async (req, res) => {
  const item = await MenuItem.findById(req.params.id).lean();
  if (!item) {
    res.status(404);
    throw new Error("Menu item not found");
  }

  res.status(200).json(item);
});

// Create a new menu item
export const createMenuItem = asyncHandler(async (req, res) => {
  let { name, category, price, isAvailable, description, inventoryItem, prepTime, hasPortions, portions } = req.body;

  const isPortionsEnabled = hasPortions === "true" || hasPortions === true;

  if (!name || !category) {
    res.status(400);
    throw new Error("Name and category are required");
  }

  if (!isPortionsEnabled && price == null) {
    res.status(400);
    throw new Error("Price is required when portions are disabled");
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
});

// Update an existing menu item
export const updateMenuItem = asyncHandler(async (req, res) => {
  const item = await MenuItem.findById(req.params.id);
  
  if (!item) {
    res.status(404);
    throw new Error("Menu item not found");
  }

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
      /* Ignore portion parse error */
    }
  }

  if (updateData.hasPortions) {
    if (Array.isArray(updateData.portions)) {
      updateData.portions = updateData.portions.map(p => ({
        portionType: p.portionType,
        price: Number(p.price)
      }));
    }
    item.hasPortions = true;
    item.portions = updateData.portions;
    item.price = undefined; // clear price since it has portions
  } else if (updateData.hasPortions === false) {
    item.hasPortions = false;
    item.portions = [];
    if (updateData.price != null && updateData.price !== "") {
      item.price = Number(updateData.price);
    }
  } else {
      // If hasPortions wasn't updated, just update price if provided
      if (updateData.price != null && updateData.price !== "") {
          item.price = Number(updateData.price);
      }
  }

  if (updateData.name !== undefined) item.name = updateData.name;
  if (updateData.category !== undefined) item.category = updateData.category;
  if (updateData.description !== undefined) item.description = updateData.description;
  if (updateData.image !== undefined) item.image = updateData.image;
  
  if (updateData.inventoryItem !== undefined) {
      item.inventoryItem = updateData.inventoryItem === "" ? null : updateData.inventoryItem;
  }
  if (updateData.prepTime != null && updateData.prepTime !== "") {
      item.prepTime = Number(updateData.prepTime);
  }
  if (updateData.isAvailable !== undefined) {
    item.isAvailable = updateData.isAvailable === 'true' || updateData.isAvailable === true;
  }

  await item.save();
  res.status(200).json(item);
});

// Delete a menu item
export const deleteMenuItem = asyncHandler(async (req, res) => {
  const item = await MenuItem.findByIdAndDelete(req.params.id);
  if (!item) {
    res.status(404);
    throw new Error("Menu item not found");
  }

  res.status(200).json({ message: "Menu item successfully deleted" });
});
