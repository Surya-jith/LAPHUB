import Wishlist from "../../models/wishlistModel.js";
import Product from "../../models/productModel.js";
import cartService from "./cartService.js";

const getWishlist = async (userId) => {

  let wishlist = await Wishlist.findOne({
    user: userId
  }).populate("products.product");

  if (!wishlist) {
    wishlist = await Wishlist.create({
      user: userId,
      products: []
    });
  }

  return wishlist;
};


const addToWishlist = async (
  userId,
  productId
) => {

  const product = await Product.findById(
    productId
  );

  if (!product) {
    throw new Error("Product not found");
  }

  let wishlist = await Wishlist.findOne({
    user: userId
  });

  if (!wishlist) {
    wishlist = await Wishlist.create({
      user: userId,
      products: []
    });
  }

  const alreadyExists =
    wishlist.products.find(
      item =>
        item.product.toString() === productId
    );

  if (alreadyExists) {
    throw new Error(
      "Product already in wishlist"
    );
  }

  wishlist.products.push({
    product: productId
  });

  await wishlist.save();

  return wishlist;
};


const removeFromWishlist = async (
  userId,
  productId
) => {

  const wishlist = await Wishlist.findOne({
    user: userId
  });

  if (!wishlist) return;

  wishlist.products =
    wishlist.products.filter(
      item =>
        item.product.toString() !== productId
    );

  await wishlist.save();
};


const moveToCart = async (
  userId,
  productId
) => {

  const product = await Product.findById(
    productId
  );

  if (!product) {
    throw new Error("Product not found");
  }

  const firstVariant =
    product.variants[0];

  if (!firstVariant) {
    throw new Error(
      "No variant available"
    );
  }

  await cartService.addToCart(
    userId,
    productId,
    firstVariant._id,
    1
  );

  await removeFromWishlist(
    userId,
    productId
  );
};


export default {
  getWishlist,
  addToWishlist,
  removeFromWishlist,
  moveToCart
};