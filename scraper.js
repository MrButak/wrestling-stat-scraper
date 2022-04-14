const puppeteer = require('puppeteer');
config = require('dotenv').config()

const { Pool, Client } = require('pg')

const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

client.connect();


async function getFirstData() {

    try {

        let browser = await puppeteer.launch({headless: false});
        let page = await browser.newPage();
        
        // navigate to login page
        let URL = 'https://www.wrestlestat.com/account/login';
        await page.goto(URL);
        
        // login
        await page.type('.form-signin input[name="Username"]', process.env.USER_NAME);
        await page.type('.form-signin input[name="Password"]', process.env.PASSWORD);

        await Promise.all([
            page.click('.form-signin .btn'),
            page.waitForNavigation(),
        ]);
        let years = ['2022', '2020', '2018', '2016']
        let schools = ['air-force', 'american', 'appalachian-state', 'arizona-state']
        
        

        for(let i = 0; i < 1; i++) {
            
            // navigate to schedule page
            URL = `https://www.wrestlestat.com/season/${years[0]}/team/${schools.indexOf(schools[0]) + 1}/${schools[0]}/profile`;
            
            await page.goto(URL, {
                waitUntil: 'load',
                timeout: 0
            });

            // block loading of resources like images and css
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

            // build object from raw data
            let tmpStr = '';
            let tmpCnt = 1;
            let tmpArry = [];
            let tmpObj = {};

            for(let i = 0; i < rawData.length; i++) {

                tmpStr = '';
                tmpArry = [];

                for(let j = 0; j < rawData[i].values.length; j++) {

                    if(rawData[i].values[j].trim() == '') {continue};
                    tmpStr = rawData[i].values[j].trim();
                    tmpArry.push(tmpStr)
                };

                tmpObj[tmpCnt] = tmpArry;
                tmpCnt++;
                
            };
            
            
            let tmpPointsArry = [];
            let scheduleObj = {
                type: [],
                date: [],
                eventName: [],
                points: [],
                oppName: []
            }
    
            Object.keys(tmpObj).forEach((key) => {
                
                
                scheduleObj.date.push(tmpObj[key][0].split('\n')[0]);
                scheduleObj.type.push(tmpObj[key][1].split('\n')[0]);

                switch(tmpObj[key].length) {

                    case 5:
                        scheduleObj.eventName.push(tmpObj[key][2]);
                        scheduleObj.oppName.push(null);
                        scheduleObj.points.push(null);
                        scheduleObj.points.push(null);
                        break;
                    case 6:
                        scheduleObj.eventName.push(null);
                        scheduleObj.oppName.push(tmpObj[key][3].substring(tmpObj[key][3].indexOf(' ') + 1));
                        // determine what index score goes in by W or L
                        if(tmpObj[key][4].toLowerCase().includes('w')) {

                            if(tmpObj[key][5].split(' - ')[0] < tmpObj[key][5].split(' - ')[1]) {
                                tmpPointsArry.unshift(tmpObj[key][5].split(' - ')[0]);
                                tmpPointsArry.unshift(tmpObj[key][5].split(' - ')[1]);
                            }
                            else {
                                tmpPointsArry.push(tmpObj[key][5].split(' - ')[0]);
                                tmpPointsArry.push(tmpObj[key][5].split(' - ')[1]);
                            }
                        }
                        else {
                            if(tmpObj[key][5].split(' - ')[0] < tmpObj[key][5].split(' - ')[1]) {
                                tmpPointsArry.push(tmpObj[key][5].split(' - ')[0]);
                                tmpPointsArry.push(tmpObj[key][5].split(' - ')[1]);
                            }
                            else {
                                tmpPointsArry.unshift(tmpObj[key][5].split(' - ')[0]);
                                tmpPointsArry.unshift(tmpObj[key][5].split(' - ')[1]);
                            }
                        };
                        scheduleObj.points.push(tmpPointsArry)
                        
                };

                tmpPointsArry = [];
                
            });
            console.log(scheduleObj);
            await page.evaluate(() => window.stop());
        };
        
        
    }

    catch(err) {
        console.log(err);
    };
};


// async function insertInDb()  {

//     const text = 'INSERT INTO purchases(stripe_pi, email, items_purchased, total_price, shipping_address, account_id) VALUES($1, $2, $3, $4, $5, $6) RETURNING *';
//     const values = [stripePiId, email, itemsPurchased, totalPrice, shippingAddress, null];

//     try {
//         const res = await client.query(text, values)
//     } 
//     catch (error) {
//         console.log(error.stack)
//     };
// };


async function main() {

    getFirstData();
    // getSecondData();
};

main();
