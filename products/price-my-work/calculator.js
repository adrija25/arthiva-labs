/* =========================================
   PRICE MY WORK — CALCULATION ENGINE
   ========================================= */


/* =========================================
   CURRENCY FORMATTER
========================================= */

function formatCurrency(value) {

  if (
    typeof value !== "number" ||
    !Number.isFinite(value)
  ) {
    return "₹0";
  }

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(Math.round(value));

}


/* =========================================
   FREELANCE RATE CALCULATOR
========================================= */

function calculateFreelanceRate({
  monthlyIncome,
  monthlyExpenses,
  hoursPerWeek,
  billablePercentage,
  weeksPerYear
}) {

  if (
    monthlyIncome <= 0 ||
    monthlyExpenses < 0 ||
    hoursPerWeek <= 0 ||
    billablePercentage <= 0 ||
    billablePercentage > 100 ||
    weeksPerYear <= 0 ||
    weeksPerYear > 52
  ) {
    return null;
  }


  /*
   * Desired personal income for the year.
   */

  const annualIncome =
    monthlyIncome * 12;


  /*
   * Business expenses for the year.
   */

  const annualExpenses =
    monthlyExpenses * 12;


  /*
   * Total working hours available
   * during the year.
   */

  const annualWorkingHours =
    hoursPerWeek * weeksPerYear;


  /*
   * Only a percentage of working time
   * is assumed to be billable.
   */

  const billableHours =
    annualWorkingHours *
    (billablePercentage / 100);


  if (billableHours <= 0) {
    return null;
  }


  /*
   * The rate must cover both:
   *
   * 1. Desired personal income
   * 2. Annual business expenses
   */

  const requiredAnnualRevenue =
    annualIncome + annualExpenses;


  const hourlyRate =
    requiredAnnualRevenue /
    billableHours;


  return {

    annualIncome,

    annualExpenses,

    annualWorkingHours,

    billableHours,

    requiredAnnualRevenue,

    hourlyRate

  };

}


/* =========================================
   PROJECT PRICE CALCULATOR
========================================= */

function calculateProjectPrice(
  hourlyRate,
  projectHours
) {

  if (
    hourlyRate <= 0 ||
    projectHours <= 0
  ) {
    return null;
  }


  return hourlyRate * projectHours;

}


/* =========================================
   SALARY NEGOTIATION CALCULATOR
========================================= */

function calculateSalaryNegotiation({
  currentSalary,
  targetSalary,
  desiredIncrease,
  minimumPercentage,
  openingPercentage
}) {

  if (
    currentSalary <= 0 ||
    desiredIncrease < 0 ||
    minimumPercentage < 0 ||
    openingPercentage < 0
  ) {
    return null;
  }


  /*
   * If the user enters a specific target
   * salary, that figure becomes the target.
   *
   * Otherwise, calculate the target from
   * the desired percentage increase.
   */

  let calculatedTargetSalary;


  if (targetSalary > 0) {

    calculatedTargetSalary =
      targetSalary;

  } else {

    calculatedTargetSalary =
      currentSalary *
      (1 + desiredIncrease / 100);

  }


  /*
   * Minimum:
   *
   * The current salary plus the defined
   * minimum negotiation increase.
   */

  const minimumSalary =
    currentSalary *
    (1 + minimumPercentage / 100);


  /*
   * Opening ask:
   *
   * Add the defined negotiation buffer
   * above the target.
   */

  const openingSalary =
    calculatedTargetSalary *
    (1 + openingPercentage / 100);


  /*
   * Calculate the actual increase represented
   * by the selected target.
   */

  const actualIncrease =
    (
      (calculatedTargetSalary - currentSalary) /
      currentSalary
    ) * 100;


  return {

    currentSalary,

    minimumSalary,

    targetSalary: calculatedTargetSalary,

    openingSalary,

    desiredIncrease: Math.round(
      targetSalary > 0
        ? actualIncrease
        : desiredIncrease
    )

  };

}
