// iowa, ohio state, cleveland state (can get objects, but deformed), virginia'', franlkin & marshall ''
const puppeteer = require('puppeteer');
config = require('dotenv').config();

const PublicGoogleSheetsParser = require('public-google-sheets-parser');
const spreadsheetId = process.env.SPREADSHEET_ID

const fs = require('fs');

// const { Pool, Client } = require('pg');
// const { captureRejections } = require('pg/lib/query');

// const client = new Client({
//     connectionString: process.env.DATABASE_URL,
//     ssl: {
//         rejectUnauthorized: false
//     }
// });

// client.connect();



// Function creates the URLs where the data will be scrapped
function getUrlData(page) {

    let urlObj = {};
    let queryString = '?grid=true';

    const parser = new PublicGoogleSheetsParser(spreadsheetId);

    parser.parse().then((items) => {

        for(let i = 0; i < items.length; i++) {
            urlObj[items[i].Short_Name] = items[i].school_url_schedule + '/' + queryString;
        };
        
        getFirstData(urlObj, page);
    });
};

// Function gets all team schecule data (except for iowa and ohio state), puts data into an array of objects, then writes to a text file the stringified schedule
async function getFirstData(urlObj, page) {

    let URL;
    let objKeys = Object.keys(urlObj)
    
    for(let i = 0; i < objKeys.length; i++) {
        
        // these two team schedules are in a different format
        if(objKeys[i].toLowerCase() == 'iowa' || objKeys[i].toLowerCase() == 'ohio state') {continue};

        try {
            
            URL = urlObj[objKeys[i]];
            
                await page.goto(URL, {
                    waitUntil: 'load',
                    timeout: 0
                });

                const tableHeaders = await page.$$eval('th', text => {
                    return Array.from(text, content => {
                        return content.textContent
                    });
                });
                    
                const result = await page.$$eval('table tr', rows => {
                    return Array.from(rows, row => {
                    const columns = row.querySelectorAll('td');
                    return Array.from(columns, column => column.innerText);
                    });
                });
                
                let keyArr = Object.keys(result);
                let schArry = [];
                let schObj = {};
                

                for(let j = 1; j < keyArr.length; j++) {

                    schObj = {};
                    
                    for(let k = 0; k < result[keyArr[j]].length; k++) {
                        
                        schObj[tableHeaders[k]] = result[keyArr[j]][k];
                    };
                    
                    schArry.push(schObj)
                };

                schArry = JSON.stringify(schArry)
                
                fs.writeFileSync (`./schedules/${objKeys[i]}.txt`, schArry)
        }
        
        catch(err) {
            console.log(err)
        };
    
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
                    await insertValues(insertDbStm, insertDbValues);
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
// Function call inserts schedule data in db
async function insertValues(insertDbStm, insertDbValues) {
    
    try {
        await client.query(insertDbStm, insertDbValues);
        return
    }
    catch(err) {
        console.log(err)
    };  
};

// Main Function calls
async function main() {

        let browser = await puppeteer.launch({headless: false});
        let page = await browser.newPage();
        //await login(page);
        //await getFirstData();
        getUrlData(page)
};

main();
