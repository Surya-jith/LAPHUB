import multer from "multer"
import path from "path"
import { v4 as uuidv4 } from "uuid"

const storage = multer.diskStorage({

destination: function(req,file,cb){
cb(null,"public/uploads/products")
},

filename: function(req,file,cb){
const uniqueName = uuidv4() + path.extname(file.originalname)
cb(null,uniqueName)
}

})

const fileFilter = (req,file,cb)=>{

const allowedTypes = ["image/jpeg","image/png","image/webp"]

if(allowedTypes.includes(file.mimetype)){
cb(null,true)
}else{
cb(new Error("Only images allowed"),false)
}

}

const productUpload = multer({

storage,
fileFilter,
limits:{
fileSize:5*1024*1024
}

}).fields([

{ name: "images", maxCount: 5 },
{ name: "variantImages", maxCount: 5 }

])

export default productUpload