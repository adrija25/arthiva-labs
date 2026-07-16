"use strict";

/*
========================================================

Brand Rate
Arthiva Labs

Product #4

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
const engagementRate = $("engagementRate");
const niche = $("niche");
const contentType = $("contentType");
const contentQuality = $("contentQuality");
const brandUsage = $("brandUsage");
const turnaround = $("turnaround");

const calculateBtn = $("calculateBtn");
const buyReportBtn = $("buyReportBtn");

const estimatedRate = $("estimatedRate");
const minimumRate = $("minimumRate");
const recommendedRate = $("recommendedRate");
const premiumRate = $("premiumRate");

const audienceStrength = $("audienceStrength");
const engagementScore = $("engagementScore");
const marketPosition = $("marketPosition");

/*
========================================================
State
========================================================
*/

let latestCalculation = null;

/*
========================================================
Helpers
========================================================
*/

function indianUser(){

    return Intl.DateTimeFormat()

        .resolvedOptions()

        .timeZone

        .includes("Kolkata");

}

function formatCurrency(value){

    if(indianUser()){

        return new Intl.NumberFormat(

            "en-IN",

            {

                style:"currency",

                currency:"INR",

                maximumFractionDigits:0

            }

        ).format(value);

    }

    return new Intl.NumberFormat(

        "en-US",

        {

            style:"currency",

            currency:"USD",

            maximumFractionDigits:0

        }

    ).format(value/85);

}

function safeNumber(value){

    const number = Number(value);

    if(Number.isNaN(number)){

        return 0;

    }

    return number;

}

function updateDisplay(){

    if(!latestCalculation){

        return;

    }

    estimatedRate.textContent =
        formatCurrency(latestCalculation.recommended);

    minimumRate.textContent =
        formatCurrency(latestCalculation.minimum);

    recommendedRate.textContent =
        formatCurrency(latestCalculation.recommended);

    premiumRate.textContent =
        formatCurrency(latestCalculation.premium);

    audienceStrength.textContent =
        latestCalculation.audience;

    engagementScore.textContent =
        latestCalculation.engagement;

    marketPosition.textContent =
        latestCalculation.position;

}

/*
========================================================
Validation
========================================================
*/

function validate(){

    if(platform.value===""){

        alert("Please select a platform.");

        return false;

    }

    if(

        safeNumber(followers.value)<=0

    ){

        alert("Enter your follower count.");

        followers.focus();

        return false;

    }

    if(

        safeNumber(engagementRate.value)<=0

    ){

        alert("Enter your engagement rate.");

        engagementRate.focus();

        return false;

    }

    if(niche.value===""){

        alert("Select your niche.");

        return false;

    }

    if(contentType.value===""){

        alert("Select a deliverable.");

        return false;

    }

    if(contentQuality.value===""){

        alert("Select content quality.");

        return false;

    }

    if(brandUsage.value===""){

        alert("Select usage rights.");

        return false;

    }

    if(turnaround.value===""){

        alert("Select delivery timeline.");

        return false;

    }

    return true;

}

/*
========================================================
Pricing Tables
========================================================
*/

const PLATFORM = {

    instagram:1,

    youtube:1.8,

    linkedin:1.6,

    tiktok:1,

    x:.8

};

const NICHE = {

    lifestyle:1,

    beauty:1.2,

    fashion:1.15,

    finance:1.55,

    technology:1.45,

    business:1.5,

    education:1.3,

    gaming:1.2,

    fitness:1.15,

    travel:1.1,

    food:1,

    parenting:1

};

const CONTENT = {

    story:.55,

    reel:1.35,

    carousel:1,

    feed:1,

    video:2.5,

    package:3.5

};
const QUALITY = {

    basic:.85,

    good:1,

    excellent:1.2,

    premium:1.45

};

const RIGHTS = {

    organic:1,

    whitelisting:1.35,

    full:1.75

};

const TURNAROUND = {

    normal:1,

    fast:1.2,

    urgent:1.45

};

/*
========================================================
Audience Classification
========================================================
*/

function audienceLevel(followersCount){

    if(followersCount<10000){

        return{

            label:"Nano Creator",

            multiplier:0.8

        };

    }

    if(followersCount<50000){

        return{

            label:"Micro Creator",

            multiplier:1

        };

    }

    if(followersCount<100000){

        return{

            label:"Mid-tier Creator",

            multiplier:1.2

        };

    }

    if(followersCount<500000){

        return{

            label:"Macro Creator",

            multiplier:1.5

        };

    }

    return{

        label:"Mega Creator",

        multiplier:1.9

    };

}

/*
========================================================
Engagement Rating
========================================================
*/

function engagementLevel(rate){

    if(rate>=8){

        return{

            label:"Excellent",

            multiplier:1.45

        };

    }

    if(rate>=6){

        return{

            label:"Very Good",

            multiplier:1.25

        };

    }

    if(rate>=4){

        return{

            label:"Good",

            multiplier:1.05

        };

    }

    if(rate>=2){

        return{

            label:"Average",

            multiplier:.9

        };

    }

    return{

        label:"Low",

        multiplier:.75

    };

}

/*
========================================================
Market Position
========================================================
*/

function creatorPosition(score){

    if(score>=250000){

        return"Premium";

    }

    if(score>=100000){

        return"High";

    }

    if(score>=40000){

        return"Growing";

    }

    return"Emerging";

}

/*
========================================================
Calculation Engine
========================================================
*/

function calculateBrandRate(){

    const followerCount=

        safeNumber(followers.value);

    const engagement=

        safeNumber(engagementRate.value);

    const audience=

        audienceLevel(followerCount);

    const engagementData=

        engagementLevel(engagement);

    const baseRate=

        followerCount*.18;

    let estimate=

        baseRate;

    estimate*=

        PLATFORM[platform.value]||1;

    estimate*=

        NICHE[niche.value]||1;

    estimate*=

        CONTENT[contentType.value]||1;

    estimate*=

        QUALITY[contentQuality.value]||1;

    estimate*=

        RIGHTS[brandUsage.value]||1;

    estimate*=

        TURNAROUND[turnaround.value]||1;

    estimate*=

        audience.multiplier;

    estimate*=

        engagementData.multiplier;

    const minimum=

        Math.round(estimate*.85);
    const recommended=

        Math.round(estimate);

    const premium=

        Math.round(estimate*1.3);

    latestCalculation={

        platform:

            platform.value,

        followers:

            followerCount,

        engagementRate:

            engagement,

        niche:

            niche.value,

        contentType:

            contentType.value,

        contentQuality:

            contentQuality.value,

        brandUsage:

            brandUsage.value,

        turnaround:

            turnaround.value,

        minimum,

        recommended,

        premium,

        audience:

            audience.label,

        engagement:

            engagementData.label,

        position:

            creatorPosition(recommended)

    };

    updateDisplay();

}

/*
========================================================
Events
========================================================
*/

calculateBtn.addEventListener(

    "click",

    ()=>{

        if(

            !validate()

        ){

            return;

        }

        calculateBrandRate();

    }

);

[
    followers,
    engagementRate
].forEach(

    field=>{

        field.addEventListener(

            "keypress",

            event=>{

                if(

                    event.key==="Enter"

                ){

                    event.preventDefault();

                    calculateBtn.click();

                }

            }

        );

    }

);

[
    platform,
    niche,
    contentType,
    contentQuality,
    brandUsage,
    turnaround
].forEach(

    field=>{

        field.addEventListener(

            "change",

            ()=>{

                latestCalculation=null;

            }

        );

    }

);

followers.addEventListener(

    "input",

    ()=>{

        latestCalculation=null;

    }

);

engagementRate.addEventListener(

    "input",

    ()=>{

        latestCalculation=null;

    }

);
/*
========================================================
Premium Report
========================================================
*/

buyReportBtn.addEventListener(

    "click",

    ()=>{

        if(

            latestCalculation===null

        ){

            alert(

                "Please calculate your brand rate first."

            );

            return;

        }

        /*
        ========================================================

        Existing Arthiva Shared Payment Flow

        Replace this section by calling the
        existing shared payment function already
        used by other Arthiva products.

        Example flow:

        1.
        create-payment

        2.
        Razorpay / PayPal

        3.
        verify-payment

        4.
        redirect

        report.html

        ========================================================
        */

        sessionStorage.setItem(

            "brandRateReport",

            JSON.stringify(

                latestCalculation

            )

        );

        window.location.href=

            "./report.html";

    }

);

/*
========================================================
Current Year
========================================================
*/

const year=

    document.getElementById(

        "currentYear"

    );

if(year){

    year.textContent=

        new Date()

            .getFullYear();

}
