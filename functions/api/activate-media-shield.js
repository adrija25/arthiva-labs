const jsonResponse = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
    },
  });

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
    },
  });
}

export async function onRequestPost(context) {
  try {
    const { request, env } = context;

    if (!env.DB) {
      return jsonResponse(
        { ok: false, error: "Database binding is unavailable." },
        500
      );
    }

    const body = await request.json();

    const token =
      typeof body.token === "string" ? body.token.trim() : "";

    const installationId =
      typeof body.installationId === "string"
        ? body.installationId.trim()
        : "";

    if (!token || !installationId) {
      return jsonResponse(
        {
          ok: false,
          error: "Activation key and installation ID are required.",
        },
        400
      );
    }

    /*
      STEP 1:
      Confirm that this activation key belongs specifically
      to Media Shield Pro.

      Keys belonging to Scam Shield, Date Shield, or another
      Arthiva product cannot activate Media Shield.
    */

    const entitlement = await env.DB.prepare(
      `
      SELECT token, product, offer
      FROM report_access
      WHERE token = ?
        AND product = 'media-shield'
        AND offer = 'pro'
      LIMIT 1
      `
    )
      .bind(token)
      .first();

    if (!entitlement) {
      return jsonResponse(
        {
          ok: false,
          active: false,
          error: "This is not a valid Media Shield Pro activation key.",
        },
        403
      );
    }

    /*
      STEP 2:
      Check whether this exact installation has already
      been authorised.

      Revalidation from an existing authorised installation
      does not consume another activation slot.
    */

    const existingInstallation = await env.DB.prepare(
      `
      SELECT id
      FROM media_shield_activations
      WHERE token = ?
        AND installation_id = ?
      LIMIT 1
      `
    )
      .bind(token, installationId)
      .first();

    if (existingInstallation) {
      return jsonResponse({
        ok: true,
        active: true,
        product: "media-shield",
        offer: "pro",
        alreadyActivated: true,
        message: "Media Shield Pro is active on this installation.",
      });
    }

    /*
      STEP 3:
      Count unique installations already authorised
      with this Media Shield licence.

      Media Shield Pro:
      1 licence = maximum 2 unique installations.
    */

    const activationCount = await env.DB.prepare(
      `
      SELECT COUNT(DISTINCT installation_id) AS count
      FROM media_shield_activations
      WHERE token = ?
      `
    )
      .bind(token)
      .first();

    const usedActivations = Number(activationCount?.count || 0);
    const MAX_INSTALLATIONS = 2;

    if (usedActivations >= MAX_INSTALLATIONS) {
      return jsonResponse(
        {
          ok: false,
          active: false,
          activationsUsed: usedActivations,
          activationLimit: MAX_INSTALLATIONS,
          licenseLimitReached: true,
          canPurchaseAnotherLicense: true,
          error:
            "This Media Shield Pro activation key has reached its 2-installation limit. Purchase another licence to activate Media Shield Pro on another installation.",
        },
        403
      );
    }

    /*
      STEP 4:
      Authorise this new installation.
    */

    await env.DB.prepare(
      `
      INSERT INTO media_shield_activations
        (token, installation_id, activated_at)
      VALUES (?, ?, ?)
      `
    )
      .bind(token, installationId, Date.now())
      .run();

    return jsonResponse({
      ok: true,
      active: true,
      product: "media-shield",
      offer: "pro",
      alreadyActivated: false,
      activationsUsed: usedActivations + 1,
      activationLimit: MAX_INSTALLATIONS,
      message: "Media Shield Pro activated successfully.",
    });
  } catch (error) {
    console.error("Media Shield activation error:", error);

    return jsonResponse(
      {
        ok: false,
        active: false,
        error: "Media Shield activation could not be completed.",
      },
      500
    );
  }
}
