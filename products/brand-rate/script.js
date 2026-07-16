"use strict";

/*
========================================================

Brand Rate
Arthiva Labs

Version:
1.0

Product:
#4

Purpose:
Estimate sponsorship pricing for creators.

========================================================
*/

const $ = (id) => document.getElementById(id);

/*
========================================================
DOM
========================================================
*/

const platform = $("platform");

const followers = $("followers");

const engagement = $("engagement");

const niche = $("niche");

const deliverable = $("deliverable");

const deliverables = $("deliverables");

const usageRights = $("usageRights");

const notes = $("notes");

const calculateButton = $("calculateBrandRate");

const unlockReportButton = $("unlockReport");

const calculatorError = $("calculatorError");

const results = $("results");

const minimumRate = $("minimumRate");

const averageRate = $("averageRate");

const premiumRate = $("premiumRate");

const recommendedRate = $("recommendedRate");

let latestBrandRateReport = null;

/*
========================================================
Helpers
========================================================
*/

function showError(message){

    calculatorError.textContent = message;

    calculatorError.classList.add("visible");

    results.classList.remove("visible");

}

function hideError(){

    calculatorError.classList.remove("visible");

}

function formatINR(value){

    return new Intl.NumberFormat(

        "en-IN",

        {

            style:"currency",

            currency:"INR",

            maximumFractionDigits:0

        }

    ).format(value);

}

function formatUSD(value){

    return new Intl.NumberFormat(

        "en-US",

        {

            style:"currency",

            currency:"USD",

            maximumFractionDigits:0

        }

    ).format(value);

}

/*
========================================================
Country Detection
========================================================
*/

function isIndianUser(){

    const timezone = Intl.DateTimeFormat()

        .resolvedOptions()

        .timeZone

        .toLowerCase();

    return timezone.includes("kolkata");

}

function formatCurrency(value){

    if(isIndianUser()){

        return formatINR(value);

    }

    return formatUSD(value / 85);

}

/*
========================================================
Validation
========================================================
*/

function validateInputs(){

    if(

        followers.value.trim()===""

    ){

        showError(

            "Please enter your follower count."

        );

        return false;

    }

    if(

        Number(followers.value)<=0

    ){

        showError(

            "Follower count must be greater than zero."

        );

        return false;

    }

    if(

        engagement.value.trim()===""

    ){

        showError(

            "Please enter your engagement rate."

        );

        return false;

    }

    if(

        Number(engagement.value)<=0

    ){

        showError(

            "Engagement rate must be greater than zero."

        );

        return false;

    }

    if(

        deliverables.value.trim()===""

    ){

        showError(

            "Please enter the number of deliverables."

        );

        return false;

    }

    if(

        Number(deliverables.value)<=0

    ){

        showError(

            "Deliverables must be at least 1."

        );

        return false;

    }

    hideError();

    return true;

}

/*
========================================================
Multipliers
========================================================
*/

const PLATFORM_MULTIPLIER = {

    Instagram:1,

    YouTube:1.8,

    TikTok:0.9,

    LinkedIn:1.6,

    "X (Twitter)":0.75

};

const NICHE_MULTIPLIER={

    lifestyle:1,

    fashion:1.1,

    beauty:1.15,

    travel:1.1,

    food:0.95,

    fitness:1.05,

    finance:1.5,

    education:1.35,

    business:1.45,

    technology:1.4,

    gaming:1.2,

    parenting:1,

    other:1

};

const DELIVERABLE_MULTIPLIER={

    story:0.55,

    post:0.9,

    reel:1.25,

    carousel:1,

    youtube:2.5,

    shorts:1.15,

    ugc:1.6

};

const USAGE_MULTIPLIER={

    none:1,

    organic:1.15,

    paid:1.4,

    full:1.8

};

function engagementMultiplier(rate){

    if(rate>=10) return 1.5;

    if(rate>=8) return 1.35;

    if(rate>=6) return 1.2;

    if(rate>=4) return 1;

    if(rate>=2) return 0.85;

    return 0.7;

}

function followerBaseRate(followerCount){

    if(followerCount<1000) return 2;

    if(followerCount<5000) return 1.75;

    if(followerCount<10000) return 1.55;

    if(followerCount<25000) return 1.35;

    if(followerCount<50000) return 1.2;

    if(followerCount<100000) return 1.1;

    if(followerCount<250000) return 1;

    if(followerCount<500000) return 0.9;

    if(followerCount<1000000) return 0.8;

    return 0.7;

}
/*
========================================================
Pricing Engine
========================================================
*/

function calculateBrandRate(){

    const followerCount = Number(followers.value);

    const engagementRate = Number(engagement.value);

    const quantity = Number(deliverables.value);

    const platformMultiplier =
        PLATFORM_MULTIPLIER[platform.value] || 1;

    const nicheMultiplier =
        NICHE_MULTIPLIER[niche.value] || 1;

    const deliverableMultiplier =
        DELIVERABLE_MULTIPLIER[deliverable.value] || 1;

    const usageMultiplier =
        USAGE_MULTIPLIER[usageRights.value] || 1;

    const engagementScore =
        engagementMultiplier(engagementRate);

    const baseRate =
        followerCount *
        followerBaseRate(followerCount);

    const estimatedRate =

        baseRate *

        platformMultiplier *

        nicheMultiplier *

        deliverableMultiplier *

        usageMultiplier *

        engagementScore *

        quantity;

    const minimum =
        Math.round(estimatedRate * 0.85);

    const recommended =
        Math.round(estimatedRate);

    const premium =
        Math.round(estimatedRate * 1.30);

    latestBrandRateReport = {

        generatedAt:
            new Date().toISOString(),

        platform:
            platform.value,

        followers:
            followerCount,

        engagement:
            engagementRate,

        niche:
            niche.value,

        deliverable:
            deliverable.value,

        deliverables:
            quantity,

        usageRights:
            usageRights.value,

        notes:
            notes.value,

        minimum,

        recommended,

        premium

    };

    renderResults();

}

/*
========================================================
Results
========================================================
*/

function renderResults(){

    minimumRate.textContent =
        formatCurrency(
            latestBrandRateReport.minimum
        );

    averageRate.textContent =
        formatCurrency(
            latestBrandRateReport.recommended
        );

    premiumRate.textContent =
        formatCurrency(
            latestBrandRateReport.premium
        );

    recommendedRate.textContent =
        formatCurrency(
            latestBrandRateReport.recommended
        );

    results.classList.add("visible");

    results.scrollIntoView({

        behavior:"smooth",

        block:"start"

    });

}

/*
========================================================
Events
========================================================
*/

calculateButton.addEventListener(

    "click",

    () => {

        if(

            !validateInputs()

        ){

            return;

        }

        calculateBrandRate();

    }

);

[
    followers,
    engagement,
    deliverables
].forEach(

    field=>{

        field.addEventListener(

            "keypress",

            event=>{

                if(

                    event.key==="Enter"

                ){

                    event.preventDefault();

                    calculateButton.click();

                }

            }

        );

    }

);

[
    platform,
    niche,
    deliverable,
    usageRights
].forEach(

    field=>{

        field.addEventListener(

            "change",

            ()=>{

                results.classList.remove("visible");

            }

        );

    }

);

followers.addEventListener(

    "input",

    ()=>{

        results.classList.remove("visible");

    }

);

engagement.addEventListener(

    "input",

    ()=>{

        results.classList.remove("visible");

    }

);

deliverables.addEventListener(

    "input",

    ()=>{

        results.classList.remove("visible");

    }

);

/*
========================================================
Premium Report
========================================================
*/

unlockReportButton.addEventListener(

    "click",

    ()=>{

        if(

            latestBrandRateReport===null

        ){

            showError(

                "Please calculate your sponsorship rate first."

            );

            return;

        }

        console.log(

            "Premium report ready.",

            latestBrandRateReport

        );

        /*
        Next version:

        create-payment

        verify-payment

        report token

        redirect to

        report.html?token=...
        */

    }

);
