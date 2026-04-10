import multer from "multer"
import { CloudinaryStorage } from "multer-storage-cloudinary"
import cloudinary from "./cloudinary.js"

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    return {
      folder: "products",
      allowed_formats: ["jpg", "png", "jpeg", "webp"],
      public_id: Date.now() + "-" + file.originalname
    }
  }
})

const upload = multer({ storage })

export default upload