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


// login to website
async function login(page) {

    try {
        // navigate to login page
        let URL = process.env.LOGIN_URL;
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

// Function creates the URLs where the data will be scraper
async function getUrlData(page) {

    try {
        let schoolShortName = [];
        let schoolLinkObj = {};
        let urlArry = [];
        let years = ['2022', '2020', '2018', '2016']
        
        URL = `https://www.wrestlestat.com/team/select`;
        
        await page.goto(URL, {
            waitUntil: 'load',
            timeout: 0
        });
        
        // get data from site
        const optionsText = await page.$$eval('option', (text) =>
            text.map((option) => option.textContent)
        );
        
        const optionsValue = await page.$$eval('option', (value) =>
            value.map((value) => value.value)
        );
        
        for(let i = 1; i < optionsText.length; i++) {
            schoolShortName.push(optionsText[i].toLocaleLowerCase());
            schoolLinkObj[`${optionsText[i].split(' ').join('-').toLocaleLowerCase()}`] = optionsValue[i];
        };

        // create the urls
        Object.keys(schoolLinkObj).forEach((key) => {
            
            urlArry.push(`https://www.wrestlestat.com/season/${years[0]}/team/${schoolLinkObj[key]}/${key}/profile`);
        });

        return [urlArry, schoolShortName];
    }

    catch(err) {
        console.log(err)
    };
};

async function getFirstData(page) {

    try {
        
        let [urlArry, schoolShortName] = await getUrlData(page);
        let URL;
        
        for(let i = 0; i < urlArry.length; i++) {
            
            URL = urlArry[i];

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
            
            let scheduleObj = {
                type: [],
                date: [],
                eventName: [],
                points: [],
                oppPoints: [],
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
                        scheduleObj.oppPoints.push(null);
                        break;
                    case 6:
                        scheduleObj.eventName.push(null);
                        scheduleObj.oppName.push(tmpObj[key][3].substring(tmpObj[key][3].indexOf(' ') + 1));

                        // determine what index score goes in by W or L
                        if(tmpObj[key][4].toLowerCase().includes('w')) {

                            if(tmpObj[key][5].split(' - ')[0] < tmpObj[key][5].split(' - ')[1]) {
                                scheduleObj.points.push(tmpObj[key][5].split(' - ')[1]);
                                scheduleObj.oppPoints.push(tmpObj[key][5].split(' - ')[0]);
                            }
                            else {
                                scheduleObj.points.push(tmpObj[key][5].split(' - ')[0]);
                                scheduleObj.oppPoints.push(tmpObj[key][5].split(' - ')[1]);
                            };
                        }
                        else {
                            if(tmpObj[key][5].split(' - ')[0] < tmpObj[key][5].split(' - ')[1]) {
                                scheduleObj.points.push(tmpObj[key][5].split(' - ')[0]);
                                scheduleObj.oppPoints.push(tmpObj[key][5].split(' - ')[1]);
                            }
                            else {
                                scheduleObj.points.push(tmpObj[key][5].split(' - ')[1]);
                                scheduleObj.oppPoints.push(tmpObj[key][5].split(' - ')[0]);
                            };
                        };
                        
                        
                }; 
            });

            // console.log(scheduleObj);
            // console.log(URL);
            
            await page.evaluate(() => window.stop());
            
            await insertInDb(scheduleObj, schoolShortName[i])
        };
        
        
    }
    catch(err) {
        console.log(err);
    };
};


async function insertInDb(scheduleObj, schoolShortName)  {

    // loop through all items in object, inserting into db
    let objKeyArr = Object.keys(scheduleObj);
    for(let i = 0; i < scheduleObj[objKeyArr[0]].length; i++) {

        try {

            let eventType = scheduleObj['type'][i];
            let eventDate = scheduleObj['date'][i];
            let eventName = scheduleObj['eventName'][i];
            let points = scheduleObj['points'][i];
            let oppPoints = scheduleObj['oppPoints'][i];
            let oppShortName = scheduleObj['oppName'][i];
            let oppSchoolId;
            let oppSchoolIdRaw;
            
            console.log(oppShortName, 'opponent');
            console.log(schoolShortName, 'host');

            let schoolIdStm = `SELECT school_id FROM schools WHERE short_name ILIKE '${schoolShortName}'`;
            let oppSchoolIdStm = `SELECT school_id FROM schools WHERE short_name ILIKE '${oppShortName}'`;

            try {

                if(eventType.toLowerCase() == 'dual') {
                    oppSchoolIdRaw = await client.query(oppSchoolIdStm);
                    oppSchoolId = await oppSchoolIdRaw.rows[0].school_id;
                }
                else {
                    oppSchoolId = null;
                    oppShortName = null;
                };
                let schoolIdRaw = await client.query(schoolIdStm);
                let schoolId = await schoolIdRaw.rows[0].school_id;
                
                try {
                    
                    let insertDbStm = 'INSERT INTO events (event_type, season_id, school_id, opponent_school_id, opponent_school_short_name, points, opponent_points, event_name, event_dates) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)';
                    let insertDbValues = [eventType, 1, schoolId, oppSchoolId, oppShortName, points, oppPoints, eventName, `{${eventDate}}`];
                    await insertValues(insertDbStm, insertDbValues)
                }
                catch(err) {
                    console.log(err)
                };
                
            }
            catch(err) {
                console.log(err)
            };
            
        }

        catch(err) {
            console.log(err);
        };
        
    }
    
  
};

async function insertValues(insertDbStm, insertDbValues) {
    
    try {
        await client.query(insertDbStm, insertDbValues);
        return
    }
    catch(err) {
        console.log(err)
    };  
};


async function main() {

        let browser = await puppeteer.launch({headless: false});
        let page = await browser.newPage();
        await login(page);
        await getFirstData(page);
};

main();
