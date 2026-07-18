import {
  isSupportedReportProduct,
  normaliseReportData
} from "./_lib/report-products.js";


/*
  ============================================================
  ARTHIVA LABS PAYMENT VERIFICATION
  ============================================================

  Supports:

  REPORT PRODUCTS
  - CTC Reality
  - Exit Date
  - Brand Rate

  EXTENSION PRODUCTS
  - Scam Shield Pro

  Payment providers:
  - Razorpay for India
  - PayPal for international payments

  IMPORTANT:
  PayPal uses LIVE production endpoints.
  ============================================================
*/


function bytesToHex(bytes) {
  return Array.from(bytes)
    .map((byte) =>
      byte.toString(16).padStart(2, "0")
    )
    .join("");
}


function safeEqual(first, second) {
  if (first.length !== second.length) {
    return false;
  }

  let difference = 0;

  for (let i = 0; i < first.length; i++) {
    difference |=
      first.charCodeAt(i) ^
      second.charCodeAt(i);
  }

  return difference === 0;
}


function createAccessToken() {
  return (
    crypto.randomUUID().replaceAll("-", "") +
    crypto.randomUUID().replaceAll("-", "")
  );
}


function formatPayPalAmount(amount) {
  return (
    Number(amount) / 100
  ).toFixed(2);
}


/*
  ============================================================
  PRODUCT TYPE HELPERS
  ============================================================
*/


function isScamShieldPro(
  product,
  offer
) {
  return (
    product === "scam-shield" &&
    offer === "pro"
  );
}


function isExtensionProduct(
  product,
  offer
) {
  return isScamShieldPro(
    product,
    offer
  );
}


/*
  ============================================================
  LOAD PAYMENT PRODUCT DETAILS
  ============================================================
*/


async function loadPaymentDetails(
  context,
  product,
  offer,
  market
) {
  const priceListUrl = new URL(
    "/payment-products.json",
    context.request.url
  );

  const priceListResponse =
    await context.env.ASSETS.fetch(
      priceListUrl
    );

  if (!priceListResponse.ok) {
    throw new Error(
      "Unable to load Arthiva price list."
    );
  }

  const priceList =
    await priceListResponse.json();

  const productDetails =
    priceList.products?.[product];

  const offerDetails =
    productDetails?.offers?.[offer];

  const priceDetails =
    offerDetails?.[market];

  if (
    !productDetails ||
    !offerDetails ||
    !priceDetails
  ) {
    return null;
  }

  return {
    productDetails,
    offerDetails,
    priceDetails
  };
}


/*
  ============================================================
  PAYPAL AUTHENTICATION
  LIVE PAYPAL ENDPOINT
  ============================================================
*/


async function getPayPalAccessToken(env) {
  const clientId =
    env.PAYPAL_CLIENT_ID;

  const clientSecret =
    env.PAYPAL_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error(
      "PayPal secrets are missing."
    );
  }

  const credentials = btoa(
    clientId + ":" + clientSecret
  );

  const tokenResponse = await fetch(
    "https://api-m.paypal.com/v1/oauth2/token",
    {
      method: "POST",
      headers: {
        "Authorization":
          "Basic " + credentials,

        "Content-Type":
          "application/x-www-form-urlencoded"
      },

      body:
        "grant_type=client_credentials"
    }
  );

  const tokenData =
    await tokenResponse.json();

  if (
    !tokenResponse.ok ||
    !tokenData.access_token
  ) {
    console.error(
      "PayPal access token error",
      tokenData
    );

    throw new Error(
      "Unable to authenticate with PayPal."
    );
  }

  return tokenData.access_token;
}


/*
  ============================================================
  RAZORPAY VERIFICATION
  ============================================================
*/


async function verifyRazorpayPayment(
  context,
  body
) {
  const orderId =
    body.razorpay_order_id ||
    body.orderId;

  const paymentId =
    body.razorpay_payment_id ||
    body.paymentId;

  const signature =
    body.razorpay_signature ||
    body.signature;

  if (
    !orderId ||
    !paymentId ||
    !signature
  ) {
    return {
      success: false,

      error:
        "Missing Razorpay verification information."
    };
  }

  const razorpayKeySecret =
    context.env.RAZORPAY_KEY_SECRET;

  if (!razorpayKeySecret) {
    throw new Error(
      "Razorpay secret is missing."
    );
  }

  const encoder =
    new TextEncoder();

  const cryptoKey =
    await crypto.subtle.importKey(
      "raw",

      encoder.encode(
        razorpayKeySecret
      ),

      {
        name: "HMAC",
        hash: "SHA-256"
      },

      false,

      ["sign"]
    );

  const verificationMessage =
    orderId + "|" + paymentId;

  const signatureBuffer =
    await crypto.subtle.sign(
      "HMAC",

      cryptoKey,

      encoder.encode(
        verificationMessage
      )
    );

  const expectedSignature =
    bytesToHex(
      new Uint8Array(
        signatureBuffer
      )
    );

  const verified =
    safeEqual(
      expectedSignature,

      String(
        signature
      ).toLowerCase()
    );

  if (!verified) {
    return {
      success: false,

      error:
        "Payment verification failed."
    };
  }

  return {
    success: true,

    paymentProvider:
      "razorpay",

    paymentId:
      paymentId
  };
}


/*
  ============================================================
  PAYPAL ORDER LOOKUP
  ============================================================
*/


async function getPayPalOrder(
  accessToken,
  orderId
) {
  const orderResponse =
    await fetch(
      "https://api-m.paypal.com/v2/checkout/orders/" +
        encodeURIComponent(
          orderId
        ),

      {
        method: "GET",

        headers: {
          "Authorization":
            "Bearer " +
            accessToken,

          "Content-Type":
            "application/json"
        }
      }
    );

  const orderData =
    await orderResponse.json();

  if (!orderResponse.ok) {
    console.error(
      "PayPal order lookup error",
      orderData
    );

    return null;
  }

  return orderData;
}


/*
  ============================================================
  VALIDATE PAYPAL ORDER
  ============================================================
*/


function validatePayPalOrder(
  orderData,
  body,
  paymentDetails
) {
  const purchaseUnit =
    orderData.purchase_units?.[0];

  if (!purchaseUnit) {
    return {
      success: false,

      error:
        "PayPal order has no purchase information."
    };
  }

  const expectedReference =
    body.product +
    ":" +
    body.offer;

  if (
    purchaseUnit.reference_id !==
      expectedReference ||

    purchaseUnit.custom_id !==
      expectedReference
  ) {
    return {
      success: false,

      error:
        "PayPal payment does not match this Arthiva product."
    };
  }

  const expectedCurrency =
    String(
      paymentDetails
        .priceDetails
        .currency
    ).toUpperCase();

  const expectedAmount =
    formatPayPalAmount(
      paymentDetails
        .priceDetails
        .amount
    );

  const orderCurrency =
    String(
      purchaseUnit
        .amount
        ?.currency_code ||
      ""
    ).toUpperCase();

  const orderAmount =
    String(
      purchaseUnit
        .amount
        ?.value ||
      ""
    );

  if (
    orderCurrency !==
      expectedCurrency ||

    orderAmount !==
      expectedAmount
  ) {
    return {
      success: false,

      error:
        "PayPal order amount does not match the Arthiva offer."
    };
  }

  return {
    success: true
  };
}


/*
  ============================================================
  FIND COMPLETED PAYPAL CAPTURE
  ============================================================
*/


function findCompletedPayPalCapture(
  orderData,
  paymentDetails
) {
  const purchaseUnits =
    orderData.purchase_units ||
    [];

  const expectedCurrency =
    String(
      paymentDetails
        .priceDetails
        .currency
    ).toUpperCase();

  const expectedAmount =
    formatPayPalAmount(
      paymentDetails
        .priceDetails
        .amount
    );

  for (
    const purchaseUnit
    of purchaseUnits
  ) {
    const captures =
      purchaseUnit
        ?.payments
        ?.captures ||
      [];

    for (
      const capture
      of captures
    ) {
      const captureCurrency =
        String(
          capture
            .amount
            ?.currency_code ||
          ""
        ).toUpperCase();

      const captureAmount =
        String(
          capture
            .amount
            ?.value ||
          ""
        );

      if (
        capture.status ===
          "COMPLETED" &&

        captureCurrency ===
          expectedCurrency &&

        captureAmount ===
          expectedAmount
      ) {
        return capture;
      }
    }
  }

  return null;
}


/*
  ============================================================
  CAPTURE AND VERIFY PAYPAL PAYMENT
  ============================================================
*/


async function captureAndVerifyPayPalPayment(
  context,
  body,
  paymentDetails
) {
  const orderId =
    body.paypal_order_id ||
    body.orderId;

  if (!orderId) {
    return {
      success: false,

      error:
        "Missing PayPal order information."
    };
  }

  const accessToken =
    await getPayPalAccessToken(
      context.env
    );

  let orderData =
    await getPayPalOrder(
      accessToken,
      orderId
    );

  if (!orderData) {
    return {
      success: false,

      error:
        "Unable to retrieve PayPal order."
    };
  }

  const orderValidation =
    validatePayPalOrder(
      orderData,
      body,
      paymentDetails
    );

  if (
    !orderValidation.success
  ) {
    return orderValidation;
  }

  let completedCapture =
    findCompletedPayPalCapture(
      orderData,
      paymentDetails
    );

  if (completedCapture) {
    return {
      success: true,

      paymentProvider:
        "paypal",

      paymentId:
        completedCapture.id
    };
  }

  if (
    orderData.status !==
    "APPROVED"
  ) {
    return {
      success: false,

      error:
        "PayPal payment has not been approved."
    };
  }

  const captureResponse =
    await fetch(
      "https://api-m.paypal.com/v2/checkout/orders/" +
        encodeURIComponent(
          orderId
        ) +
        "/capture",

      {
        method: "POST",

        headers: {
          "Authorization":
            "Bearer " +
            accessToken,

          "Content-Type":
            "application/json",

          "PayPal-Request-Id":
            "arthiva-capture-" +
            orderId
        },

        body:
          "{}"
      }
    );

  const captureData =
    await captureResponse.json();

  if (!captureResponse.ok) {
    console.error(
      "PayPal capture error",
      captureData
    );

    return {
      success: false,

      error:
        "PayPal payment could not be captured."
    };
  }

  const captureOrderValidation =
    validatePayPalOrder(
      captureData,
      body,
      paymentDetails
    );

  if (
    !captureOrderValidation.success
  ) {
    return captureOrderValidation;
  }

  completedCapture =
    findCompletedPayPalCapture(
      captureData,
      paymentDetails
    );

  if (!completedCapture) {
    console.error(
      "PayPal completed capture not found",
      captureData
    );

    return {
      success: false,

      error:
        "PayPal payment is not completed."
    };
  }

  return {
    success: true,

    paymentProvider:
      "paypal",

    paymentId:
      completedCapture.id
  };
}


/*
  ============================================================
  MAIN PAYMENT VERIFICATION ENDPOINT
  ============================================================
*/


export async function onRequestPost(
  context
) {
  try {
    const body =
      await context.request.json();

    const product =
      body.product;

    const offer =
      body.offer;

    const reportData =
      body.reportData;

    const paymentProvider =
      String(
        body.paymentProvider ||
        body.provider ||
        "razorpay"
      ).toLowerCase();


    /*
      ----------------------------------------------------------
      BASIC PAYMENT INFORMATION
      ----------------------------------------------------------
    */


    if (
      !product ||
      !offer
    ) {
      return Response.json(
        {
          success: false,

          verified: false,

          error:
            "Missing product or offer information."
        },

        {
          status: 400
        }
      );
    }


    /*
      ----------------------------------------------------------
      DETERMINE PRODUCT TYPE
      ----------------------------------------------------------
    */


    const extensionProduct =
      isExtensionProduct(
        product,
        offer
      );

    const reportProduct =
      isSupportedReportProduct(
        product,
        offer
      );


    if (
      !extensionProduct &&
      !reportProduct
    ) {
      return Response.json(
        {
          success: false,

          verified: false,

          error:
            "Invalid product or offer."
        },

        {
          status: 400
        }
      );
    }


    /*
      ----------------------------------------------------------
      REPORT PRODUCTS REQUIRE REPORT DATA

      Scam Shield Pro does NOT require reportData.
      ----------------------------------------------------------
    */


    if (
      reportProduct &&
      !reportData
    ) {
      return Response.json(
        {
          success: false,

          verified: false,

          error:
            "Missing report verification information."
        },

        {
          status: 400
        }
      );
    }


    /*
      ----------------------------------------------------------
      CHECK DATABASE BINDING
      ----------------------------------------------------------
    */


    if (!context.env.DB) {
      throw new Error(
        "Arthiva database binding is missing."
      );
    }


    /*
      ----------------------------------------------------------
      NORMALISE REPORT DATA

      Only runs for report products.

      Scam Shield skips this completely.
      ----------------------------------------------------------
    */


    let normalisedReportData =
      null;


    if (reportProduct) {
      try {
        normalisedReportData =
          normaliseReportData(
            product,
            offer,
            reportData
          );

      } catch (
        reportError
      ) {
        return Response.json(
          {
            success: false,

            verified: false,

            error:
              reportError.message
          },

          {
            status: 400
          }
        );
      }
    }


    /*
      ----------------------------------------------------------
      VERIFY PAYMENT
      ----------------------------------------------------------
    */


    let paymentVerification;


    if (
      paymentProvider ===
      "razorpay"
    ) {
      paymentVerification =
        await verifyRazorpayPayment(
          context,
          body
        );


    } else if (
      paymentProvider ===
      "paypal"
    ) {

      const paymentDetails =
        await loadPaymentDetails(
          context,
          product,
          offer,
          "international"
        );


      if (!paymentDetails) {
        return Response.json(
          {
            success: false,

            verified: false,

            error:
              "International payment offer is not available."
          },

          {
            status: 404
          }
        );
      }


      paymentVerification =
        await captureAndVerifyPayPalPayment(
          context,
          body,
          paymentDetails
        );


    } else {

      return Response.json(
        {
          success: false,

          verified: false,

          error:
            "Unsupported payment provider."
        },

        {
          status: 400
        }
      );
    }


    if (
      !paymentVerification.success
    ) {
      return Response.json(
        {
          success: false,

          verified: false,

          error:
            paymentVerification.error
        },

        {
          status: 400
        }
      );
    }


    /*
      ==========================================================
      SCAM SHIELD PRO
      ==========================================================

      Scam Shield is a one-time purchase.

      It does not generate a report.

      The access token is stored in the existing
      report_access table.

      The report_data column stores entitlement metadata.

      expires_at is set to 31 December 9999,
      effectively representing permanent access.

      used_at remains NULL because extension access
      must not be consumed after one use.
      ==========================================================
    */


    if (extensionProduct) {

      const existingAccess =
        await context.env.DB
          .prepare(
            `
            SELECT
              token,
              expires_at
            FROM report_access
            WHERE
              product = ?
              AND offer = ?
              AND payment_id = ?
            ORDER BY created_at DESC
            LIMIT 1
            `
          )
          .bind(
            product,
            offer,
            paymentVerification
              .paymentId
          )
          .first();


      if (existingAccess) {

        return Response.json({
          success: true,

          verified: true,

          status:
            "payment-already-verified",

          paymentProvider:
            paymentVerification
              .paymentProvider,

          paymentId:
            paymentVerification
              .paymentId,

          accessType:
            "extension-pro",

          product:
            product,

          offer:
            offer,

          proAccessCreated:
            false,

          proAccessToken:
            existingAccess.token,

          proAccessExpiresAt:
            Number(
              existingAccess
                .expires_at
            )
        });
      }


      const token =
        createAccessToken();


      const now =
        Date.now();


      /*
        31 December 9999 UTC.

        This represents effectively permanent
        one-time-purchase access.
      */


      const expiresAt =
        253402300799000;


      const entitlementData =
        JSON.stringify({
          type:
            "extension-entitlement",

          product:
            product,

          offer:
            offer,

          plan:
            "pro",

          access:
            "unlimited-scans",

          studio:
            "Arthiva Labs",

          createdAt:
            now
        });


      try {

        await context.env.DB
          .prepare(
            `
            INSERT INTO report_access (
              token,
              product,
              offer,
              payment_id,
              report_data,
              created_at,
              expires_at,
              used_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, NULL)
            `
          )
          .bind(
            token,
            product,
            offer,

            paymentVerification
              .paymentId,

            entitlementData,

            now,

            expiresAt
          )
          .run();


      } catch (
        databaseError
      ) {

        console.error(
          "Arthiva extension access insert error",
          databaseError
        );


        return Response.json(
          {
            success: false,

            verified: true,

            error:
              "Payment was verified, but Scam Shield Pro access could not be created."
          },

          {
            status: 500
          }
        );
      }


      return Response.json({
        success: true,

        verified: true,

        status:
          "payment-verified",

        paymentProvider:
          paymentVerification
            .paymentProvider,

        paymentId:
          paymentVerification
            .paymentId,

        accessType:
          "extension-pro",

        product:
          product,

        offer:
          offer,

        proAccessCreated:
          true,

        proAccessToken:
          token,

        proAccessExpiresAt:
          expiresAt
      });
    }


    /*
      ==========================================================
      EXISTING REPORT PRODUCT FLOW
      ==========================================================

      CTC Reality
      Exit Date
      Brand Rate

      These continue using temporary 30-minute
      report access tokens.
      ==========================================================
    */


    const existingAccess =
      await context.env.DB
        .prepare(
          `
          SELECT
            token,
            expires_at
          FROM report_access
          WHERE
            product = ?
            AND offer = ?
            AND payment_id = ?
          ORDER BY created_at DESC
          LIMIT 1
          `
        )
        .bind(
          product,
          offer,

          paymentVerification
            .paymentId
        )
        .first();


    if (
      existingAccess &&

      Number(
        existingAccess
          .expires_at
      ) >
        Date.now()
    ) {

      return Response.json({
        success: true,

        verified: true,

        status:
          "payment-already-verified",

        paymentProvider:
          paymentVerification
            .paymentProvider,

        paymentId:
          paymentVerification
            .paymentId,

        reportAccessCreated:
          false,

        reportToken:
          existingAccess.token,

        reportExpiresAt:
          Number(
            existingAccess
              .expires_at
          )
      });
    }


    /*
      ----------------------------------------------------------
      CREATE REPORT ACCESS TOKEN
      ----------------------------------------------------------
    */


    const token =
      createAccessToken();


    const now =
      Date.now();


    const expiresAt =
      now +
      30 *
      60 *
      1000;


    const storedReportData =
      JSON.stringify(
        normalisedReportData
      );


    try {

      await context.env.DB
        .prepare(
          `
          INSERT INTO report_access (
            token,
            product,
            offer,
            payment_id,
            report_data,
            created_at,
            expires_at,
            used_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, NULL)
          `
        )
        .bind(
          token,
          product,
          offer,

          paymentVerification
            .paymentId,

          storedReportData,

          now,

          expiresAt
        )
        .run();


    } catch (
      databaseError
    ) {

      console.error(
        "Arthiva report access insert error",
        databaseError
      );


      return Response.json(
        {
          success: false,

          verified: true,

          error:
            "Payment was verified, but report access could not be created."
        },

        {
          status: 500
        }
      );
    }


    /*
      ----------------------------------------------------------
      REPORT PAYMENT SUCCESS
      ----------------------------------------------------------
    */


    return Response.json({
      success: true,

      verified: true,

      status:
        "payment-verified",

      paymentProvider:
        paymentVerification
          .paymentProvider,

      paymentId:
        paymentVerification
          .paymentId,

      reportAccessCreated:
        true,

      reportToken:
        token,

      reportExpiresAt:
        expiresAt
    });


  } catch (error) {

    console.error(
      "Arthiva payment verification error",
      error
    );


    return Response.json(
      {
        success: false,

        verified: false,

        error:
          "Unable to verify payment."
      },

      {
        status: 500
      }
    );
  }
}
