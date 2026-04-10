import mongoose from "mongoose";

const productSchema = new mongoose.Schema({

  name: {
    type: String,
    required: true,
    trim: true
  },

  description: {
    type: String,
    required: true
  },

  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Category",
    required: true
  },

  brand: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Brand",
    default: null
  },

  price: {
    type: Number,
    required: true
  },

  discount: {
    type: Number,
    default: 0
  },

  offerPrice: {
    type: Number
  },


  variants: [
    {
      color: String,
      ram: String,
      rom: String,
      stock: Number,
      price: Number,

      variantImage: {
        type: String
      }
    }
  ],


  // General Images
  images: [{
    type: String,
    required: true
  }],


  // ⭐ Reviews Section
  reviews: [
    {
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
      },

      rating: {
        type: Number,
        min: 1,
        max: 5
      },

      comment: {
        type: String
      },

      createdAt: {
        type: Date,
        default: Date.now
      }
    }
  ],


  isDeleted: {
    type: Boolean,
    default: false
  },

  isListed: {
    type: Boolean,
    default: true
  }

}, {
  timestamps: true
});


const Product = mongoose.model("Product", productSchema);

export default Product;