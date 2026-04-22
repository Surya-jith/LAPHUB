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

  // ✅ Calculate Total Stock
  products.forEach(product => {

  product.totalStock = product.variants.reduce(
    (total, variant) => {
      return total + Number(variant.stock || 0);
    },
    0
  );

  product.isLowStock =
    product.totalStock > 0 &&
    product.totalStock <= 5;

  product.isOutOfStock =
    product.totalStock === 0;

});

  const categories = await Category.find({
    isListed: true,
    isDeleted: false
  })

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

  const categories = await Category.find({
    isListed: true,
    isDeleted: false
  })

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

  // ✅ Create Variants
  const variants = colors.map((c,index)=>({

    color: c,
    ram: rams[index],
    rom: roms[index],
    stock: stocks[index],
    price: prices[index],
    variantImage: variantImages[index]?.path || ""

  }))

  const brandValue = brand && brand !== "" ? brand : null

  // General Images
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

  const categories = await Category.find({
    $or: [
      { isListed: true, isDeleted: false },
      { _id: product.category }
    ]
  })

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

  const existingProduct = await Product.findById(id)

  // ✅ Variants update with image fallback
  const variants = colors.map((c,index)=>({

    color: c,
    ram: rams[index],
    rom: roms[index],
    stock: stocks[index],
    price: prices[index],

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

  // General Images (replace only if new uploaded)
 const mainImages = files?.images || []

let updatedImages = [...existingProduct.images]

if (mainImages.length > 0) {
  mainImages.forEach((file, index) => {
    if (file?.path) {
      updatedImages[index] = file.path
    }
  })
}

updateData.images = updatedImages

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