import wishlistService from "../../services/user/wishlistService.js";

const loadWishlist = async (req, res) => {
  try {

    const userId = req.session.user;

    const wishlist =
      await wishlistService.getWishlist(
        userId
      );

    res.render("user/wishlist", {
      user: req.session.user,
      wishlistItems:
        wishlist.products || [],
      error: null
    });

  } catch (error) {
    console.log(
      "Load Wishlist Error:",
      error
    );

    res.render("user/wishlist", {
      user: req.session.user,
      wishlistItems: [],
      error: "Unable to load wishlist"
    });
  }
};


const addToWishlist = async (
  req,
  res
) => {
  try {

    const userId = req.session.user;
    const productId =
      req.params.productId;

    await wishlistService.addToWishlist(
      userId,
      productId
    );

    return res.redirect(
      "/wishlist"
    );

  } catch (error) {
    console.log(
      "Add Wishlist Error:",
      error
    );

    return res.redirect(
      `/products?error=${encodeURIComponent(error.message)}`
    );
  }
};


const removeFromWishlist = async (
  req,
  res
) => {
  try {

    const userId = req.session.user;
    const productId =
      req.params.productId;

    await wishlistService.removeFromWishlist(
      userId,
      productId
    );

    return res.redirect(
      "/wishlist"
    );

  } catch (error) {
    console.log(
      "Remove Wishlist Error:",
      error
    );

    return res.redirect(
      "/wishlist"
    );
  }
};


const moveToCart = async (
  req,
  res
) => {
  try {

    const userId = req.session.user;
    const productId =
      req.params.productId;

    await wishlistService.moveToCart(
      userId,
      productId
    );

    return res.redirect(
      "/cart"
    );

  } catch (error) {
    console.log(
      "Move To Cart Error:",
      error
    );

    return res.redirect(
      `/wishlist?error=${encodeURIComponent(error.message)}`
    );
  }
};


export default {
  loadWishlist,
  addToWishlist,
  removeFromWishlist,
  moveToCart
};