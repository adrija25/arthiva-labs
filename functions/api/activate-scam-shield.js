/*
============================================================
CORS
============================================================
*/

function getCorsHeaders(request) {
  const origin =
    request.headers.get("Origin") || "";

  const headers = {
    "Access-Control-Allow-Methods":
      "POST, OPTIONS",

    "Access-Control-Allow-Headers":
      "Content-Type",

    "Access-Control-Max-Age":
      "86400",

    "Vary":
      "Origin"
  };

  /*
    Scam Shield activation requests may come
    directly from the installed Chrome extension.

    Chrome extensions use a chrome-extension://
    origin, so we allow Chrome extension origins
    for this activation endpoint.

    The Scam Shield website is also allowed.
  */

  if (
    origin.startsWith(
      "chrome-extension://"
    ) ||
    origin ===
      "https://scam-shield-2sn.pages.dev"
  ) {
    headers[
      "Access-Control-Allow-Origin"
    ] = origin;
  }

  return headers;
}


/*
============================================================
JSON RESPONSE
============================================================
*/

function jsonResponse(
  request,
  data,
  status = 200
) {
  return Response.json(
    data,
    {
      status:
        status,

      headers:
        getCorsHeaders(request)
    }
  );
}


/*
============================================================
OPTIONS / CORS PREFLIGHT
============================================================
*/

export async function onRequestOptions(
  context
) {
  const origin =
    context.request.headers.get(
      "Origin"
    ) || "";

  const isAllowedOrigin =
    origin.startsWith(
      "chrome-extension://"
    ) ||
    origin ===
      "https://scam-shield-2sn.pages.dev";

  if (
    origin &&
    !isAllowedOrigin
  ) {
    return new Response(
      null,
      {
        status: 403
      }
    );
  }

  return new Response(
    null,
    {
      status: 204,

      headers:
        getCorsHeaders(
          context.request
        )
    }
  );
}


/*
============================================================
ACTIVATE SCAM SHIELD PRO
============================================================
*/

export async function onRequestPost(context) {
  try {
    let body;

    try {
      body =
        await context.request.json();
    } catch (error) {
      return jsonResponse(
        context.request,
        {
          success: false,
          activated: false,
          error:
            "Invalid request."
        },
        400
      );
    }


    const token =
      typeof body.token === "string"
        ? body.token.trim()
        : "";


    if (!token) {
      return jsonResponse(
        context.request,
        {
          success: false,
          activated: false,
          error:
            "Missing activation code."
        },
        400
      );
    }


    /*
    ========================================================
    VALIDATE TOKEN FORMAT
    ========================================================

    Scam Shield Pro tokens are expected
    to be 64-character hexadecimal values.
    */

    if (
      !/^[a-fA-F0-9]{64}$/.test(
        token
      )
    ) {
      return jsonResponse(
        context.request,
        {
          success: true,
          activated: false,
          valid: false,
          error:
            "Invalid activation code."
        }
      );
    }


    /*
    ========================================================
    CHECK DATABASE BINDING
    ========================================================
    */

    if (!context.env.DB) {
      throw new Error(
        "Arthiva database binding is missing."
      );
    }


    /*
    ========================================================
    FIND SCAM SHIELD PRO ACCESS
    ========================================================

    Look only for Scam Shield Pro access.

    Tokens belonging to Brand Rate,
    CTC Reality, Exit Date, or any other
    Arthiva product cannot activate
    Scam Shield Pro.
    */

    const access =
      await context.env.DB
        .prepare(
          `
          SELECT
            token,
            product,
            offer,
            payment_id,
            created_at,
            expires_at
          FROM report_access
          WHERE
            token = ?
            AND product = ?
            AND offer = ?
          LIMIT 1
          `
        )
        .bind(
          token,
          "scam-shield",
          "pro"
        )
        .first();


    if (!access) {
      return jsonResponse(
        context.request,
        {
          success: true,
          activated: false,
          valid: false,
          error:
            "Activation code was not found."
        }
      );
    }


    /*
    ========================================================
    CHECK EXPIRATION
    ========================================================
    */

    const expiresAt =
      Number(
        access.expires_at
      );


    if (
      !Number.isFinite(
        expiresAt
      ) ||
      expiresAt <= Date.now()
    ) {
      return jsonResponse(
        context.request,
        {
          success: true,
          activated: false,
          valid: false,
          error:
            "This activation code has expired."
        }
      );
    }


    /*
    ========================================================
    ACTIVATE PRO
    ========================================================

    Valid Scam Shield Pro entitlement.

    This endpoint does NOT mark the token
    as used because Scam Shield Pro is a
    persistent entitlement rather than a
    one-time report download.
    */

    return jsonResponse(
      context.request,
      {
        success: true,
        activated: true,
        valid: true,
        pro: true,
        product:
          "scam-shield",
        offer:
          "pro",
        accessType:
          "extension-pro",
        expiresAt:
          expiresAt
      }
    );


  } catch (error) {
    console.error(
      "Scam Shield activation error",
      error
    );


    return jsonResponse(
      context.request,
      {
        success: false,
        activated: false,
        valid: false,
        pro: false,
        error:
          "Unable to activate Scam Shield Pro."
      },
      500
    );
  }
}
