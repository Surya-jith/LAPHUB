import Order from "../../models/order.js";

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
      order
    });

  } catch (error) {
    console.log("Load Order Details Error:", error);
    res.redirect("/admin/orders");
  }
};

const updateOrderStatus = async (req, res) => {
  try {
    const orderId = req.params.id;
    const { orderStatus } = req.body;

    const order = await Order.findById(orderId);

    if (!order) {
      return res.redirect("/admin/orders");
    }

    // Restore stock only when changing to Cancelled
    if (
      orderStatus === "Cancelled" &&
      order.orderStatus !== "Cancelled"
    ) {
      for (const item of order.items) {
        const product = await Product.findById(item.product);

        if (product) {
          const variant = product.variants.id(item.variantId);

          if (variant) {
            variant.stock += item.quantity;
          }

          await product.save();
        }
      }
    }

    // update without full validation issue
    await Order.findByIdAndUpdate(orderId, {
      orderStatus: orderStatus
    });

    res.redirect(`/admin/orders/${orderId}`);

  } catch (error) {
    console.log("Update Order Status Error:", error);
    res.redirect("/admin/orders");
  }
};
export default {
  loadOrders,
  loadOrderDetails,
  updateOrderStatus
};