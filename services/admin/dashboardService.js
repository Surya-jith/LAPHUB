import Order from "../../models/order.js";
import Product from "../../models/productModel.js";
import Category from "../../models/category.js";
import Brand from "../../models/brandModel.js";
import User from "../../models/user.js";

/*
=================================
GET DASHBOARD DATA
=================================
*/

const getDashboardData = async (
  filter
) => {

  /*
  =================================
  DATE FILTER
  =================================
  */

  let startDate =
    new Date();

  if (filter === "yearly") {

    startDate.setFullYear(
      startDate.getFullYear() - 1
    );

  } else if (
    filter === "weekly"
  ) {

    startDate.setDate(
      startDate.getDate() - 7
    );

  } else {

    // monthly default
    startDate.setMonth(
      startDate.getMonth() - 1
    );
  }

  /*
  =================================
  VALID ORDERS
  =================================
  */

  const validOrders =
    await Order.find({

      createdAt: {
        $gte: startDate
      },

      paymentStatus: "Paid",

      orderStatus: {
        $nin: [
          "Cancelled",
          "Returned"
        ]
      }
    })
    .populate("items.product");

  /*
  =================================
  TOTAL REVENUE
  =================================
  */

  const totalRevenue =
    validOrders.reduce(
      (sum, order) =>

        sum + order.finalAmount,

      0
    );

  /*
  =================================
  TOTAL ORDERS
  =================================
  */

  const totalOrders =
    validOrders.length;

  /*
  =================================
  TOTAL USERS
  =================================
  */

  const totalUsers =
    await User.countDocuments();

  /*
  =================================
  SALES CHART
  =================================
  */

  const salesChart =
    await Order.aggregate([

      {
        $match: {

          createdAt: {
            $gte: startDate
          },

          paymentStatus: "Paid",

          orderStatus: {
            $nin: [
              "Cancelled",
              "Returned"
            ]
          }
        }
      },

      {
        $group: {

          _id: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$createdAt"
            }
          },

          sales: {
            $sum:
              "$finalAmount"
          }
        }
      },

      {
        $sort: {
          _id: 1
        }
      }
    ]);

  /*
  =================================
  BEST SELLING PRODUCTS
  =================================
  */

  const bestProducts =
    await Order.aggregate([

      {
        $match: {

          paymentStatus: "Paid",

          orderStatus: {
            $nin: [
              "Cancelled",
              "Returned"
            ]
          }
        }
      },

      {
        $unwind: "$items"
      },

      {
        $group: {

          _id:
            "$items.product",

          totalSold: {
            $sum:
              "$items.quantity"
          }
        }
      },

      {
        $sort: {
          totalSold: -1
        }
      },

      {
        $limit: 10
      },

      {
        $lookup: {

          from: "products",

          localField: "_id",

          foreignField: "_id",

          as: "product"
        }
      },

      {
        $unwind: "$product"
      }
    ]);

  /*
  =================================
  BEST SELLING CATEGORIES
  =================================
  */

  const bestCategories =
    await Order.aggregate([

      {
        $match: {

          paymentStatus: "Paid",

          orderStatus: {
            $nin: [
              "Cancelled",
              "Returned"
            ]
          }
        }
      },

      {
        $unwind: "$items"
      },

      {
        $lookup: {

          from: "products",

          localField:
            "items.product",

          foreignField: "_id",

          as: "product"
        }
      },

      {
        $unwind: "$product"
      },

      {
        $group: {

          _id:
            "$product.category",

          totalSold: {
            $sum:
              "$items.quantity"
          }
        }
      },

      {
        $sort: {
          totalSold: -1
        }
      },

      {
        $limit: 10
      },

      {
        $lookup: {

          from: "categories",

          localField: "_id",

          foreignField: "_id",

          as: "category"
        }
      },

      {
        $unwind: "$category"
      }
    ]);

  /*
  =================================
  BEST SELLING BRANDS
  =================================
  */

  const bestBrands =
    await Order.aggregate([

      {
        $match: {

          paymentStatus: "Paid",

          orderStatus: {
            $nin: [
              "Cancelled",
              "Returned"
            ]
          }
        }
      },

      {
        $unwind: "$items"
      },

      {
        $lookup: {

          from: "products",

          localField:
            "items.product",

          foreignField: "_id",

          as: "product"
        }
      },

      {
        $unwind: "$product"
      },

      {
        $group: {

          _id:
            "$product.brand",

          totalSold: {
            $sum:
              "$items.quantity"
          }
        }
      },

      {
        $sort: {
          totalSold: -1
        }
      },

      {
        $limit: 10
      },

      {
        $lookup: {

          from: "brands",

          localField: "_id",

          foreignField: "_id",

          as: "brand"
        }
      },

      {
        $unwind: "$brand"
      }
    ]);

  return {

    totalRevenue,

    totalOrders,

    totalUsers,

    salesChart,

    bestProducts,

    bestCategories,

    bestBrands
  };
};

export default {
  getDashboardData
};