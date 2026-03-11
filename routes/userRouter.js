import express from "express";
import userController from "../controllers/user/userController.js";
import passport from "passport";
import authMiddleware from "../middlewares/authMiddleware.js";
import upload from "../middlewares/uploadMiddleware.js";

const router = express.Router();
console.log(authMiddleware);






router.get("/", userController.loadHomepage);





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

 router.get("/profile/edit",authMiddleware.isUserLoggedIn,userController.loadEditProfile)
router.post(
"/profile/edit",
authMiddleware.isUserLoggedIn,
upload.single("profileImage"),
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



export default router;