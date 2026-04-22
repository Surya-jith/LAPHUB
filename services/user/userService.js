import User from "../../models/user.js";
import bcrypt  from "bcryptjs";
import Product from "../../models/productModel.js"
import Category from "../../models/category.js"
import sendEmail from "../../utils/sendEmail.js";



const register = async ({ username, email, password, phone }) => {

  const hashedPassword = await bcrypt.hash(password, 10);

  await User.create({
    username,
    email,
    phone,
    password: hashedPassword
  });

};





const validateSignup = async ({ username, email, password, confirmPassword, phone }) => {

  const usernameRegex = /^[A-Za-z]{3,}$/;
  if (!usernameRegex.test(username)) {
    throw new Error("Username must be at least 3 letters and contain only alphabets");
  }

  const emailRegex = /^[A-Za-z][A-Za-z0-9._%+-]*@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
  if (!emailRegex.test(email)) {
    throw new Error("Invalid email format");
  }

  const phoneRegex = /^[0-9]{10}$/;
  if (phone && !phoneRegex.test(phone)) {
    throw new Error("Phone number must be exactly 10 digits");
  }

  if (password !== confirmPassword) {
    throw new Error("Passwords do not match");
  }

  const existingUser = await User.findOne({ email });

  if (existingUser) {
    throw new Error("Email already exists");
  }

};



const login=async({email,password})=>{

  const user=await User.findOne({email})

  if(!user){
    throw new Error("User not found")
  }
  
  if (user.role === "admin") {
    throw new Error("Admin must login from admin panel");
  }

  if(user.isBlocked){
    throw new Error("User is blocked!")
  }

  const isMatch=await bcrypt.compare(password,user.password);
  if(!isMatch){
    throw new Error("invalid password or email");
  }

  return user;

}


const getUser=async (userId)=>{
  return await User.findById(userId)

}

const updateProfile = async (userId, data) => {

  await User.findByIdAndUpdate(userId, data);

}

const changePassword=async(userId,currentPassword,newPassword)=>{

const user=await User.findById(userId)
const match=await bcrypt.compare(currentPassword,user.password)
if(!match){
  return {success:false,message:"Invalid current Password"}
}
const hashedPassword=await bcrypt.hash(newPassword,10)
user.password=hashedPassword;
await user.save()

return {success:true}

}

const sendEmailOtp=async(userId,email,password)=>{
    const user = await User.findById(userId);
      const match = await bcrypt.compare(password, user.password);
       if (!match) {
    return { success: false, message: "Incorrect password" };
  }
  if(email==user.email){
    return {success:false,message:"This email is your current email"}
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString()
  user.otp=otp;
  user.otpExpiry=Date.now()+300000;
  await user.save()

await sendEmail(email,"Email Change OTP", `Your OTP is ${otp}. It expires in 5 minutes.`,otp);
return {success:true};

}

const verifyEmailOtp=async(userId,email,otp)=>{
const user=await User.findById(userId)

if(user.otpExpiry<Date.now()){
  return {success:false,message:"OTP expired"}
}

if(user.otp!==otp){
  return {success:false,message:"OTP is incorrect"}
}

const existingUser = await User.findOne({ email })

if(existingUser){
  return {success:false,message:"Email already exists"}
}

user.email=email;
user.otp=null;
user.otpExpiry=null
await user.save()
return {success:true}
}


const validateAddress = (data) => {

  const nameRegex = /^[A-Za-z ]{2,}$/;
  const phoneRegex = /^[0-9]{10}$/;
  const pincodeRegex = /^[0-9]{6}$/;
  const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

  if (!data.firstName || !nameRegex.test(data.firstName.trim())) {
    throw new Error("First name must contain only letters and at least 2 characters");
  }

  if (!data.lastName || !nameRegex.test(data.lastName.trim())) {
    throw new Error("Last name must contain only letters and at least 2 characters");
  }

  if (!phoneRegex.test(data.phone)) {
    throw new Error("Phone number must be exactly 10 digits");
  }

  if (!pincodeRegex.test(data.pincode)) {
    throw new Error("Pincode must be 6 digits");
  }

  if (!emailRegex.test(data.email)) {
    throw new Error("Invalid email format");
  }

  if (!data.address || data.address.trim().length < 5) {
    throw new Error("Address must be at least 5 characters long");
  }

};
const saveAddress = async (userId, addressData) => {

  

  validateAddress(addressData);

  const user = await User.findById(userId);

  const addressId = addressData.addressId;
  const isDefault = addressData.isDefault === "true";

  // reset old default
  if (isDefault) {
    user.addresses.forEach(addr => {
      addr.isDefault = false;
    });
  }

  if (addressId) {

    // EDIT
    const address = user.addresses.id(addressId);

    if (!address) return;

    address.firstName = addressData.firstName;
    address.lastName = addressData.lastName;
    address.company = addressData.company;
    address.address = addressData.address;
    address.country = addressData.country;
    address.state = addressData.state;
    address.city = addressData.city;
    address.pincode = addressData.pincode;
    address.email = addressData.email;
    address.phone = addressData.phone;
    address.isDefault = isDefault;

  } else {

    // ADD
    user.addresses.push({
      firstName: addressData.firstName,
      lastName: addressData.lastName,
      company: addressData.company,
      address: addressData.address,
      country: addressData.country,
      state: addressData.state,
      city: addressData.city,
      pincode: addressData.pincode,
      email: addressData.email,
      phone: addressData.phone,
      isDefault
    });
  }

  await user.save();
};
const deleteAddress=async(userId,addressId)=>{
    const user = await User.findById(userId);

  user.addresses.pull(addressId);

  await user.save();

}




 const getProducts = async (filters) => {

 try {

  const {
   search,
   page = 1,
   sort,
   category,
   minPrice,
   maxPrice
  } = filters


  let query = {
   isDeleted: false,
   isListed: true
  }


  if (search) {
   query.name = {
    $regex: search,
    $options: "i"
   }
  }


  if (category) {
   query.category = category
  }


  if (minPrice && maxPrice) {
   query.price = {
    $gte: Number(minPrice),
    $lte: Number(maxPrice)
   }
  }


  let sortOption = {}

  switch (sort) {

   case "price_asc":
    sortOption.price = 1
    break

   case "price_desc":
    sortOption.price = -1
    break

   case "name_asc":
    sortOption.name = 1
    break

   case "name_desc":
    sortOption.name = -1
    break

   default:
    sortOption.createdAt = -1
  }


  const limit = 8
  const skip = (page - 1) * limit


  const products = await Product.find(query)
   .populate("category")
   .sort(sortOption)
   .skip(skip)
   .limit(limit)


  const totalProducts = await Product.countDocuments(query)

  const totalPages = Math.ceil(totalProducts / limit)


  const categories = await Category.find({
   isListed: true
  })


  return {
   products,
   categories,
   currentPage: Number(page),
   totalPages,
   totalProducts
  }

 } catch (error) {

  console.log(error)
  throw error

 }

}

const getProductDetails = async(productId)=>{

try{

const product = await Product.findById(productId)
.populate("category")
.populate("brand")
.populate("reviews.user")   // ⭐ Important


// product blocked check
if(!product || product.isDeleted || !product.isListed){
return null
}


// related products
const relatedProducts = await Product.find({

category: product.category,
_id: { $ne: product._id },
isDeleted:false,
isListed:true

}).limit(4)

let avgRating = 0
let reviewCount = 0

if(product.reviews && product.reviews.length > 0){

reviewCount = product.reviews.length

const total = product.reviews.reduce((sum,review)=>{
return sum + review.rating
},0)

avgRating = total / reviewCount

}
return {

product,
relatedProducts,
avgRating,
reviewCount

}

}catch(error){

console.log(error)
return null

}

}



const addReview = async({

userId,
productId,
rating,
comment

})=>{

const product = await Product.findById(productId)

// Check if user already reviewed
const alreadyReviewed = product.reviews.find(
r => r.user.toString() === userId.toString()
)

if(alreadyReviewed){

alreadyReviewed.rating = rating
alreadyReviewed.comment = comment

}else{

product.reviews.push({
user:userId,
rating,
comment
})

}

await product.save()

}




export default {register,login,validateSignup,
  getUser,
  updateProfile,
  changePassword,
  sendEmailOtp,
  verifyEmailOtp,
  saveAddress,
  deleteAddress,
  getProducts,
  getProductDetails,
  addReview
};