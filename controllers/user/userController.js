import User from "../../models/user.js";
import userService from "../../services/user/userService.js";
import sendEmail from "../../utils/sendEmail.js";
import bcrypt from "bcryptjs";





const loadSignup = (req, res) => {
  res.render("user/signup", {
    title: "Signup",
    error: null,
    user: null,
    oldData: null
  });
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
      user = await User.findById(req.session.user);
    }

    res.render("user/homepage", {
      user,
      title: "Home"
    });

  } catch (error) {

    console.log("Error loading homepage:", error.message);
    res.status(500).send("Server Error");

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
    res.status(500).send("Server Error");

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

    if (!user || user.otp !== otp) {

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

    res.redirect(`/reset-password?email=${email}`);

  } catch (error) {

    console.log(error.message);
    res.status(500).send("Server Error");

  }

};





const loadResetPassword = (req, res) => {

  res.render("user/resetpassword", {
    title: "Reset Password",
    error: null,
    email: req.query.email,
    user: null
  });

};



const resetPassword = async (req, res) => {

  try {

    const { email, password, confirmPassword } = req.body;

    if (password !== confirmPassword) {

      return res.render("user/resetpassword", {
        title: "Reset Password",
        error: "Passwords do not match",
        email
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

    res.redirect("/login");

  } catch (error) {

    console.log(error.message);
    res.status(500).send("Server Error");

  }

};




const loadSignupOtp = (req, res) => {

  res.render("user/signupOtp", {
    title: "Verify OTP",
    email: req.query.email,
    error: null,
    user: null
  });

};


const verifySignupOtp = async (req, res) => {

  try {

    const { otp } = req.body;

    if (otp !== req.session.signupOtp) {

      return res.render("user/signupOtp", {
        title: "Verify OTP",
        error: "Invalid OTP",
        email: req.session.signupData.email,
        user: null
      });

    }

    if (req.session.signupOtpExpiry < Date.now()) {

      return res.render("user/signupOtp", {
        title: "Verify OTP",
        error: "OTP expired",
        email: req.session.signupData.email,
        user: null
      });

    }

    await userService.register(req.session.signupData);

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


const loadProfile=async (req,res)=>{

  const user = await userService.getUser(req.session.user)

res.render("user/profile",{user})
}

const loadEditProfile=async (req,res)=>{

  const user = await userService.getUser(req.session.user)
  res.render("user/editProfile",{user})
}

const updateProfile = async (req,res)=>{

  console.log("BODY:", req.body);
console.log("FILE:", req.file); 

const username = req.body?.username;
const phone = req.body?.phone;

const updateData = {
username,
phone
};

// if user uploaded a new image
if(req.file){
updateData.profileImage = req.file.filename;
}

await userService.updateProfile(req.session.user, updateData);

res.redirect("/profile");

}

const loadChangePassword=(req,res)=>{
  res.render("user/changePassword");

}

const changePassword=async(req,res)=>{
  const{currentPassword,newPassword}=req.body;

  const result = await userService.changePassword(req.session.user,currentPassword,newPassword)
if(!result.success){
  res.render("user/changePassword",{error:result.message})
}
res.redirect("/profile")

}

const loadEditEmail=(req,res)=>{
  res.render("user/editEmail",{
    user:req.user,error:null
  })
}

const sendEmailOtp = async (req, res) => {
  try {

    const { email, password } = req.body;

    const result = await userService.sendEmailOtp(req.session.user, email, password);

    if (!result.success) {
      return res.render("user/editEmail", {
        error: result.message,
        user: req.session.user
      });
    }

    res.render("user/otppage", { email,user:null,error:null });

  } catch (error) {
    console.log(error);
    res.render("user/editEmail", {
      error: "Something went wrong",
      user: req.session.user
    });
  }
};


const verifyEmailOtp=async (req,res)=>{
  try {
    const {email,otp}=req.body;
    const result =await userService.verifyEmailOtp(req.session.user,email,otp)

    if(!result.success){
      return res.render("user/otppage",{email,error:result.message,user:null})

    }

    res.redirect("/profile")
    
  } catch (error) {
    console.log(error)

     res.render("user/otppage", {
      email: req.body.email,
      error: "Something went wrong"
    });
    

  }
}






const loadAddressPage = async (req,res)=>{

  try {
    const user = await userService.getUser(req.session.user)

let selectedAddress = null

if(req.query.selected){

selectedAddress = user.addresses.id(req.query.selected)

}else{

selectedAddress = user.addresses[0]

}

res.render("user/address",{user,selectedAddress})
  } catch (error) {
    console.log(error)
    res.redirect("/profile")
    
  }



}

const saveAddress = async (req, res) => {
  try {

    await userService.saveAddress(req.session.user, req.body);

    res.redirect("/address");

  } catch (error) {
    console.log(error);
    res.redirect("/address");
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
  deleteAddress
};