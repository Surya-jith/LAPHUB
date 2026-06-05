import Cart from "../../models/cartModel.js";
import User from "../../models/user.js";
import Product from "../../models/productModel.js";
import Order from "../../models/order.js";
import Coupon from "../../models/couponModel.js";
import Wallet from "../../models/walletModel.js";

const getCheckoutData = async (userId, buyNow = null,sessionCoupon = null) => {

  let items = [];
  let subtotal = 0;
  let discount = 0;
  let gst = 0;
  let total = 0;
  let disableCheckout = false;

  /*
  BUY NOW FLOW
  */

  if (buyNow) {

    const {
      productId,
      variantId,
      quantity
    } = buyNow;

    const product = await Product.findById(productId);

    if (!product) {
      throw new Error("Product not found");
    }

    const variant = product.variants.id(variantId);

    if (!variant) {
      throw new Error("Variant not found");
    }

    // validation
    if (
      variant.stock === 0 ||
      product.isBlocked ||
      !product.isListed ||
      quantity > variant.stock
    ) {
      disableCheckout = true;
    }

    const price = variant.price;
    const itemTotal = price * quantity;

    subtotal += itemTotal;

    items.push({
      productId: product._id,
      name: product.name,
      image:
        variant.variantImage ||
        product.images?.[0] ||
        "/images/no-image.png",
      quantity,
      price,
      itemTotal
    });

  }

  /*
  =================================
  CART CHECKOUT FLOW
  =================================
  */

  else {

    const cart = await Cart.findOne({ user: userId })
      .populate("items.product");

    if (!cart || cart.items.length === 0) {
      throw new Error("Cart is empty");
    }

    for (const item of cart.items) {

      const product = item.product;

      if (!product) continue;

      const variant = product.variants.id(item.variant);

      if (!variant) continue;

      const price = variant.price;
      const quantity = item.quantity;
      const itemTotal = price * quantity;

      subtotal += itemTotal;

      if (
        variant.stock === 0 ||
        product.isBlocked ||
        !product.isListed ||
        quantity > variant.stock
      ) {
        disableCheckout = true;
      }

      items.push({
        productId: product._id,
        name: product.name,
        image:
          variant.variantImage ||
          product.images?.[0] ||
          "/images/no-image.png",
        quantity,
        price,
        itemTotal
      });
    }

    if (items.length === 0) {
      return {
        cartItems: [],
        subtotal: 0,
        discount: 0,
        gst: 0,
        total: 0,
        disableCheckout: true,
        addresses: [],
        defaultAddress: null,
        error: "All items in cart are unavailable"
      };
    }
  }


  /*
=================================
SESSION COUPON
=================================
*/

if (sessionCoupon) {

  const coupon =
    await Coupon.findById(
      sessionCoupon._id
    );

  if (
    coupon &&
    coupon.isActive &&
    coupon.expiryDate > new Date()
  ) {

    discount =
      sessionCoupon.discount || 0;
  }
}
  /*
  =================================
  COMMON TOTAL CALCULATION
  =================================
  */

  gst = Number((subtotal * 0.02).toFixed(2));

  total = Number(
    (
      subtotal +
      gst -
      discount
    ).toFixed(2)
  );

  /*
  =================================
  USER ADDRESSES
  =================================
  */

  const user = await User.findById(userId);

  const addresses = user.addresses || [];

  const defaultAddress =
    addresses.find(a => a.isDefault) ||
    addresses[0] ||
    null;

  return {
    cartItems: items,
    subtotal,
    discount,
    gst,
    total,
    disableCheckout,
    addresses,
    defaultAddress
  };
};

const applyCoupon = async (
  userId,
  couponCode,
  buyNow = null
) => {


  console.log(
  "Coupon Code:",
  couponCode
);
  /*
  =================================
  GET CHECKOUT DATA
  =================================
  */

  const checkoutData =
    await getCheckoutData(
      userId,
      buyNow
    );

  const subtotal =
    checkoutData.subtotal;

  /*
  =================================
  FIND COUPON
  =================================
  */

  const coupon =
    await Coupon.findOne({
      code:
        couponCode.toUpperCase(),
      isActive: true
    });

  if (!coupon) {
    throw new Error(
      "Invalid coupon code"
    );
  }

  /*
  =================================
  EXPIRY CHECK
  =================================
  */

  if (
    coupon.expiryDate < new Date()
  ) {

    throw new Error(
      "Coupon expired"
    );
  }

  /*
  =================================
  MINIMUM AMOUNT CHECK
  =================================
  */

  if (
    subtotal <
    coupon.minimumAmount
  ) {

    throw new Error(
      `Minimum purchase amount is ₹${coupon.minimumAmount}`
    );
  }

  /*
  =================================
  SINGLE USE CHECK
  =================================
  */

  const alreadyUsed =
    coupon.usedBy.includes(userId);

  if (alreadyUsed) {

    throw new Error(
      "Coupon already used"
    );
  }

  /*
  =================================
  CALCULATE DISCOUNT
  =================================
  */

  let discount = 0;

  if (
    coupon.discountType ===
    "percentage"
  ) {

    discount =
      (subtotal *
        coupon.discountValue) / 100;

    /*
    MAX DISCOUNT
    */

    if (
      coupon.maximumDiscount > 0
    ) {

      discount = Math.min(
        discount,
        coupon.maximumDiscount
      );
    }

  } else {

    discount =
      coupon.discountValue;
  }

  /*
  =================================
  GST + TOTAL
  =================================
  */

  const gst = Number(
    (
      subtotal * 0.02
    ).toFixed(2)
  );

  const total = Number(
    (
      subtotal +
      gst -
      discount
    ).toFixed(2)
  );

  return {

    coupon: {
      _id: coupon._id,
      code: coupon.code,
      discount
    },

    discount,
    total
  };
};

const placeOrder = async (
  userId,
  addressId,
  paymentMethod,
  buyNow = null,
  sessionCoupon=null
) => {

  let items = [];
  let subtotal = 0;
  let discount = 0;
  let shippingCharge = 0;

  /*
  =================================
  GENERATE ORDER ID
  =================================
  */

  const orderId =
    "ORD-" +
    Date.now() +
    "-" +
    Math.floor(Math.random() * 1000);

  /*
  =================================
  GET SELECTED ADDRESS
  =================================
  */

  const user = await User.findById(userId);

  if (!user) {
    throw new Error("User not found");
  }

  const selectedAddress =
    user.addresses.id(addressId);

  if (!selectedAddress) {
    throw new Error("Address not found");
  }

  /*
  =================================
  BUY NOW FLOW
  =================================
  */

  if (buyNow) {

    const {
      productId,
      variantId,
      quantity
    } = buyNow;

    const product = await Product.findById(productId);

    if (!product) {
      throw new Error("Product not found");
    }

    const variant = product.variants.id(variantId);

    if (!variant) {
      throw new Error("Variant not found");
    }

    if (
      product.isBlocked ||
      !product.isListed
    ) {
      throw new Error("This product is currently unavailable");
    }

    if (
      variant.stock <= 0 ||
      quantity > variant.stock
    ) {
      throw new Error("Insufficient stock available");
    }

    const totalPrice =
      variant.price * quantity;

    items.push({
      product: product._id,
      variantId,
      quantity,
      price: variant.price,
      totalPrice
    });

    subtotal += totalPrice;

    // Reduce stock
    variant.stock -= quantity;
    await product.save();
  }

  /*
  =================================
  CART CHECKOUT FLOW
  =================================
  */

  else {

    const cart = await Cart.findOne({
      user: userId
    }).populate("items.product");

    if (!cart || cart.items.length === 0) {
      throw new Error("Cart is empty");
    }

    for (const item of cart.items) {

      const product = item.product;

      if (!product) continue;

      const variant = product.variants.id(
        item.variant
      );

      if (!variant) continue;

      if (
        product.isBlocked ||
        !product.isListed
      ) {
        throw new Error(
          `${product.name} is currently unavailable`
        );
      }

      if (
        variant.stock <= 0 ||
        item.quantity > variant.stock
      ) {
        throw new Error(
          `${product.name} has insufficient stock`
        );
      }

      const totalPrice =
        variant.price * item.quantity;

      items.push({
        product: product._id,
        variantId: variant._id,
        quantity: item.quantity,
        price: variant.price,
        totalPrice
      });

      subtotal += totalPrice;

      // Reduce stock
      variant.stock -= item.quantity;
      await product.save();
    }

    // Clear cart after successful order
    cart.items = [];
    await cart.save();
  }

  /*
=================================
APPLY COUPON DISCOUNT
=================================
*/

if (sessionCoupon) {

  discount =
    sessionCoupon.discount || 0;

  /*
  MARK COUPON USED
  */

  await Coupon.findByIdAndUpdate(
    sessionCoupon._id,
    {
      $addToSet: {
        usedBy: userId
      }
    }
  );
}

  /*
  =================================
  FINAL TOTAL
  =================================
  */

  const gst = Number((subtotal * 0.02).toFixed(2));

  const finalAmount = Number(
    (
      subtotal +
      gst +
      shippingCharge -
      discount
    ).toFixed(2)
  );

  /*
=================================
WALLET PAYMENT
=================================
*/

if (paymentMethod === "Wallet") {

  const wallet =
    await Wallet.findOne({
      user: userId
    });

  if (!wallet) {
    throw new Error(
      "Wallet not found"
    );
  }

  /*
  =================================
  INSUFFICIENT BALANCE
  =================================
  */

  if (
    wallet.balance <
    finalAmount
  ) {

    throw new Error(
      "Insufficient wallet balance"
    );
  }

  /*
  =================================
  DEDUCT WALLET
  =================================
  */

  wallet.balance -=
    finalAmount;

  /*
  =================================
  TRANSACTION
  =================================
  */

  wallet.transactions.push({

    type: "Debit",

    amount: finalAmount,

    description:
      "Order payment"
  });

  await wallet.save();
}

  /*
  =================================
  CREATE ORDER
  =================================
  */

  const order = await Order.create({
    orderId,
    user: userId,
    items,

    address: {
      firstName: selectedAddress.firstName,
      lastName: selectedAddress.lastName,
      phone: selectedAddress.phone,
      address: selectedAddress.address,
      city: selectedAddress.city,
      state: selectedAddress.state,
      pincode: selectedAddress.pincode
    },

    paymentMethod,

   paymentStatus:

  paymentMethod === "COD"

    ? "Pending"

    : paymentMethod === "Wallet"

      ? "Paid"

      : "Failed",

    subtotal,
    discount,
    gst,
    shippingCharge,
    finalAmount,
    orderStatus: "Pending"
  });

  return order;
};

const getOrderSuccessData = async (
  orderId,
  userId
) => {

  const order = await Order.findOne({
    _id: orderId,
    user: userId
  });

  if (!order) {
    throw new Error("Order not found");
  }

  return order;
};

export default {
  getCheckoutData,
  placeOrder,
  getOrderSuccessData,
  applyCoupon
};