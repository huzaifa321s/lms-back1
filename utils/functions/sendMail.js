import nodemailer from "nodemailer"

const sendMail = async (email, subject, text) => {
  let transport;

  // Choose the email transport based on environment or any other condition
  if (process.env.USE_MAILTRAP === "true") {
    transport = nodemailer.createTransport({
      host: "sandbox.smtp.mailtrap.io",
      port: 2525,
      auth: {
        user: "2b18bb5ec9b6f4",
        pass: "60f2379e6d2007"
      }
    });
  } else {
    console.log("send-mail-else-block")
    const sendgridTransport = require("nodemailer-sendgrid-transport");
    transport = nodemailer.createTransport(
      sendgridTransport({
        auth: {
          api_key: process.env.NODEMAILER_API_KEY,
        },
      })
    );
  }

  await transport.sendMail({
    from: "info@lms-app.com",
    to: email,
    subject,
    text,
  });
};

export default sendMail;