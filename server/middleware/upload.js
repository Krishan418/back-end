let upload;

try {
  const multerModule = await import("multer");
  const multer = multerModule.default;

  // Define the storage location and file naming convention for uploaded photos
  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      // Save uploaded photos to the 'uploads/' directory
      cb(null, "uploads/");
    },
    filename: (req, file, cb) => {
      // Append the current timestamp to the original filename to prevent naming conflicts
      cb(null, `${Date.now()}-${file.originalname}`);
    },
  });

  // Filter to ensure only image files are accepted
  const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed!"), false);
    }
  };

  upload = multer({
    storage,
    fileFilter,
    // Restrict file size to a maximum of 5MB to prevent server overload
    limits: { fileSize: 5 * 1024 * 1024 },
  });
} catch (error) {
  console.warn("Multer not installed. File upload routes will run without file handling.");
  upload = {
    single: () => (req, res, next) => next(),
    array: () => (req, res, next) => next(),
    fields: () => (req, res, next) => next(),
    none: () => (req, res, next) => next(),
  };
}

export default upload;