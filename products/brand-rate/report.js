"use strict";

/*
========================================================
Brand Rate Premium Report
Arthiva Labs

Product #4

report.js
Version 2.0
========================================================
*/

/* ======================================================
   Storage
====================================================== */

const STORAGE_KEY = "brandRateReport";

/* ======================================================
   Read Stored Report
====================================================== */

const reportData = JSON.parse(

    sessionStorage.getItem(STORAGE_KEY) || "{}"

);

/* ======================================================
   Validation
====================================================== */

if (

    !reportData ||

    Object.keys(reportData).length === 0

) {

    alert(

        "No report found.\n\nPlease calculate your Brand Rate first."

    );

    window.location.href = "./index.html";

}

/* ======================================================
   DOM Helpers
====================================================== */

const $ = (id) => document.getElementById(id);

function setText(id, value) {

    const element = $(id);

    if (!element) return;

    element.textContent = value;

}

/* ======================================================
   Currency Formatter
====================================================== */

const currencyFormatter = new Intl.NumberFormat(

    "en-IN",

    {

        style: "currency",

        currency: "INR",

        maximumFractionDigits: 0

    }

);

function formatCurrency(value) {

    return currencyFormatter.format(

        Math.round(

            Number(value) || 0

        )

    );

}

/* ======================================================
   Number Formatter
====================================================== */

function formatNumber(value) {

    return new Intl.NumberFormat(

        "en-IN"

    ).format(

        Number(value) || 0

    );

}

/* ======================================================
   Date Formatter
====================================================== */

function todayString() {

    return new Date().toLocaleDateString(

        "en-IN",

        {

            day: "numeric",

            month: "long",

            year: "numeric"

        }

    );

}

/* ======================================================
   Extract Report Data
====================================================== */

const {

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

} = reportData;

/* ======================================================
   Creator Score
====================================================== */

function calculateCreatorScore() {

    let score = 0;

    score += Math.min(

        followers / 2000,

        40

    );

    score += Math.min(

        engagementRate * 8,

        40

    );

    switch (niche) {

        case "finance":
        case "business":

            score += 10;

            break;

        case "technology":
        case "education":

            score += 9;

            break;

        case "beauty":
        case "fashion":

            score += 8;

            break;

        default:

            score += 6;

    }

    if (

        brandUsage === "whitelisting"

    ) {

        score += 6;

    }

    else if (

        brandUsage === "full"

    ) {

        score += 8;

    }

    return Math.min(

        Math.round(score),

        100

    );

}

const creatorScore =

    calculateCreatorScore();

/* ======================================================
   Creator Tier
====================================================== */

function creatorTier(score) {

    if (score >= 90)
        return "Elite Creator";

    if (score >= 80)
        return "Premium Creator";

    if (score >= 70)
        return "Professional Creator";

    if (score >= 60)
        return "Growing Creator";

    return "Emerging Creator";

}

/* ======================================================
   Negotiation Confidence
====================================================== */

function confidence(score) {

    if (score >= 90)
        return "Very High";

    if (score >= 75)
        return "High";

    if (score >= 60)
        return "Moderate";

    return "Growing";

}
/* ======================================================
   Executive Summary
====================================================== */

setText(
    "recommendedQuoteHero",
    formatCurrency(recommended)
);

setText(
    "overallCreatorScore",
    `${creatorScore}/100`
);

setText(
    "creatorTier",
    creatorTier(creatorScore)
);

setText(
    "negotiationConfidence",
    confidence(creatorScore)
);

/* ======================================================
   Creator Snapshot
====================================================== */

setText(
    "platformValue",
    platform || "--"
);

setText(
    "followersValue",
    formatNumber(followers)
);

setText(
    "engagementValue",
    `${engagementRate}%`
);

setText(
    "nicheValue",
    niche || "--"
);

setText(
    "deliverableValue",
    contentType || "--"
);

setText(
    "usageValue",
    brandUsage || "--"
);

setText(
    "generatedDate",
    todayString()
);

setText(
    "creatorScore",
    `${creatorScore}/100`
);

/* ======================================================
   Strength Analysis
====================================================== */

setText(
    "strengthScore",
    `${creatorScore}/100`
);

setText(
    "strengthTitle",
    creatorTier(creatorScore)
);

let strengthDescription = "";

if (creatorScore >= 90) {

    strengthDescription =
        "Your profile demonstrates exceptional commercial value with strong sponsorship potential. Premium pricing is justified when negotiating with brands.";

}
else if (creatorScore >= 80) {

    strengthDescription =
        "You have an attractive creator profile with above-average commercial appeal. Continue strengthening consistency to unlock higher-value partnerships.";

}
else if (creatorScore >= 70) {

    strengthDescription =
        "Your creator foundation is solid. Improving authority, engagement and portfolio quality will noticeably increase your sponsorship rates.";

}
else if (creatorScore >= 60) {

    strengthDescription =
        "You are building momentum. Focus on audience trust, consistent content and stronger case studies to increase your pricing power.";

}
else {

    strengthDescription =
        "Every successful creator starts somewhere. Prioritise consistent publishing and authentic audience engagement before increasing your rates.";

}

setText(
    "strengthDescription",
    strengthDescription
);

/* ======================================================
   Progress Scores
====================================================== */

const audiencePercent = Math.min(

    Math.round(followers / 1000),

    100

);

const engagementPercent = Math.min(

    Math.round(engagementRate * 12),

    100

);

let nichePercent = 75;

switch (niche) {

    case "finance":
    case "business":

        nichePercent = 95;
        break;

    case "technology":
    case "education":

        nichePercent = 90;
        break;

    case "beauty":
    case "fashion":

        nichePercent = 85;
        break;

    case "fitness":

        nichePercent = 82;
        break;

    default:

        nichePercent = 75;

}

const commercialPercent = Math.min(

    creatorScore,

    100

);

setText(
    "audienceScore",
    `${audiencePercent}/100`
);

setText(
    "engagementScore",
    `${engagementPercent}/100`
);

setText(
    "nicheScore",
    `${nichePercent}/100`
);

setText(
    "commercialScore",
    `${commercialPercent}/100`
);

if ($("audienceProgress")) {

    $("audienceProgress").style.width =
        audiencePercent + "%";

}

if ($("engagementProgress")) {

    $("engagementProgress").style.width =
        engagementPercent + "%";

}

if ($("nicheProgress")) {

    $("nicheProgress").style.width =
        nichePercent + "%";

}

if ($("commercialProgress")) {

    $("commercialProgress").style.width =
        commercialPercent + "%";

}

/* ======================================================
   Pricing Cards
====================================================== */

setText(
    "minimumQuote",
    formatCurrency(minimum)
);

setText(
    "recommendedQuote",
    formatCurrency(recommended)
);

setText(
    "premiumQuote",
    formatCurrency(premium)
);

setText(
    "walkAwayQuote",
    formatCurrency(
        Math.round(minimum * 0.9)
    )
);

/* ======================================================
   Monthly Income Projection
====================================================== */

setText(
    "income2Deals",
    formatCurrency(recommended * 2)
);

setText(
    "income4Deals",
    formatCurrency(recommended * 4)
);

setText(
    "income8Deals",
    formatCurrency(recommended * 8)
);

setText(
    "income12Deals",
    formatCurrency(recommended * 12)
);

setText(
    "pricingExplanation",
    `Based on your ${formatNumber(followers)} followers, ${engagementRate}% engagement rate, ${niche} niche and ${contentType} content format, your recommended sponsorship quote is ${formatCurrency(recommended)}. This estimate also considers your selected content quality, usage rights and turnaround preferences.`
);
/* ======================================================
   Best Brand Categories
====================================================== */

const brandRecommendations = {

    beauty: [
        ["Skincare", "High compatibility with skincare and personal care campaigns."],
        ["Cosmetics", "Excellent for tutorials, launches and beauty reviews."],
        ["Fashion", "Natural crossover with fashion collaborations."],
        ["Luxury", "Suitable for premium lifestyle partnerships."]
    ],

    fashion: [
        ["Fashion", "Strong alignment with apparel and accessory brands."],
        ["Beauty", "Ideal crossover for makeup and skincare campaigns."],
        ["Lifestyle", "Great fit for everyday creator partnerships."],
        ["Luxury", "Premium designer and luxury collaborations."]
    ],

    finance: [
        ["Fintech", "Excellent trust-based sponsorship opportunities."],
        ["Banking", "High-value financial campaigns."],
        ["Investment", "Premium educational collaborations."],
        ["Insurance", "Long-term partnership potential."]
    ],

    business: [
        ["SaaS", "Ideal audience for software companies."],
        ["AI Tools", "Growing commercial demand."],
        ["Productivity", "Excellent B2B creator fit."],
        ["Professional Services", "Strong consulting partnerships."]
    ],

    technology: [
        ["Consumer Tech", "Perfect for gadget launches."],
        ["AI Products", "Rapidly growing sponsorship niche."],
        ["Software", "Excellent SaaS opportunities."],
        ["Gaming", "Natural crossover campaigns."]
    ],

    education: [
        ["EdTech", "Strong educational partnerships."],
        ["Career Platforms", "Excellent audience alignment."],
        ["Books", "Evergreen sponsorship category."],
        ["Learning Apps", "Ideal educational collaborations."]
    ]

};

const defaultBrands = [

    ["Lifestyle", "Suitable for a wide variety of creator campaigns."],
    ["Consumer Goods", "Broad sponsorship opportunities."],
    ["Travel", "Good audience compatibility."],
    ["Wellness", "Growing commercial category."]

];

const selectedBrands =

    brandRecommendations[niche] ||

    defaultBrands;

for (let i = 0; i < 4; i++) {

    setText(

        `brandFit${i + 1}`,

        selectedBrands[i][0]

    );

    setText(

        `brandFitDesc${i + 1}`,

        selectedBrands[i][1]

    );

}

/* ======================================================
   Negotiation Advice
====================================================== */

if (creatorScore >= 85) {

    setText(

        "openingAdvice",

        "Lead negotiations with your recommended quote confidently. Your profile supports premium positioning."

    );

}
else {

    setText(

        "openingAdvice",

        "Start with your recommended quote while leaving room for a small negotiation if the campaign scope expands."

    );

}

setText(

    "discountAdvice",

    "Instead of lowering your fee, increase perceived value by offering Stories, Carousels or behind-the-scenes content."

);

setText(

    "licensingAdvice",

    "Paid advertising, whitelisting, exclusivity and commercial licensing should always be charged separately."

);

setText(

    "creatorTip",

    "Always confirm deliverables, payment schedule, revisions, timeline and usage rights before accepting collaborations."

);

/* ======================================================
   Deliverable Pricing
====================================================== */

const storyPrice =

    Math.round(recommended * 0.35);

const postPrice =

    Math.round(recommended * 0.75);

const carouselPrice =

    Math.round(recommended * 0.85);

const reelPrice =

    recommended;

const ugcPrice =

    Math.round(recommended * 1.10);

const youtubePrice =

    Math.round(recommended * 2.40);

setText(

    "storyPrice",

    formatCurrency(storyPrice)

);

setText(

    "postPrice",

    formatCurrency(postPrice)

);

setText(

    "carouselPrice",

    formatCurrency(carouselPrice)

);

setText(

    "reelPrice",

    formatCurrency(reelPrice)

);

setText(

    "ugcPrice",

    formatCurrency(ugcPrice)

);

setText(

    "youtubePrice",

    formatCurrency(youtubePrice)

);

/* ======================================================
   Improvement Opportunities
====================================================== */

const improvements = [];

if (engagementRate < 3) {

    improvements.push([

        "Increase Engagement",

        "Focus on saves, shares and meaningful conversations before prioritising follower growth."

    ]);

}

if (followers < 10000) {

    improvements.push([

        "Grow Your Audience",

        "Crossing 10K followers significantly improves brand partnership opportunities."

    ]);

}

if (brandUsage === "organic") {

    improvements.push([

        "Charge for Licensing",

        "Always charge separately for whitelisting, paid ads and commercial usage."

    ]);

}

improvements.push([

    "Build Your Portfolio",

    "Collect testimonials, campaign metrics and successful collaborations to justify higher pricing."

]);

while (improvements.length < 3) {

    improvements.push([

        "Stay Consistent",

        "Consistent publishing and audience trust are the biggest drivers of long-term creator growth."

    ]);

}

for (let i = 0; i < 3; i++) {

    setText(

        `riskTitle${i + 1}`,

        improvements[i][0]

    );

    setText(

        `riskDescription${i + 1}`,

        improvements[i][1]

    );

}

/* ======================================================
   Future Pricing Projection
====================================================== */

const growthMultipliers = {

    future10k: 1.0,
    future25k: 1.6,
    future50k: 2.4,
    future100k: 3.6,
    future250k: 6.2,
    future500k: 9.5,
    future1m: 15

};

Object.entries(

    growthMultipliers

).forEach(

    ([id, multiplier]) => {

        setText(

            id,

            formatCurrency(

                recommended * multiplier

            )

        );

    }

);
/* ======================================================
   Growth Advice
====================================================== */

let growthAdvice1 =
    "Increase saves, shares and meaningful conversations. Strong engagement consistently improves sponsorship pricing.";

let growthAdvice2 =
    "Create a professional media kit, collect testimonials and showcase measurable campaign results to justify premium rates.";

let growthAdvice3 =
    "Always use written agreements covering payment terms, deliverables, revisions, timelines and usage rights.";

if (engagementRate >= 6) {

    growthAdvice1 =
        "Maintain your excellent engagement by prioritising authentic audience interactions over rapid follower growth.";

}

if (creatorScore >= 85) {

    growthAdvice2 =
        "Focus on long-term partnerships and recurring campaigns instead of one-off collaborations.";

}

setText(
    "growthAdvice1",
    growthAdvice1
);

setText(
    "growthAdvice2",
    growthAdvice2
);

setText(
    "growthAdvice3",
    growthAdvice3
);

/* ======================================================
   Dynamic Brand Pitch
====================================================== */

const creatorName = "Creator";

const pitch = `Hi,

Thank you for reaching out.

Based on your campaign requirements, my rate for this collaboration is ${formatCurrency(recommended)}.

This quote includes one ${contentType} deliverable with standard organic usage rights.

If your campaign requires paid advertising, whitelisting, exclusivity, commercial licensing or additional deliverables, I would be happy to provide an updated quotation.

Please let me know your campaign objectives, timeline and usage requirements so I can prepare the most suitable proposal.

Looking forward to hearing from you.

Best,
${creatorName}`;

const pitchBox = $("brandPitch");

if (pitchBox) {

    pitchBox.value = pitch;

}

/* ======================================================
   Copy Brand Pitch
====================================================== */

const copyButton = $("copyPitchButton");

if (copyButton && pitchBox) {

    copyButton.addEventListener(
        "click",
        async () => {

            try {

                await navigator.clipboard.writeText(
                    pitchBox.value
                );

            } catch {

                pitchBox.select();
                document.execCommand("copy");

            }

            const originalText =
                copyButton.textContent;

            copyButton.textContent =
                "Copied ✓";

            setTimeout(() => {

                copyButton.textContent =
                    originalText;

            }, 2000);

        }
    );

}

/* ======================================================
   Footer
====================================================== */

setText(
    "currentYear",
    new Date().getFullYear()
);

/* ======================================================
   Animate Progress Bars
====================================================== */

window.addEventListener(
    "load",
    () => {

        document
            .querySelectorAll(".progress-fill")
            .forEach((bar) => {

                const finalWidth =
                    bar.style.width;

                bar.style.width = "0%";

                requestAnimationFrame(() => {

                    setTimeout(() => {

                        bar.style.width =
                            finalWidth;

                    }, 150);

                });

            });

    }
);

/* ======================================================
   Fade-in Animation
====================================================== */

window.addEventListener(
    "load",
    () => {

        const cards = document.querySelectorAll(

            ".summary-card, .price-card, .content-card, .income-card, .brand-fit-card, .snapshot-item"

        );

        cards.forEach((card, index) => {

            card.style.opacity = "0";
            card.style.transform =
                "translateY(16px)";

            setTimeout(() => {

                card.style.transition =
                    "opacity .45s ease, transform .45s ease";

                card.style.opacity = "1";
                card.style.transform =
                    "translateY(0)";

            }, index * 60);

        });

    }
);

/* ======================================================
   Report Ready
====================================================== */

console.log(
    "Brand Rate Premium Report loaded successfully."
);
