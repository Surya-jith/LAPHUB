import express from "express";
import userController from "../controllers/user/userController.js";
import passport from "passport";
import authMiddleware from "../middlewares/authMiddleware.js";
import upload from "../middlewares/uploadMiddleware.js";
import ROUTES from "../constants/routes.js";
import cartController from "../controllers/user/cartController.js"
import checkoutController from "../controllers/user/checkoutController.js";
import orderController from "../controllers/user/orderController.js";
import wishlistController from "../controllers/user/wishlistController.js";
const router = express.Router();


router.get("/", userController.loadHomepage);
router.get(
  "/about",
  userController.loadAbout
);
router.get(
  "/contact",
  userController.loadContact
);
router.get("/signup", authMiddleware.redirectIfLoggedIn, userController.loadSignup);
router.post("/signup", userController.registerUser);

router.get("/verify-signup-otp", userController.loadSignupOtp);
router.post("/verify-signup-otp", userController.verifySignupOtp);
router.get("/resend-signup-otp", userController.resendSignupOtp);

router.get("/login", authMiddleware.redirectIfLoggedIn, userController.loadLogin);
router.post("/login", userController.loginUser);

router.get("/logout", authMiddleware.isUserLoggedIn, userController.logout);

router.get("/forgot-password", userController.loadForgotPassword);
router.post("/forgot-password", userController.sendOtp);

router.get("/verify-otp", userController.loadVerifyOtp);
router.post("/verify-otp", userController.verifyOtp);

router.get("/reset-password", userController.loadResetPassword);
router.post("/reset-password", userController.resetPassword);


router.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);
router.get(
  "/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "/login" }),
  (req, res) => {

    if(req.user.isBlocked){
      return res.redirect("/login?error=User blocked");
    }

    req.session.user = req.user._id;

    res.redirect("/");

  }
);

 router.get("/profile",authMiddleware.isUserLoggedIn,userController.loadProfile)
 router.get(
  ROUTES.USER_WALLET,
  authMiddleware.isUserLoggedIn,
  userController.loadWalletPage
);

 router.get("/profile/edit",authMiddleware.isUserLoggedIn,userController.loadEditProfile)
router.post(
"/profile/edit",
authMiddleware.isUserLoggedIn,
(req, res, next) => {
  upload.single("profileImage")(req, res, (err) => {
    if (err) {
      return res.redirect(
        `/profile/edit?error=${encodeURIComponent(err.message || "Unable to upload profile image")}`
      )
    }

    next()
  })
},
userController.updateProfile
);

 router.get("/change-password", authMiddleware.isUserLoggedIn, userController.loadChangePassword)
router.post("/change-password", authMiddleware.isUserLoggedIn, userController.changePassword)

router.get("/edit-email", authMiddleware.isUserLoggedIn, userController.loadEditEmail)
router.post("/edit-email", authMiddleware.isUserLoggedIn, userController.sendEmailOtp)
router.post("/verify-email-otp", authMiddleware.isUserLoggedIn, userController.verifyEmailOtp)



router.get("/address", authMiddleware.isUserLoggedIn, userController.loadAddressPage)
router.post("/address/save", authMiddleware.isUserLoggedIn, userController.saveAddress)
router.post("/address/delete/:id", authMiddleware.isUserLoggedIn, userController.deleteAddress)

router.get("/products",authMiddleware.isUserLoggedIn,userController.loadProducts)
router.get("/product/:id",authMiddleware.isUserLoggedIn, userController.loadProductDetails)
router.post("/product/review/:id", authMiddleware.isUserLoggedIn, userController.addReview)


//CART
router.get("/cart", authMiddleware.isUserLoggedIn, cartController.loadCart)
router.post("/add-to-cart", authMiddleware.isUserLoggedIn, cartController.addToCart)
router.get("/cart/increase/:productId/:variantId", authMiddleware.isUserLoggedIn, cartController.increaseQty)
router.get("/cart/decrease/:productId/:variantId", authMiddleware.isUserLoggedIn, cartController.decreaseQty)
router.get("/remove-cart/:productId/:variantId", authMiddleware.isUserLoggedIn, cartController.removeCartItem)

//checkout
router.get("/checkout", authMiddleware.isUserLoggedIn, checkoutController.loadCheckout);
router.get("/edit-address/:id", authMiddleware.isUserLoggedIn, userController.loadEditAddress);
router.get("/add-address", authMiddleware.isUserLoggedIn, userController.loadAddAddress);
router.post("/add-address", authMiddleware.isUserLoggedIn, userController.saveAddress);
router.post( "/buy-now",authMiddleware.isUserLoggedIn,checkoutController.buyNow);
router.post("/place-order",authMiddleware.isUserLoggedIn,checkoutController.placeOrder);
router.post(
  "/verify-payment",
  authMiddleware.isUserLoggedIn,
  checkoutController.verifyPayment
);
router.post(
  ROUTES.RETRY_PAYMENT,
  authMiddleware.isUserLoggedIn,
  checkoutController.retryPayment
);

// ORDER MANAGEMENT

router.get(
  "/orders",
  authMiddleware.isUserLoggedIn,
  orderController.loadOrders
);

router.get(
  "/orders/:id",
  authMiddleware.isUserLoggedIn,
  orderController.loadOrderDetails
);
router.get(
  "/order-success/:id",
  authMiddleware.isUserLoggedIn,
  checkoutController.loadOrderSuccess
);
router.post(
  "/orders/:id/cancel",
  authMiddleware.isUserLoggedIn,
  orderController.cancelOrder
);

router.post(
  "/orders/:orderId/items/:itemId/cancel",
  authMiddleware.isUserLoggedIn,
  orderController.cancelOrderItem
);
router.post(
  "/orders/:id/return",
  authMiddleware.isUserLoggedIn,
  orderController.returnOrder);
router.get("/orders/:id/invoice",authMiddleware.isUserLoggedIn,orderController.downloadInvoice);

router.post(
  "/orders/:orderId/items/:itemId/return",
  authMiddleware.isUserLoggedIn,
  orderController.returnOrderItem
);

// WISHLIST
router.get( "/wishlist",authMiddleware.isUserLoggedIn,wishlistController.loadWishlist);
router.post("/wishlist/add/:productId",authMiddleware.isUserLoggedIn,wishlistController.addToWishlist);
router.get("/wishlist/remove/:productId",authMiddleware.isUserLoggedIn,wishlistController.removeFromWishlist);
router.post("/wishlist/move-to-cart/:productId", authMiddleware.isUserLoggedIn,wishlistController.moveToCart);



router.post(
  ROUTES.APPLY_COUPON,
  authMiddleware.isUserLoggedIn,
  checkoutController.applyCoupon
);

router.post(
  ROUTES.REMOVE_COUPON,
  authMiddleware.isUserLoggedIn,
  checkoutController.removeCoupon
);
export default router;
