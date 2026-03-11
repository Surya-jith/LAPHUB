import mongoose from "mongoose";

const addressSchema = new mongoose.Schema({

  firstName: String,

  lastName: String,

  company: String,

  address: String,

  country: String,

  state: String,

  city: String,

  pincode: String,

  email: String,

  phone: String,

  isDefault: {
    type: Boolean,
    default: false
  }

}, { _id: true });



const userSchema = new mongoose.Schema({

  username: {
    type: String,
    required: true,
    trim: true
  },

  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },

  phone: {
    type: String
  },
  profileImage:{
 type:String,
 default:"null"
},

  otp: {
    type: String
  },

  otpExpiry: {
    type: Date
  },

  password: {
    type: String,
    required: false
  },

  role: {
    type: String,
    enum: ["user", "admin"],
    default: "user"
  },

  isBlocked: {
    type: Boolean,
    default: false
  },

  referralCode: {
    type: String,
    unique: true,
    sparse: true
  },

  referredBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },

  addresses: [addressSchema]  

}, { timestamps: true });

export default mongoose.model("User", userSchema);