import checkoutService from "../../services/user/checkoutService.js";


const loadCheckout = async (req, res) => {
  try {

    const userId = req.session.user;

    const data = await checkoutService.getCheckoutData(
      userId,
      req.session.buyNow
    );

    if (data.disableCheckout) {
      return res.redirect(
        "/cart?error=Invalid cart items"
      );
    }

    res.render("user/checkout", {
      cartItems: data.cartItems,
      subtotal: data.subtotal,
      discount: data.discount,
      tax: data.tax,
      total: data.total,
      disableCheckout: data.disableCheckout,
      addresses: data.addresses,
      defaultAddress: data.defaultAddress,
      error: null
    });

  } catch (error) {
    res.render("user/checkout", {
      cartItems: [],
      subtotal: 0,
      discount: 0,
      tax: 0,
      total: 0,
      disableCheckout: true,
      addresses: [],
      defaultAddress: null,
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

    // Validation
    if (!address) {
      return res.render("user/checkout", {
        cartItems: [],
        subtotal: 0,
        discount: 0,
        tax: 0,
        total: 0,
        disableCheckout: true,
        addresses: [],
        defaultAddress: null,
        error: "Please select a delivery address"
      });
    }

    if (!paymentMethod) {
      return res.redirect(
        "/checkout?error=Select payment method"
      );
    }

    // Create order
    const order = await checkoutService.placeOrder(
      userId,
      address,
      paymentMethod,
      req.session.buyNow
    );

    // Clear Buy Now session
    req.session.buyNow = null;

    return res.redirect(
      `/order-success/${order._id}`
    );

  } catch (error) {
    console.log("Place Order Error:", error);

    return res.redirect(
      `/checkout?error=${encodeURIComponent(error.message)}`
    );
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

export default {
  loadCheckout,
  buyNow,
  placeOrder,
  loadOrderSuccess
};