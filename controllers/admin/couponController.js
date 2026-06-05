import couponService from
"../../services/admin/couponService.js";

/*
=================================
LOAD COUPONS
=================================
*/

const loadCoupons = async (
  req,
  res
) => {

  try {

    const coupons =
      await couponService
        .getCoupons();

    res.render(
      "admin/coupons",
      {
        coupons,
        error: null
      }
    );

  } catch (error) {

    console.log(
      "Load Coupons Error:",
      error
    );

    res.redirect(
      "/admin/dashboard"
    );
  }
};

/*
=================================
LOAD ADD COUPON
=================================
*/

const loadAddCoupon = (
  req,
  res
) => {

  res.render(
    "admin/addCoupon",
    {
      error: null
    }
  );
};

/*
=================================
ADD COUPON
=================================
*/

const addCoupon = async (
  req,
  res
) => {

  try {

    await couponService
      .createCoupon(
        req.body
      );

    res.redirect(
      "/admin/coupons"
    );

  } catch (error) {

    console.log(
      "Add Coupon Error:",
      error
    );

    res.render(
      "admin/addCoupon",
      {
        error:
          error.message
      }
    );
  }
};

/*
=================================
TOGGLE COUPON
=================================
*/

const toggleCoupon = async (
  req,
  res
) => {

  try {

    await couponService
      .toggleCoupon(
        req.params.id
      );

    res.redirect(
      "/admin/coupons"
    );

  } catch (error) {

    console.log(
      "Toggle Coupon Error:",
      error
    );

    res.redirect(
      "/admin/coupons"
    );
  }
};

/*
=================================
DELETE COUPON
=================================
*/

const deleteCoupon = async (
  req,
  res
) => {

  try {

    await couponService
      .deleteCoupon(
        req.params.id
      );

    res.redirect(
      "/admin/coupons"
    );

  } catch (error) {

    console.log(
      "Delete Coupon Error:",
      error
    );

    res.redirect(
      "/admin/coupons"
    );
  }
};

export default {

  loadCoupons,
  loadAddCoupon,
  addCoupon,
  toggleCoupon,
  deleteCoupon
};