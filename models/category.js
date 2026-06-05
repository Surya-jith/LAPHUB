import mongoose from "mongoose";

const categorySchema =new mongoose.Schema({

     name: {
    type: String,
    required: true,
    unique: true,
    trim : true,
    lowercase: true
  },
  isListed: {
  type: Boolean,
  default: true
},

   isDeleted: {
    type: Boolean,
    default: false
  },

  /*
  =================================
  CATEGORY OFFER
  =================================
  */

  categoryOffer: {

    percentage: {
      type: Number,
      default: 0
    },

    expiryDate: {
      type: Date,
      default: null
    }
  }

    
},{timestamps:true});

export default mongoose.model("Category",categorySchema);