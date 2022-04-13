const puppeteer = require('puppeteer');
config = require('dotenv').config()


// async function getTableData() {

//     try {

//         let URL = 'https://www.wrestlestat.com/account/login';

//         // navigate to login page
//         let browser = await puppeteer.launch({headless: false});
//         let page = await browser.newPage();

//         await page.goto(URL);
        
//         // login
//         await page.type('.form-signin input[name="Username"]', '');
//         await page.type('.form-signin input[name="Password"]', '');

//         await Promise.all([
//             page.click('.form-signin .btn'),
//             page.waitForNavigation(),
//         ]);

//         // navigate to schedule page
//         URL = 'https://www.wrestlestat.com/season/2022/team/1/air-force/profile';
        
//         await page.goto(URL, {
//             waitUntil: 'load',
//             timeout: 0
//         });
//         await page.goto(URL);
        

//         // click on #schedule tab
//         await Promise.all([
//             page.click('[href="#schedule"]')
//             // page.waitForNavigation(),
//         ]);

//         // block loading of resources like images and css
//         await page.setRequestInterception(true);
        
//         // get table data
//         let rawData = await page.evaluate(() => {

//             let data = [];
//             let table = document.querySelectorAll('table')
//             table = table[4]; // there are 9+ tables on the page

//             for (var i = 1; i < table.rows.length; i++) {

//                 let objCells = table.rows.item(i).cells;

//                 let values = [];
//                 for (var j = 0; j < objCells.length; j++) {
//                     // if I choose to use .innerHTML here, I need to remove all <span> and other tags with .remove()
//                     let text = objCells.item(j).textContent;
//                     values.push(text);
//                 };

//                 let d = { i, values };
//                 data.push(d);
//             };

//             return data;
//         });

//         iterate(rawData)
        
//         await browser.close();
//     }

//     catch(err) {
//         console.log(err);
//     };
// };

// let iterate = (rawData) => {
//     let tmp = '';
//     for(let i = 0; i < rawData.length; i++) {
        
//         for(let j = 0; j < rawData[i].values.length; j++) {
//         tmp = rawData[i].values[j].trim();
//         console.log(tmp)
//         };
//     };
// };


// async function getTableData() {

//     try {

//         let URL = 'https://goduke.com/sports/wrestling/schedule/2021-22?grid=true';

//         // navigate to schedule page
//         let browser = await puppeteer.launch({headless: false});
//         let page = await browser.newPage();
        
//         await page.goto(URL, {
//             waitUntil: 'load',
//             timeout: 0
//         });
//         await page.goto(URL);
        
//         // block loading of resources like images and css
//         await page.setRequestInterception(true);
        
//         // get table data
//         let rawData = await page.evaluate(() => {

//             let data = [];
//             let table = document.querySelector('table')

//             for (var i = 1; i < table.rows.length; i++) {

//                 let objCells = table.rows.item(i).cells;

//                 let values = [];
//                 for (var j = 0; j < objCells.length; j++) {
//                     // if I choose to use .innerHTML here, I need to remove all <span> and other tags with .remove()
//                     let text = objCells.item(j).textContent;
//                     values.push(text);
//                 };

//                 let d = { i, values };
//                 data.push(d);
//             };

//             return data;
//         });

//         iterate(rawData)
        
//         await browser.close();
//     }

//     catch(err) {
//         console.log(err);
//     };
// };

// let iterate = (rawData) => {

//     for(let i = 0; i < rawData.length; i++) {
        
//         for(let j = 0; j < rawData[i].values.length; j++) {
//             console.log(rawData[i].values[j].replace(/\s/g, ""));
//         };
//     };
// };




async function getTableData() {

    try {

        let URL = 'https://www.wrestlestat.com/account/login';

        // navigate to login page
        let browser = await puppeteer.launch({headless: false});
        let page = await browser.newPage();

        await page.goto(URL);
        
        // login
        await page.type('.form-signin input[name="Username"]', process.env.USER_NAME);
        await page.type('.form-signin input[name="Password"]', process.env.PASSWORD);

        await Promise.all([
            page.click('.form-signin .btn'),
            page.waitForNavigation(),
        ]);

        // navigate to schedule page
        URL = 'https://www.wrestlestat.com/season/2022/team/1/air-force/profile';
        
        await page.goto(URL, {
            waitUntil: 'load',
            timeout: 0
        });
        await page.goto(URL);

        // block loading of resources like images and css
        await page.setRequestInterception(true);

        // // click on #schedule tab
        // await Promise.all([
        //     page.click('[href="#schedule"]')
        //     // page.waitForNavigation(),
        // ]);

        // // block loading of resources like images and css
        // await page.setRequestInterception(true);
        
        // get table data
        let rawData = await page.evaluate(() => {

            let data = [];
            let table = document.querySelectorAll('table')
            table = table[4]; // there are 9+ tables on the page

            for (var i = 1; i < table.rows.length; i++) {

                let objCells = table.rows.item(i).cells;

                let values = [];
                for (var j = 0; j < objCells.length; j++) {
                    let text = objCells.item(j).textContent;
                    values.push(text);
                };

                let d = { i, values };
                data.push(d);
            };

            return data;
        });

        parseRawData(rawData)
        
        await browser.close();
    }

    catch(err) {
        console.log(err);
    };
};

let parseRawData = (rawData) => {

    let tmpStr = '';
    let tmpCnt = 1;
    let inCnt = 0;
    let tmpArry = [];
    let tmpObj = {};

    for(let i = 0; i < rawData.length; i++) {

        inCnt = 0;
        tmpStr = '';
        tmpArry = [];

        for(let j = 0; j < rawData[i].values.length; j++) {

            if(rawData[i].values[j].includes('unofficial') || rawData[i].values[j].includes('Big 12 9th Place Matches')) {inCnt++};  
            if(rawData[i].values[j].trim() == '') {continue};
            tmpStr = rawData[i].values[j].trim();
            tmpArry.push(tmpStr)
        };

        if(inCnt > 0) {continue};
        tmpObj[tmpCnt] = tmpArry;
        tmpCnt++;
        
    };
    buildScheduleObj(tmpObj);
    
};

let buildScheduleObj = (rawObj) => {

    let tmpPointsArry = [];
    let scheduleObj = {
        type: [],
        date: [],
        eventName: [],
        points: [],
        oppName: []
    }
    
    Object.keys(rawObj).forEach((key) => {
        
        
        scheduleObj.date.push(rawObj[key][0].split('\n')[0]);
        scheduleObj.type.push(rawObj[key][1].split('\n')[0]);

        switch(rawObj[key].length) {

            case 5:
                scheduleObj.eventName.push(rawObj[key][2]);
                scheduleObj.oppName.push(null);
                scheduleObj.points.push(null);
                scheduleObj.points.push(null);
                break;
            case 6:
                scheduleObj.eventName.push(null);
                scheduleObj.oppName.push(rawObj[key][3].substring(rawObj[key][3].indexOf(' ') + 1));
                tmpPointsArry.push(rawObj[key][5].split(' - ')[0]);
                tmpPointsArry.push(rawObj[key][5].split(' - ')[1]);
                scheduleObj.points.push(tmpPointsArry)
                
        };

        tmpPointsArry = [];
        
    });

    console.log(scheduleObj)
};

getTableData();
