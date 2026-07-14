export async function onRequestPost(context) {
  try {
    const body = await context.request.json();

    const product = body.product;
    const offer = body.offer;
    const market = body.market;

    if (!product || !offer || !market) {
      return Response.json(
        {
          success: false,
          error: "Missing payment information."
        },
        {
          status: 400
        }
      );
    }

    if (market !== "india" && market !== "international") {
      return Response.json(
        {
          success: false,
          error: "Invalid payment market."
        },
        {
          status: 400
        }
      );
    }

    return Response.json({
      success: true,
      product: product,
      offer: offer,
      market: market,
      paymentProvider:
        market === "india" ? "razorpay" : "paypal",
      status: "payment-system-ready"
    });

  } catch (error) {
    return Response.json(
      {
        success: false,
        error: "Unable to prepare payment."
      },
      {
        status: 500
      }
    );
  }
}
