function bytesToHex(bytes) {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
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

export async function onRequestPost(context) {
  try {
    const body = await context.request.json();

    const orderId = body.orderId;
    const paymentId = body.paymentId;
    const signature = body.signature;

    const product = body.product;
    const offer = body.offer;

    const reportData = body.reportData;

    if (
      !orderId ||
      !paymentId ||
      !signature ||
      !product ||
      !offer ||
      !reportData
    ) {
      return Response.json(
        {
          success: false,
          verified: false,
          error:
            "Missing payment or report verification information."
        },
        {
          status: 400
        }
      );
    }

    if (
      product !== "ctc-reality" ||
      offer !== "salary-report"
    ) {
      return Response.json(
        {
          success: false,
          verified: false,
          error: "Invalid product or offer."
        },
        {
          status: 400
        }
      );
    }

    const razorpayKeySecret =
      context.env.RAZORPAY_KEY_SECRET;

    if (!razorpayKeySecret) {
      throw new Error(
        "Razorpay secret is missing."
      );
    }

    if (!context.env.DB) {
      throw new Error(
        "Arthiva database binding is missing."
      );
    }

    const encoder = new TextEncoder();

    const cryptoKey =
      await crypto.subtle.importKey(
        "raw",
        encoder.encode(razorpayKeySecret),
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
        encoder.encode(verificationMessage)
      );

    const expectedSignature = bytesToHex(
      new Uint8Array(signatureBuffer)
    );

    const verified = safeEqual(
      expectedSignature,
      String(signature).toLowerCase()
    );

    if (!verified) {
      return Response.json(
        {
          success: false,
          verified: false,
          error: "Payment verification failed."
        },
        {
          status: 400
        }
      );
    }

    const annualCtc =
      Number(reportData.annualCtc);

    const bonus =
      Number(reportData.bonus);

    const monthlyPf =
      Number(reportData.monthlyPf);

    if (
      !Number.isFinite(annualCtc) ||
      annualCtc <= 0 ||
      !Number.isFinite(bonus) ||
      bonus < 0 ||
      bonus > annualCtc ||
      !Number.isFinite(monthlyPf) ||
      monthlyPf < 0
    ) {
      return Response.json(
        {
          success: false,
          verified: false,
          error: "Invalid salary report information."
        },
        {
          status: 400
        }
      );
    }

    const token = createAccessToken();

    const now = Date.now();

    const expiresAt =
      now + 30 * 60 * 1000;

    const storedReportData = JSON.stringify({
      annualCtc: annualCtc,
      bonus: bonus,
      monthlyPf: monthlyPf
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
          paymentId,
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
      status: "payment-verified",
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
        error: "Unable to verify payment."
      },
      {
        status: 500
      }
    );
  }
}
