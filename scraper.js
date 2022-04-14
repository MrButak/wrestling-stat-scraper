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

async function login(page) {

    try {
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
    }

    catch(err) {
        console.log(err);
    };

};

async function getFirstData(page) {

    try {

        
        let years = ['2022', '2020', '2018', '2016']
        let schools = ['air-force', 'american', 'appalachian-state', 'arizona-state', 'army', 'bellarmine', 'binghamton', 'bloomsburg',
                    'brown', '*bucknell', 'buffalo', 'cal-baptist', 'cal-poly', 'campbell', 'central-michigan', 'chattanogga', 'clarion',
                    'cleveland-state', 'columbia', 'cornell', 'csu-bakersfield', 'davidson', 'drexel', 'duke', 'edinboro', 'franklin-and-marshall',
                    'gardner-webb', 'george-mason', 'harvard', 'hofstra', 'illinois', 'indiana', 'iowa', 'iowa-state', 'kent-state', 'lehigh', 'little-rock',
                    'liu', 'lock-haven', 'maryland', 'michigan', 'michigan-state', 'minnesota', 'missouri', 'navy', 'nebraska', 'north-carolina', 'north-carolina-state',
                    'north-dakota-state', 'northern-colorado', 'northern-illinois', 'northern-iowa', 'northwestern', 'ohio', 'ohio-state', 'oregon-state',
                    'penn-state', 'pennsylvania', 'pittsburgh', 'princeton', 'purdue', 'rider', 'rutgers', 'sacred-heart', 'south-dakota-state', 'southern-illinois-edwardsville',
                    'stanford', 'the-citadel', 'utah-valley', 'virginia', 'virginia-tech', 'vmi', 'west-virginia', 'wisconsin', 'wyoming'];

        
        for(let i = 0; i < 80; i++) {
            
            
            // navigate to schedule page
            if(schools[i] == 'pennsylvania') {
                URL = 'https://www.wrestlestat.com/season/2022/team/61/pennsylvania/profile';
            }
            if(schools[i] == 'edinboro') {
                URL = 'https://www.wrestlestat.com/season/2022/team/26/edinboro/profile';
            }

            if(schools[i] == 'pittsburgh') {
                URL = 'https://www.wrestlestat.com/season/2022/team/62/pittsburgh/profile';
            }
            if(schools[i] == 'bloomsburg') {
                URL = 'https://www.wrestlestat.com/season/2022/team/7/bloomsburg/profile';
            }
            else if(schools[i] == 'franklin-and-marshall') {
                URL = 'https://www.wrestlestat.com/season/2022/team/27/franklin-and-marshall/profile';
            }
            else if(schools[i] == 'brown') {
                URL = 'https://www.wrestlestat.com/season/2022/team/10/brown/profile';
            }
            else if(schools[i] == 'bucknell') {
                URL = 'https://www.wrestlestat.com/season/2022/team/11/bucknell/profile'
            }
            else {
                URL = `https://www.wrestlestat.com/season/${years[0]}/team/${i + 1}/${schools[i]}/profile`;
            };
            
            
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
            console.log(URL)
            console.log(schools[i], '^^^^^^^');
            await page.evaluate(() => window.stop());
            // await insertInDb(scheduleObj)
        };
        
        
    }
    catch(err) {
        console.log(err);
    };
};


async function insertInDb()  {

    const text = 'INSERT INTO purchases(stripe_pi, email, items_purchased, total_price, shipping_address, account_id) VALUES($1, $2, $3, $4, $5, $6) RETURNING *';
    const values = [stripePiId, email, itemsPurchased, totalPrice, shippingAddress, null];

    try {
        const res = await client.query(text, values)
    } 
    catch (error) {
        console.log(error.stack)
    };
};


async function main() {

        
        let browser = await puppeteer.launch({headless: false});
        let page = await browser.newPage();
        await login(page);
        await getFirstData(page);
        
    
    // getFirstData();
    // getSecondData();
};

main();
