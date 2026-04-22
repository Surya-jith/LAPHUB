import Cart from "../../models/cartModel.js";
import User from "../../models/user.js";
import Product from "../../models/productModel.js";
import Order from "../../models/order.js";

const getCheckoutData = async (userId, buyNow = null) => {

  let items = [];
  let subtotal = 0;
  let discount = 0;
  let tax = 0;
  let total = 0;
  let disableCheckout = false;

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
        tax: 0,
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
  COMMON TOTAL CALCULATION
  =================================
  */

  tax = Number((subtotal * 0.02).toFixed(2));
  total = Number((subtotal + tax - discount).toFixed(2));

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
    tax,
    total,
    disableCheckout,
    addresses,
    defaultAddress
  };
};


const placeOrder = async (
  userId,
  addressId,
  paymentMethod,
  buyNow = null
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

    if (quantity > variant.stock) {
      throw new Error("Insufficient stock");
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

      if (item.quantity > variant.stock) {
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
  FINAL TOTAL
  =================================
  */

  const finalAmount =
    subtotal - discount + shippingCharge;

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
        : "Paid",

    subtotal,
    discount,
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
  getOrderSuccessData
};