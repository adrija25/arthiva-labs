import {
  isSupportedReportProduct,
  normaliseReportData
} from "./_lib/report-products.js";

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
  return (Number(amount) / 100).toFixed(2);
}

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

  const verified = safeEqual(
    expectedSignature,
    String(signature).toLowerCase()
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
    paymentProvider: "razorpay",
    paymentId
  };
}

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

  const captureResponse = await fetch(
    "https://api-m.paypal.com/v2/checkout/orders/" +
      encodeURIComponent(orderId) +
      "/capture",
    {
      method: "POST",
      headers: {
        "Authorization":
          "Bearer " + accessToken,
        "Content-Type":
          "application/json",
        "PayPal-Request-Id":
          "arthiva-capture-" + orderId
      },
      body: "{}"
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

  const purchaseUnit =
    captureData.purchase_units?.[0];

  const capture =
    purchaseUnit
      ?.payments
      ?.captures?.[0];

  if (
    captureData.status !== "COMPLETED" ||
    !capture ||
    capture.status !== "COMPLETED"
  ) {
    console.error(
      "PayPal incomplete capture",
      captureData
    );

    return {
      success: false,
      error:
        "PayPal payment is not completed."
    };
  }

  const expectedReference =
    body.product + ":" + body.offer;

  if (
    purchaseUnit.reference_id !==
      expectedReference ||
    purchaseUnit.custom_id !==
      expectedReference
  ) {
    console.error(
      "PayPal product reference mismatch",
      captureData
    );

    return {
      success: false,
      error:
        "PayPal payment does not match this Arthiva product."
    };
  }

  const expectedCurrency =
    String(
      paymentDetails.priceDetails.currency
    ).toUpperCase();

  const expectedAmount =
    formatPayPalAmount(
      paymentDetails.priceDetails.amount
    );

  const capturedCurrency =
    String(
      capture.amount?.currency_code || ""
    ).toUpperCase();

  const capturedAmount =
    String(
      capture.amount?.value || ""
    );

  if (
    capturedCurrency !== expectedCurrency ||
    capturedAmount !== expectedAmount
  ) {
    console.error(
      "PayPal amount mismatch",
      {
        expectedCurrency,
        expectedAmount,
        capturedCurrency,
        capturedAmount
      }
    );

    return {
      success: false,
      error:
        "PayPal payment amount does not match the Arthiva offer."
    };
  }

  return {
    success: true,
    paymentProvider: "paypal",
    paymentId: capture.id
  };
}

export async function onRequestPost(context) {
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

    if (
      !product ||
      !offer ||
      !reportData
    ) {
      return Response.json(
        {
          success: false,
          verified: false,
          error:
            "Missing product, offer, or report verification information."
        },
        {
          status: 400
        }
      );
    }

    if (
      !isSupportedReportProduct(
        product,
        offer
      )
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

    if (!context.env.DB) {
      throw new Error(
        "Arthiva database binding is missing."
      );
    }

    let paymentVerification;

    if (
      paymentProvider === "razorpay"
    ) {
      paymentVerification =
        await verifyRazorpayPayment(
          context,
          body
        );

    } else if (
      paymentProvider === "paypal"
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

    if (!paymentVerification.success) {
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

    let normalisedReportData;

    try {
      normalisedReportData =
        normaliseReportData(
          product,
          offer,
          reportData
        );

    } catch (reportError) {
      return Response.json(
        {
          success: false,
          verified: true,
          error:
            reportError.message
        },
        {
          status: 400
        }
      );
    }

    const token =
      createAccessToken();

    const now =
      Date.now();

    const expiresAt =
      now + 30 * 60 * 1000;

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
          paymentVerification.paymentId,
          storedReportData,
          now,
          expiresAt
        )
        .run();

    } catch (databaseError) {
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

    return Response.json({
      success: true,
      verified: true,
      status:
        "payment-verified",
      paymentProvider:
        paymentVerification.paymentProvider,
      paymentId:
        paymentVerification.paymentId,
      reportAccessCreated: true,
      reportToken: token,
      reportExpiresAt: expiresAt
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
