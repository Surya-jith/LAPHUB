import Cart from "../models/cartModel.js";
import Product from "../models/productModel.js";

const cartCount = async (req, res, next) => {
  try {
    if (!req.session.user) {
      res.locals.cartCount = 0;
      return next();
    }

    const cart = await Cart.findOne({ user: req.session.user })
      .populate("items.product");

    if (!cart || !cart.items.length) {
      res.locals.cartCount = 0;
      return next();
    }

    const validItems = cart.items.filter(
      item =>
        item.product &&
        item.quantity > 0
    );

    res.locals.cartCount = validItems.reduce(
      (total, item) => total + item.quantity,
      0
    );

    next();
  } catch (error) {
    console.error("Cart count middleware error:", error);
    res.locals.cartCount = 0;
    next();
  }
};

export default cartCount;