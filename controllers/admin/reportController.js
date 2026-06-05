import reportService from
"../../services/admin/reportService.js";
import PDFDocument from "pdfkit";
import ExcelJS from "exceljs";

/*
=================================
LOAD SALES REPORT
=================================
*/

const loadSalesReport = async (
  req,
  res
) => {

  try {

    /*
    =================================
    FILTERS
    =================================
    */

    const filter =
      req.query.filter || "monthly";

    const startDate =
      req.query.startDate || null;

    const endDate =
      req.query.endDate || null;

    /*
    =================================
    REPORT DATA
    =================================
    */

    const data =
      await reportService
        .getSalesReport(

          filter,

          startDate,

          endDate
        );

    /*
    =================================
    RENDER
    =================================
    */

    res.render(
      "admin/salesReport",
      {

        ...data,

        filter,

        startDate,

        endDate
      }
    );

  } catch (error) {

    console.log(
      "Sales Report Error:",
      error
    );

    res.redirect(
      "/admin/dashboard"
    );
  }
};

/*
=================================
PDF DOWNLOAD
=================================
*/

const downloadPdfReport =
  async (
    req,
    res
  ) => {

    try {

      /*
      =================================
      FILTERS
      =================================
      */

      const filter =
        req.query.filter || "monthly";

      const startDate =
        req.query.startDate || null;

      const endDate =
        req.query.endDate || null;

      /*
      =================================
      REPORT DATA
      =================================
      */

      const data =
        await reportService
          .getSalesReport(

            filter,

            startDate,

            endDate
          );

      /*
      =================================
      PDF
      =================================
      */

      const doc =
        new PDFDocument({

          margin: 40,

          size: "A4"
        });

      /*
      =================================
      RESPONSE HEADERS
      =================================
      */

      res.setHeader(
        "Content-Type",
        "application/pdf"
      );

      res.setHeader(

        "Content-Disposition",

        "attachment; filename=sales-report.pdf"
      );

      doc.pipe(res);

      /*
      =================================
      TITLE
      =================================
      */

      doc
        .fontSize(24)
        .font("Helvetica-Bold")
        .text(
          "Sales Report",
          {
            align: "center"
          }
        );

      doc.moveDown(2);

      /*
      =================================
      SUMMARY
      =================================
      */

      doc
        .fontSize(14)
        .font("Helvetica");

      doc.text(
        `Total Sales: ₹${data.totalSales.toFixed(2)}`
      );

      doc.text(
        `Total Discount: ₹${data.totalDiscount.toFixed(2)}`
      );

      doc.text(
        `Total Orders: ${data.totalOrders}`
      );

      doc.moveDown(2);

      /*
      =================================
      TABLE HEADER
      =================================
      */

      const tableTop = doc.y;

      const col1 = 40;
      const col2 = 220;
      const col3 = 340;
      const col4 = 450;

      doc
        .fontSize(12)
        .font("Helvetica-Bold");

      doc.text(
        "Order ID",
        col1,
        tableTop
      );

      doc.text(
        "User",
        col2,
        tableTop
      );

      doc.text(
        "Amount",
        col3,
        tableTop
      );

      doc.text(
        "Payment",
        col4,
        tableTop
      );

      /*
      =================================
      HEADER LINE
      =================================
      */

      doc
        .moveTo(
          40,
          tableTop + 20
        )
        .lineTo(
          550,
          tableTop + 20
        )
        .stroke();

      /*
      =================================
      TABLE ROWS
      =================================
      */

      let rowY =
        tableTop + 35;

      doc.font(
        "Helvetica"
      );

      data.orders.forEach(
        order => {

          /*
          PAGE BREAK
          */

          if (rowY > 750) {

            doc.addPage();

            rowY = 50;
          }

          doc.text(

            order.orderId,

            col1,

            rowY,

            {
              width: 150
            }
          );

          doc.text(

            order.user?.username
            || "User",

            col2,

            rowY
          );

          doc.text(

            `₹${order.finalAmount}`,

            col3,

            rowY
          );

          doc.text(

            order.paymentMethod,

            col4,

            rowY
          );

          /*
          ROW SPACING
          */

          rowY += 30;
        }
      );

      /*
      =================================
      END PDF
      =================================
      */

      doc.end();

    } catch (error) {

      console.log(
        "PDF Export Error:",
        error
      );

      res.redirect(
        "/admin/sales-report"
      );
    }
  };

/*
=================================
EXCEL DOWNLOAD
=================================
*/

const downloadExcelReport =
  async (
    req,
    res
  ) => {

    try {

      /*
      =================================
      FILTERS
      =================================
      */

      const filter =
        req.query.filter || "monthly";

      const startDate =
        req.query.startDate || null;

      const endDate =
        req.query.endDate || null;

      /*
      =================================
      REPORT DATA
      =================================
      */

      const data =
        await reportService
          .getSalesReport(

            filter,

            startDate,

            endDate
          );

      /*
      =================================
      WORKBOOK
      =================================
      */

      const workbook =
        new ExcelJS.Workbook();

      const worksheet =
        workbook.addWorksheet(
          "Sales Report"
        );

      /*
      =================================
      HEADERS
      =================================
      */

      worksheet.columns = [

        {
          header: "Order ID",
          key: "orderId",
          width: 25
        },

        {
          header: "User",
          key: "user",
          width: 25
        },

        {
          header: "Amount",
          key: "amount",
          width: 20
        },

        {
          header: "Discount",
          key: "discount",
          width: 20
        },

        {
          header: "Payment",
          key: "payment",
          width: 20
        },

        {
          header: "Date",
          key: "date",
          width: 20
        }
      ];

      /*
      =================================
      ORDERS
      =================================
      */

      data.orders.forEach(
        order => {

          worksheet.addRow({

            orderId:
              order.orderId,

            user:
              order.user
                ?.username || "User",

            amount:
              order.finalAmount,

            discount:
              order.discount || 0,

            payment:
              order.paymentMethod,

            date:
              new Date(
                order.createdAt
              )
              .toLocaleDateString()
          });
        }
      );

      /*
      =================================
      TOTALS
      =================================
      */

      worksheet.addRow([]);

      worksheet.addRow({

        orderId:
          "TOTAL SALES",

        amount:
          data.totalSales
      });

      worksheet.addRow({

        orderId:
          "TOTAL DISCOUNT",

        amount:
          data.totalDiscount
      });

      worksheet.addRow({

        orderId:
          "TOTAL ORDERS",

        amount:
          data.totalOrders
      });

      /*
      =================================
      RESPONSE
      =================================
      */

      res.setHeader(

        "Content-Type",

        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );

      res.setHeader(

        "Content-Disposition",

        "attachment; filename=sales-report.xlsx"
      );

      /*
      =================================
      WRITE FILE
      =================================
      */

      await workbook.xlsx.write(
        res
      );

      res.end();

    } catch (error) {

      console.log(
        "Excel Export Error:",
        error
      );

      res.redirect(
        "/admin/sales-report"
      );
    }
  };

export default {

  loadSalesReport,

  downloadPdfReport,

  downloadExcelReport
};