import User from "../models/user.js"

const isUserLoggedIn = async (req, res, next) => {

  // Check session first
  if (!req.session.user) {
    return res.redirect("/login");
  }

  const user = await User.findById(req.session.user);

  // If user not found
  if (!user) {
    req.session.destroy();
    return res.redirect("/login");
  }

  // Role check
  if (user.role !== "user") {
    return res.redirect("/admin/dashboard");
  }

  // Blocked user check
  if (user.isBlocked) {
    req.session.destroy();
    return res.redirect("/login?error=Account blocked");
  }

  next();
};




const redirectIfLoggedIn = (req, res, next) => {
  if (req.session.user) {
    return res.redirect("/");
  }

  next();
};


const adminAuth = (req, res, next) => {

  if (!req.session.admin) {
    return res.redirect("/admin/login");
  }

  next();
};

export default {
  isUserLoggedIn,
  redirectIfLoggedIn,
  adminAuth
};