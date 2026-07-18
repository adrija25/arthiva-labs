/*
  ============================================================
  SCAM SHIELD PRO ACCESS VALIDATION
  ============================================================

  This endpoint validates an existing Scam Shield Pro
  entitlement stored in the Arthiva Labs D1 database.

  It is intentionally read-only.

  It does NOT:
  - consume the token
  - update used_at
  - modify report access
  - affect other Arthiva Labs products

  Expected request:

  POST /api/validate-pro-access

  {
    "token": "..."
  }
*/


export async function onRequestPost(context) {

  try {

    /*
      ----------------------------------------------------------
      READ REQUEST
      ----------------------------------------------------------
    */


    let body;


    try {

      body =
        await context.request.json();

    } catch (error) {

      return Response.json(
        {
          success: false,
          valid: false,
          error:
            "Invalid request."
        },
        {
          status: 400
        }
      );

    }


    const token =
      typeof body.token === "string"
        ? body.token.trim()
        : "";


    /*
      ----------------------------------------------------------
      VALIDATE TOKEN INPUT
      ----------------------------------------------------------
    */


    if (!token) {

      return Response.json(
        {
          success: false,
          valid: false,
          error:
            "Missing Pro access token."
        },
        {
          status: 400
        }
      );

    }


    /*
      Basic sanity check.

      Scam Shield tokens are generated from two UUIDs
      with hyphens removed, producing a 64-character
      hexadecimal token.
    */


    if (
      !/^[a-fA-F0-9]{64}$/.test(
        token
      )
    ) {

      return Response.json(
        {
          success: true,
          valid: false,
          error:
            "Invalid Pro access token."
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
      FIND SCAM SHIELD PRO ENTITLEMENT
      ----------------------------------------------------------

      Important:

      We explicitly restrict the query to:

      product = scam-shield
      offer   = pro

      This prevents report tokens belonging to
      CTC Reality, Exit Date, Brand Rate, or future
      Arthiva products from being accepted as
      Scam Shield Pro access.
      ----------------------------------------------------------
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


    /*
      ----------------------------------------------------------
      TOKEN NOT FOUND
      ----------------------------------------------------------
    */


    if (!access) {

      return Response.json({
        success: true,
        valid: false,
        pro: false
      });

    }


    /*
      ----------------------------------------------------------
      CHECK EXPIRATION
      ----------------------------------------------------------

      Scam Shield Pro currently uses an effectively
      permanent expiration date.

      We still validate expires_at so the system
      remains compatible with future entitlement
      models.
      ----------------------------------------------------------
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

      return Response.json({
        success: true,
        valid: false,
        pro: false,
        reason:
          "expired"
      });

    }


    /*
      ----------------------------------------------------------
      VALID PRO ENTITLEMENT
      ----------------------------------------------------------
    */


    return Response.json({

      success: true,

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

    });


  } catch (error) {


    console.error(
      "Scam Shield Pro validation error",
      error
    );


    return Response.json(
      {
        success: false,

        valid: false,

        pro: false,

        error:
          "Unable to validate Scam Shield Pro access."
      },
      {
        status: 500
      }
    );

  }

}
