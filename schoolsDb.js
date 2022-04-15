// I don't really need this file anymore, but will leave it for reference
const PublicGoogleSheetsParser = require('public-google-sheets-parser');
config = require('dotenv').config()
const spreadsheetId = process.env.SPREADSHEET_ID

const { Pool, Client } = require('pg')

const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

client.connect();

async function getSchoolInfo() {

    const parser = new PublicGoogleSheetsParser(spreadsheetId)
    parser.parse().then((items) => {
        insertIntoDb(items);
    });
};

// Function pull data from a public google spreadsheet and inserts the data into a postgres db
async function insertIntoDb(schoolObj) {

    for(let i = 0; i < schoolObj.length; i++) {
        
        let text = 'INSERT INTO schools(conference_id, full_name, nick_name, short_name, city, state) VALUES($1, $2, $3, $4, $5, $6)';
        let values = [schoolObj[i].conference_id, schoolObj[i].School, schoolObj[i].Nickname, schoolObj[i].Short_Name ,schoolObj[i].Location, schoolObj[i].State];

        try {
            let res = await client.query(text, values)
        } 
        catch (error) {
            console.log(error.stack)
        };
    }
    return
};

async function main() {

    await getSchoolInfo()
};

main();
