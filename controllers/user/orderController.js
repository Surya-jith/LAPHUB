import orderService from "../../services/user/orderService.js";
import { PDFDocument, StandardFonts } from "pdf-lib";

const loadOrders = async (req, res) => {
  try {

    const userId = req.session.user;
    const page = parseInt(req.query.page) || 1;
    const search = req.query.search || "";
    const error = req.query.error || null;

    const data = await orderService.getUserOrders(
      userId,
      page,
      search
    );

    res.render("user/orders", {
      user: req.session.user,
      error,
      ...data
    });

  } catch (error) {
    console.log("Load Orders Error:", error);

    res.render("user/orders", {
      user: req.session.user,
      orders: [],
      currentPage: 1,
      totalPages: 1,
      search: "",
      error: "Unable to load orders"
    });
  }
};


const loadOrderDetails = async (req, res) => {
  try {

    const userId = req.session.user;
    const orderId = req.params.id;

    const order = await orderService.getOrderById(
      orderId,
      userId
    );

    if (!order) {
      return res.redirect(
        `/orders?error=${encodeURIComponent("Order not found")}`
      );
    }

    res.render("user/orderDetails", {
      user: req.session.user,
      order,
      error: null
    });

  } catch (error) {
    console.log("Load Order Details Error:", error);

    res.redirect(
      `/orders?error=${encodeURIComponent("Unable to load order details")}`
    );
  }
};
const cancelOrder = async (req, res) => {
  try {

    const userId = req.session.user;
    const orderId = req.params.id;
    const cancelReason =
      req.body.cancelReason || "";

    await orderService.cancelOrder(
      orderId,
      userId,
      cancelReason
    );

    return res.redirect(
      `/orders/${orderId}?success=${encodeURIComponent("Order cancelled successfully")}`
    );

  } catch (error) {
    console.log("Cancel Order Error:", error);

    return res.redirect(
      `/orders/${req.params.id}?error=${encodeURIComponent(error.message)}`
    );
  }
};

const cancelOrderItem = async (req, res) => {
  try {

    const userId = req.session.user;

    const {
      orderId,
      itemId
    } = req.params;

    await orderService.cancelOrderItem(
      orderId,
      itemId,
      userId
    );

    return res.redirect(
      `/orders/${orderId}?success=${encodeURIComponent("Item cancelled successfully")}`
    );

  } catch (error) {
    console.log("Cancel Item Error:", error);

    return res.redirect(
      `/orders/${req.params.orderId}?error=${encodeURIComponent(error.message)}`
    );
  }
};

const returnOrder = async (req, res) => {
  try {

    const userId = req.session.user;
    const orderId = req.params.id;
    const returnReason =
      req.body.returnReason || "";

    await orderService.returnOrder(
      orderId,
      userId,
      returnReason
    );

    return res.redirect(
      `/orders/${orderId}?success=${encodeURIComponent("Return request submitted successfully")}`
    );

  } catch (error) {
    console.log("Return Order Error:", error);

    return res.redirect(
      `/orders/${req.params.id}?error=${encodeURIComponent(error.message)}`
    );
  }
};



const downloadInvoice = async (req, res) => {
  try {
    const userId = req.session.user;
    const orderId = req.params.id;

    const order = await orderService.getOrderById(
      orderId,
      userId
    );

    if (!order) {
      return res.redirect(
        `/orders?error=${encodeURIComponent("Order not found")}`
      );
    }

    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([600, 800]);

    const font = await pdfDoc.embedFont(
      StandardFonts.Helvetica
    );

    let y = 760;

    const drawText = (text, size = 12) => {
      page.drawText(text, {
        x: 50,
        y,
        size,
        font
      });
      y -= 20;
    };

    /*
    =================================
    HEADER
    =================================
    */

    drawText("Invoice", 20);
    y -= 10;

    drawText(`Order ID: ${order.orderId}`);
    drawText(
      `Order Date: ${new Date(order.createdAt).toDateString()}`
    );
    drawText(
      `Payment Method: ${order.paymentMethod}`
    );
    drawText(
      `Payment Status: ${order.paymentStatus}`
    );

    /*
    =================================
    ADDRESS
    =================================
    */

    y -= 20;

    drawText("Delivery Address", 14);

    drawText(
      `${order.address.firstName} ${order.address.lastName}`
    );
    drawText(order.address.address);
    drawText(
      `${order.address.city}, ${order.address.state}`
    );
    drawText(order.address.pincode);
    drawText(order.address.phone);

    /*
    =================================
    PRODUCTS
    =================================
    */

    y -= 20;

    drawText("Ordered Products", 14);

    order.items.forEach((item, index) => {
      drawText(
        `${index + 1}. ${item.product.name}`
      );

      drawText(
        `Qty: ${item.quantity} | Price: Rs.${item.price} | Total: Rs.${item.totalPrice}`
      );

      y -= 5;
    });

    /*
    =================================
    PAYMENT SUMMARY
    =================================
    */

    y -= 10;

    drawText("Payment Summary", 14);

    drawText(`Subtotal: Rs.${order.subtotal}`);
    drawText(`Discount: Rs.${order.discount}`);
    drawText(`Shipping: Rs.${order.shippingCharge}`);
    drawText(`Final Amount: Rs.${order.finalAmount}`);

    /*
    =================================
    SEND PDF
    =================================
    */

    const pdfBytes = await pdfDoc.save();

    res.setHeader(
      "Content-Type",
      "application/pdf"
    );

    res.setHeader(
      "Content-Disposition",
      `attachment; filename=invoice-${order.orderId}.pdf`
    );

    res.send(Buffer.from(pdfBytes));

  } catch (error) {
    console.log(
      "Download Invoice Error:",
      error
    );

    return res.redirect(
      `/orders?error=${encodeURIComponent("Unable to download invoice")}`
    );
  }
};

export default {
  loadOrders,
  loadOrderDetails,
  cancelOrder,
  cancelOrderItem,
  returnOrder,
  downloadInvoice
};