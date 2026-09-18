const nodemailer = require("nodemailer");

// =========================================================
// EMAIL ENVIRONMENT VARIABLES
// =========================================================
const sanitizeHtml = require("sanitize-html");
const requiredEmailEnv = [
  "EMAIL_HOST",
  "EMAIL_PORT",
  "EMAIL_SECURE",
  "EMAIL_USER",
  "EMAIL_FORM",
  "EMAIL_PASS",
];


// =========================================================
// HTML ESCAPE
// =========================================================

const escapeHtml = (value = "") => {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};


// =========================================================
// TRANSPORTER
// =========================================================

const getTransporter = () => {
  const missing = requiredEmailEnv.filter(
    (key) => !process.env[key]
  );

  if (missing.length) {
    throw new Error(
      `Missing email environment variables: ${missing.join(", ")}`
    );
  }

  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,

    port: Number(process.env.EMAIL_PORT),

    secure:
      String(process.env.EMAIL_SECURE).toLowerCase() ===
      "true",

    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};


// =========================================================
// GENERIC SEND EMAIL
// =========================================================

const sendEmail = async ({
  to,
  subject,
  text = "",
  html = "",
}) => {
  if (!to) {
    throw new Error("Recipient email is required.");
  }

  if (!subject) {
    throw new Error("Email subject is required.");
  }

  const transporter = getTransporter();

  const mailOptions = {
    from: process.env.EMAIL_FORM,
    to,
    subject,
    text,
  };

  if (html) {
    mailOptions.html = html;
  }

  return transporter.sendMail(mailOptions);
};


// =========================================================
// ADMIN OTP EMAIL
// =========================================================

const sendAdminOtp = async ({
  to,
  name,
  otp,
}) => {
  const safeName = escapeHtml(name);

  const subject =
    "PetCard Admin Verification OTP";

  const text = `Hello ${name},

Your PetCard admin verification OTP is ${otp}.

This OTP is valid for 2 minutes.

If you requested a new OTP, the previous OTP is no longer valid.

PetCard`;


  const html = `
<!DOCTYPE html>

<html lang="en">

<head>

  <meta charset="UTF-8" />

  <meta
    name="viewport"
    content="width=device-width, initial-scale=1.0"
  />

  <title>PetCard Admin Verification</title>

</head>

<body
  style="
    margin:0;
    padding:0;
    background:#fff8f2;
    font-family:Arial,Helvetica,sans-serif;
    color:#381b0e;
  "
>

<table
  width="100%"
  cellpadding="0"
  cellspacing="0"
  border="0"
  style="
    background:#fff8f2;
    padding:30px 12px;
  "
>

<tr>

<td align="center">

<table
  width="100%"
  cellpadding="0"
  cellspacing="0"
  border="0"
  style="
    max-width:520px;
    background:#ffffff;
    border-radius:20px;
    overflow:hidden;
    border:1px solid #f0e2d7;
  "
>

<tr>

<td
  style="
    padding:28px 30px;
    background:#fff3e7;
    border-bottom:1px solid #f1dfd0;
  "
>

<div
  style="
    font-size:27px;
    font-weight:800;
  "
>
  <span style="color:#381b0e;">
    PET
  </span>

  <span style="color:#ff7a00;">
    CARD
  </span>
</div>

<div
  style="
    margin-top:5px;
    font-size:9px;
    letter-spacing:1.4px;
    font-weight:700;
    color:#8b7569;
  "
>
  WORLD'S FIRST AI-ENABLED PET ID
</div>

</td>

</tr>


<tr>

<td
  style="
    padding:34px 30px;
  "
>

<p
  style="
    margin:0 0 8px;
    font-size:12px;
    color:#ff7a00;
    font-weight:700;
  "
>
  ADMIN VERIFICATION
</p>

<h1
  style="
    margin:0 0 16px;
    font-size:25px;
    color:#381b0e;
  "
>
  Hello ${safeName},
</h1>

<p
  style="
    margin:0 0 20px;
    font-size:14px;
    line-height:1.7;
    color:#6f625c;
  "
>
  Use the following OTP to verify your
  PetCard admin account.
</p>


<div
  style="
    margin:25px 0;
    padding:20px;
    border-radius:14px;
    background:#fff8f2;
    border:1px solid #f0dfd2;
    text-align:center;
  "
>

<div
  style="
    font-size:32px;
    font-weight:800;
    letter-spacing:8px;
    color:#ff7a00;
  "
>
  ${otp}
</div>

</div>


<p
  style="
    margin:0 0 8px;
    font-size:13px;
    line-height:1.6;
    color:#6f625c;
  "
>
  This OTP is valid for
  <strong style="color:#381b0e;">
    2 minutes
  </strong>.
</p>

<p
  style="
    margin:0;
    font-size:13px;
    line-height:1.6;
    color:#6f625c;
  "
>
  If you requested a new OTP, the previous
  OTP is no longer valid.
</p>

</td>

</tr>


<tr>

<td
  style="
    padding:22px 30px;
    background:#381b0e;
  "
>

<p
  style="
    margin:0;
    color:#ffffff;
    font-size:15px;
    font-weight:800;
  "
>
  PET<span style="color:#ff9b2f;">CARD</span>
</p>

<p
  style="
    margin:6px 0 0;
    color:#cfc1ba;
    font-size:11px;
  "
>
  Everything your pet needs. All in one card.
</p>

</td>

</tr>

</table>

</td>

</tr>

</table>

</body>

</html>
`;


  return sendEmail({
    to,
    subject,
    text,
    html,
  });
};


// =========================================================
// CONTACT REPLY EMAIL
// =========================================================

const buildContactReplyEmail = ({
  name,
  originalSubject,
  originalMessage,
  replyMessage,
}) => {

  const safeName = escapeHtml(name);

  const safeSubject = escapeHtml(
    originalSubject || "Your enquiry"
  );

  const safeOriginalMessage = escapeHtml(
    originalMessage || ""
  ).replace(/\n/g, "<br>");

  const safeReplyMessage = escapeHtml(
    replyMessage || ""
  ).replace(/\n/g, "<br>");


  return `
<!DOCTYPE html>

<html lang="en">

<head>

  <meta charset="UTF-8" />

  <meta
    name="viewport"
    content="width=device-width, initial-scale=1.0"
  />

  <title>PetCard Support</title>

</head>


<body
  style="
    margin:0;
    padding:0;
    background:#fff8f2;
    font-family:Arial,Helvetica,sans-serif;
    color:#381b0e;
  "
>

<table
  width="100%"
  cellpadding="0"
  cellspacing="0"
  border="0"
  style="
    background:#fff8f2;
    padding:30px 12px;
  "
>

<tr>

<td align="center">


<table
  width="100%"
  cellpadding="0"
  cellspacing="0"
  border="0"
  style="
    max-width:650px;
    background:#ffffff;
    border-radius:22px;
    overflow:hidden;
    border:1px solid #f0e2d7;
  "
>


<!-- =====================================================
     HEADER
===================================================== -->

<tr>

<td
  style="
    padding:30px 35px;
    background:#fff3e7;
    border-bottom:1px solid #f1dfd0;
  "
>

<table
  width="100%"
  cellpadding="0"
  cellspacing="0"
  border="0"
>

<tr>

<td>

<div
  style="
    font-size:28px;
    font-weight:800;
    letter-spacing:-0.5px;
  "
>
  <span style="color:#381b0e;">
    PET
  </span>

  <span style="color:#ff7a00;">
    CARD
  </span>
</div>


<div
  style="
    margin-top:5px;
    font-size:10px;
    letter-spacing:1.5px;
    font-weight:700;
    color:#8b7569;
  "
>
  WORLD'S FIRST AI-ENABLED PET ID
</div>

</td>


<td
  align="right"
  valign="middle"
  style="
    font-size:30px;
  "
>
  🐾
</td>

</tr>

</table>

</td>

</tr>


<!-- =====================================================
     CONTENT
===================================================== -->

<tr>

<td
  style="
    padding:38px 35px 32px;
  "
>


<p
  style="
    margin:0 0 8px;
    font-size:14px;
    color:#ff7a00;
    font-weight:700;
  "
>
  PETCARD SUPPORT
</p>


<h1
  style="
    margin:0 0 18px;
    font-size:28px;
    line-height:1.25;
    color:#381b0e;
  "
>
  Hi ${safeName},
</h1>


<p
  style="
    margin:0 0 24px;
    font-size:15px;
    line-height:1.7;
    color:#6f625c;
  "
>
  Thank you for reaching out to PetCard.
  Our support team has reviewed your enquiry
  and we're happy to help.
</p>


<!-- =====================================================
     ORIGINAL QUERY
===================================================== -->

<table
  width="100%"
  cellpadding="0"
  cellspacing="0"
  border="0"
  style="
    margin-bottom:24px;
    background:#fff8f2;
    border:1px solid #f0dfd2;
    border-radius:14px;
  "
>

<tr>

<td
  style="
    padding:18px 20px;
  "
>

<p
  style="
    margin:0 0 8px;
    font-size:11px;
    font-weight:800;
    letter-spacing:.7px;
    text-transform:uppercase;
    color:#ff7a00;
  "
>
  YOUR ENQUIRY
</p>


<p
  style="
    margin:0 0 10px;
    font-size:14px;
    font-weight:700;
    color:#381b0e;
  "
>
  ${safeSubject}
</p>


<p
  style="
    margin:0;
    font-size:13px;
    line-height:1.7;
    color:#6f625c;
  "
>
  ${safeOriginalMessage}
</p>

</td>

</tr>

</table>


<!-- =====================================================
     REPLY
===================================================== -->

<table
  width="100%"
  cellpadding="0"
  cellspacing="0"
  border="0"
  style="
    margin-bottom:28px;
    border-left:4px solid #ff7a00;
    background:#ffffff;
  "
>

<tr>

<td
  style="
    padding:4px 20px 4px 18px;
  "
>

<p
  style="
    margin:0 0 12px;
    font-size:11px;
    font-weight:800;
    letter-spacing:.7px;
    text-transform:uppercase;
    color:#ff7a00;
  "
>
  PETCARD SUPPORT REPLY
</p>


<p
  style="
    margin:0;
    font-size:15px;
    line-height:1.8;
    color:#381b0e;
  "
>
  ${safeReplyMessage}
</p>

</td>

</tr>

</table>


<p
  style="
    margin:0 0 8px;
    font-size:15px;
    font-weight:700;
    color:#381b0e;
  "
>
  We're always happy to help 🐾
</p>


<p
  style="
    margin:0;
    font-size:14px;
    line-height:1.7;
    color:#6f625c;
  "
>
  If you have any additional questions,
  simply reply to this email and our team
  will be happy to assist you.
</p>

</td>

</tr>


<!-- =====================================================
     CTA
===================================================== -->

<tr>

<td
  align="center"
  style="
    padding:0 35px 36px;
  "
>

<a
  href="https://petcard.in"
  target="_blank"
  style="
    display:inline-block;
    padding:14px 25px;
    background:#ff7a00;
    color:#ffffff;
    text-decoration:none;
    border-radius:12px;
    font-size:13px;
    font-weight:700;
  "
>
  Visit PetCard →
</a>

</td>

</tr>


<!-- =====================================================
     FOOTER
===================================================== -->

<tr>

<td
  style="
    padding:25px 35px;
    background:#381b0e;
  "
>

<p
  style="
    margin:0 0 8px;
    color:#ffffff;
    font-size:16px;
    font-weight:800;
  "
>
  PET<span style="color:#ff9b2f;">CARD</span>
</p>


<p
  style="
    margin:0 0 14px;
    color:#d8cbc4;
    font-size:12px;
    line-height:1.6;
  "
>
  Everything your pet needs.
  All in one card.
</p>


<p
  style="
    margin:0;
    font-size:11px;
    line-height:1.6;
    color:#a99991;
  "
>
  © ${new Date().getFullYear()} PetCard.
  All rights reserved.
</p>


<p
  style="
    margin:8px 0 0;
    font-size:11px;
  "
>

<a
  href="https://petcard.in"
  target="_blank"
  style="
    color:#ff9b2f;
    text-decoration:none;
  "
>
  petcard.in
</a>

</p>

</td>

</tr>


</table>

</td>

</tr>

</table>

</body>

</html>
`;
};
// =========================================================
// NEWSLETTER EMAIL
// =========================================================

const buildNewsletterEmail = ({
  preheader = "",
  heading = "",
  content = "",
  ctaText = "",
  ctaUrl = "",
}) => {
  const safePreheader = escapeHtml(preheader);
  const safeHeading = escapeHtml(heading);
  const safeCtaText = escapeHtml(ctaText);
  const safeCtaUrl = escapeHtml(ctaUrl);

  /*
   * Jodit content is already HTML.
   * Sanitize it without escaping HTML tags so that
   * h2, h3, h4, p, ul, ol etc. render properly.
   */
  const newsletterContent = sanitizeHtml(
    String(content || ""),
    {
      allowedTags: [
        "p",
        "br",
        "strong",
        "b",
        "em",
        "i",
        "u",
        "h2",
        "h3",
        "h4",
        "ul",
        "ol",
        "li",
        "a",
      ],

      allowedAttributes: {
        a: [
          "href",
          "target",
          "rel",
        ],
      },

      allowedSchemes: [
        "http",
        "https",
        "mailto",
      ],
    }
  )
    .replace(
      /<h2>/gi,
      `<h2 style="
        margin:0 0 18px;
        font-size:25px;
        line-height:1.3;
        font-weight:800;
        color:#381b0e;
      ">`
    )
    .replace(
      /<h3>/gi,
      `<h3 style="
        margin:28px 0 14px;
        font-size:19px;
        line-height:1.4;
        font-weight:800;
        color:#381b0e;
      ">`
    )
    .replace(
      /<h4>/gi,
      `<h4 style="
        margin:22px 0 9px;
        font-size:15px;
        line-height:1.5;
        font-weight:800;
        color:#381b0e;
      ">`
    )
    .replace(
      /<p>/gi,
      `<p style="
        margin:0 0 18px;
        font-size:15px;
        line-height:1.8;
        color:#6f625c;
      ">`
    )
    .replace(
      /<ul>/gi,
      `<ul style="
        margin:0 0 20px;
        padding-left:22px;
        color:#6f625c;
      ">`
    )
    .replace(
      /<ol>/gi,
      `<ol style="
        margin:0 0 20px;
        padding-left:22px;
        color:#6f625c;
      ">`
    )
    .replace(
      /<li>/gi,
      `<li style="
        margin-bottom:8px;
        font-size:15px;
        line-height:1.7;
        color:#6f625c;
      ">`
    )
    .replace(
      /<a /gi,
      `<a style="
        color:#ff7a00;
        font-weight:700;
        text-decoration:none;
      " `
    );

  const ctaBlock =
    safeCtaText && safeCtaUrl
      ? `
        <div
          style="
            text-align:center;
            margin:30px 0 5px;
          "
        >
          <a
            href="${safeCtaUrl}"
            target="_blank"
            rel="noopener noreferrer"
            style="
              display:inline-block;
              padding:14px 26px;
              background:#ff7a00;
              color:#ffffff;
              text-decoration:none;
              border-radius:12px;
              font-size:13px;
              font-weight:700;
            "
          >
            ${safeCtaText} →
          </a>
        </div>
      `
      : "";

  return `
<!DOCTYPE html>

<html lang="en">

<head>

  <meta charset="UTF-8" />

  <meta
    name="viewport"
    content="width=device-width, initial-scale=1.0"
  />

  <title>
    ${safeHeading || "PetCard Newsletter"}
  </title>

  <style>

    @media only screen and (max-width:600px) {

      .email-wrapper {
        padding:15px 8px !important;
      }

      .email-card {
        border-radius:16px !important;
      }

      .email-header,
      .email-content,
      .email-footer {
        padding-left:22px !important;
        padding-right:22px !important;
      }

      .email-heading {
        font-size:24px !important;
      }

    }

  </style>

</head>


<body
  style="
    margin:0;
    padding:0;
    background:#fff8f2;
    font-family:Arial,Helvetica,sans-serif;
    color:#381b0e;
  "
>


<!-- PREHEADER -->

<div
  style="
    display:none;
    max-height:0;
    overflow:hidden;
    opacity:0;
    color:transparent;
  "
>
  ${safePreheader}
</div>


<!-- OUTER -->

<table
  width="100%"
  cellpadding="0"
  cellspacing="0"
  border="0"
  class="email-wrapper"
  style="
    background:#fff8f2;
    padding:30px 12px;
  "
>

<tr>

<td align="center">


<!-- EMAIL CARD -->

<table
  width="100%"
  cellpadding="0"
  cellspacing="0"
  border="0"
  class="email-card"
  style="
    max-width:650px;
    background:#ffffff;
    border-radius:22px;
    overflow:hidden;
    border:1px solid #f0e2d7;
  "
>


<!-- HEADER -->

<tr>

<td
  class="email-header"
  style="
    padding:30px 35px;
    background:#fff3e7;
    border-bottom:1px solid #f1dfd0;
  "
>

<table
  width="100%"
  cellpadding="0"
  cellspacing="0"
  border="0"
>

<tr>

<td>

<div
  style="
    font-size:28px;
    font-weight:800;
    letter-spacing:-0.5px;
  "
>

<span style="color:#381b0e;">
  PET
</span>

<span style="color:#ff7a00;">
  CARD
</span>

</div>


<div
  style="
    margin-top:5px;
    font-size:10px;
    letter-spacing:1.5px;
    font-weight:700;
    color:#8b7569;
  "
>
  WORLD'S FIRST AI-ENABLED PET ID
</div>

</td>


<td
  align="right"
  valign="middle"
  style="
    font-size:30px;
  "
>
  🐾
</td>

</tr>

</table>

</td>

</tr>


<!-- CONTENT -->

<tr>

<td
  class="email-content"
  style="
    padding:38px 35px 36px;
  "
>


<p
  style="
    margin:0 0 8px;
    font-size:11px;
    font-weight:800;
    letter-spacing:1px;
    color:#ff7a00;
  "
>
  PETCARD NEWSLETTER
</p>


<h1
  class="email-heading"
  style="
    margin:0 0 26px;
    font-size:29px;
    line-height:1.3;
    color:#381b0e;
  "
>
  ${safeHeading}
</h1>


<!-- JODIT HTML CONTENT -->

<div
  style="
    font-size:15px;
    line-height:1.8;
    color:#6f625c;
  "
>

${newsletterContent}

</div>


<!-- CTA -->

${ctaBlock}


</td>

</tr>


<!-- FOOTER -->

<tr>

<td
  class="email-footer"
  style="
    padding:25px 35px;
    background:#381b0e;
  "
>

<p
  style="
    margin:0 0 8px;
    color:#ffffff;
    font-size:16px;
    font-weight:800;
  "
>
  PET<span style="color:#ff9b2f;">CARD</span>
</p>


<p
  style="
    margin:0 0 14px;
    color:#d8cbc4;
    font-size:12px;
    line-height:1.6;
  "
>
  Everything your pet needs.
  All in one card.
</p>


<p
  style="
    margin:0;
    font-size:11px;
    line-height:1.6;
    color:#a99991;
  "
>
  © ${new Date().getFullYear()}
  PetCard. All rights reserved.
</p>


<p
  style="
    margin:8px 0 0;
    font-size:11px;
  "
>

<a
  href="https://petcard.in"
  target="_blank"
  style="
    color:#ff9b2f;
    text-decoration:none;
  "
>
  petcard.in
</a>

</p>


</td>

</tr>


</table>

</td>

</tr>

</table>

</body>

</html>
`;
};

// =========================================================
// EXPORTS
// =========================================================

module.exports = {
  sendEmail,
  sendAdminOtp,
  buildContactReplyEmail,
  buildNewsletterEmail
};