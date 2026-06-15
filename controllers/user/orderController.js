import orderService from "../../services/user/orderService.js";
import {
  PDFDocument,
  StandardFonts,
  rgb
} from "pdf-lib";

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
      userId,
      req.body.cancelReason || ""
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

    const userId = req.session.user
    const orderId = req.params.id

    const order = await orderService.getOrderById(
      orderId,
      userId
    )

    if (!order) {
      return res.redirect(
        `/orders?error=${encodeURIComponent("Order not found")}`
      )
    }

    if (order.orderStatus !== "Delivered") {
      return res.redirect(
        `/orders/${orderId}?error=${encodeURIComponent("Invoice is available only for delivered orders")}`
      )
    }

    const pdfDoc = await PDFDocument.create()

    const page = pdfDoc.addPage([700, 900])

    const font = await pdfDoc.embedFont(
      StandardFonts.Helvetica
    )

    const boldFont = await pdfDoc.embedFont(
      StandardFonts.HelveticaBold
    )

    const { width, height } = page.getSize()

    /*
    =================================
    COLORS
    =================================
    */

    const darkBg = rgb(0.12, 0.12, 0.12)
    const lightText = rgb(1, 1, 1)
    const mutedText = rgb(0.7, 0.7, 0.7)
    const borderColor = rgb(0.3, 0.3, 0.3)
    const whiteBg = rgb(1, 1, 1)

    /*
    =================================
    PAGE BACKGROUND
    =================================
    */

    page.drawRectangle({
      x: 0,
      y: 0,
      width,
      height,
      color: whiteBg
    })

    /*
    =================================
    HEADER
    =================================
    */

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

    /*
    =================================
    ORDER DETAILS
    =================================
    */

    let y = height - 170

    const drawLabel = (label, value) => {

      page.drawText(label, {
        x: 50,
        y,
        size: 11,
        font: boldFont
      })

      page.drawText(String(value || ""), {
        x: 180,
        y,
        size: 11,
        font
      })

      y -= 22
    }

    drawLabel("Order ID:", order.orderId)

    drawLabel(
      "Order Date:",
      new Date(order.createdAt).toDateString()
    )

    drawLabel(
      "Payment Method:",
      order.paymentMethod
    )

    drawLabel(
      "Payment Status:",
      order.paymentStatus
    )

    /*
    =================================
    ADDRESS SECTION
    =================================
    */

    y -= 20

    page.drawRectangle({
      x: 45,
      y: y - 90,
      width: 280,
      height: 90,
      borderColor,
      borderWidth: 1
    })

    page.drawText("Delivery Address", {
      x: 55,
      y: y - 20,
      size: 13,
      font: boldFont
    })

    page.drawText(
      `${order.address?.firstName || ""} ${order.address?.lastName || ""}`,
      {
        x: 55,
        y: y - 42,
        size: 11,
        font
      }
    )

    page.drawText(
      `${order.address?.address || ""}`,
      {
        x: 55,
        y: y - 58,
        size: 10,
        font
      }
    )

    page.drawText(
      `${order.address?.city || ""}, ${order.address?.state || ""}`,
      {
        x: 55,
        y: y - 74,
        size: 10,
        font
      }
    )

    page.drawText(
      `${order.address?.pincode || ""} | ${order.address?.phone || ""}`,
      {
        x: 55,
        y: y - 90,
        size: 10,
        font
      }
    )

    y -= 140

    /*
    =================================
    PRODUCT TABLE HEADER
    =================================
    */

    page.drawRectangle({
      x: 45,
      y,
      width: 610,
      height: 28,
      color: darkBg
    })

    page.drawText("Product", {
      x: 55,
      y: y + 8,
      size: 11,
      font: boldFont,
      color: lightText
    })

    page.drawText("Qty", {
      x: 350,
      y: y + 8,
      size: 11,
      font: boldFont,
      color: lightText
    })

    page.drawText("Price", {
      x: 430,
      y: y + 8,
      size: 11,
      font: boldFont,
      color: lightText
    })

    page.drawText("Total", {
      x: 550,
      y: y + 8,
      size: 11,
      font: boldFont,
      color: lightText
    })

    y -= 35

    /*
    =================================
    PRODUCTS
    =================================
    */

   order.items.forEach(item => {

  const productName =
    item.product?.name || "Product"

  const shortName =
    productName.length > 45
      ? productName.substring(0, 45) + "..."
      : productName

  page.drawText(shortName, {
    x: 55,
    y,
    size: 10,
    font,
    maxWidth: 260
  })

  page.drawText(
    String(item.quantity),
    {
      x: 360,
      y,
      size: 10,
      font
    }
  )

  page.drawText(
    `Rs.${item.price.toFixed(2)}`,
    {
      x: 430,
      y,
      size: 10,
      font
    }
  )

  page.drawText(
    `Rs.${item.totalPrice.toFixed(2)}`,
    {
      x: 565,
      y,
      size: 10,
      font
    }
  )

  y -= 28
})

    /*
    =================================
    TOTALS SECTION
    =================================
    */

    y -= 20

    page.drawRectangle({
      x: 390,
      y: y - 110,
      width: 265,
      height: 110,
      borderColor,
      borderWidth: 1
    })

    const drawTotalRow = (
      label,
      value,
      posY,
      isBold = false
    ) => {

      page.drawText(label, {
        x: 405,
        y: posY,
        size: 11,
        font: isBold ? boldFont : font
      })

      page.drawText(value, {
        x: 540,
        y: posY,
        size: 11,
        font: isBold ? boldFont : font
      })
    }

    drawTotalRow(
      "Subtotal",
      `Rs.${order.subtotal.toFixed(2)}`,
      y - 20
    )

    drawTotalRow(
      "GST (2%)",
      `Rs.${(order.gst || 0).toFixed(2)}`,
      y - 40
    )

    drawTotalRow(
      "Discount",
      `Rs.${(order.discount || 0).toFixed(2)}`,
      y - 60
    )

    drawTotalRow(
      "Shipping",
      order.shippingCharge > 0
        ? `Rs.${order.shippingCharge.toFixed(2)}`
        : "Free",
      y - 80
    )

    drawTotalRow(
      "Final Amount",
      `Rs.${order.finalAmount.toFixed(2)}`,
      y - 100,
      true
    )

    /*
    =================================
    FOOTER
    =================================
    */

    page.drawText(
      "Thank you for shopping with LAPHUB",
      {
        x: 50,
        y: 40,
        size: 10,
        font,
        color: mutedText
      }
    )

    /*
    =================================
    SEND PDF
    =================================
    */

    const pdfBytes = await pdfDoc.save()

    res.setHeader(
      "Content-Type",
      "application/pdf"
    )

    res.setHeader(
      "Content-Disposition",
      `attachment; filename=invoice-${order.orderId}.pdf`
    )

    res.send(Buffer.from(pdfBytes))

  } catch (error) {

    console.log(
      "Download Invoice Error:",
      error
    )

    return res.redirect(
      `/orders?error=${encodeURIComponent("Unable to download invoice")}`
    )
  }
}


const returnOrderItem = async (
  req,
  res
) => {

  try {

    console.log("RETURN ITEM HIT");
    console.log("Params:", req.params);
    console.log("Body:", req.body);

    await orderService.returnOrderItem(
      req.params.orderId,
      req.params.itemId,
      req.session.user,
      req.body.returnReason
    );

    console.log("RETURN ITEM SUCCESS");

    res.redirect(
      `/orders/${req.params.orderId}`
    );

  } catch (error) {

    console.log(
      "RETURN ITEM ERROR:",
      error.message
    );

    res.redirect(
      `/orders/${req.params.orderId}?error=${encodeURIComponent(error.message)}`
    );
  }
};

export default {
  loadOrders,
  loadOrderDetails,
  cancelOrder,
  cancelOrderItem,
  returnOrder,
  downloadInvoice,
  returnOrderItem
};
