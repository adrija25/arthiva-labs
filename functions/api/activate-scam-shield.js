export async function onRequestPost(context) {
  try {
    let body;

    try {
      body = await context.request.json();
    } catch (error) {
      return Response.json(
        {
          success: false,
          activated: false,
          error: "Invalid request."
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

    if (!token) {
      return Response.json(
        {
          success: false,
          activated: false,
          error: "Missing activation code."
        },
        {
          status: 400
        }
      );
    }

    /*
      Scam Shield Pro tokens are expected
      to be 64-character hexadecimal values.
    */

    if (!/^[a-fA-F0-9]{64}$/.test(token)) {
      return Response.json({
        success: true,
        activated: false,
        valid: false,
        error: "Invalid activation code."
      });
    }

    if (!context.env.DB) {
      throw new Error(
        "Arthiva database binding is missing."
      );
    }

    /*
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
      return Response.json({
        success: true,
        activated: false,
        valid: false,
        error: "Activation code was not found."
      });
    }

    const expiresAt =
      Number(access.expires_at);

    if (
      !Number.isFinite(expiresAt) ||
      expiresAt <= Date.now()
    ) {
      return Response.json({
        success: true,
        activated: false,
        valid: false,
        error: "This activation code has expired."
      });
    }

    /*
      Valid Scam Shield Pro entitlement.

      This endpoint does NOT mark the token
      as used because Scam Shield Pro is a
      persistent entitlement rather than a
      one-time report download.
    */

    return Response.json({
      success: true,
      activated: true,
      valid: true,
      pro: true,
      product: "scam-shield",
      offer: "pro",
      accessType: "extension-pro",
      expiresAt: expiresAt
    });

  } catch (error) {
    console.error(
      "Scam Shield activation error",
      error
    );

    return Response.json(
      {
        success: false,
        activated: false,
        valid: false,
        pro: false,
        error:
          "Unable to activate Scam Shield Pro."
      },
      {
        status: 500
      }
    );
  }
}
