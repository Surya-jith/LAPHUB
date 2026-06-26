import User from "../../models/user.js";
import userService from "../../services/user/userService.js";
import homeService
from "../../services/user/homeService.js";
import sendEmail from "../../utils/sendEmail.js";
import bcrypt from "bcryptjs";
import Wallet from "../../models/walletModel.js";
import Coupon from "../../models/couponModel.js";





const loadSignup = (req, res) => {
  res.render("user/signup", {
    title: "Signup",
    error: null,
    user: null,
    oldData: null
  });
};

const loadAbout = (req,res)=>{

  res.render(
    "user/about",
    {
      title:"About Us"
    }
  );

};


const loadContact = (req,res)=>{

  res.render(
    "user/Contact",
    {
      title:"Contact"
    }
  );

};

const registerUser = async (req, res) => {
  try {

    await userService.validateSignup(req.body);

    const { email } = req.body;

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    req.session.signupData = req.body;
    req.session.signupOtp = otp;
    req.session.signupOtpExpiry = Date.now() + 5 * 60 * 1000;

    await sendEmail(
      email,
      "Signup OTP Verification",
      `Your OTP is ${otp}. It expires in 5 minutes.`,
      otp
    );

    res.redirect(`/verify-signup-otp?email=${email}`);

  } catch (error) {

    res.render("user/signup", {
      error: error.message,
      oldData: req.body,
      user: null
    });

  }
};





const loadLogin = (req, res) => {


  if (req.session.user) {
    return res.redirect("/");
  }

  res.render("user/login", {
    error: null,
    title: "Login",
    user: null
  });

};



const loginUser = async (req, res) => {

  try {

    const user = await userService.login(req.body);

    req.session.user = user._id;

    res.redirect("/");

  } catch (error) {

    res.render("user/login", {
      error: error.message,
      title: "Login",
      user: null
    });

  }

};





const loadHomepage = async (req, res) => {

  try {

    let user = null;

    if (req.session.user) {

      user =
        await User.findById(
          req.session.user
        );
    }
const data =
  await homeService.getHomeData();



res.render(
  "user/homepage",
  {
    user,

    title: "Home",

    error:
      req.query.error || null,

    topProducts:
      data.topProducts,

    topCategories:
      data.topCategories
  }
);

  } catch (error) {

    console.log(error);
res.render(
  "user/homepage",
  {
    user: null,

    title: "Home",

    error:
      "Unable to load homepage",

    topProducts: [],

    topCategories: []
  }
);
  }
};





const logout = (req, res, next) => {

  req.session.destroy((err) => {

    if (err) {
      return next(err);
    }

    res.clearCookie("connect.sid");

    res.redirect("/");

  });

};





const loadForgotPassword = (req, res) => {

  res.render("user/forgetpassword", {
    title: "Forgot Password",
    error: null,
    user: null
  });

};



const sendOtp = async (req, res) => {

  try {

    const { email } = req.body;

    const user = await User.findOne({ email });

    if (!user) {

      return res.render("user/forgetpassword", {
        title: "Forgot Password",
        error: "Email not found",
        user: null
      });

    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    user.otp = otp;
    user.otpExpiry = Date.now() + 5 * 60 * 1000;

    await user.save();

    await sendEmail(
      email,
      "OTP for forgot password",
      `Your OTP is ${otp}. It expires in 5 minutes.`,
      otp
    );

    res.redirect(`/verify-otp?email=${email}`);

  } catch (error) {

    console.log(error.message);
    res.render("user/forgetpassword", {
      title: "Forgot Password",
      error: "Unable to send OTP. Please try again.",
      user: null
    });

  }

};





const loadVerifyOtp = (req, res) => {

  res.render("user/otppage", {
    title: "Verify OTP",
    error: null,
    email: req.query.email,
    user: null
  });

};



const verifyOtp = async (req, res) => {

  try {

    const { email, otp } = req.body;

    const user = await User.findOne({ email });

    if (!user || user.otp !== otp.trim()) {

      return res.render("user/otppage", {
        title: "Verify OTP",
        email,
        error: "Invalid OTP",
        user: null
      });

    }

    if (user.otpExpiry < Date.now()) {

      return res.render("user/otppage", {
        title: "Verify OTP",
        email,
        error: "OTP expired",
        user: null
      });

    }

    // clear otp after successful verification
    user.otp = null;
    user.otpExpiry = null;
    await user.save();

    req.session.passwordResetEmail = email;
    req.session.passwordResetVerified = true;

    res.redirect("/reset-password");

  } catch (error) {

    console.log(error);
    res.render("user/otppage", {
      title: "Verify OTP",
      email: req.body.email,
      error: "Unable to verify OTP. Please try again.",
      user: null
    });

  }

};





const loadResetPassword = (req, res) => {

  if (!req.session.passwordResetVerified || !req.session.passwordResetEmail) {
    return res.redirect("/forgot-password");
  }

  res.render("user/resetpassword", {
    title: "Reset Password",
    error: null,
    email: req.session.passwordResetEmail,
    user: null
  });

};



const resetPassword = async (req, res) => {

  try {

    if (!req.session.passwordResetVerified || !req.session.passwordResetEmail) {
      return res.redirect("/forgot-password");
    }

    const { password, confirmPassword } = req.body;
    const email = req.session.passwordResetEmail;

    if (password !== confirmPassword) {

      return res.render("user/resetpassword", {
        title: "Reset Password",
        error: "Passwords do not match",
        email,
        user: null
      });

    }

    if (!password || password.length < 6) {
      return res.render("user/resetpassword", {
        title: "Reset Password",
        error: "Password must be at least 6 characters",
        email,
        user: null
      });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.redirect("/forgot-password");
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    user.password = hashedPassword;
    user.otp = null;
    user.otpExpiry = null;

    await user.save();

    req.session.passwordResetEmail = null;
    req.session.passwordResetVerified = null;

    res.redirect("/login");

  } catch (error) {

    console.log(error.message);
    res.render("user/resetpassword", {
      title: "Reset Password",
      error: "Unable to reset password. Please try again.",
      email: req.session.passwordResetEmail || "",
      user: null
    });

  }

};




const loadSignupOtp = (req, res) => {
  if (!req.session.signupData || !req.session.signupOtp) {
    return res.redirect("/signup");
  }

  const remainingSeconds = Math.max(
    Math.ceil(((req.session.signupOtpExpiry || Date.now()) - Date.now()) / 1000),
    0
  );

  res.render("user/signupOtp", {
    title: "Verify OTP",
    email: req.query.email,
    error: null,
    user: null,
    remainingSeconds
  });

};


const verifySignupOtp = async (req, res) => {

  try {

    const { otp } = req.body;

    if (!req.session.signupData || !req.session.signupOtp) {
      return res.redirect("/signup");
    }

    if (otp !== req.session.signupOtp) {

      return res.render("user/signupOtp", {
        title: "Verify OTP",
        error: "Invalid OTP",
        email: req.session.signupData.email,
        user: null,
        remainingSeconds: Math.max(
          Math.ceil(((req.session.signupOtpExpiry || Date.now()) - Date.now()) / 1000),
          0
        )
      });

    }

    if (req.session.signupOtpExpiry < Date.now()) {

      return res.render("user/signupOtp", {
        title: "Verify OTP",
        error: "OTP expired",
        email: req.session.signupData.email,
        user: null,
        remainingSeconds: 0
      });

    }

    /*
=================================
REGISTER USER
=================================
*/

const newUser =
  await userService.register(
    req.session.signupData
  );

/*
=================================
REFERRAL REWARD
=================================
*/

const referralCode =
  req.session.signupData
    .referralCode;

if (referralCode) {

  /*
  =================================
  FIND REFERRER
  =================================
  */

  const referrer =
    await User.findOne({
      referralCode
    });

  /*
  =================================
  VALID REFERRAL
  =================================
  */

  if (

    referrer &&

    referrer._id.toString() !==
    newUser._id.toString()

  ) {

    /*
    =================================
    UPDATE REFERRED USER
    =================================
    */

    newUser.referredBy =
      referrer._id;

    await newUser.save();

    /*
    =================================
    FIND OR CREATE WALLETS
    =================================
    */

    let referrerWallet =
      await Wallet.findOne({
        user: referrer._id
      });

    if (!referrerWallet) {

      referrerWallet =
        await Wallet.create({
          user: referrer._id,
          balance: 0,
          transactions: []
        });
    }

    let newUserWallet =
      await Wallet.findOne({
        user: newUser._id
      });

    if (!newUserWallet) {

      newUserWallet =
        await Wallet.create({
          user: newUser._id,
          balance: 0,
          transactions: []
        });
    }

    /*
    =================================
    REWARD AMOUNTS
    =================================
    */

    const referrerReward = 200;
    const newUserReward = 100;

    /*
    =================================
    CREDIT REFERRER
    =================================
    */

    referrerWallet.balance +=
      referrerReward;

    referrerWallet.transactions.push({

      type: "Credit",

      amount: referrerReward,

      description:
        "Referral reward"
    });

    /*
    =================================
    CREDIT NEW USER
    =================================
    */

    newUserWallet.balance +=
      newUserReward;

    newUserWallet.transactions.push({

      type: "Credit",

      amount: newUserReward,

      description:
        "Welcome referral reward"
    });

    await referrerWallet.save();
    await newUserWallet.save();
  }
}

    req.session.signupData = null;
    req.session.signupOtp = null;
    req.session.signupOtpExpiry = null;

    res.redirect("/login");

  } catch (error) {

    console.log(error.message);
    res.status(500).send("Server Error");

  }

};


const resendSignupOtp = async (req, res) => {

  try {

    const signupData = req.session.signupData;

    if (!signupData) {
      return res.redirect("/signup");
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    req.session.signupOtp = otp;
    req.session.signupOtpExpiry = Date.now() + 5 * 60 * 1000;

    await sendEmail(
      signupData.email,
      "Signup OTP Verification",
      `Your new OTP is ${otp}. It expires in 5 minutes.`,
      otp
    );

    res.redirect(`/verify-signup-otp?email=${signupData.email}`);

  } catch (error) {

    console.log(error.message);
    res.status(500).send("Server Error");

  }

};
const loadProfile = async (req, res) => {
  try {
    const user = await userService.getUser(req.session.user)

    res.render("user/profile", {
      user,
      error: req.query.error || null,
      success: req.query.success || null
    })

  } catch (error) {
    console.log(error)

    res.redirect(
      `/?error=${encodeURIComponent("Unable to load profile")}`
    )
  }
}

const loadEditProfile = async (req, res) => {
  try {

    const user = await userService.getUser(req.session.user)

    res.render("user/editProfile", {
      user,
      error: req.query.error || null,
      success: null
    })

  } catch (error) {
    console.log("Load Edit Profile Error:", error)
    res.redirect("/profile")
  }
}


const updateProfile = async (req, res) => {
  try {

    const { username, phone } = req.body
    const user = await userService.getUser(req.session.user)

    const renderEditProfile = (message) => {
      user.username = username || user.username
      user.phone = phone || ""

      return res.render("user/editProfile", {
        user,
        error: message,
        success: null
      })
    }

    // Validation
    if (!username || !username.trim()) {
      return renderEditProfile("Name is required")
    }

    if (username.trim().length < 2 || username.trim().length > 30) {
      return renderEditProfile("Name must be between 2 and 30 characters")
    }

    if (!/^[A-Za-z ]+$/.test(username.trim())) {
      return renderEditProfile("Name must contain only letters and spaces")
    }

    if (phone && !/^\d{10}$/.test(phone.trim())) {
      return renderEditProfile("Phone number must be exactly 10 digits")
    }

    const updateData = {
      username: username.trim(),
      phone: phone?.trim() || ""
    }

    if (req.file) {
      updateData.profileImage = req.file.path
    }

    await userService.updateProfile(req.session.user, updateData)

    res.redirect("/profile?success=Profile updated successfully")

  } catch (error) {
    console.log("Update Profile Error:", error)

    const user = await userService.getUser(req.session.user)

    res.render("user/editProfile", {
      user,
      error: error.message || "Failed to update profile",
      success: null
    })
  }
}

const loadChangePassword = (req, res) => {
  res.render("user/changePassword", {
    error: null,
    success: null
  })
}

const changePassword = async (req, res) => {
  try {
 
    const { currentPassword, newPassword } = req.body
 
    if (!currentPassword || !newPassword) {
      return res.render("user/changePassword", {
        error: "All fields are required",
        success: null
      })
    }
 
    if (newPassword.length < 6) {
      return res.render("user/changePassword", {
        error: "New password must be at least 6 characters",
        success: null
      })
    }
 
    const result = await userService.changePassword(
      req.session.user,
      currentPassword,
      newPassword
    )
 
    if (!result.success) {
      return res.render("user/changePassword", {
        error: result.message,
        success: null
      })
    }
 
    res.redirect("/profile?success=Password changed successfully")
 
  } catch (error) {
    console.log("Change Password Error:", error)
 
    res.render("user/changePassword", {
      error: error.message || "Failed to change password",
      success: null
    })
  }
}
 

const loadEditEmail=async(req,res)=>{
  const user = await userService.getUser(req.session.user)

  res.render("user/editEmail",{
    user,
    error:null
  })
}

const sendEmailOtp = async (req, res) => {
  try {

    const { email, password } = req.body;

    const result = await userService.sendEmailOtp(req.session.user, email, password);

    if (!result.success) {
      const user = await userService.getUser(req.session.user)

      return res.render("user/editEmail", {
        error: result.message,
        user
      });
    }

    res.render("user/emailotp", { email,user:null,error:null });

  } catch (error) {
    console.log(error);
    const user = await userService.getUser(req.session.user)

    res.render("user/editEmail", {
      error: "Something went wrong",
      user
    });
  }
};


const verifyEmailOtp=async (req,res)=>{
  try {
    const {email,otp}=req.body;
    const result =await userService.verifyEmailOtp(req.session.user,email,otp)

    if(!result.success){
      return res.render("user/emailotp", {
        email,
        error: result.message,
        user: null
      })

    }

    res.redirect("/profile")
    
  } catch (error) {
    console.log(error)

     res.render("user/emailotp", {
      email: req.body.email,
      error: "Something went wrong",
      user: null
    });
    

  }
}






const loadAddressPage = async (req, res) => {
  try {
    const user = await userService.getUser(req.session.user)

    let selectedAddress = null

    if (req.query.selected) {
      selectedAddress = user.addresses.id(req.query.selected)
    } else {
      selectedAddress = user.addresses[0]
    }

    res.render("user/address", {
      user,
      selectedAddress,
      error: req.query.error || null,
      success: req.query.success || null
    })

  } catch (error) {
    console.log(error)

    res.redirect(
      `/profile?error=${encodeURIComponent("Unable to load address page")}`
    )
  }
}

const saveAddress = async (req, res) => {
  try {
    const userId = req.session.user;

    await userService.saveAddress(userId, req.body);

    // 🔥 dynamic redirect
    const redirectTo = req.query.redirect || "/address";

    res.redirect(redirectTo);

  } catch (error) {
    console.log(error);

    const redirectTo = req.query.redirect || "/address";

    if (req.query.redirect) {
      return res.redirect(
        `/add-address?redirect=${encodeURIComponent(redirectTo)}&error=${encodeURIComponent(error.message)}`
      );
    }

    res.redirect(`/address?error=${encodeURIComponent(error.message)}`);
  }
};
const deleteAddress = async (req, res) => {
  try {

    await userService.deleteAddress(req.session.user, req.params.id);

    res.redirect("/address");

  } catch (error) {
    console.log(error);
    res.redirect("/address");
  }
};



 const loadProducts = async (req, res) => {

 try {

 
  const {
   search,
   page,
   sort,
   category,
   minPrice,
   maxPrice
  } = req.query


  const data = await userService.getProducts({
   search,
   page,
   sort,
   category,
   minPrice,
   maxPrice
  })


  const {
   products,
   categories,
   totalPages,
   currentPage,
   totalProducts
  } = data


res.render("user/productListing", {
  ...res.locals,
  products,
  categories,
  totalPages,
  currentPage,
  selectedCategory: category,
  sort,
  search,
  priceRange: maxPrice,
  minPrice,
  totalProducts,
  user: req.user || req.session.user,
  error: req.query.error || null,
  success: req.query.success || null
});

 } catch (error) {

  console.log(error)
  res.redirect("/pageNotFound")

 }

}




const loadProductDetails = async (req, res) => {
  try {
    const productId = req.params.id

    const error = req.query.error || null
    const success = req.query.success || null

    const data = await userService.getProductDetails(productId)

    if (!data || !data.product) {
      return res.redirect("/products")
    }

    /*
=================================
AVAILABLE COUPONS
=================================
*/

const availableCoupons =
  await Coupon.find({

    isActive: true,

    expiryDate: {
      $gt: new Date()
    }
  });

    if (data.product.isBlocked) {
      return res.render("user/productDetails", {

  ...data,

  availableCoupons,

  error:
    "This product is currently unavailable.",

  success: null
})
    }

    res.render("user/productDetails", {

  ...data,

  availableCoupons,

  error,

  success
})

  } catch (error) {
    console.log(error)
    res.redirect(
      `/products?error=${encodeURIComponent("Unable to load product details")}`
    )
  }
}

const addReview = async(req,res)=>{

try{

const userId = req.session.user
const productId = req.params.id

const { rating , comment } = req.body

// check login
if(!userId){
return res.redirect("/login")
}

await userService.addReview({

userId,
productId,
rating,
comment

})

res.redirect(`/product/${productId}`)

}catch(error){

console.log("Add Review Error:",error)
res.redirect("/products")

}

}

const loadAddAddress = async (req, res) => {
  try {
    const user = await userService.getUser(req.session.user);

    res.render("user/addressForm", {
      user,
      address: null,
      redirect: req.query.redirect || null,
      error: req.query.error || null
    });
  } catch (error) {
    console.log("Load Add Address Error:", error);
    res.redirect("/checkout");
  }
};

const loadEditAddress = async (req, res) => {
  try {
    const user = await userService.getUser(req.session.user);

    const address = user.addresses.id(req.params.id);

    res.render("user/addressForm", {
      user,
      address,
      redirect: req.query.redirect || null,
      error: null
    });

  } catch (error) {
    console.log(error);
    res.redirect("/checkout");
  }
};


const loadWalletPage = async (
  req,
  res
) => {

  try {

    const userId =
      req.session.user;

    /*
    =================================
    FIND USER
    =================================
    */

    const user =
      await User.findById(
        userId
      );

    /*
    =================================
    GENERATE REFERRAL CODE
    FOR OLD USERS
    =================================
    */

    if (!user.referralCode) {

      user.referralCode =

        user.username
          .substring(0, 4)
          .toUpperCase()

        +

        Math.floor(
          1000 +
          Math.random() * 9000
        );

      await user.save();
    }

    /*
    =================================
    FIND OR CREATE WALLET
    =================================
    */

    let wallet =
      await Wallet.findOne({
        user: userId
      });

    if (!wallet) {

      wallet =
        await Wallet.create({

          user: userId,

          balance: 0,

          transactions: []
        });
    }

    /*
    =================================
    SORT TRANSACTIONS
    =================================
    */

    wallet.transactions.sort(

      (a, b) =>

        new Date(b.createdAt) -

        new Date(a.createdAt)
    );

    /*
    =================================
    RENDER PAGE
    =================================
    */

    res.render(
      "user/wallet",
      {
        wallet,
        user
      }
    );

  } catch (error) {

    console.log(
      "Load Wallet Error:",
      error
    );

    res.redirect(
      "/profile"
    );
  }
};







export default {
  loadSignup,
  registerUser,
  loadLogin,
  loginUser,
  loadHomepage,
  logout,

  loadForgotPassword,
  sendOtp,
  loadVerifyOtp,
  verifyOtp,
  loadResetPassword,
  resetPassword,


  loadSignupOtp,
  verifySignupOtp,
  resendSignupOtp,

  loadProfile,
  loadEditProfile,
  updateProfile,
  loadChangePassword,
  changePassword,
  loadEditEmail,
  sendEmailOtp,verifyEmailOtp,
  loadAddressPage,
  saveAddress,
  deleteAddress,


  loadProducts,
  loadProductDetails,
  addReview,

  loadEditAddress,
  loadAddAddress,
  loadWalletPage,
  loadAbout,
  loadContact
};
