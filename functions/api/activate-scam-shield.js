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


    const installationId =
      typeof body.installationId === "string"
        ? body.installationId.trim()
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


    if (!installationId) {
      return jsonResponse(
        context.request,
        {
          success: false,
          activated: false,
          error:
            "Missing installation ID."
        },
        400
      );
    }


    /*
    ========================================================
    VALIDATE TOKEN FORMAT
    ========================================================
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
    VALIDATE INSTALLATION ID
    ========================================================

    Installation IDs are generated locally by
    the Scam Shield extension.

    Limit the length to prevent invalid or
    excessively large values being stored.
    */

    if (
      installationId.length < 16 ||
      installationId.length > 128
    ) {
      return jsonResponse(
        context.request,
        {
          success: false,
          activated: false,
          valid: false,
          error:
            "Invalid installation ID."
        },
        400
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
    CHECK EXISTING INSTALLATION
    ========================================================

    If this exact installation has already
    activated this token, allow it again.

    This ensures existing activated devices
    continue to work.
    */

    const existingInstallation =
      await context.env.DB
        .prepare(
          `
          SELECT
            id
          FROM scam_shield_activations
          WHERE
            token = ?
            AND installation_id = ?
          LIMIT 1
          `
        )
        .bind(
          token,
          installationId
        )
        .first();


    if (existingInstallation) {
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
    }


    /*
    ========================================================
    COUNT ACTIVATED INSTALLATIONS
    ========================================================

    Each Scam Shield Pro activation code may
    activate a maximum of two unique extension
    installations.
    */

    const activationCount =
      await context.env.DB
        .prepare(
          `
          SELECT
            COUNT(*) AS count
          FROM scam_shield_activations
          WHERE
            token = ?
          `
        )
        .bind(
          token
        )
        .first();


    const currentActivations =
      Number(
        activationCount?.count || 0
      );


    if (
      currentActivations >= 2
    ) {
      return jsonResponse(
        context.request,
        {
          success: true,
          activated: false,
          valid: true,
          pro: false,
          error:
            "This activation code has already been activated on the maximum number of devices."
        }
      );
    }


    /*
    ========================================================
    REGISTER NEW INSTALLATION
    ========================================================
    */

    await context.env.DB
      .prepare(
        `
        INSERT INTO scam_shield_activations
        (
          token,
          installation_id,
          activated_at
        )
        VALUES (?, ?, ?)
        `
      )
      .bind(
        token,
        installationId,
        Date.now()
      )
      .run();


    /*
    ========================================================
    ACTIVATE PRO
    ========================================================
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
