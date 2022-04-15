const puppeteer = require('puppeteer');
config = require('dotenv').config()

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


async function getUrlData(page) {

    try {

        let schoolLinkObj = {};
        
        URL = `https://www.wrestlestat.com/team/select`;
        
        await page.goto(URL, {
            waitUntil: 'load',
            timeout: 0
        });
        
        // build schoolLinkObj
        const optionsText = await page.$$eval('option', (text) =>
            text.map((option) => option.textContent)
        );
        const optionsValue = await page.$$eval('option', (value) =>
            value.map((value) => value.value)
        );
        
        for(let i = 1; i < optionsText.length; i++) {
            schoolLinkObj[`${optionsText[i].split(' ').join('-').toLocaleLowerCase()}`] = optionsValue[i];
        };

        // object will be used to make URLs
        return schoolLinkObj;
    }

    catch(err) {
        console.log(err)
    };
}

async function main() {

    let browser = await puppeteer.launch({headless: false});
    let page = await browser.newPage();
    await login(page);
    await getFirstData(page);
};

main()