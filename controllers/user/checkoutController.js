import checkoutService from "../../services/user/checkoutService.js";
import razorpay from "../../config/razorpay.js";
import crypto from "crypto";
import Order from "../../models/order.js";
import Coupon from "../../models/couponModel.js";
import Wallet from "../../models/walletModel.js";
import HTTP_STATUS from "../../constants/httpStatus.js";
import MESSAGES from "../../constants/messages.js";
import ROUTES from "../../constants/routes.js";


const loadCheckout = async (req, res) => {
  try {

    const userId = req.session.user;

    const data = await checkoutService.getCheckoutData(
      userId,
      req.session.buyNow,
      req.session.coupon
    );

    if (data.disableCheckout) {
      return res.redirect(
        `${ROUTES.USER_CART}?error=Invalid cart items`
      );
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

  /*
=================================
WALLET
=================================
*/

const wallet =
  await Wallet.findOne({
    user: userId
  });

const walletBalance =
  wallet?.balance || 0;

    res.render("user/checkout", {
      availableCoupons,
      walletBalance,
      cartItems: data.cartItems,
      subtotal: data.subtotal,
discount: data.discount,
gst: data.gst,
total: data.total,
      disableCheckout: data.disableCheckout,
      addresses: data.addresses,
      defaultAddress: data.defaultAddress,
      appliedCoupon: req.session.coupon || null,
      error: null
    });

  } catch (error) {
    res.render("user/checkout", {
      availableCoupons: [],
      walletBalance: 0,
      cartItems: [],
      subtotal: 0,
      discount: 0,
      gst: 0,
      total: 0,
      disableCheckout: true,
      addresses: [],
      defaultAddress: null,
      appliedCoupon: null,
      error: error.message
    });
  }
};


const buyNow = async (req, res) => {
  try {

    const {
      productId,
      variantId,
      quantity
    } = req.body;

    if (
      !productId ||
      !variantId ||
      !quantity
    ) {
      return res.redirect(
        "/products?error=Invalid product selection"
      );
    }

    req.session.buyNow = {
      productId,
      variantId,
      quantity: Number(quantity)
    };

    return res.redirect("/checkout");

  } catch (error) {
    console.log("Buy Now Error:", error);

    return res.redirect(
      "/products?error=Unable to process Buy Now"
    );
  }
};


const placeOrder = async (req, res) => {
  try {

    const userId = req.session.user;

    const {
      address,
      paymentMethod
    } = req.body;

    /*
    =================================
    VALIDATION
    =================================
    */

    if (!address) {
      return res.status(400).json({
        success: false,
        message: "Please select a delivery address"
      });
    }

    if (!paymentMethod) {
      return res.status(400).json({
        success: false,
        message: "Select payment method"
      });
    }

    /*
    =================================
    CREATE ORDER
    =================================
    */

    const order = await checkoutService.placeOrder(
      userId,
      address,
      paymentMethod,
      req.session.buyNow,
      req.session.coupon
    );

    /*
    =================================
    COD FLOW
    =================================
    */

   if (

  paymentMethod === "COD" ||

  paymentMethod === "Wallet"

) {

      req.session.buyNow = null;
      req.session.coupon = null;

      return res.json({
        success: true,
        cod: true,
        orderId: order._id
      });
    }

    /*
    =================================
    RAZORPAY FLOW
    =================================
    */

    const razorpayOrder =
      await razorpay.orders.create({

        amount:
          Math.round(order.finalAmount * 100),

        currency: "INR",

        receipt: order.orderId
      });

    return res.json({
      success: true,

      cod: false,

      razorpayOrder,

      order: {
        _id: order._id,
        amount: order.finalAmount
      },

      razorpayKey:
        process.env.RAZORPAY_KEY_ID
    });

  } catch (error) {

    console.log(
      "Place Order Error:",
      error
    );

   return res.json({

  success: false,

  message: error.message
});
  }
};



const verifyPayment = async (req, res) => {

  try {

    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      orderId
    } = req.body;

    /*
    =================================
    GENERATE SIGNATURE
    =================================
    */

    const body =
      razorpay_order_id +
      "|" +
      razorpay_payment_id;

    const expectedSignature =
      crypto
        .createHmac(
          "sha256",
          process.env.RAZORPAY_KEY_SECRET
        )
        .update(body.toString())
        .digest("hex");

    /*
    =================================
    VERIFY SIGNATURE
    =================================
    */

    if (
      expectedSignature !==
      razorpay_signature
    ) {

      await Order.findByIdAndUpdate(
        orderId,
        {
          paymentStatus: "Failed"
        }
      );

      return res.status(400).json({
        success: false,
        message: "Payment verification failed"
      });
    }

    /*
    =================================
    UPDATE ORDER
    =================================
    */

    await Order.findByIdAndUpdate(
      orderId,
      {

        paymentStatus: "Paid",

        razorpayOrderId:
          razorpay_order_id,

        razorpayPaymentId:
          razorpay_payment_id,

        razorpaySignature:
          razorpay_signature
      }
    );

    req.session.buyNow = null;
    req.session.coupon = null;

    return res.json({
      success: true
    });

  } catch (error) {

    console.log(
      "Verify Payment Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Payment verification failed"
    });
  }
};

const retryPayment = async (req, res) => {

  try {

    const userId =
      req.session.user;

    const orderId =
      req.params.id;

    /*
    =================================
    FIND ORDER
    =================================
    */

    const order =
      await Order.findOne({
        _id: orderId,
        user: userId
      });

    if (!order) {

      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: MESSAGES.ORDER_NOT_FOUND
      });
    }

    /*
    =================================
    VALIDATION
    =================================
    */

    if (
      order.paymentMethod !== "Razorpay"
    ) {

      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: MESSAGES.PAYMENT_RETRY_RAZORPAY_ONLY
      });
    }

    if (
      order.paymentStatus === "Paid"
    ) {

      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: MESSAGES.PAYMENT_ALREADY_COMPLETED
      });
    }

    const isCancelled = order.orderStatus === "Cancelled" ||
      (order.items.length > 0 && order.items.every(item => item.status === "Cancelled"));

    if (isCancelled || order.finalAmount <= 0) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: MESSAGES.PAYMENT_RETRY_CANCELLED
      });
    }

    /*
    =================================
    CREATE NEW RAZORPAY ORDER
    =================================
    */

    const razorpayOrder =
      await razorpay.orders.create({

        amount:
          Math.round(
            order.finalAmount * 100
          ),

        currency: "INR",

        receipt: order.orderId
      });

    return res.json({

      success: true,

      razorpayOrder,

      razorpayKey:
        process.env.RAZORPAY_KEY_ID
    });

  } catch (error) {

    console.log(
      "Retry Payment Error:",
      error
    );

    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: MESSAGES.PAYMENT_RETRY_UNAVAILABLE
    });
  }
};

const loadOrderSuccess = async (req, res) => {
  try {

    const orderId = req.params.id;
    const userId = req.session.user;

    const order = await checkoutService.getOrderSuccessData(
      orderId,
      userId
    );

    if (!order) {
      return res.redirect(
        "/orders?error=Order not found"
      );
    }

    res.render("user/orderSuccess", {
      user: req.session.user,
      order
    });

  } catch (error) {
    console.log("Order Success Page Error:", error);

    res.redirect(
      "/orders?error=Unable to load order success page"
    );
  }
};


const applyCoupon = async (req, res) => {

  try {

    const userId =
      req.session.user;

    const {
      couponCode
    } = req.body;

    const result =
      await checkoutService.applyCoupon(
        userId,
        couponCode,
        req.session.buyNow
      );

    /*
    =================================
    STORE COUPON IN SESSION
    =================================
    */

    req.session.coupon = result.coupon;

    return res.json({
      success: true,
      message: MESSAGES.COUPON_APPLIED,
      discount: result.discount,
      total: result.total
    });

  } catch (error) {

  console.log(
    "COUPON ERROR:",
    error
  );

  return res.status(400).json({
    success: false,
    message: error.message
  });
}
}



const removeCoupon = async (req, res) => {

  try {

    req.session.coupon = null;

    return res.json({
      success: true,
      message: MESSAGES.COUPON_REMOVED
    });

  } catch (error) {

    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: MESSAGES.COUPON_REMOVE_FAILED
    });
  }
};

export default {
  loadCheckout,
  buyNow,
  placeOrder,
  loadOrderSuccess,
  verifyPayment,
  retryPayment,
  applyCoupon,
  removeCoupon
};
