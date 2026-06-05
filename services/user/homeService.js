import Order from "../../models/order.js";

/*
=================================
HOME PAGE DATA
=================================
*/

const getHomeData = async () => {

  /*
  =================================
  TOP SELLING PRODUCTS
  =================================
  */

  const topProducts =
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
        $limit: 4
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
  TOP SELLING CATEGORIES
  =================================
  */

  const topCategories =
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
        $limit: 6
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

  return {

    topProducts,

    topCategories
  };
};

export default {
  getHomeData
};