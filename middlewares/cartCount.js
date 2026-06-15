import Cart from "../models/cartModel.js";

const cartCount = async (req, res, next) => {
  try {
    if (!req.session.user) {
      res.locals.cartCount = 0;
      return next();
    }

    const cart = await Cart.findOne({ user: req.session.user })
      .populate({
        path: "items.product",
        match: {
          isDeleted: false,
          isBlocked: false,
          isListed: true
        }
      });

    if (!cart || !cart.items.length) {
      res.locals.cartCount = 0;
      return next();
    }

    // item.product will be null if populate match failed (deleted/blocked)
    const validItems = cart.items.filter(item => {
      if (!item.product || item.quantity <= 0) return false;

      const variant = item.product.variants.id(item.variant);

      return variant && variant.stock > 0;
    });

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
