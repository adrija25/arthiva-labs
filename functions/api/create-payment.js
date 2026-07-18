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

function formatPayPalAmount(amount) {
  return (
    Number(amount) / 100
  ).toFixed(2);
}

function getProductReturnUrl(
  product,
  arthivaOrigin
) {
  const supportedReturnUrls = {
    "ctc-reality":
      arthivaOrigin +
      "/products/ctc-reality/",

    "exit-date":
      arthivaOrigin +
      "/products/exit-date/",

    "brand-rate":
      arthivaOrigin +
      "/products/brand-rate/",

    "scam-shield":
      "https://scam-shield-2sn.pages.dev/"
  };

  return (
    supportedReturnUrls[product] ||
    arthivaOrigin + "/"
  );
}

function getPaymentMarket(request) {
  const country =
    request.cf?.country || "";

  if (country === "IN") {
    return "india";
  }

  return "international";
}

export async function onRequestPost(context) {
  try {
    const body =
      await context.request.json();

    const product =
      body.product;

    const offer =
      body.offer;

    if (
      !product ||
      !offer
    ) {
      return Response.json(
        {
          success: false,
          error:
            "Missing payment information."
        },
        {
          status: 400
        }
      );
    }

    const market =
      getPaymentMarket(
        context.request
      );

    console.log(
      "Arthiva server payment market",
      {
        country:
          context.request.cf?.country ||
          "unknown",
        market:
          market
      }
    );

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
      return Response.json(
        {
          success: false,
          error:
            "Product or offer is not available."
        },
        {
          status: 404
        }
      );
    }

    if (market === "india") {
      const razorpayKeyId =
        context.env.RAZORPAY_KEY_ID;

      const razorpayKeySecret =
        context.env.RAZORPAY_KEY_SECRET;

      if (
        !razorpayKeyId ||
        !razorpayKeySecret
      ) {
        throw new Error(
          "Razorpay secrets are missing."
        );
      }

      const credentials = btoa(
        razorpayKeyId +
        ":" +
        razorpayKeySecret
      );

      const receipt =
        "arthiva_" +
        product.replace(
          /[^a-zA-Z0-9]/g,
          "_"
        ) +
        "_" +
        Date.now();

      const razorpayResponse =
        await fetch(
          "https://api.razorpay.com/v1/orders",
          {
            method: "POST",
            headers: {
              "Authorization":
                "Basic " + credentials,
              "Content-Type":
                "application/json"
            },
            body: JSON.stringify({
              amount:
                priceDetails.amount,

              currency:
                priceDetails.currency,

              receipt:
                receipt,

              notes: {
                product:
                  product,

                offer:
                  offer,

                studio:
                  "Arthiva Labs"
              }
            })
          }
        );

      const razorpayOrder =
        await razorpayResponse.json();

      if (!razorpayResponse.ok) {
        console.error(
          "Razorpay order error",
          razorpayOrder
        );

        return Response.json(
          {
            success: false,
            error:
              "Razorpay could not create the order."
          },
          {
            status: 502
          }
        );
      }

      return Response.json({
        success: true,
        product:
          product,
        productName:
          productDetails.name,
        offer:
          offer,
        offerName:
          offerDetails.name,
        market:
          market,
        paymentProvider:
          "razorpay",
        currency:
          priceDetails.currency,
        amount:
          priceDetails.amount,
        orderId:
          razorpayOrder.id,
        razorpayKeyId:
          razorpayKeyId,
        status:
          "razorpay-order-created"
      });
    }

    const paypalAccessToken =
      await getPayPalAccessToken(
        context.env
      );

    const paypalRequestId =
      "arthiva-" +
      product.replace(
        /[^a-zA-Z0-9]/g,
        "-"
      ) +
      "-" +
      offer.replace(
        /[^a-zA-Z0-9]/g,
        "-"
      ) +
      "-" +
      crypto.randomUUID();

    const requestUrl =
      new URL(context.request.url);

    const arthivaOrigin =
      requestUrl.origin;

    const returnUrl =
      getProductReturnUrl(
        product,
        arthivaOrigin
      );

    const cancelUrl =
      returnUrl +
      (
        returnUrl.includes("?")
          ? "&"
          : "?"
      ) +
      "paypal=cancelled";

    const paypalResponse =
      await fetch(
        "https://api-m.paypal.com/v2/checkout/orders",
        {
          method: "POST",
          headers: {
            "Authorization":
              "Bearer " +
              paypalAccessToken,

            "Content-Type":
              "application/json",

            "PayPal-Request-Id":
              paypalRequestId
          },

          body: JSON.stringify({
            intent:
              "CAPTURE",

            purchase_units: [
              {
                reference_id:
                  product +
                  ":" +
                  offer,

                description:
                  productDetails.name +
                  " — " +
                  offerDetails.name,

                custom_id:
                  product +
                  ":" +
                  offer,

                amount: {
                  currency_code:
                    priceDetails.currency,

                  value:
                    formatPayPalAmount(
                      priceDetails.amount
                    )
                }
              }
            ],

            payment_source: {
              paypal: {
                experience_context: {
                  brand_name:
                    "Arthiva Labs",

                  shipping_preference:
                    "NO_SHIPPING",

                  user_action:
                    "PAY_NOW",

                  return_url:
                    returnUrl,

                  cancel_url:
                    cancelUrl
                }
              }
            }
          })
        }
      );

    const paypalOrder =
      await paypalResponse.json();

    if (
      !paypalResponse.ok ||
      !paypalOrder.id
    ) {
      console.error(
        "PayPal order error",
        paypalOrder
      );

      return Response.json(
        {
          success: false,
          error:
            "PayPal could not create the order."
        },
        {
          status: 502
        }
      );
    }

    const approveLink =
      paypalOrder.links?.find(
        (link) =>
          link.rel ===
            "payer-action" ||
          link.rel ===
            "approve"
      )?.href;

    if (!approveLink) {
      console.error(
        "PayPal approval link missing",
        paypalOrder
      );

      return Response.json(
        {
          success: false,
          error:
            "PayPal did not return an approval link."
        },
        {
          status: 502
        }
      );
    }

    return Response.json({
      success: true,
      product:
        product,
      productName:
        productDetails.name,
      offer:
        offer,
      offerName:
        offerDetails.name,
      market:
        market,
      paymentProvider:
        "paypal",
      currency:
        priceDetails.currency,
      amount:
        priceDetails.amount,
      orderId:
        paypalOrder.id,
      approveUrl:
        approveLink,
      status:
        "paypal-order-created"
    });

  } catch (error) {
    console.error(
      "Arthiva payment error",
      error
    );

    return Response.json(
      {
        success: false,
        error:
          "Unable to prepare payment."
      },
      {
        status: 500
      }
    );
  }
}
