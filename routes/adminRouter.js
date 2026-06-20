import express from "express";
import adminController from "../controllers/admin/adminController.js";
import categoryController from "../controllers/admin/categoryController.js"
import authMiddleware from "../middlewares/authMiddleware.js";
import productController from "../controllers/admin/productController.js"
import productUpload from "../middlewares/productUpload.js"
import orderController from "../controllers/admin/orderController.js";
import couponController from "../controllers/admin/couponController.js";
import reportController from "../controllers/admin/reportController.js";
const router=express.Router();
import upload from "../config/multerCloudinary.js"

router.get("/login",authMiddleware.redirectIfLoggedadmin,adminController.loadLogin);
router.post("/login",authMiddleware.redirectIfLoggedadmin,adminController.login);
router.get("/dashboard",authMiddleware.adminAuth,adminController.loadDashboard)
router.get("/users",authMiddleware.adminAuth,adminController.loadUsers)
router.post("/block-user/:id",authMiddleware.adminAuth,adminController.toggleBlockUser)
router.get("/logout",adminController.logout)

//CATEGORY MANAGEMENT
router.get("/category",authMiddleware.adminAuth,categoryController.loadCategory)
router.get("/add-category",authMiddleware.adminAuth,categoryController.loadAddCategory)
router.post("/add-category",authMiddleware.adminAuth,categoryController.addCategory)
router.get("/edit-category/:id",authMiddleware.adminAuth,categoryController.loadEditCategory)
router.post("/edit-category",authMiddleware.adminAuth,categoryController.editCategory)
router.post("/toggle-category/:id",authMiddleware.adminAuth,categoryController.toggleCategory)
router.post("/delete-category/:id",authMiddleware.adminAuth,categoryController.deleteCategory)


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
return res.redirect(`/admin/add-product?error=${encodeURIComponent(err.message || "Unable to upload product images")}`)
}
next()
})
},productController.addProduct)


router.get("/edit-product/:id",authMiddleware.adminAuth,productController.loadEditProduct)
router.post("/edit-product/:id",authMiddleware.adminAuth,upload.fields([{ name:"images", maxCount:3 },{ name:"variantImages", maxCount:10 }]),productController.editProduct)
router.post("/delete-product/:id",authMiddleware.adminAuth,productController.deleteProduct)
router.post(
  "/toggle-product-block/:id",
  authMiddleware.adminAuth,
  productController.toggleProductBlock
)





// ORDER MANAGEMENT


router.get("/orders",authMiddleware.adminAuth,orderController.loadOrders);
router.get("/orders/:id",authMiddleware.adminAuth, orderController.loadOrderDetails);
router.post("/orders/:id/status",authMiddleware.adminAuth,orderController.updateOrderStatus);
router.post(
  "/orders/:orderId/items/:itemId/return",
  authMiddleware.adminAuth,
  orderController.processItemReturn
);
/*
=================================
COUPON MANAGEMENT
=================================
*/

router.get(
  "/coupons",
  authMiddleware.adminAuth,
  couponController.loadCoupons
);

router.get(
  "/add-coupon",
  authMiddleware.adminAuth,
  couponController.loadAddCoupon
);

router.post(
  "/add-coupon",
  authMiddleware.adminAuth,
  couponController.addCoupon
);

router.post(
  "/toggle-coupon/:id",
  authMiddleware.adminAuth,
  couponController.toggleCoupon
);

router.post(
  "/delete-coupon/:id",
  authMiddleware.adminAuth,
  couponController.deleteCoupon
);

/*
=================================
SALES REPORTS
=================================
*/

router.get(

  "/sales-report",

  authMiddleware.adminAuth,

  reportController.loadSalesReport
);

/*
=================================
EXPORT PDF
=================================
*/

router.get(

  "/sales-report/pdf",

  authMiddleware.adminAuth,

  reportController.downloadPdfReport
);

/*
=================================
EXPORT EXCEL
=================================
*/

router.get(

  "/sales-report/excel",

  authMiddleware.adminAuth,

  reportController.downloadExcelReport
);
export default router;
