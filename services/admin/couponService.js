import Coupon from
"../../models/couponModel.js";

/*
=================================
GET COUPONS
=================================
*/

const getCoupons = async () => {

  return await Coupon.find()
    .sort({ createdAt: -1 });
};

/*
=================================
CREATE COUPON
=================================
*/

const createCoupon = async (
  data
) => {

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

  if (!code?.trim()) {
    throw new Error(
      "Coupon code required"
    );
  }

  const existingCoupon =
    await Coupon.findOne({
      code:
        code.toUpperCase()
    });

  if (existingCoupon) {
    throw new Error(
      "Coupon already exists"
    );
  }

  if (
    Number(discountValue) <= 0
  ) {
    throw new Error(
      "Invalid discount value"
    );
  }

  /*
  =================================
  CREATE COUPON
  =================================
  */

  return await Coupon.create({

    code:
      code.toUpperCase(),

    discountType,

    discountValue,

    minimumAmount,

    maximumDiscount,

    expiryDate
  });
};

/*
=================================
TOGGLE COUPON
=================================
*/

const toggleCoupon = async (
  id
) => {

  const coupon =
    await Coupon.findById(id);

  if (!coupon) {
    throw new Error(
      "Coupon not found"
    );
  }

  coupon.isActive =
    !coupon.isActive;

  await coupon.save();
};

/*
=================================
DELETE COUPON
=================================
*/

const deleteCoupon = async (
  id
) => {

  await Coupon.findByIdAndDelete(
    id
  );
};

export default {

  getCoupons,
  createCoupon,
  toggleCoupon,
  deleteCoupon
};