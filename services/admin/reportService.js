import Order from
"../../models/order.js";

/*
=================================
GET SALES REPORT
=================================
*/

const getSalesReport = async (

  filter,

  startDate,

  endDate
) => {

  /*
  =================================
  DATE FILTER
  =================================
  */

  let fromDate =
    new Date();

  let toDate =
    new Date();

  /*
  =================================
  FILTER LOGIC
  =================================
  */

  if (filter === "daily") {

    fromDate.setHours(
      0,0,0,0
    );
  }

  else if (
    filter === "weekly"
  ) {

    fromDate.setDate(
      fromDate.getDate() - 7
    );
  }

  else if (
    filter === "yearly"
  ) {

    fromDate.setFullYear(
      fromDate.getFullYear() - 1
    );
  }

  else if (
    filter === "custom" &&
    startDate &&
    endDate
  ) {

    fromDate =
      new Date(startDate);

    toDate =
      new Date(endDate);

    toDate.setHours(
      23,59,59,999
    );
  }

  else {

    // monthly default
    fromDate.setMonth(
      fromDate.getMonth() - 1
    );
  }

  /*
  =================================
  VALID ORDERS
  =================================
  */

  const orders =
    await Order.find({

      createdAt: {

        $gte: fromDate,

        $lte: toDate
      },

      paymentStatus: "Paid",

      orderStatus: {

        $nin: [
          "Cancelled",
          "Returned"
        ]
      }
    })
    .populate("user")
    .sort({
      createdAt: -1
    });

  /*
  =================================
  TOTALS
  =================================
  */

  let totalSales = 0;

  let totalDiscount = 0;

  let totalOrders = 0;

  orders.forEach(order => {

    totalSales +=
      order.finalAmount;

    totalDiscount +=
      order.discount || 0;

    totalOrders++;
  });

  return {

    orders,

    totalSales,

    totalDiscount,

    totalOrders
  };
};

export default {
  getSalesReport
};