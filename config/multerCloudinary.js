import multer from "multer"
import path from "path"
import { CloudinaryStorage } from "multer-storage-cloudinary"
import cloudinary from "./cloudinary.js"

let storage;

const isCloudinaryConfigured = 
  process.env.CLOUDINARY_NAME && 
  process.env.CLOUDINARY_KEY && 
  process.env.CLOUDINARY_SECRET;

if (isCloudinaryConfigured) {
  storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: async (req, file) => {
      return {
        folder: "products",
        allowed_formats: ["jpg", "png", "jpeg", "webp"],
        public_id: Date.now() + "-" + file.originalname
      }
    }
  })
} else {
  console.warn("WARNING: Cloudinary environment variables are missing. Falling back to local disk storage for products.");
  storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, "public/uploads/products")
    },
    filename: function (req, file, cb) {
      const uniqueName = Date.now() + "-" + file.originalname
      cb(null, uniqueName)
    }
  })
}

const upload = multer({ storage })

export default upload