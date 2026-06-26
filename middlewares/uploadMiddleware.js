import multer from "multer";
import path from "path";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary from "../config/cloudinary.js";

let storage;

const isCloudinaryConfigured = 
  process.env.CLOUDINARY_NAME && 
  process.env.CLOUDINARY_KEY && 
  process.env.CLOUDINARY_SECRET;

if (isCloudinaryConfigured) {
  storage = new CloudinaryStorage({
    cloudinary,
    params: async (req, file) => ({
      folder: "profile",
      allowed_formats: ["jpg", "jpeg", "png", "webp"],
      public_id: `${Date.now()}-${file.originalname.replace(/\.[^/.]+$/, "")}`
    })
  });
} else {
  console.warn("WARNING: Cloudinary environment variables are missing. Falling back to local disk storage for profile pictures.");
  storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, "public/uploads/profile");
    },
    filename: function (req, file, cb) {
      const uniqueName = Date.now() + path.extname(file.originalname);
      cb(null, uniqueName);
    }
  });
}

const upload = multer({
  storage,
  limits: {
    fileSize: 2 * 1024 * 1024
  },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Please upload a valid image file"));
    }

    cb(null, true);
  }
});

export default upload;

