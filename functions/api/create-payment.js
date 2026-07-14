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

    const priceListResponse = await fetch(priceListUrl);

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

    const paymentProvider =
      market === "india" ? "razorpay" : "paypal";

    return Response.json({
      success: true,
      product: product,
      productName: productDetails.name,
      offer: offer,
      offerName: offerDetails.name,
      market: market,
      paymentProvider: paymentProvider,
      currency: priceDetails.currency,
      amount: priceDetails.amount,
      status: "price-verified"
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
