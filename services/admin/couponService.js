import Coupon from "../../models/couponModel.js";

/*
=================================
GET COUPONS (Pagination + Search)
=================================
*/

const getCoupons = async (page = 1, search = "") => {

  const limit = 10;
  const currentPage = Math.max(Number(page) || 1, 1);
  const skip = (currentPage - 1) * limit;
  const searchText = search.trim();

  const query = searchText
    ? { code: { $regex: searchText, $options: "i" } }
    : {};

  const totalCoupons = await Coupon.countDocuments(query);
  const totalPages = Math.max(Math.ceil(totalCoupons / limit), 1);

  const coupons = await Coupon.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  return {
    coupons,
    currentPage,
    totalPages,
    search: searchText,
    totalCoupons
  };
};

/*
=================================
CREATE COUPON
=================================
*/

const createCoupon = async (data) => {

  const {
    code,
    discountType,
    discountValue,
    minimumAmount,
    maximumDiscount,
    expiryDate
  } = data;

  /*
  =================================
  VALIDATION
  =================================
  */

  // Code
  if (!code?.trim()) {
    throw new Error("Coupon code is required");
  }

  // Duplicate check
  const existingCoupon = await Coupon.findOne({
    code: code.trim().toUpperCase()
  });
  if (existingCoupon) {
    throw new Error("Coupon code already exists");
  }

  // Discount type
  if (!discountType || !["fixed", "percentage"].includes(discountType)) {
    throw new Error("Invalid discount type");
  }

  // Discount value
  if (!discountValue || Number(discountValue) <= 0) {
    throw new Error("Discount value must be greater than 0");
  }

  // Minimum amount
  if (!minimumAmount || Number(minimumAmount) <= 0) {
    throw new Error("Minimum purchase amount must be greater than 0");
  }

  // Expiry date
  if (!expiryDate) {
    throw new Error("Expiry date is required");
  }
  if (new Date(expiryDate) <= new Date()) {
    throw new Error("Expiry date must be in the future");
  }

  // Fixed discount must be less than minimum amount
  if (discountType === "fixed" && Number(discountValue) >= Number(minimumAmount)) {
    throw new Error(
      `Discount value (₹${discountValue}) must be less than minimum purchase amount (₹${minimumAmount})`
    );
  }

  // Percentage must be between 1 and 99
  if (discountType === "percentage") {
    if (Number(discountValue) >= 100) {
      throw new Error("Percentage discount must be less than 100%");
    }

    // Max discount cap must be less than minimum amount
    if (maximumDiscount && Number(maximumDiscount) > 0 &&
        Number(maximumDiscount) >= Number(minimumAmount)) {
      throw new Error(
        `Maximum discount (₹${maximumDiscount}) must be less than minimum purchase amount (₹${minimumAmount})`
      );
    }
  }

  /*
  =================================
  CREATE COUPON
  =================================
  */

  return await Coupon.create({
    code: code.trim().toUpperCase(),
    discountType,
    discountValue: Number(discountValue),
    minimumAmount: Number(minimumAmount),
    maximumDiscount: Number(maximumDiscount || 0),
    expiryDate
  });
};

/*
=================================
TOGGLE COUPON
=================================
*/

const toggleCoupon = async (id) => {

  const coupon = await Coupon.findById(id);

  if (!coupon) {
    throw new Error("Coupon not found");
  }

  coupon.isActive = !coupon.isActive;
  await coupon.save();
};

/*
=================================
DELETE COUPON
=================================
*/

const deleteCoupon = async (id) => {

  const coupon = await Coupon.findById(id);

  if (!coupon) {
    throw new Error("Coupon not found");
  }

  await Coupon.findByIdAndDelete(id);
};

export default {
  getCoupons,
  createCoupon,
  toggleCoupon,
  deleteCoupon
};
