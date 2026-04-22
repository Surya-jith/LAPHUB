import mongoose from "mongoose";

const orderSchema = new mongoose.Schema({

  orderId: {
    type: String,
    required: true,
    unique: true
  },

  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },

  items: [
    {
      product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
        required: true
      },

      variantId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
      },

      quantity: {
        type: Number,
        required: true
      },

      price: {
        type: Number,
        required: true
      },

      totalPrice: {
        type: Number,
        required: true
      },

      status: {
        type: String,
        enum: [
          "Pending",
          "Processing",
          "Shipped",
          "Delivered",
          "Cancelled",
          "Returned"
        ],
        default: "Pending"
      }
    }
  ],

  address: {
  firstName: {
    type: String,
    required: true
  },

  lastName: {
    type: String,
    required: true
  },

  phone: {
    type: String,
    required: true
  },

  address: {
    type: String,
    required: true
  },

  city: {
    type: String,
    required: true
  },

  state: {
    type: String,
    required: true
  },

  pincode: {
    type: String,
    required: true
  }
},

  paymentMethod: {
    type: String,
    enum: ["COD", "Razorpay", "Wallet"],
    required: true
  },

  paymentStatus: {
    type: String,
    enum: ["Pending", "Paid", "Failed"],
    default: "Pending"
  },

  subtotal: {
    type: Number,
    required: true
  },

  discount: {
    type: Number,
    default: 0
  },

  shippingCharge: {
    type: Number,
    default: 0
  },

  finalAmount: {
    type: Number,
    required: true
  },

  orderStatus: {
    type: String,
    enum: [
      "Pending",
      "Processing",
      "Shipped",
      "Delivered",
      "Cancelled",
      "Returned"
    ],
    default: "Pending"
  },

  cancelReason: {
    type: String,
    default: ""
  },

  returnReason: {
    type: String,
    default: ""
  }

}, {
  timestamps: true
});

export default mongoose.model("Order", orderSchema);