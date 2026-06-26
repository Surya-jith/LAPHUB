import Order from "../../models/order.js";
import Product from "../../models/productModel.js";
import Wallet from "../../models/walletModel.js";
import {
  calculateItemPaidAmount,
  calculateItemsPaidAmount,
  calculateActiveOrderTotals
} from "../../utils/orderTotals.js";
import {
  PDFDocument,
  StandardFonts,
  rgb
} from "pdf-lib";

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
      order,
      totals: calculateActiveOrderTotals(order),
      error: req.query.error || null
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

        const refundableItems = order.items.filter(
          item => item.status === "Return Requested"
        )

        for (const item of refundableItems) {
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

const refundAmount = calculateItemsPaidAmount(refundableItems, order);

wallet.balance += refundAmount;

wallet.transactions.push({

  type: "Credit",

  amount: refundAmount,

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

      if (item.status !== "Return Requested") {
        return res.redirect(
          `/admin/orders/${orderId}?error=${encodeURIComponent("Only return requested items can be approved")}`
        );
      }

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

      const refundAmount = calculateItemPaidAmount(item, order);

      wallet.balance += refundAmount;

      wallet.transactions.push({

        type: "Credit",

        amount: refundAmount,

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

const downloadInvoice = async (req, res) => {
  try {
    const orderId = req.params.id

    const order = await Order.findById(orderId)
      .populate("user")
      .populate("items.product")

    if (!order) {
      return res.redirect("/admin/orders")
    }

    const totals = calculateActiveOrderTotals(order)

    if (!totals.activeItems.length) {
      return res.redirect(
        `/admin/orders/${orderId}?error=${encodeURIComponent("Invoice is not available because all products are cancelled or returned")}`
      )
    }

    const pdfDoc = await PDFDocument.create()
    const page = pdfDoc.addPage([700, 900])
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
    const { width, height } = page.getSize()
    const darkBg = rgb(0.12, 0.12, 0.12)
    const lightText = rgb(1, 1, 1)
    const mutedText = rgb(0.7, 0.7, 0.7)
    const borderColor = rgb(0.3, 0.3, 0.3)

    page.drawRectangle({
      x: 0,
      y: height - 120,
      width,
      height: 120,
      color: darkBg
    })

    page.drawText("LAPHUB", {
      x: 50,
      y: height - 70,
      size: 28,
      font: boldFont,
      color: lightText
    })

    page.drawText("INVOICE", {
      x: 50,
      y: height - 100,
      size: 14,
      font,
      color: mutedText
    })

    let y = height - 165

    const drawLabel = (label, value) => {
      page.drawText(label, { x: 50, y, size: 11, font: boldFont })
      page.drawText(String(value || ""), { x: 180, y, size: 11, font })
      y -= 22
    }

    drawLabel("Order ID:", order.orderId)
    drawLabel("Order Date:", new Date(order.createdAt).toDateString())
    drawLabel("Customer:", order.user?.username || "User Deleted")
    drawLabel("Payment:", `${order.paymentMethod} - ${order.paymentStatus}`)

    y -= 20
    page.drawText("Delivery Address", { x: 50, y, size: 13, font: boldFont })
    y -= 20
    page.drawText(
      `${order.address?.firstName || ""} ${order.address?.lastName || ""}`,
      { x: 50, y, size: 10, font }
    )
    y -= 16
    page.drawText(`${order.address?.address || ""}`, { x: 50, y, size: 10, font })
    y -= 16
    page.drawText(
      `${order.address?.city || ""}, ${order.address?.state || ""} - ${order.address?.pincode || ""}`,
      { x: 50, y, size: 10, font }
    )

    y -= 45
    page.drawRectangle({ x: 45, y, width: 610, height: 28, color: darkBg })
    page.drawText("Product", { x: 55, y: y + 8, size: 11, font: boldFont, color: lightText })
    page.drawText("Qty", { x: 350, y: y + 8, size: 11, font: boldFont, color: lightText })
    page.drawText("Price", { x: 430, y: y + 8, size: 11, font: boldFont, color: lightText })
    page.drawText("Total", { x: 550, y: y + 8, size: 11, font: boldFont, color: lightText })
    y -= 35

    totals.activeItems.forEach(item => {
      const productName = item.product?.name || "Product"
      const shortName = productName.length > 45
        ? productName.substring(0, 45) + "..."
        : productName

      page.drawText(shortName, { x: 55, y, size: 10, font, maxWidth: 260 })
      page.drawText(String(item.quantity), { x: 360, y, size: 10, font })
      page.drawText(`Rs.${Number(item.price || 0).toFixed(2)}`, { x: 430, y, size: 10, font })
      page.drawText(`Rs.${Number(item.totalPrice || 0).toFixed(2)}`, { x: 565, y, size: 10, font })
      y -= 28
    })

    y -= 20
    page.drawRectangle({
      x: 390,
      y: y - 110,
      width: 265,
      height: 110,
      borderColor,
      borderWidth: 1
    })

    const drawTotalRow = (label, value, posY, isBold = false) => {
      page.drawText(label, { x: 405, y: posY, size: 11, font: isBold ? boldFont : font })
      page.drawText(value, { x: 540, y: posY, size: 11, font: isBold ? boldFont : font })
    }

    drawTotalRow("Subtotal", `Rs.${totals.subtotal.toFixed(2)}`, y - 20)
    drawTotalRow("GST (2%)", `Rs.${totals.gst.toFixed(2)}`, y - 40)
    drawTotalRow("Discount", `Rs.${totals.discount.toFixed(2)}`, y - 60)
    drawTotalRow("Shipping", totals.shippingCharge > 0 ? `Rs.${totals.shippingCharge.toFixed(2)}` : "Free", y - 80)
    drawTotalRow("Final Amount", `Rs.${totals.finalAmount.toFixed(2)}`, y - 100, true)

    const pdfBytes = await pdfDoc.save()

    res.setHeader("Content-Type", "application/pdf")
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=invoice-${order.orderId}.pdf`
    )
    res.send(Buffer.from(pdfBytes))
  } catch (error) {
    console.log("Admin Download Invoice Error:", error)
    res.redirect(
      `/admin/orders/${req.params.id}?error=${encodeURIComponent("Unable to download invoice")}`
    )
  }
}


export default {
  loadOrders,
  loadOrderDetails,
  downloadInvoice,
  updateOrderStatus,
  processItemReturn
};
