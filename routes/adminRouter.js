import express from "express";
import adminController from "../controllers/admin/adminController.js";
import categoryController from "../controllers/admin/categoryController.js"
import authMiddleware from "../middlewares/authMiddleware.js";
import productController from "../controllers/admin/productController.js"
import productUpload from "../middlewares/productUpload.js"
import orderController from "../controllers/admin/orderController.js";
const router=express.Router();
import upload from "../config/multerCloudinary.js"

router.get("/login",authMiddleware.redirectIfLoggedadmin,adminController.loadLogin);
router.post("/login",authMiddleware.redirectIfLoggedadmin,adminController.login);
router.get("/dashboard",authMiddleware.adminAuth,adminController.loadDashboard)
router.get("/users",authMiddleware.adminAuth,adminController.loadUsers)
router.post("/block-user/:id",authMiddleware.adminAuth,adminController.toggleBlockUser)
router.get("/logout",adminController.logout)

//CATEGORY MANAGEMENT
router.get("/category",categoryController.loadCategory)
router.get("/add-category",categoryController.loadAddCategory)
router.post("/add-category",categoryController.addCategory)
router.get("/edit-category/:id",categoryController.loadEditCategory)
router.post("/edit-category",categoryController.editCategory)
router.post("/toggle-category/:id",categoryController.toggleCategory)
router.post("/delete-category/:id",categoryController.deleteCategory)


// PRODUCT MANAGEMENT
// Product Management Page
router.get("/products",authMiddleware.adminAuth,productController.loadProducts)
// Add Product Page
router.get("/add-product",authMiddleware.adminAuth,productController.loadAddProduct)
// Add Product
router.post(
"/add-product",
authMiddleware.adminAuth,
(req,res,next)=>{
upload.fields([
{ name:"images", maxCount:3 },
{ name:"variantImages", maxCount:10 }
])(req,res,(err)=>{

if(err){
console.log("Multer Error:",err)
return res.send(err.message)
}

next()

})
},
productController.addProduct
)
// Edit Product Page
router.get("/edit-product/:id",authMiddleware.adminAuth,productController.loadEditProduct)
// Edit Product
router.post(
"/edit-product/:id",
authMiddleware.adminAuth,
upload.fields([
{ name:"images", maxCount:3 },
{ name:"variantImages", maxCount:10 }
]),
productController.editProduct
)
// Soft Delete Product
router.post("/delete-product/:id",authMiddleware.adminAuth,productController.deleteProduct)




// =========================
// ORDER MANAGEMENT
// =========================

// Order List Page
router.get(
  "/orders",
  authMiddleware.adminAuth,
  orderController.loadOrders
);

// Order Details Page
router.get(
  "/orders/:id",
  authMiddleware.adminAuth,
  orderController.loadOrderDetails
);

// Update Order Status
router.post(
  "/orders/:id/status",
  authMiddleware.adminAuth,
  orderController.updateOrderStatus
);
export default router;