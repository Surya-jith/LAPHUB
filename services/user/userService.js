import User from "../../models/user.js";
import bcrypt  from "bcryptjs";
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

const nameRegex = /^[A-Za-z]{3,}$/;
const phoneRegex = /^[0-9]{10}$/;
const pincodeRegex = /^[0-9]{6}$/;
const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

if(!nameRegex.test(data.firstName)){
throw new Error("First name must contain only letters and at least 3 characters");
}

if(!nameRegex.test(data.lastName)){
throw new Error("Last name must contain only letters and at least 3 characters");
}

if(!phoneRegex.test(data.phone)){
throw new Error("Phone number must be exactly 10 digits");
}

if(!pincodeRegex.test(data.pincode)){
throw new Error("Pincode must be 6 digits");
}

if(!emailRegex.test(data.email)){
throw new Error("Invalid email format");
}

if(!data.address || data.address.length < 5){
throw new Error("Address must be at least 5 characters long");
}

};

const saveAddress = async (userId, addressData) => {

  validateAddress(addressData)

const user = await User.findById(userId)

const { addressId, isDefault } = addressData


// If user sets new default address
if(isDefault){

user.addresses.forEach(addr=>{
addr.isDefault = false
})

}


if(addressId){

// EDIT ADDRESS

const address = user.addresses.id(addressId)

if(!address) return

address.firstName = addressData.firstName
address.lastName = addressData.lastName
address.company = addressData.company
address.address = addressData.address
address.country = addressData.country
address.state = addressData.state
address.city = addressData.city
address.pincode = addressData.pincode
address.email = addressData.email
address.phone = addressData.phone
address.isDefault = isDefault ? true : false

}else{

// ADD ADDRESS

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
isDefault: isDefault ? true : false

})

}

await user.save()

}

const deleteAddress=async(userId,addressId)=>{
    const user = await User.findById(userId);

  user.addresses.pull(addressId);

  await user.save();

}











export default {register,login,validateSignup,
  getUser,
  updateProfile,
  changePassword,
  sendEmailOtp,
  verifyEmailOtp,
  saveAddress,
  deleteAddress
};