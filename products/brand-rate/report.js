/*
=========================================================
Brand Rate Premium Report
Arthiva Labs

report.js
=========================================================
*/

"use strict";

/* =======================================================
   Read Stored Calculation
======================================================= */

const reportData = JSON.parse(
    sessionStorage.getItem("latestCalculation") || "{}"
);

/* =======================================================
   DOM Helpers
======================================================= */

const $ = (id) => document.getElementById(id);

const setText = (id, value) => {

    const element = $(id);

    if (!element) return;

    element.textContent = value;

};

/* =======================================================
   Currency Formatter
======================================================= */

const currency = new Intl.NumberFormat("en-IN", {

    style: "currency",

    currency: "INR",

    maximumFractionDigits: 0

});

function formatMoney(value) {

    return currency.format(Math.round(value || 0));

}

/* =======================================================
   Number Formatter
======================================================= */

function formatNumber(value) {

    return new Intl.NumberFormat("en-IN").format(
        Number(value || 0)
    );

}

/* =======================================================
   Date Formatter
======================================================= */

function todayString() {

    return new Date().toLocaleDateString("en-IN", {

        day: "numeric",

        month: "long",

        year: "numeric"

    });

}

/* =======================================================
   Validation
======================================================= */

if (

    !reportData ||

    Object.keys(reportData).length === 0

) {

    alert(

        "No report data found.\n\nPlease calculate your Brand Rate first."

    );

    window.location.href = "./index.html";

}

/* =======================================================
   Extract Data
======================================================= */

const {

    platform,

    followers,

    engagementRate,

    niche,

    contentType,

    brandUsage,

    minimum,

    recommended,

    premium,

    audienceStrength,

    engagementScore,

    marketPosition

} = reportData;

/* =======================================================
   Creator Score
======================================================= */

function calculateCreatorScore() {

    let score = 0;

    score += Math.min(
        Number(followers || 0) / 2000,
        40
    );

    score += Math.min(
        Number(engagementRate || 0) * 8,
        40
    );

    if (
        niche === "finance" ||
        niche === "business"
    ) {

        score += 10;

    }

    else if (

        niche === "technology" ||

        niche === "education"

    ) {

        score += 9;

    }

    else if (

        niche === "beauty" ||

        niche === "fashion"

    ) {

        score += 8;

    }

    else {

        score += 6;

    }

    if (

        brandUsage === "paid"

    ) {

        score += 6;

    }

    else if (

        brandUsage === "commercial"

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

/* =======================================================
   Creator Tier
======================================================= */

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

/* =======================================================
   Negotiation Confidence
======================================================= */

function confidence(score) {

    if (score >= 90)
        return "Very High";

    if (score >= 75)
        return "High";

    if (score >= 60)
        return "Moderate";

    return "Growing";

}
/* =======================================================
   Executive Summary
======================================================= */

setText(
    "recommendedQuoteHero",
    formatMoney(recommended)
);

setText(
    "overallCreatorScore",
    creatorScore + "/100"
);

setText(
    "creatorTier",
    creatorTier(creatorScore)
);

setText(
    "negotiationConfidence",
    confidence(creatorScore)
);

/* =======================================================
   Creator Snapshot
======================================================= */

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

/* =======================================================
   Strength Analysis
======================================================= */

setText(
    "strengthScore",
    creatorScore
);

const title =
    creatorTier(creatorScore);

setText(
    "strengthTitle",
    title
);

let description = "";

if (creatorScore >= 90) {

    description =
        "Your profile demonstrates exceptional commercial potential. You can confidently position yourself for premium partnerships and long-term brand collaborations.";

}
else if (creatorScore >= 80) {

    description =
        "Your content has strong sponsorship potential with above-average commercial appeal. Focus on consistency to unlock premium campaigns.";

}
else if (creatorScore >= 70) {

    description =
        "You have solid creator fundamentals. Improving engagement and authority within your niche will noticeably increase your rates.";

}
else if (creatorScore >= 60) {

    description =
        "Your creator journey is progressing well. Strengthening audience trust and content quality will significantly improve pricing power.";

}
else {

    description =
        "Keep building consistency and engagement. As your audience matures, your commercial value will naturally increase.";

}

setText(
    "strengthDescription",
    description
);

/* =======================================================
   Progress Bars
======================================================= */

const audiencePercent =
    Math.min(
        Math.round(
            Number(followers || 0) / 1000
        ),
        100
    );

const engagementPercent =
    Math.min(
        Math.round(
            Number(engagementRate || 0) * 12
        ),
        100
    );

let nichePercent = 70;

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

    case "health":
    case "fitness":
        nichePercent = 82;
        break;

    default:
        nichePercent = 75;

}

const commercialPercent =
    Math.min(
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

$("audienceProgress").style.width =
    audiencePercent + "%";

$("engagementProgress").style.width =
    engagementPercent + "%";

$("nicheProgress").style.width =
    nichePercent + "%";

$("commercialProgress").style.width =
    commercialPercent + "%";

/* =======================================================
   Pricing Cards
======================================================= */

setText(
    "minimumQuote",
    formatMoney(minimum)
);

setText(
    "recommendedQuote",
    formatMoney(recommended)
);

setText(
    "premiumQuote",
    formatMoney(premium)
);

setText(
    "walkAwayQuote",
    formatMoney(
        Math.round(minimum * 0.9)
    )
);

/* =======================================================
   Monthly Income Projection
======================================================= */

setText(
    "income2Deals",
    formatMoney(recommended * 2)
);

setText(
    "income4Deals",
    formatMoney(recommended * 4)
);

setText(
    "income8Deals",
    formatMoney(recommended * 8)
);

setText(
    "income12Deals",
    formatMoney(recommended * 12)
);

setText(
    "pricingExplanation",
    `Based on your ${formatNumber(followers)} followers, ${engagementRate}% engagement rate, ${niche} niche and ${contentType} content format, your recommended sponsorship quote is ${formatMoney(recommended)}. This balances competitiveness with commercial value while accounting for platform demand and usage rights.`
);
/* =======================================================
   Best Brand Categories
======================================================= */

const brandRecommendations = {

    beauty: [
        ["Skincare", "High compatibility with visual-first beauty campaigns."],
        ["Cosmetics", "Suitable for tutorials, launches and reviews."],
        ["Fashion", "Strong opportunity for lifestyle collaborations."],
        ["Luxury", "Premium positioning with aspirational content."]
    ],

    fashion: [
        ["Fashion", "Excellent for apparel, accessories and styling campaigns."],
        ["Beauty", "Natural crossover with fashion audiences."],
        ["Lifestyle", "Ideal for everyday creator partnerships."],
        ["Luxury", "Premium fashion and designer collaborations."]
    ],

    finance: [
        ["Fintech", "Highly valuable commercial niche."],
        ["Banking", "Strong trust-based audience."],
        ["Investment", "Premium educational sponsorships."],
        ["Insurance", "Excellent long-term partnerships."]
    ],

    business: [
        ["SaaS", "Strong B2B sponsorship potential."],
        ["Productivity", "Ideal creator audience for software."],
        ["AI Tools", "Growing commercial demand."],
        ["Professional Services", "High-value partnerships."]
    ],

    technology: [
        ["Consumer Tech", "Excellent hardware launches."],
        ["AI Products", "Rapidly growing creator category."],
        ["Software", "Ideal for SaaS promotions."],
        ["Gaming", "Good crossover opportunities."]
    ],

    education: [
        ["EdTech", "High audience trust."],
        ["Career Platforms", "Excellent educational partnerships."],
        ["Books", "Evergreen sponsorship opportunities."],
        ["Learning Apps", "Strong audience alignment."]
    ]

};

const defaultBrands = [
    ["Lifestyle", "Suitable for a wide range of creator campaigns."],
    ["Consumer Goods", "Broad sponsorship opportunities."],
    ["Travel", "Campaign-friendly audience."],
    ["Wellness", "Growing commercial category."]
];

const selectedBrands =
    brandRecommendations[niche] || defaultBrands;

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

/* =======================================================
   Negotiation Advice
======================================================= */

if (creatorScore >= 85) {

    setText(
        "openingAdvice",
        "Lead negotiations with your recommended quote and avoid discounting too early. Your creator profile supports premium positioning."
    );

}
else {

    setText(
        "openingAdvice",
        "Start with your recommended quote while leaving room for a small negotiation if additional value is requested."
    );

}

setText(
    "discountAdvice",
    "Instead of reducing your fee, consider adding Stories, Carousels or behind-the-scenes content to increase perceived value."
);

setText(
    "licensingAdvice",
    "Commercial licensing, paid advertising, whitelisting and exclusivity should always be priced separately from your creator fee."
);

setText(
    "creatorTip",
    "Confirm revisions, payment schedule, campaign timeline, deliverables and usage rights before accepting collaborations."
);

/* =======================================================
   Deliverable Pricing
======================================================= */

const reelPrice = recommended;
const storyPrice = Math.round(recommended * 0.35);
const postPrice = Math.round(recommended * 0.75);
const carouselPrice = Math.round(recommended * 0.85);
const ugcPrice = Math.round(recommended * 1.10);
const youtubePrice = Math.round(recommended * 2.40);

setText("storyPrice", formatMoney(storyPrice));
setText("postPrice", formatMoney(postPrice));
setText("carouselPrice", formatMoney(carouselPrice));
setText("reelPrice", formatMoney(reelPrice));
setText("ugcPrice", formatMoney(ugcPrice));
setText("youtubePrice", formatMoney(youtubePrice));

/* =======================================================
   Improvement Opportunities
======================================================= */

const improvements = [];

if (Number(engagementRate) < 3) {

    improvements.push([
        "Increase Engagement",
        "Focus on saves, shares and meaningful comments before prioritising follower growth."
    ]);

}

if (Number(followers) < 10000) {

    improvements.push([
        "Grow Audience",
        "Reaching 10K followers significantly improves sponsorship opportunities across most industries."
    ]);

}

if (
    brandUsage === "organic"
) {

    improvements.push([
        "Separate Licensing",
        "Charge additional fees whenever brands request paid advertising or commercial licensing."
    ]);

}

improvements.push([
    "Strengthen Portfolio",
    "Build case studies and showcase measurable campaign results to justify higher pricing."
]);

for (let i = 0; i < 3; i++) {

    const item =
        improvements[i] || improvements[0];

    setText(
        `riskTitle${i + 1}`,
        item[0]
    );

    setText(
        `riskDescription${i + 1}`,
        item[1]
    );

}

/* =======================================================
   Future Pricing
======================================================= */

const growthMultipliers = {

    future10k: 1,
    future25k: 1.6,
    future50k: 2.4,
    future100k: 3.6,
    future250k: 6.2,
    future500k: 9.5,
    future1m: 15

};

Object.entries(growthMultipliers).forEach(

    ([id, multiplier]) => {

        setText(
            id,
            formatMoney(
                recommended * multiplier
            )
        );

    }

);
/* =======================================================
   Growth Advice
======================================================= */

let growthAdvice1 =
    "Increase saves, shares and meaningful conversations. Strong engagement consistently improves sponsorship pricing.";

let growthAdvice2 =
    "Create a professional media kit, collect testimonials and showcase measurable campaign results to justify premium rates.";

let growthAdvice3 =
    "Always use written agreements covering payment terms, deliverables, revisions, timelines and usage rights.";

if (Number(engagementRate) >= 6) {

    growthAdvice1 =
        "Maintain your excellent engagement by prioritising authentic audience interactions over rapid follower growth.";

}

if (creatorScore >= 85) {

    growthAdvice2 =
        "Focus on long-term partnerships and recurring campaigns instead of one-off collaborations.";

}

setText("growthAdvice1", growthAdvice1);
setText("growthAdvice2", growthAdvice2);
setText("growthAdvice3", growthAdvice3);

/* =======================================================
   Dynamic Brand Pitch
======================================================= */

const creatorName = reportData.creatorName || "[Your Name]";

const pitch = `Hi,

Thank you for reaching out.

Based on your campaign requirements, my rate for this collaboration is ${formatMoney(recommended)}.

This quote includes one ${contentType} deliverable with standard organic usage rights.

If paid advertising, commercial licensing, exclusivity, whitelisting, additional revisions or extra deliverables are required, I'd be happy to provide an updated quotation.

Please let me know your campaign objectives, timeline and usage requirements so I can prepare the most suitable proposal.

Looking forward to hearing from you.

Best,
${creatorName}`;

const pitchBox = $("brandPitch");

if (pitchBox) {

    pitchBox.value = pitch;

}

/* =======================================================
   Copy Pitch
======================================================= */

const copyButton = $("copyPitchButton");

if (copyButton && pitchBox) {

    copyButton.addEventListener("click", async () => {

        try {

            await navigator.clipboard.writeText(
                pitchBox.value
            );

            const originalText =
                copyButton.textContent;

            copyButton.textContent =
                "Copied ✓";

            setTimeout(() => {

                copyButton.textContent =
                    originalText;

            }, 2000);

        }

        catch {

            pitchBox.select();

            document.execCommand("copy");

            const originalText =
                copyButton.textContent;

            copyButton.textContent =
                "Copied ✓";

            setTimeout(() => {

                copyButton.textContent =
                    originalText;

            }, 2000);

        }

    });

}

/* =======================================================
   Footer
======================================================= */

setText(
    "currentYear",
    new Date().getFullYear()
);

/* =======================================================
   Animate Progress Bars
======================================================= */

window.addEventListener("load", () => {

    document
        .querySelectorAll(".progress-fill")
        .forEach((bar) => {

            const width =
                bar.style.width;

            bar.style.width = "0%";

            requestAnimationFrame(() => {

                setTimeout(() => {

                    bar.style.width = width;

                }, 150);

            });

        });

});

/* =======================================================
   Fade-in Cards
======================================================= */

window.addEventListener("load", () => {

    document
        .querySelectorAll(
            ".summary-card, .price-card, .content-card, .income-card, .brand-fit-card, .snapshot-item"
        )
        .forEach((card, index) => {

            card.style.opacity = "0";
            card.style.transform = "translateY(16px)";

            setTimeout(() => {

                card.style.transition =
                    "opacity .45s ease, transform .45s ease";

                card.style.opacity = "1";
                card.style.transform = "translateY(0)";

            }, index * 60);

        });

});

/* =======================================================
   End of Report
======================================================= */

console.log(
    "Brand Rate Premium Report loaded successfully."
);
