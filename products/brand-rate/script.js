"use strict";

/*
========================================================
Brand Rate
Arthiva Labs

Product #4

Production Script
Version 1.0
========================================================
*/

/* ======================================================
   DOM Helper
====================================================== */

const $ = (id) => document.getElementById(id);

/* ======================================================
   Storage
====================================================== */

const STORAGE_KEY = "brandRateReport";

/* ======================================================
   DOM Cache
====================================================== */

const elements = {

    /* Calculator */

    platform: $("platform"),
    followers: $("followers"),
    engagementRate: $("engagementRate"),
    niche: $("niche"),
    contentType: $("contentType"),
    contentQuality: $("contentQuality"),
    brandUsage: $("brandUsage"),
    turnaround: $("turnaround"),

    /* Buttons */

    calculateBtn: $("calculateBtn"),
    buyReportBtn: $("buyReportBtn"),

    /* Results */

    estimatedRate: $("estimatedRate"),
    minimumRate: $("minimumRate"),
    recommendedRate: $("recommendedRate"),
    premiumRate: $("premiumRate"),

    audienceStrength: $("audienceStrength"),
    engagementScore: $("engagementScore"),
    marketPosition: $("marketPosition"),

    /* Footer */

    currentYear: $("currentYear")

};

/* ======================================================
   State
====================================================== */

let latestCalculation = null;

/* ======================================================
   Currency Helpers
====================================================== */

const currencyFormatter = new Intl.NumberFormat(
    "en-IN",
    {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0
    }
);

function formatCurrency(value){

    return currencyFormatter.format(

        Math.round(

            Number(value) || 0

        )

    );

}

function formatNumber(value){

    return new Intl.NumberFormat(

        "en-IN"

    ).format(

        Number(value) || 0

    );

}

/* ======================================================
   Utility Helpers
====================================================== */

function safeNumber(value){

    const number = Number(value);

    if(Number.isNaN(number)){

        return 0;

    }

    return number;

}

function clamp(value,min,max){

    return Math.min(

        Math.max(value,min),

        max

    );

}

function resetCalculation(){

    latestCalculation = null;

}

function clearResults(){

    resetCalculation();

    elements.estimatedRate.textContent="--";
    elements.minimumRate.textContent="--";
    elements.recommendedRate.textContent="--";
    elements.premiumRate.textContent="--";

    elements.audienceStrength.textContent="--";
    elements.engagementScore.textContent="--";
    elements.marketPosition.textContent="--";

}

/* ======================================================
   Validation
====================================================== */

function validateInputs(){

    if(!elements.platform.value){

        alert("Please select a platform.");

        return false;

    }

    const followers = safeNumber(

        elements.followers.value

    );

    if(followers < 1){

        alert(

            "Please enter your follower count."

        );

        elements.followers.focus();

        return false;

    }

    if(followers > 500000000){

        alert(

            "Follower count looks invalid."

        );

        return false;

    }

    const engagement = safeNumber(

        elements.engagementRate.value

    );

    if(engagement <= 0){

        alert(

            "Please enter your engagement rate."

        );

        elements.engagementRate.focus();

        return false;

    }

    if(engagement > 100){

        alert(

            "Engagement cannot exceed 100%."

        );

        return false;

    }

    if(!elements.niche.value){

        alert("Please select a niche.");

        return false;

    }

    if(!elements.contentType.value){

        alert("Please select a deliverable.");

        return false;

    }

    if(!elements.contentQuality.value){

        alert("Please select content quality.");

        return false;

    }

    if(!elements.brandUsage.value){

        alert("Please select usage rights.");

        return false;

    }

    if(!elements.turnaround.value){

        alert("Please select turnaround.");

        return false;

    }

    return true;

}
/* ======================================================
   Pricing Multipliers
====================================================== */

const PLATFORM = {

    instagram: 1.00,
    youtube: 1.80,
    linkedin: 1.60,
    tiktok: 1.00,
    x: 0.80

};

const NICHE = {

    lifestyle: 1.00,
    beauty: 1.20,
    fashion: 1.15,
    finance: 1.55,
    technology: 1.45,
    business: 1.50,
    education: 1.30,
    gaming: 1.20,
    fitness: 1.15,
    travel: 1.10,
    food: 1.00,
    parenting: 1.00

};

const CONTENT = {

    story: 0.55,
    reel: 1.35,
    carousel: 1.00,
    feed: 1.00,
    video: 2.50,
    package: 3.50

};

const QUALITY = {

    basic: 0.85,
    good: 1.00,
    excellent: 1.20,
    premium: 1.45

};

const RIGHTS = {

    organic: 1.00,
    whitelisting: 1.35,
    full: 1.75

};

const TURNAROUND = {

    normal: 1.00,
    fast: 1.20,
    urgent: 1.45

};

/* ======================================================
   Audience Classification
====================================================== */

function audienceLevel(followers){

    if(followers < 10000){

        return{

            label:"Nano Creator",
            multiplier:0.80

        };

    }

    if(followers < 50000){

        return{

            label:"Micro Creator",
            multiplier:1.00

        };

    }

    if(followers < 100000){

        return{

            label:"Mid-tier Creator",
            multiplier:1.20

        };

    }

    if(followers < 500000){

        return{

            label:"Macro Creator",
            multiplier:1.50

        };

    }

    return{

        label:"Mega Creator",
        multiplier:1.90

    };

}

/* ======================================================
   Engagement Classification
====================================================== */

function engagementLevel(rate){

    if(rate >= 8){

        return{

            label:"Excellent",
            multiplier:1.45

        };

    }

    if(rate >= 6){

        return{

            label:"Very Good",
            multiplier:1.25

        };

    }

    if(rate >= 4){

        return{

            label:"Good",
            multiplier:1.05

        };

    }

    if(rate >= 2){

        return{

            label:"Average",
            multiplier:0.90

        };

    }

    return{

        label:"Low",
        multiplier:0.75

    };

}

/* ======================================================
   Market Position
====================================================== */

function creatorPosition(recommended){

    if(recommended >= 250000){

        return "Premium";

    }

    if(recommended >= 100000){

        return "High";

    }

    if(recommended >= 40000){

        return "Growing";

    }

    return "Emerging";

}

/* ======================================================
   Brand Rate Calculation
====================================================== */

function calculateBrandRate(){

    const platform = elements.platform.value;

    const followers = safeNumber(

        elements.followers.value

    );

    const engagementRate = safeNumber(

        elements.engagementRate.value

    );

    const niche = elements.niche.value;

    const contentType = elements.contentType.value;

    const contentQuality =

        elements.contentQuality.value;

    const brandUsage =

        elements.brandUsage.value;

    const turnaround =

        elements.turnaround.value;

    const audience =

        audienceLevel(followers);

    const engagement =

        engagementLevel(engagementRate);

    let estimate =

        followers * 0.18;

    estimate *= PLATFORM[platform] || 1;
    estimate *= NICHE[niche] || 1;
    estimate *= CONTENT[contentType] || 1;
    estimate *= QUALITY[contentQuality] || 1;
    estimate *= RIGHTS[brandUsage] || 1;
    estimate *= TURNAROUND[turnaround] || 1;

    estimate *= audience.multiplier;
    estimate *= engagement.multiplier;

    estimate = Math.round(estimate);

    const minimum =

        Math.round(estimate * 0.85);

    const recommended =

        estimate;

    const premium =

        Math.round(estimate * 1.30);

    latestCalculation = {

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

        audience: audience.label,
        engagement: engagement.label,
        position: creatorPosition(recommended)

    };

    return latestCalculation;

}
/* ======================================================
   Update Calculator Results
====================================================== */

function updateDisplay() {

    if (!latestCalculation) {

        clearResults();
        return;

    }

    elements.estimatedRate.textContent =
        formatCurrency(latestCalculation.recommended);

    elements.minimumRate.textContent =
        formatCurrency(latestCalculation.minimum);

    elements.recommendedRate.textContent =
        formatCurrency(latestCalculation.recommended);

    elements.premiumRate.textContent =
        formatCurrency(latestCalculation.premium);

    elements.audienceStrength.textContent =
        latestCalculation.audience;

    elements.engagementScore.textContent =
        latestCalculation.engagement;

    elements.marketPosition.textContent =
        latestCalculation.position;

}

/* ======================================================
   Premium Report Data Contract
====================================================== */

function buildReportData() {

    if (!latestCalculation) {

        return null;

    }

    return {

        /* User Inputs */

        platform:
            latestCalculation.platform,

        followers:
            latestCalculation.followers,

        engagementRate:
            latestCalculation.engagementRate,

        niche:
            latestCalculation.niche,

        contentType:
            latestCalculation.contentType,

        contentQuality:
            latestCalculation.contentQuality,

        brandUsage:
            latestCalculation.brandUsage,

        turnaround:
            latestCalculation.turnaround,

        /* Pricing */

        minimum:
            latestCalculation.minimum,

        recommended:
            latestCalculation.recommended,

        premium:
            latestCalculation.premium,

        /* Classifications */

        audience:
            latestCalculation.audience,

        engagement:
            latestCalculation.engagement,

        position:
            latestCalculation.position

    };

}

/* ======================================================
   Save Report
====================================================== */

function saveReportData() {

    const report = buildReportData();

    if (!report) {

        return false;

    }

    sessionStorage.setItem(

        STORAGE_KEY,

        JSON.stringify(report)

    );

    return true;

}

/* ======================================================
   Clear Saved Report
====================================================== */

function clearSavedReport() {

    sessionStorage.removeItem(

        STORAGE_KEY

    );

}

/* ======================================================
   Calculate Flow
====================================================== */

function performCalculation() {

    if (!validateInputs()) {

        return;

    }

    calculateBrandRate();

    updateDisplay();

    clearSavedReport();

}

/* ======================================================
   Reset Calculator
====================================================== */

function invalidateCalculation() {

    latestCalculation = null;

    clearSavedReport();

    clearResults();

}
/* ======================================================
   Update Calculator Results
====================================================== */

function updateDisplay() {

    if (!latestCalculation) {

        clearResults();
        return;

    }

    elements.estimatedRate.textContent =
        formatCurrency(latestCalculation.recommended);

    elements.minimumRate.textContent =
        formatCurrency(latestCalculation.minimum);

    elements.recommendedRate.textContent =
        formatCurrency(latestCalculation.recommended);

    elements.premiumRate.textContent =
        formatCurrency(latestCalculation.premium);

    elements.audienceStrength.textContent =
        latestCalculation.audience;

    elements.engagementScore.textContent =
        latestCalculation.engagement;

    elements.marketPosition.textContent =
        latestCalculation.position;

}

/* ======================================================
   Premium Report Data Contract
====================================================== */

function buildReportData() {

    if (!latestCalculation) {

        return null;

    }

    return {

        /* User Inputs */

        platform:
            latestCalculation.platform,

        followers:
            latestCalculation.followers,

        engagementRate:
            latestCalculation.engagementRate,

        niche:
            latestCalculation.niche,

        contentType:
            latestCalculation.contentType,

        contentQuality:
            latestCalculation.contentQuality,

        brandUsage:
            latestCalculation.brandUsage,

        turnaround:
            latestCalculation.turnaround,

        /* Pricing */

        minimum:
            latestCalculation.minimum,

        recommended:
            latestCalculation.recommended,

        premium:
            latestCalculation.premium,

        /* Classifications */

        audience:
            latestCalculation.audience,

        engagement:
            latestCalculation.engagement,

        position:
            latestCalculation.position

    };

}

/* ======================================================
   Save Report
====================================================== */

function saveReportData() {

    const report = buildReportData();

    if (!report) {

        return false;

    }

    sessionStorage.setItem(

        STORAGE_KEY,

        JSON.stringify(report)

    );

    return true;

}

/* ======================================================
   Clear Saved Report
====================================================== */

function clearSavedReport() {

    sessionStorage.removeItem(

        STORAGE_KEY

    );

}

/* ======================================================
   Calculate Flow
====================================================== */

function performCalculation() {

    if (!validateInputs()) {

        return;

    }

    calculateBrandRate();

    updateDisplay();

    clearSavedReport();

}

/* ======================================================
   Reset Calculator
====================================================== */

function invalidateCalculation() {

    latestCalculation = null;

    clearSavedReport();

    clearResults();

}
/* ======================================================
   Calculate Button
====================================================== */

elements.calculateBtn.addEventListener(

    "click",

    () => {

        performCalculation();

    }

);

/* ======================================================
   Enter Key Support
====================================================== */

[
    elements.followers,
    elements.engagementRate

].forEach(field => {

    field.addEventListener(

        "keypress",

        (event) => {

            if (event.key === "Enter") {

                event.preventDefault();

                performCalculation();

            }

        }

    );

});

/* ======================================================
   Reset When Inputs Change
====================================================== */

[
    elements.platform,
    elements.followers,
    elements.engagementRate,
    elements.niche,
    elements.contentType,
    elements.contentQuality,
    elements.brandUsage,
    elements.turnaround

].forEach(field => {

    field.addEventListener(

        "input",

        invalidateCalculation

    );

    field.addEventListener(

        "change",

        invalidateCalculation

    );

});

/* ======================================================
   Premium Report
====================================================== */

elements.buyReportBtn.addEventListener(

    "click",

    async () => {

        if (!latestCalculation) {

            alert(

                "Please calculate your Brand Rate first."

            );

            return;

        }

        /*
        ==================================================

        PAYMENT INTEGRATION

        Replace ONLY this block with the shared Arthiva
        payment flow used across all premium products.

        Required flow:

        1. Create Order
        2. Razorpay / PayPal Checkout
        3. Verify Payment
        4. saveReportData()
        5. Redirect to report.html

        ==================================================
        */

        const saved = saveReportData();

        if (!saved) {

            alert(

                "Unable to prepare your report."

            );

            return;

        }

        window.location.href = "./report.html";

    }

);

/* ======================================================
   Footer
====================================================== */

if (elements.currentYear) {

    elements.currentYear.textContent =

        new Date().getFullYear();

}

/* ======================================================
   Initialise
====================================================== */

clearResults();

console.log(

    "Brand Rate loaded successfully."

);
