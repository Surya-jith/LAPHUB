import Order from "../../models/order.js";
import Product from "../../models/productModel.js";

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

    if (variant) {
      variant.stock += item.quantity;
      await product.save();
    }

    item.status = "Cancelled";
  }

  /*
  =================================
  UPDATE ORDER STATUS
  =================================
  */

  order.orderStatus = "Cancelled";
  order.cancelReason = cancelReason || "";

  await order.save();

  return order;
};

const cancelOrderItem = async (
  orderId,
  itemId,
  userId
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

  if (item.status === "Cancelled") {
    throw new Error("Item already cancelled");
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

  /*
  =================================
  IF ALL ITEMS CANCELLED
  → FULL ORDER CANCELLED
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
  });

  if (!order) {
    throw new Error("Order not found");
  }

  /*
  =================================
  VALIDATION
  =================================
  */

  if (order.orderStatus !== "Delivered") {
    throw new Error(
      "Return allowed only after delivery"
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

  /*
  =================================
  UPDATE ORDER STATUS
  =================================
  */

  order.orderStatus = "Returned";
  order.returnReason = returnReason.trim();

 for (const item of order.items) {

  const product = await Product.findById(
    item.product
  );

  if (!product) continue;

  const variant = product.variants.id(
    item.variantId
  );

  if (variant) {
    variant.stock += item.quantity;
    await product.save();
  }

  item.status = "Returned";
}

  await order.save();

  return order;
};

export default {
  generateOrderId,
  getUserOrders,
  getOrderById,
  cancelOrder,
  cancelOrderItem,
  returnOrder
};