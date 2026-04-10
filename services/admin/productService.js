import Product from "../../models/productModel.js"
import Category from "../../models/category.js"
import Brand from "../../models/brandModel.js"


// Get Products (Pagination + Brands)
const getProducts = async ({ page = 1, selectedCategory } = {}) => {

const limit = 10
const skip = (page - 1) * limit

let filter = {
isDeleted:false
}

if(selectedCategory){
filter.category = selectedCategory
}

const totalProducts = await Product.countDocuments(filter)

const totalPages = Math.ceil(totalProducts / limit)

const products = await Product.find(filter)
.populate("category")
.populate("brand")
.skip(skip)
.limit(limit)
.sort({createdAt:-1})


// ✅ Calculate Total Stock from Variants
products.forEach(product => {

product.totalStock = product.variants.reduce((total,variant)=>{
return total + Number(variant.stock || 0)
},0)

})


const categories = await Category.find({isDeleted:false})

return {
products,
categories,
totalPages,
currentPage:page,
selectedCategory
}

}




// Get Add Product Page Data
const getAddProductData = async()=>{

const categories = await Category.find({isDeleted:false})
const brands = await Brand.find({isDeleted:false})

return {
categories,
brands
}

}



// Add Product
const createProduct = async(data,files)=>{

const {
name,
description,
category,
brand,
price,
discount,
color,
ram,
rom,
stock,
variantPrice
} = data


// Convert to Arrays
const colors = Array.isArray(color) ? color : [color]
const rams = Array.isArray(ram) ? ram : [ram]
const roms = Array.isArray(rom) ? rom : [rom]
const stocks = Array.isArray(stock) ? stock : [stock]
const prices = Array.isArray(variantPrice) ? variantPrice : [variantPrice]

const variantImages = files.variantImages || []

// ✅ Create Variants with Variant Image
const variants = colors.map((c,index)=>({

color: c,
ram: rams[index],
rom: roms[index],
stock: stocks[index],
price: prices[index],
variantImage: variantImages[index]?.path || ""

}))


const brandValue = brand && brand !== "" ? brand : null


// ✅ Only General Images
let images = []

const mainImages = files.images || []

mainImages.forEach(file=>{
images.push(file.path)
})


const offerPrice =
Number(price) - (Number(price) * Number(discount || 0) / 100)


const newProduct = new Product({

name,
description,
category,
brand: brandValue,
price,
discount,
offerPrice,
variants,
images

})

await newProduct.save()

}

// Get Edit Product Data
const getEditProductData = async(id)=>{

const product = await Product.findById(id)

const categories = await Category.find({isDeleted:false})
const brands = await Brand.find({isDeleted:false})

return {
product,
categories,
brands
}

}



// Update Product
const updateProduct = async(id,data,files)=>{

const {
name,
description,
category,
brand,
price,
discount,
color,
ram,
rom,
stock,
variantPrice
} = data

const brandValue = brand && brand !== "" ? brand : null

const colors = Array.isArray(color) ? color : [color]
const rams = Array.isArray(ram) ? ram : [ram]
const roms = Array.isArray(rom) ? rom : [rom]
const stocks = Array.isArray(stock) ? stock : [stock]
const prices = Array.isArray(variantPrice) ? variantPrice : [variantPrice]

const variantImages = files?.variantImages || []

// Get existing product
const existingProduct = await Product.findById(id)

// ✅ Create variants with image handling
const variants = colors.map((c,index)=>({

color: c,
ram: rams[index],
rom: roms[index],
stock: stocks[index],
price: prices[index],

// If new image uploaded use new
// else keep old image
variantImage: variantImages[index]?.path 
|| existingProduct.variants[index]?.variantImage 
|| ""

}))


const offerPrice =
Number(price) - (Number(price) * Number(discount || 0) / 100)

let updateData = {

name,
description,
category,
brand: brandValue,
price,
discount,
offerPrice,
variants

}


// General Images
const mainImages = files?.images || []

if(mainImages.length > 0){

let images = []

mainImages.forEach(file=>{
images.push(file.path)
})

updateData.images = images

}

await Product.findByIdAndUpdate(id,updateData)

}



// Soft Delete Product
const softDeleteProduct = async(id)=>{

await Product.findByIdAndUpdate(id,{
isDeleted:true
})

}


export default {

getProducts,
getAddProductData,
createProduct,
getEditProductData,
updateProduct,
softDeleteProduct

}