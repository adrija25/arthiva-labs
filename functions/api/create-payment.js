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

    const priceListUrl = new URL(
      "/payment-products.json",
      context.request.url
    );

    const priceListResponse = await context.env.ASSETS.fetch(
      priceListUrl
    );

    if (!priceListResponse.ok) {
      throw new Error("Unable to load Arthiva price list.");
    }

    const priceList = await priceListResponse.json();

    const productDetails = priceList.products?.[product];
    const offerDetails = productDetails?.offers?.[offer];
    const priceDetails = offerDetails?.[market];

    if (!productDetails || !offerDetails || !priceDetails) {
      return Response.json(
        {
          success: false,
          error: "Product or offer is not available."
        },
        {
          status: 404
        }
      );
    }

    if (market === "india") {
      const razorpayKeyId = context.env.RAZORPAY_KEY_ID;
      const razorpayKeySecret = context.env.RAZORPAY_KEY_SECRET;

      if (!razorpayKeyId || !razorpayKeySecret) {
        throw new Error("Razorpay secrets are missing.");
      }

      const credentials = btoa(
        razorpayKeyId + ":" + razorpayKeySecret
      );

      const receipt =
        "arthiva_" +
        product.replace(/[^a-zA-Z0-9]/g, "_") +
        "_" +
        Date.now();

      const razorpayResponse = await fetch(
        "https://api.razorpay.com/v1/orders",
        {
          method: "POST",
          headers: {
            "Authorization": "Basic " + credentials,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            amount: priceDetails.amount,
            currency: priceDetails.currency,
            receipt: receipt,
            notes: {
              product: product,
              offer: offer,
              studio: "Arthiva Labs"
            }
          })
        }
      );

      const razorpayOrder = await razorpayResponse.json();

      if (!razorpayResponse.ok) {
        console.error("Razorpay order error", razorpayOrder);

        return Response.json(
          {
            success: false,
            error: "Razorpay could not create the test order."
          },
          {
            status: 502
          }
        );
      }

      return Response.json({
        success: true,
        product: product,
        productName: productDetails.name,
        offer: offer,
        offerName: offerDetails.name,
        market: market,
        paymentProvider: "razorpay",
        currency: priceDetails.currency,
        amount: priceDetails.amount,
        orderId: razorpayOrder.id,
        razorpayKeyId: razorpayKeyId,
        status: "razorpay-order-created"
      });
    }

    return Response.json({
      success: true,
      product: product,
      productName: productDetails.name,
      offer: offer,
      offerName: offerDetails.name,
      market: market,
      paymentProvider: "paypal",
      currency: priceDetails.currency,
      amount: priceDetails.amount,
      status: "paypal-not-connected-yet"
    });

  } catch (error) {
    console.error("Arthiva payment error", error);

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
