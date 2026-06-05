import Order from "../../models/order.js";
import Product from "../../models/productModel.js";
import Wallet from "../../models/walletModel.js";

const loadOrders = async (req, res) => {
  try {
    let {
      search = "",
      status = "",
      sort = "",
      page = 1
    } = req.query;

    page = parseInt(page) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;

    let filter = {};

    // Search by Order ID
    if (search) {
      filter.orderId = {
        $regex: search,
        $options: "i"
      };
    }

    // Filter by status
    if (status) {
      filter.orderStatus = status;
    }

    let sortOption = { createdAt: -1 }; // latest first default

    // Sorting
    if (sort === "oldest") {
      sortOption = { createdAt: 1 };
    }

    const totalOrders = await Order.countDocuments(filter);

    const orders = await Order.find(filter)
      .populate("user")
      .sort(sortOption)
      .skip(skip)
      .limit(limit);

    const totalPages = Math.ceil(totalOrders / limit);

    res.render("admin/orders", {
      orders,
      currentPage: page,
      totalPages,
      search,
      status,
      sort
    });

  } catch (error) {
    console.log("Load Orders Error:", error);
    res.redirect("/admin/dashboard");
  }
};

const loadOrderDetails = async (req, res) => {
  try {
    const orderId = req.params.id;

    const order = await Order.findById(orderId)
      .populate("user")
      .populate("items.product");

    if (!order) {
      return res.redirect("/admin/orders");
    }

    res.render("admin/orderDetails", {
      order,error: req.query.error || null
    });

  } catch (error) {
    console.log("Load Order Details Error:", error);
    res.redirect("/admin/orders");
  }
};

const updateOrderStatus = async (req, res) => {
  try {
    const orderId = req.params.id
    const { orderStatus } = req.body

    const redirectWithError = (message) => {
      return res.redirect(
        `/admin/orders/${orderId}?error=${encodeURIComponent(message)}`
      )
    }

    const order = await Order.findById(orderId)

    if (!order) {
      return redirectWithError("Order not found")
    }

    /*
    =================================
    RETURN REQUEST APPROVAL FLOW
    =================================
    */

    if (order.orderStatus === "Return Requested") {

      // Approve Return
      if (orderStatus === "Returned") {

        for (const item of order.items) {
          const product = await Product.findById(item.product)

          if (!product) continue

          const variant = product.variants.id(item.variantId)

          if (
            variant &&
            item.status !== "Returned"
          ) {
            variant.stock += item.quantity
            await product.save()
          }

          item.status = "Returned"
        }

       /*
=================================
WALLET REFUND
=================================
*/

let wallet =
  await Wallet.findOne({
    user: order.user
  });

if (!wallet) {

  wallet = await Wallet.create({
    user: order.user,
    balance: 0,
    transactions: []
  });
}

wallet.balance += order.finalAmount;

wallet.transactions.push({

  type: "Credit",

  amount: order.finalAmount,

  description:
    `Refund for Order ${order.orderId}`,

  orderId: order._id
});

await wallet.save();

/*
=================================
UPDATE ORDER
=================================
*/

order.orderStatus = "Returned";

await order.save();

        return res.redirect(`/admin/orders/${orderId}`)
      }

      // Reject Return
      if (orderStatus === "Delivered") {

        for (const item of order.items) {
          if (item.status === "Return Requested") {
            item.status = "Delivered"
          }
        }

        order.orderStatus = "Delivered"
        await order.save()

        return res.redirect(`/admin/orders/${orderId}`)
      }
    }

    /*
    =================================
    NORMAL STATUS FLOW
    =================================
    */

    const statusFlow = [
      "Pending",
      "Processing",
      "Shipped",
      "Delivered",
      "Cancelled"
    ]

    const currentStatus = order.orderStatus.trim()
    const selectedStatus = orderStatus.trim()

    const currentIndex = statusFlow.indexOf(currentStatus)
    const newIndex = statusFlow.indexOf(selectedStatus)

 

    // Prevent moving to previous status
    if (
      newIndex < currentIndex &&
      currentStatus !== "Cancelled" &&
      currentStatus !== "Returned"
    ) {
      return redirectWithError("Previous status cannot be assigned")
    }

    // Prevent updating closed orders
    if (
      currentStatus === "Cancelled" ||
      currentStatus === "Returned"
    ) {
      return redirectWithError("This order is already closed")
    }

    /*
    =================================
    CANCELLED → RESTORE STOCK
    =================================
    */

    if (
      selectedStatus === "Cancelled" &&
      currentStatus !== "Cancelled"
    ) {

      for (const item of order.items) {
        const product = await Product.findById(item.product)

        if (!product) continue

        const variant = product.variants.id(item.variantId)

        if (
          variant &&
          item.status !== "Cancelled" &&
          item.status !== "Returned"
        ) {
          variant.stock += item.quantity
          await product.save()
        }

        item.status = "Cancelled"
      }

      order.orderStatus = "Cancelled"
      await order.save()

      return res.redirect(`/admin/orders/${orderId}`)
    }
/*
=================================
NORMAL UPDATE
=================================
*/

for (const item of order.items) {

  if (
    item.status !== "Cancelled" &&
    item.status !== "Returned"
  ) {
    item.status = selectedStatus;
  }

}

order.orderStatus = selectedStatus;

await order.save();

return res.redirect(`/admin/orders/${orderId}`);

  } catch (error) {
    console.log("Update Order Status Error:", error)
    return res.redirect("/admin/orders")
  }
}

const processItemReturn = async (req, res) => {

  try {

    const { orderId, itemId } = req.params;
    const { action } = req.body;

    const order = await Order.findById(orderId);

    if (!order) {
      return res.redirect("/admin/orders");
    }

    const item = order.items.id(itemId);

    if (!item) {
      return res.redirect(`/admin/orders/${orderId}`);
    }

    /*
    ============================
    APPROVE RETURN
    ============================
    */

    if (action === "approve") {

      const product = await Product.findById(
        item.product
      );

      if (product) {

        const variant =
          product.variants.id(
            item.variantId
          );

        if (variant) {

          variant.stock += item.quantity;

          await product.save();
        }
      }

      /*
      ============================
      WALLET REFUND
      ============================
      */

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

      wallet.balance += item.totalPrice;

      wallet.transactions.push({

        type: "Credit",

        amount: item.totalPrice,

        description:
          `Refund for returned item in Order ${order.orderId}`,

        orderId: order._id
      });

      await wallet.save();

      item.status = "Returned";
    }

    /*
    ============================
    REJECT RETURN
    ============================
    */

    if (action === "reject") {

      item.status = "Delivered";
    }

    await order.save();

    return res.redirect(
      `/admin/orders/${orderId}`
    );

  } catch (error) {

    console.log(
      "Process Item Return Error:",
      error
    );

    return res.redirect(
      "/admin/orders"
    );
  }
};


export default {
  loadOrders,
  loadOrderDetails,
  updateOrderStatus,
  processItemReturn
};