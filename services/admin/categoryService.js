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

  const exist = await Category.findOne({
    name: { $regex: `^${name}$`, $options: "i" }
  });

  if (exist) {
    throw new Error("Category already exists");
  }

  return await Category.create({ name });
};

const getCategoryById = async (id) => {
  return await Category.findById(id);
};

const updateCategory = async (id, name) => {

  const exist = await Category.findOne({
    name: { $regex: `^${name.trim()}$`, $options: "i" },
    _id: { $ne: id }
  });

  if (exist) {
    throw new Error("Category already exists");
  }

  return await Category.findByIdAndUpdate(
    id,
    { name: name.trim() },
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

export default {
  getCategories,
  createCategory,
  updateCategory,
  toggleCategory,
  deleteCategory,
  getCategoryById
};