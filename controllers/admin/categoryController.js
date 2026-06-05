import categoryService from "../../services/admin/categoryService.js"


const loadCategory = async (req, res) => {
  try {

    const page = parseInt(req.query.page) || 1;
    const search = req.query.search || "";
    const error = req.query.error || null;

    const data = await categoryService.getCategories(page, search);

    res.render("admin/category", {
      ...data,
      error
    });

  } catch (err) {
    console.log("Load Category Error:", err);
    res.redirect("/admin/category");
  }
};


// Load Add Category Page
const loadAddCategory = async (req,res)=>{
  try {

    res.render("admin/addCategory")

  } catch (err) {
    console.log("Load Add Category Error:", err)
    res.redirect("/admin/category")
  }
}


// Add Category
const addCategory = async (req, res) => {
  try {

    const { name } = req.body;

    await categoryService.createCategory(name);

    res.redirect("/admin/category");

  } catch (err) {
   

    // 🔥 SHOW ERROR TO USER
    const page = 1;
    const search = "";

    const data = await categoryService.getCategories(page, search);

    res.render("admin/category", {
      ...data,
      error: err.message
    });
  }
};


// Load Edit Category Page
const loadEditCategory = async (req,res)=>{
  try {

    const id = req.params.id

    const category = await categoryService.getCategoryById(id)

    res.render("admin/editCategory",{category})

  } catch (err) {
    console.log("Load Edit Category Error:", err)
    res.redirect("/admin/category")
  }
}


// Edit Category
const editCategory = async (req, res) => {
  try {

   const {
  id,
  name,
  offerPercentage,
  offerExpiryDate
} = req.body;

    await categoryService.updateCategory(

  id,
  name,

  offerPercentage,

  offerExpiryDate
);

    res.redirect("/admin/category");

  } catch (err) {
    console.log("Edit Category Error:", err);

    const category = await categoryService.getCategoryById(req.body.id);

    res.render("admin/editCategory", {
      category,
      error: err.message
    });
  }
};


const toggleCategory = async (req,res)=>{
  try {

    const id = req.params.id

    await categoryService.toggleCategory(id)

    res.redirect("/admin/category")

  } catch (err) {
    console.log("Toggle Category Error:", err)
    res.redirect("/admin/category")
  }
}


const deleteCategory = async (req,res)=>{
  try {

    const id = req.params.id

    await categoryService.deleteCategory(id)

    res.redirect("/admin/category")

  } catch (err) {
    console.log("Delete Category Error:", err)
    res.redirect("/admin/category")
  }
}


export default {
  loadCategory,
  loadAddCategory,
  addCategory,
  loadEditCategory,
  editCategory,
  toggleCategory,
  deleteCategory
}