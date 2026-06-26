import Product from "../../models/productModel.js"
import Category from "../../models/category.js"
import Brand from "../../models/brandModel.js"
import calculateBestOffer from "../../utils/calculateBestOffer.js"

function normalizeImagePath(filePath) {
  if (!filePath) return "";
  if (filePath.startsWith("http")) return filePath;
  let clean = filePath.replace(/\\/g, "/");
  if (clean.startsWith("public/")) {
    clean = clean.substring(7);
  }
  if (!clean.startsWith("/")) {
    clean = "/" + clean;
  }
  return clean;
}


// Get Products (Pagination + Brands)
const getProducts = async ({
  page = 1,
  selectedCategory,
  search = ""
} = {}) => {

  const limit = 10
  const skip = (page - 1) * limit

  let filter = {
    isDeleted: false
  }

  if (selectedCategory) {
    filter.category = selectedCategory
  }

  if (search) {
    filter.name = {
      $regex: search,
      $options: "i"
    }
  }

  const totalProducts = await Product.countDocuments(filter)
  const totalPages = Math.ceil(totalProducts / limit)

  const products = await Product.find(filter)
    .populate("category")
    .populate("brand")
    .skip(skip)
    .limit(limit)
    .sort({ createdAt: -1 })

  // Total Stock Calculation
  products.forEach(product => {

    product.totalStock = product.variants.reduce(
      (total, variant) => {
        return total + Number(variant.stock || 0)
      },
      0
    )

    product.isLowStock =
      product.totalStock > 0 &&
      product.totalStock <= 5

    product.isOutOfStock =
      product.totalStock === 0

  })

  const categories = await Category.find({
    isListed: true,
    isDeleted: false
  })

  return {
    products,
    categories,
    totalPages,
    currentPage: page,
    selectedCategory,
    search
  }
}


// Get Add Product Page Data
const getAddProductData = async () => {

  const categories = await Category.find({
    isListed: true,
    isDeleted: false
  })

  const brands = await Brand.find({ isDeleted: false })

  return {
    categories,
    brands
  }

}



// Add Product
const createProduct = async (data, files) => {

  const {
    name,
    description,
    category,
    brand,
    price,
    discount,
    offerExpiryDate,
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

  // ================================= 
  // VALIDATIONS
  // =================================

  // Base price validation
  if (!price || Number(price) <= 0) {
    throw new Error("Product base price must be greater than 0")
  }

  if (Number(discount || 0) < 0 || Number(discount || 0) > 90) {
    throw new Error("Product offer must be between 0 and 90%")
  }

  // Per-variant price & stock validation
  for (let i = 0; i < colors.length; i++) {
    if (!prices[i] || Number(prices[i]) <= 0) {
      throw new Error(`Variant ${i + 1}: Price must be greater than 0`)
    }
    if (stocks[i] === undefined || stocks[i] === "" || Number(stocks[i]) < 0) {
      throw new Error(`Variant ${i + 1}: Stock cannot be negative`)
    }
  }

  // Duplicate variant check (color + ram + rom must be unique)
  const variantKeys = colors.map((c, i) =>
    `${c?.trim().toLowerCase()}-${rams[i]?.trim().toLowerCase()}-${roms[i]?.trim().toLowerCase()}`
  )
  const uniqueKeys = new Set(variantKeys)
  if (uniqueKeys.size !== variantKeys.length) {
    throw new Error("Duplicate variant found. Each Color + RAM + ROM combination must be unique")
  }

  const variantImages = files.variantImages || []

  // Create Variants
  const variants = colors.map((c, index) => ({
    color: c,
    ram: rams[index],
    rom: roms[index],
    stock: stocks[index],
    price: prices[index],
    variantImage: normalizeImagePath(variantImages[index]?.path)
  }))

  const brandValue = brand && brand !== "" ? brand : null

  // General Images
  let images = []
  const mainImages = files.images || []

  mainImages.forEach(file => {
    images.push(normalizeImagePath(file.path))
  })

  /*
  =================================
  PRODUCT OFFER
  =================================
  */

  const productOffer = Number(discount || 0)

  /*
  =================================
  CATEGORY OFFER
  =================================
  */

  const categoryData = await Category.findById(category)

  let categoryOffer = 0

  if (categoryData?.categoryOffer?.expiryDate > new Date()) {
    categoryOffer = categoryData.categoryOffer.percentage || 0
  }

  /*
  =================================
  BEST OFFER
  =================================
  */

  const offerData = calculateBestOffer(
    productOffer,
    categoryOffer,
    Number(price)
  )

  const newProduct = new Product({
    name,
    description,
    category,
    brand: brandValue,
    price,
    discount,

    productOffer: {
      percentage: productOffer,
      expiryDate: offerExpiryDate || null
    },

    finalOffer: offerData.finalOffer,
    finalPrice: offerData.finalPrice,

    variants,
    images
  })

  await newProduct.save()

}



// Get Edit Product Data
const getEditProductData = async (id) => {

  const product = await Product.findById(id)

  const categories = await Category.find({
    $or: [
      { isListed: true, isDeleted: false },
      { _id: product.category }
    ]
  })

  const brands = await Brand.find({ isDeleted: false })

  return {
    product,
    categories,
    brands
  }

}



// Update Product
const updateProduct = async (id, data, files) => {

  const {
    name,
    description,
    category,
    brand,
    price,
    discount,
    offerExpiryDate,
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

  // =================================
  // VALIDATIONS
  // =================================

  // Base price validation
  if (!price || Number(price) <= 0) {
    throw new Error("Product base price must be greater than 0")
  }

  if (Number(discount || 0) < 0 || Number(discount || 0) > 90) {
    throw new Error("Product offer must be between 0 and 90%")
  }

  // Per-variant price & stock validation
  for (let i = 0; i < colors.length; i++) {
    if (!prices[i] || Number(prices[i]) <= 0) {
      throw new Error(`Variant ${i + 1}: Price must be greater than 0`)
    }
    if (stocks[i] === undefined || stocks[i] === "" || Number(stocks[i]) < 0) {
      throw new Error(`Variant ${i + 1}: Stock cannot be negative`)
    }
  }

  // Duplicate variant check (color + ram + rom must be unique)
  const variantKeys = colors.map((c, i) =>
    `${c?.trim().toLowerCase()}-${rams[i]?.trim().toLowerCase()}-${roms[i]?.trim().toLowerCase()}`
  )
  const uniqueKeys = new Set(variantKeys)
  if (uniqueKeys.size !== variantKeys.length) {
    throw new Error("Duplicate variant found. Each Color + RAM + ROM combination must be unique")
  }

  const variantImages = files?.variantImages || []

  const existingProduct = await Product.findById(id)

  // Variants update with image fallback
  const variants = colors.map((c, index) => ({
    color: c,
    ram: rams[index],
    rom: roms[index],
    stock: stocks[index],
    price: prices[index],
    variantImage: variantImages[index]?.path
      ? normalizeImagePath(variantImages[index].path)
      : (existingProduct.variants[index]?.variantImage || "")
  }))

  /*
  =================================
  PRODUCT OFFER
  =================================
  */

  const productOffer = Number(discount || 0)

  /*
  =================================
  CATEGORY OFFER
  =================================
  */

  const categoryData = await Category.findById(category)

  let categoryOffer = 0

  if (categoryData?.categoryOffer?.expiryDate > new Date()) {
    categoryOffer = categoryData.categoryOffer.percentage || 0
  }

  /*
  =================================
  BEST OFFER
  =================================
  */

  const offerData = calculateBestOffer(
    productOffer,
    categoryOffer,
    Number(price)
  )

  let updateData = {
    name,
    description,
    category,
    brand: brandValue,
    price,
    discount,

    productOffer: {
      percentage: productOffer,
      expiryDate: offerExpiryDate || null
    },

    finalOffer: offerData.finalOffer,
    finalPrice: offerData.finalPrice,

    variants
  }

  // General Images (replace only if new uploaded)
  const mainImages = files?.images || []

  let updatedImages = [...existingProduct.images]

  if (mainImages.length > 0) {
    mainImages.forEach((file, index) => {
      if (file?.path) {
        updatedImages[index] = normalizeImagePath(file.path)
      }
    })
  }

  updateData.images = updatedImages

  await Product.findByIdAndUpdate(id, updateData)

}



// Soft Delete Product
const softDeleteProduct = async (id) => {

  await Product.findByIdAndUpdate(id, {
    isDeleted: true
  })

}

const toggleProductBlock = async (id) => {
  const product = await Product.findById(id)

  if (!product) {
    throw new Error("Product not found")
  }

  await Product.findByIdAndUpdate(id, {
    isBlocked: !product.isBlocked
  })
}


export default {
  getProducts,
  getAddProductData,
  createProduct,
  getEditProductData,
  updateProduct,
  softDeleteProduct,
  toggleProductBlock
}
