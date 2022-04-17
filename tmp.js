const fs = require('fs');
const { nextTick } = require('process');
config = require('dotenv').config();
const PublicGoogleSheetsParser = require('public-google-sheets-parser');
const spreadsheetId = process.env.SPREADSHEET_ID;


const parser = new PublicGoogleSheetsParser(spreadsheetId);

let fileNameArry = [];
let fileName = '';
let schedule;
parser.parse().then((items) => {

    for(let i = 0; i < items.length; i++) {

        if(items[i].Short_Name.toLowerCase() == 'iowa' || items[i].Short_Name.toLowerCase() == 'ohio state' 
        || items[i].Short_Name.toLowerCase() == 'cleveland state' 
        || items[i].Short_Name.toLowerCase() == 'virginia' 
        || items[i].Short_Name.toLowerCase() == 'franklin & marshall') {continue};
        fileNameArry.push(items[i].Short_Name + '.txt');
    };
    
    let tmpArry = [];
    for(let i = 0; i < fileNameArry.length; i++) {

        fileName = './schedules/' + fileNameArry[i]
        
        schedule = fs.readFileSync(fileName);
        schedule = JSON.parse(schedule);

        switch(Object.keys(schedule[1]).length) {


            case 10:
                // for(let j = 0; j < schedule.length; j++) {

                //     console.log(schedule[j])
                // }
                // console.log(Object.keys(schedule[0]))
                Object.keys(schedule).forEach((key) => {
                    console.log(new Date(schedule[key].Date))
                    console.log(schedule[key])
                    
                    
                })
                break;
            default:
                break;
        }
        // if(Object.keys(schedule[1]).length == 9) {
        //     console.log(schedule)
        //     tmpArry.push(fileNameArry[i])
        // }
        // if(Object.keys(schedule[1]).length == 0) {
        //     console.log(schedule)
        //     tmpArry.push(fileNameArry[i])
        // }
        // if(tmpArry.includes(Object.keys(schedule[1]).length)) {

        //     continue;
        // }
        // else {
        //     tmpArry.push(Object.keys(schedule[1]).length)
        // }
        
        
    };
    
    // console.log(tmpArry)
});

// let schArry = fs.readFileSync('./schedules/Air Force.txt');
// schArry = JSON.parse(schArry)

// for(let i = 0; i < schArry.length; i++) {


//     console.log(schArry[i].Time)
// }
