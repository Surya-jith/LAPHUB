import Category from "../../models/category.js";


// 🔹 GET (Search + Pagination + Sort + Soft Delete Filter)
const getCategories = async (page, search) => {

  const limit = 10;
  const skip = (page - 1) * limit;

  const query = {
    isDeleted: false,
    name: { $regex: search, $options: "i" }
  };

  const categories = await Category.find(query)
    .sort({ createdAt: -1 })   // DESCENDING
    .skip(skip)
    .limit(limit);

  const total = await Category.countDocuments(query);

  return {
    categories,
    currentPage: page,
    totalPages: Math.ceil(total / limit),
    search
  };
};

const createCategory = async (name) => {

  // ❌ Block empty / spaces
  if (!name || !name.trim()) {
    throw new Error("Category name is required");
  }

  // ✅ Normalize
  const formattedName = name.trim().toLowerCase();

  // 🔍 Duplicate check (safe + normalized)
  const exist = await Category.findOne({
    name: { $regex: new RegExp(`^${formattedName}$`, "i") }
  });

  if (exist) {
    throw new Error("Category already exists");
  }

  try {
    return await Category.create({ name: formattedName });
  } catch (error) {
    if (error.code === 11000) {
      throw new Error("Category already exists");
    }
    throw error;
  }
};

const updateCategory = async (id, name,offerPercentage,
  offerExpiryDate) => {

  if (!name || !name.trim()) {
    throw new Error("Category name is required");
  }

  const formattedName = name.trim().toLowerCase();

  const exist = await Category.findOne({
    name: { $regex: new RegExp(`^${formattedName}$`, "i") },
    _id: { $ne: id }
  });

  if (exist) {
    throw new Error("Category already exists");
  }

  return await Category.findByIdAndUpdate(

  id,

  {

    name: formattedName,

    /*
    =================================
    CATEGORY OFFER
    =================================
    */

    categoryOffer: {

      percentage:
        Number(
          offerPercentage || 0
        ),

      expiryDate:
        offerExpiryDate || null
    }
  },

  { new: true }
);
};

const toggleCategory = async (id) => {

  const category = await Category.findById(id);

  if (!category) {
    throw new Error("Category not found");
  }

  return await Category.findByIdAndUpdate(id, {
    isListed: !category.isListed
  });
};

const deleteCategory = async (id) => {

  return await Category.findByIdAndUpdate(id, {
    isDeleted: true
  });
};



const getCategoryById = async (id) => {
  return await Category.findById(id);
};
export default {
  getCategories,
  createCategory,
  updateCategory,
  toggleCategory,
  deleteCategory,
  getCategoryById
};