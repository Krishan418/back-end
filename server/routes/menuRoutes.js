import express from "express";
import {
  getMenuItems,
  getMenuItemById,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
} from "../controllers/menuController.js";



import upload from "../middleware/upload.js"; 

const router = express.Router();

// Public Routes (Customers)
router.get("/", getMenuItems);
router.get("/:id", getMenuItemById);

// Protected Routes (Admin/Manager)
router.post(
  "/",
  upload.single("image"), 
  createMenuItem
);

router.put(
  "/:id",
  //verifyToken,
  //authorizeRoles("Admin", "Manager"),
  upload.single("image"),
  updateMenuItem
);

router.delete(
  "/:id",
  //verifyToken,
  //authorizeRoles("Admin", "Manager"),
  deleteMenuItem
);

export default router;