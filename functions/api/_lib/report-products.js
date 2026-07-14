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
