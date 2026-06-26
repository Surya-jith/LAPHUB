import nodemailer from "nodemailer";


const sendEmail = async (to, subject, text) => {
  try {

    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    await transporter.sendMail({
      from: `"LapHUB Support" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      text
    });

    console.log("Email sent successfully");

  } catch (error) {
    console.log("Email sending failed:", error.message);
  }
};

export default sendEmail;
