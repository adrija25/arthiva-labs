const REPORT_PRODUCTS = {
  "ctc-reality": {
    "salary-report": {
      normaliseReportData(reportData) {
        const annualCtc = Number(reportData?.annualCtc);
        const bonus = Number(reportData?.bonus);
        const monthlyPf = Number(reportData?.monthlyPf);

        if (
          !Number.isFinite(annualCtc) ||
          annualCtc <= 0 ||
          !Number.isFinite(bonus) ||
          bonus < 0 ||
          bonus > annualCtc ||
          !Number.isFinite(monthlyPf) ||
          monthlyPf < 0
        ) {
          throw new Error("Invalid salary report information.");
        }

        return {
          annualCtc,
          bonus,
          monthlyPf
        };
      }
    }
  },

  "exit-date": {
    "transition-plan": {
      normaliseReportData(reportData) {
        const resignationDate = String(
          reportData?.resignationDate || ""
        ).trim();

        const noticePeriodDays = Number(
          reportData?.noticePeriodDays
        );

        const noticeCountingMethod = String(
          reportData?.noticeCountingMethod || ""
        ).trim();

        const estimatedLastWorkingDay = String(
          reportData?.estimatedLastWorkingDay || ""
        ).trim();

        const assessmentAnswers =
          reportData?.assessmentAnswers;

        const assessmentScore = Number(
          reportData?.assessmentScore
        );

        if (
          !resignationDate ||
          !Number.isFinite(noticePeriodDays) ||
          noticePeriodDays < 0 ||
          noticePeriodDays > 365 ||
          !noticeCountingMethod ||
          !estimatedLastWorkingDay ||
          !Array.isArray(assessmentAnswers) ||
          assessmentAnswers.length !== 15 ||
          !assessmentAnswers.every(
            (answer) =>
              Number.isFinite(Number(answer)) &&
              Number(answer) >= 0 &&
              Number(answer) <= 4
          ) ||
          !Number.isFinite(assessmentScore) ||
          assessmentScore < 0 ||
          assessmentScore > 100
        ) {
          throw new Error(
            "Invalid transition plan information."
          );
        }

        return {
          resignationDate,
          noticePeriodDays,
          noticeCountingMethod,
          estimatedLastWorkingDay,
          assessmentAnswers:
            assessmentAnswers.map(Number),
          assessmentScore
        };
      }
    }
  },

  "brand-rate": {
    "premium-report": {
      normaliseReportData(reportData) {

        const platform = String(
          reportData?.platform || ""
        ).trim();

        const followers = Number(
          reportData?.followers
        );

        const engagementRate = Number(
          reportData?.engagementRate
        );

        const niche = String(
          reportData?.niche || ""
        ).trim();

        const contentType = String(
          reportData?.contentType || ""
        ).trim();

        const contentQuality = String(
          reportData?.contentQuality || ""
        ).trim();

        const brandUsage = String(
          reportData?.brandUsage || ""
        ).trim();

        const turnaround = String(
          reportData?.turnaround || ""
        ).trim();

        const minimum = Number(
          reportData?.minimum
        );

        const recommended = Number(
          reportData?.recommended
        );

        const premium = Number(
          reportData?.premium
        );

        const audience = String(
          reportData?.audience || ""
        ).trim();

        const engagement = String(
          reportData?.engagement || ""
        ).trim();

        const position = String(
          reportData?.position || ""
        ).trim();

        if (
          !platform ||
          !Number.isFinite(followers) ||
          followers < 1 ||
          !Number.isFinite(engagementRate) ||
          engagementRate < 0 ||
          engagementRate > 100 ||
          !niche ||
          !contentType ||
          !contentQuality ||
          !brandUsage ||
          !turnaround ||
          !Number.isFinite(minimum) ||
          minimum < 0 ||
          !Number.isFinite(recommended) ||
          recommended < minimum ||
          !Number.isFinite(premium) ||
          premium < recommended ||
          !audience ||
          !engagement ||
          !position
        ) {
          throw new Error(
            "Invalid Brand Rate report information."
          );
        }

        return {
          platform,
          followers,
          engagementRate,
          niche,
          contentType,
          contentQuality,
          brandUsage,
          turnaround,
          minimum,
          recommended,
          premium,
          audience,
          engagement,
          position
        };
      }
    }
  }
};

export function isSupportedReportProduct(
  product,
  offer
) {
  return Boolean(
    REPORT_PRODUCTS[product]?.[offer]
  );
}

export function normaliseReportData(
  product,
  offer,
  reportData
) {
  const reportProduct =
    REPORT_PRODUCTS[product]?.[offer];

  if (!reportProduct) {
    throw new Error(
      "Invalid report product or offer."
    );
  }

  return reportProduct.normaliseReportData(
    reportData
  );
}
