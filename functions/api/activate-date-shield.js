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
      to Date Shield Pro.

      This prevents a Scam Shield key or another Arthiva
      product key from activating Date Shield.
    */

    const entitlement = await env.DB.prepare(
      `
      SELECT token, product, offer
      FROM report_access
      WHERE token = ?
        AND product = 'date-shield'
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
          error: "This is not a valid Date Shield Pro activation key.",
        },
        403
      );
    }

    /*
      STEP 2:
      Check whether this exact installation has already
      been authorized.

      Revalidation by an existing authorized installation
      must NOT consume another activation slot.
    */

    const existingInstallation = await env.DB.prepare(
      `
      SELECT id
      FROM date_shield_activations
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
        product: "date-shield",
        offer: "pro",
        alreadyActivated: true,
        message: "Date Shield Pro is active on this installation.",
      });
    }

    /*
      STEP 3:
      Count how many unique installations are already
      authorized for this activation key.

      Date Shield Pro rule:
      1 purchase = maximum 2 unique installations.
    */

    const activationCount = await env.DB.prepare(
      `
      SELECT COUNT(DISTINCT installation_id) AS count
      FROM date_shield_activations
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
          error:
            "This Date Shield Pro activation key has reached its installation limit.",
        },
        403
      );
    }

    /*
      STEP 4:
      Authorize this new installation.
    */

    await env.DB.prepare(
      `
      INSERT INTO date_shield_activations
        (token, installation_id, activated_at)
      VALUES (?, ?, ?)
      `
    )
      .bind(token, installationId, Date.now())
      .run();

    return jsonResponse({
      ok: true,
      active: true,
      product: "date-shield",
      offer: "pro",
      alreadyActivated: false,
      activationsUsed: usedActivations + 1,
      activationLimit: MAX_INSTALLATIONS,
      message: "Date Shield Pro activated successfully.",
    });
  } catch (error) {
    console.error("Date Shield activation error:", error);

    return jsonResponse(
      {
        ok: false,
        active: false,
        error: "Date Shield activation could not be completed.",
      },
      500
    );
  }
}
