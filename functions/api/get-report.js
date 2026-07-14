import {
  isSupportedReportProduct
} from "./_lib/report-products.js";

export async function onRequestPost(context) {
  try {
    const body = await context.request.json();

    const token = body.token;

    if (!token) {
      return Response.json(
        {
          success: false,
          error:
            "Report access token is missing."
        },
        {
          status: 400
        }
      );
    }

    if (!context.env.DB) {
      throw new Error(
        "Arthiva database binding is missing."
      );
    }

    const reportAccess =
      await context.env.DB
        .prepare(
          `
          SELECT
            token,
            product,
            offer,
            payment_id,
            report_data,
            created_at,
            expires_at,
            used_at
          FROM report_access
          WHERE token = ?
          LIMIT 1
          `
        )
        .bind(token)
        .first();

    if (!reportAccess) {
      return Response.json(
        {
          success: false,
          error:
            "Report access is invalid."
        },
        {
          status: 404
        }
      );
    }

    const now = Date.now();

    if (
      now >
      Number(reportAccess.expires_at)
    ) {
      return Response.json(
        {
          success: false,
          error:
            "Report access has expired."
        },
        {
          status: 410
        }
      );
    }

    if (
      !isSupportedReportProduct(
        reportAccess.product,
        reportAccess.offer
      )
    ) {
      return Response.json(
        {
          success: false,
          error:
            "Report access does not match a supported product."
        },
        {
          status: 403
        }
      );
    }

    let reportData;

    try {
      reportData = JSON.parse(
        reportAccess.report_data
      );
    } catch (error) {
      throw new Error(
        "Stored report data is invalid."
      );
    }

    return Response.json({
      success: true,
      accessVerified: true,
      product:
        reportAccess.product,
      offer:
        reportAccess.offer,
      reportData:
        reportData,
      expiresAt:
        Number(
          reportAccess.expires_at
        )
    });

  } catch (error) {
    console.error(
      "Arthiva get report error",
      error
    );

    return Response.json(
      {
        success: false,
        error:
          "Unable to load report."
      },
      {
        status: 500
      }
    );
  }
}
