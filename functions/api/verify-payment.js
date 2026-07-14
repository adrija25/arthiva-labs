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
    difference |= first.charCodeAt(i) ^ second.charCodeAt(i);
  }

  return difference === 0;
}

export async function onRequestPost(context) {
  try {
    const body = await context.request.json();

    const orderId = body.orderId;
    const paymentId = body.paymentId;
    const signature = body.signature;

    if (!orderId || !paymentId || !signature) {
      return Response.json(
        {
          success: false,
          verified: false,
          error: "Missing payment verification information."
        },
        {
          status: 400
        }
      );
    }

    const razorpayKeySecret =
      context.env.RAZORPAY_KEY_SECRET;

    if (!razorpayKeySecret) {
      throw new Error("Razorpay secret is missing.");
    }

    const encoder = new TextEncoder();

    const cryptoKey = await crypto.subtle.importKey(
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

    const signatureBuffer = await crypto.subtle.sign(
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

    return Response.json({
      success: true,
      verified: true,
      orderId: orderId,
      paymentId: paymentId,
      status: "payment-verified"
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
