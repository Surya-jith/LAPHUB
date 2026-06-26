import Category from "../../models/category.js";


// 🔹 GET (Search + Pagination + Sort + Soft Delete Filter)
const getCategories = async (page = 1, search = "") => {

  const limit = 10;
  const currentPage = Math.max(Number(page) || 1, 1);
  const skip = (currentPage - 1) * limit;
  const searchText = search.trim();

  const query = {
    isDeleted: false,
    name: { $regex: searchText, $options: "i" }
  };

  const categories = await Category.find(query)
    .sort({ createdAt: -1 })   // DESCENDING
    .skip(skip)
    .limit(limit);

  const total = await Category.countDocuments(query);
  const totalPages = Math.max(Math.ceil(total / limit), 1);

  return {
    categories,
    currentPage,
    totalPages,
    search: searchText,
    totalCategories: total
  };
};

const createCategory = async (name, offerPercentage = 0, offerExpiryDate = null) => {

  // ❌ Block empty / spaces
  if (!name || !name.trim()) {
    throw new Error("Category name is required");
  }

  // ✅ Normalize
  const formattedName = name.trim().toLowerCase();
  const offer = Number(offerPercentage || 0);

  if (offer < 0 || offer > 90) {
    throw new Error("Category offer must be between 0 and 90%");
  }

  // 🔍 Duplicate check (safe + normalized)
  const exist = await Category.findOne({
    name: { $regex: new RegExp(`^${formattedName}$`, "i") }
  });

  if (exist) {
    throw new Error("Category already exists");
  }

  try {
    return await Category.create({
      name: formattedName,
      categoryOffer: {
        percentage: offer,
        expiryDate: offerExpiryDate || null
      }
    });
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
  const offer = Number(offerPercentage || 0);

  if (offer < 0 || offer > 90) {
    throw new Error("Category offer must be between 0 and 90%");
  }

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

      percentage: offer,

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
