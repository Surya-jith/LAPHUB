import productService from "../../services/admin/productService.js"


// Load Product Management Page
const loadProducts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1
    const selectedCategory = req.query.category || ""
    const search = req.query.search?.trim() || ""

    const data = await productService.getProducts({
      page,
      selectedCategory,
      search
    })

    res.render("admin/productManagement", {
      ...data,
      search
    })

  } catch (error) {
    console.log(error)
  }
}


// Load Add Product Page
const loadAddProduct = async(req,res)=>{

try{

const data = await productService.getAddProductData()

res.render("admin/addProduct",{
...data,
formData:{}
})

}catch(error){

console.log(error)

}

}



// Add Product
const addProduct = async(req,res)=>{

try{

const images = req.files?.images || []
const variantImages = req.files?.variantImages || []

const data = await productService.getAddProductData()

// Category Validation
if(!req.body.category){

return res.render("admin/addProduct",{
...data,
error:"Please select category",
formData:req.body
})

}

// General Image Validation
if(images.length < 3){

return res.render("admin/addProduct",{
...data,
error:"Minimum 3 images required",
formData:req.body
})

}

// Variant Image Validation
if(!variantImages.length){

return res.render("admin/addProduct",{
...data,
error:"Each variant must have image",
formData:req.body
})

}

await productService.createProduct(req.body,req.files)

res.redirect("/admin/products")

}catch(error){

console.log("Add Product Error:",error)

const data = await productService.getAddProductData()

res.render("admin/addProduct",{
...data,
error:error.message,
formData:req.body
})

}

}



// Load Edit Product Page
const loadEditProduct = async(req,res)=>{

try{

const data = await productService.getEditProductData(req.params.id)

res.render("admin/editProduct",data)

}catch(error){

console.log(error)

}

}



// Edit Product
const editProduct = async(req,res)=>{

try{

await productService.updateProduct(
req.params.id,
req.body,
req.files   // already correct
)

res.redirect("/admin/products")

}catch(error){

console.log(error)

}

}



// Soft Delete Product
const deleteProduct = async(req,res)=>{

try{

await productService.softDeleteProduct(req.params.id)

res.redirect("/admin/products")

}catch(error){

console.log(error)

}

}

const toggleProductBlock = async (req, res) => {
  try {
    await productService.toggleProductBlock(req.params.id)
    res.redirect("/admin/products")
  } catch (error) {
    console.log(error)
  }
}


export default {

loadProducts,
loadAddProduct,
addProduct,
loadEditProduct,
editProduct,
deleteProduct,
toggleProductBlock

}