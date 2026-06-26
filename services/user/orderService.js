import Order from "../../models/order.js";
import Product from "../../models/productModel.js";
import Wallet from "../../models/walletModel.js";
import {
  calculateItemPaidAmount,
  calculateItemsPaidAmount
} from "../../utils/orderTotals.js";

const generateOrderId = () => {
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.floor(1000 + Math.random() * 9000);

  return `ORD-${timestamp}-${random}`;
};


const getUserOrders = async (userId, page = 1, search = "") => {
  const limit = 10;
  const skip = (page - 1) * limit;

  const query = {
    user: userId,
    orderId: {
      $regex: search,
      $options: "i"
    }
  };

  const orders = await Order.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const total = await Order.countDocuments(query);

  return {
    orders,
    currentPage: page,
    totalPages: Math.ceil(total / limit),
    search
  };
};


const getOrderById = async (orderId, userId) => {
  return await Order.findOne({
    _id: orderId,
    user: userId
  })
    .populate("items.product")
    
};

const cancelOrder = async (
  orderId,
  userId,
  cancelReason = ""
) => {

  const order = await Order.findOne({
    _id: orderId,
    user: userId
  });

  if (!order) {
    throw new Error("Order not found");
  }

  if (
    order.orderStatus === "Cancelled" ||
    order.orderStatus === "Returned"
  ) {
    throw new Error("Order already closed");
  }

  if (order.orderStatus === "Delivered") {
  throw new Error(
    "Delivered orders cannot be cancelled"
  );
}

  if (!cancelReason || !cancelReason.trim()) {
    throw new Error("Cancel reason is required");
  }

  /*
  =================================
  STOCK INCREMENT BACK
  =================================
  */

  for (const item of order.items) {

    const product = await Product.findById(
      item.product
    );

    if (!product) continue;

    const variant = product.variants.id(
      item.variantId
    );

    if (
      item.status !== "Cancelled" &&
      item.status !== "Returned"
    ) {

      if (variant) {
        variant.stock += item.quantity;
        await product.save();
      }

      item.status = "Cancelled";
    }
  }

  /*
  =================================
  UPDATE ORDER STATUS
  =================================
  */

  order.orderStatus = "Cancelled";
  order.cancelReason = cancelReason.trim();

  /*
  =================================
  WALLET REFUND
  =================================
  */

  if (
    order.paymentStatus === "Paid" &&
    (
      order.paymentMethod === "Wallet" ||
      order.paymentMethod === "Razorpay"
    )
  ) {
    console.log("REFUND BLOCK EXECUTED");

    let wallet = await Wallet.findOne({
      user: order.user
    });

    if (!wallet) {

      wallet = await Wallet.create({
        user: order.user,
        balance: 0,
        transactions: []
      });
    }

    const refundableItems = order.items.filter(
      item => item.status !== "Cancelled" && item.status !== "Returned"
    );
    const refundAmount = calculateItemsPaidAmount(refundableItems, order);

    wallet.balance += refundAmount;

    wallet.transactions.push({
      type: "Credit",
      amount: refundAmount,
      description: `Refund for Cancelled Order ${order.orderId}`,
      orderId: order._id
    });

    await wallet.save();
  }

  await order.save();

  return order;
};
const cancelOrderItem = async (
  orderId,
  itemId,
  userId,
  cancelReason = ""
) => {

  const order = await Order.findOne({
    _id: orderId,
    user: userId
  });

  if (!order) {
    throw new Error("Order not found");
  }

  if (
    order.orderStatus === "Cancelled" ||
    order.orderStatus === "Returned"
  ) {
    throw new Error("Order already closed");
  }

  /*
  =================================
  FIND ITEM
  =================================
  */

  const item = order.items.id(itemId);

  if (!item) {
    throw new Error("Order item not found");
  }

  if (item.status === "Delivered") {
    throw new Error(
      "Delivered items cannot be cancelled"
    );
  }

  if (
    item.status === "Cancelled" ||
    item.status === "Returned"
  ) {
    throw new Error(
      "This item is already closed"
    );
  }

  if (!cancelReason || !cancelReason.trim()) {
    throw new Error("Cancel reason is required");
  }

  /*
  =================================
  RESTORE STOCK
  =================================
  */

  const product = await Product.findById(
    item.product
  );

  if (product) {

    const variant = product.variants.id(
      item.variantId
    );

    if (variant) {
      variant.stock += item.quantity;
      await product.save();
    }
  }

  /*
  =================================
  UPDATE ITEM STATUS
  =================================
  */

  item.status = "Cancelled";
  item.cancelReason = cancelReason.trim();

  /*
  =================================
  REFUND FOR PAID ORDERS
  =================================
  */

  const refundAmount = calculateItemPaidAmount(item, order);

  if (
    order.paymentStatus === "Paid" &&
    (
      order.paymentMethod === "Wallet" ||
      order.paymentMethod === "Razorpay"
    )
  ) {

    let wallet = await Wallet.findOne({
      user: order.user
    });

    if (!wallet) {

      wallet = await Wallet.create({
        user: order.user,
        balance: 0,
        transactions: []
      });
    }

    wallet.balance += refundAmount;

    wallet.transactions.push({
      type: "Credit",
      amount: refundAmount,
      description:
        `Refund for cancelled item in Order ${order.orderId}`,
      orderId: order._id
    });

    await wallet.save();
  }

  /*
  =================================
  IF ALL ITEMS CANCELLED
  =================================
  */

  const allCancelled = order.items.every(
    i => i.status === "Cancelled"
  );

  if (allCancelled) {
    order.orderStatus = "Cancelled";
  }

  await order.save();

  return order;
};

const returnOrder = async (
  orderId,
  userId,
  returnReason
) => {

  const order = await Order.findOne({
    _id: orderId,
    user: userId
  })

  if (!order) {
    throw new Error("Order not found")
  }

  /*
  =================================
  VALIDATION
  =================================
  */

  if (order.orderStatus !== "Delivered") {
    throw new Error(
      "Return allowed only after delivery"
    )
  }

  if (
    !returnReason ||
    !returnReason.trim()
  ) {
    throw new Error(
      "Return reason is required"
    )
  }

  /*
  =================================
  USER ONLY REQUESTS RETURN
  (NO STOCK RESTORE HERE)
  =================================
  */

  order.orderStatus = "Return Requested"
  order.returnReason = returnReason.trim()

  for (const item of order.items) {
    if (
      item.status !== "Cancelled" &&
      item.status !== "Returned"
    ) {
      item.status = "Return Requested"
    }
  }

  await order.save()

  return order
}

const returnOrderItem = async (
  orderId,
  itemId,
  userId,
  returnReason
) => {

  const order = await Order.findOne({
    _id: orderId,
    user: userId
  });

  if (!order) {
    throw new Error("Order not found");
  }

  const item = order.items.id(itemId);

  if (!item) {
    throw new Error("Item not found");
  }

if (
  order.orderStatus !== "Delivered" ||
  item.status === "Cancelled" ||
  item.status === "Returned"
) {
  throw new Error(
    "Return allowed only for delivered items"
  );
}

  if (
    !returnReason ||
    !returnReason.trim()
  ) {
    throw new Error(
      "Return reason is required"
    );
  }

  item.status = "Return Requested";
  item.returnReason = returnReason.trim();

  await order.save();

  return order;
};

export default {
  generateOrderId,
  getUserOrders,
  getOrderById,
  cancelOrder,
  cancelOrderItem,
  returnOrder,
  returnOrderItem
};
