import * as fs from 'node:fs';
import * as path from 'node:path';
import * as url from 'node:url';

import { default as express } from 'express';
import { default as sqlite3 } from 'sqlite3';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));

const port = 8000;
const root = path.join(__dirname, 'public');
const template = path.join(__dirname, 'templates');

//const puppeteer = require('puppeteer');

let app = express();
app.use(express.static(root));

app.use(express.json());
app.use(express.urlencoded());

let dynRoute; //3 Dynamic Route Names
let searchContent; //Filter based on levels within the route
let userSearchInput = null; //User's input

let recentSearches = []; //list of html tags of the data visited and display on recent searches
let viewHistory = []; //Store the names of every data visited

let URLplaceholder = "!§&"; //If no user input, this is the placeholder





//COMPLETED
//database
const db = new sqlite3.Database(path.join(__dirname, 'Covid.sqlite3'), sqlite3.OPEN_READONLY, (err) =>{
    if (err){
        console.log("You must be this tall to enter the database (6ft)");
    }else{
        console.log("Welcome to our database. Don't break it or else......");
    }
});





//COMPLETED
// Home page
app.get('/', (req, res) => {
    res.sendFile(`${root}/index.html`);
});





//COMPLETED
//Dynamic Search input results and a list of viewed data by the user
app.get('/search', (req, res) => {
    //console.log('Working on Dyanmic Search...');
    let otherData = null;
    let finishAndSend = function() {
        fs.readFile(path.join(root, 'search.html'), 'utf-8', (err, data) => {

            //Dynamically populated as the user is typing in the input
            let response;
            let table_body = '';
            otherData.forEach((Data) => {
                let table_row;
                table_row += "<option value='"+Data.MMSA+"'>"+Data.MMSA+"</option>";
                table_body += table_row;
            });
            response = data.replace('$$TABLE_SEARCHRESULT$$', table_body);



            //Show the user's history
            if (recentSearches.length === 0){ //no history
                response = response.replace('$$SEARCH_LIST$$', `<div class="cell">
                <p>No history to show here!</p>
                </div>`);
            }else{
                let blocks = "";
                recentSearches.forEach((block) => {
                    blocks += block;
                });
                response = response.replace('$$SEARCH_LIST$$', blocks);
            }
            res.status(200).type('html').send(response);
        });
    };


    let query1 = 'SELECT MMSA FROM covidTable;';
    db.all(query1, (err, rows) => {
        //console.log(rows);
        if (err || !rows) {
            res.status(404).type('html').sendFile(`${root}/error.html`);
            res.redirect(`/error.html`);
        }else {
            otherData = rows;
            if (otherData !== null) {
                finishAndSend();
            }
        }
    });
});





//COMPLETED
//When the user click search, get all the info based on the user's input and redirect the user accordingly.
app.post('/search', (req, res) => {

    dynRoute = req.body['ChooseOption']; //Get the Dynamic Route



    //Redirect to the appropriate page
    //Get the User Input based on the User
    userSearchInput = encodeURIComponent(req.body['Searchbar']);

    //Replace with a placeholder if the user did not input anything
    if (userSearchInput === ""){
        userSearchInput = URLplaceholder;
    }
    //console.log("Userinput: "+userSearchInput);
    let pageNumber = 1;
    if (dynRoute === 'searchState'){
        res.redirect(`/search/searchState/${userSearchInput}/${pageNumber}`);

    }else if (dynRoute === 'searchHospitals' && req.body['HospitalNum'] !== ''){
        searchContent = req.body['HospitalNum'];
        res.redirect(`/search/searchHospitals/${searchContent}/${userSearchInput}/${pageNumber}`);

    }else if (dynRoute === 'searchRisk' && req.body['RiskNum'] !== ''){
        searchContent = req.body['RiskNum'];
        res.redirect(`/search/searchRisk/${searchContent}/${userSearchInput}/${pageNumber}`);

    }else{
        //404 error
        console.log('redirect error');
        res.status(404).type('html').sendFile(`${root}/error.html`);
        res.redirect(`/error.html`);
    }
});









//COMPLETED
//Search by State
app.get('/search/searchState/:value/:value2', (req, res) => {
    let searching = req.params.value; //input the user want to look for
    let siteNum = req.params.value2; //page number
    let otherData = null;

    let itemCount = 0; //results on how many items are there based of the query.



    let finishAndSend = function() {
        fs.readFile(path.join(template, 'searchState.html'), 'utf-8', (err, data) => {
            let response;
            let totalPageNumber = (itemCount / 6);
            console.log("How many items based on search: "+itemCount);
            //console.log("How many pages in total: "+(itemCount / 6));

            if (totalPageNumber !== Math.floor(totalPageNumber)){ //If it is a decimal, round it and add 1
                totalPageNumber = Math.floor(totalPageNumber) + 1;
            }

            //If there are items, do the following. Otherwise, throw a no result.
            if (itemCount >= 1){
                response = data.replace('$$State$$', "Search Results for: '"+searching+"'");
                let table_body = `<div class="covidTable grid-x grid-margin-x small-up-1 medium-up-2 large-up-3">`;

                let pageCalculate = siteNum * 6; //6 means show 6 items



                //Prev and Next button calculations
                //String URL to array
                var stringURL = req.url;
                stringURL = stringURL.split("/");
                stringURL[stringURL.length - 1] = parseInt(stringURL[stringURL.length - 1]);

                //New URL for Next and Prev Pages
                let newURLPrev = "";
                let newURLNext = "";
                let currentPage = parseInt(stringURL[stringURL.length - 1]);
                for (let i = 0; i < stringURL.length; i++){
                    if (stringURL[i] === " "){ //beginning
                        newURLPrev += "/";
                        newURLNext += "/";
                    }else if (i === stringURL.length - 1){ //end
                        let nextPage = stringURL[i] + 1;
                        let prevPage = stringURL[i] - 1;
                        newURLPrev += prevPage;
                        newURLNext += nextPage;
                    }else{
                        newURLPrev += stringURL[i]+"/";
                        newURLNext += stringURL[i]+"/";
                    }
                }
                //console.log("New Prev URL: "+newURLPrev);
                //console.log("New Next URL: "+newURLNext);


                let counter = 1; //Overall Counter
                let blockCounter = 0; //If-Condition Counter
                //console.log("Max: "+pageCalculate);
                //console.log("min: "+(pageCalculate - 6));
                otherData.forEach((StateData) => {

                    //If the counter is between the Max and the min, give us content to show on web
                    if (counter <= pageCalculate && counter > (parseInt(pageCalculate) - 6)){

                        //A block
                        let table_row = `<div class="boxResults cell">`;
                        table_row += "<h4 class='bRTitle'>" + StateData.MMSA + '</h4>';

                        let covidPercent = parseFloat(StateData.total_percent_at_risk.replace("%", ""));
                        if (covidPercent <= 60){ //Low Risk
                            table_row += "<h5>Covid Status: <img id='covidStatus' src='/images/green.png' draggable='false' loading='lazy' /></h5>";
                        }else if (covidPercent > 60 && covidPercent <= 75){ //Medium Risk
                            table_row += "<h5>Covid Status: <img id='covidStatus' src='/images/orange.png' draggable='false' loading='lazy' /></h5>";
                        }else{ //High Risk
                            table_row += "<h5>Covid Status: <img id='covidStatus' src='/images/COVID-19.png' draggable='false' loading='lazy' /></h5>";
                        }

                        table_row += "<p><a href='../../info/Location/"+encodeURIComponent(StateData.MMSA)+"'><button class='learnMoreButton'>Learn More</button></a></p>";
                        table_row += '</div>\n';

                        table_body += table_row;
                        blockCounter += 1;
                    }
                    counter += 1;
                });
                console.log("Highest counter: "+blockCounter);
                response = response.replace('$$TABLE_BODY$$', table_body+"</div>");

                //check to see if it is the last or first item
                let prevButton;
                let nextButton;
                console.log("pageCalc"+pageCalculate+" === itemCount"+itemCount);
                if (currentPage <= 1 && (itemCount <= pageCalculate)){ //On the first page w/ less than 6 items
                    console.log("First page");
                    nextButton = `<button class="nextButton" disabled>Next</button>`;
                    prevButton = `<button class="prevButton" disabled>Prev</button>`;
                }else if (currentPage <= 1){ //On the first page
                    console.log("First page with lots of items coming up");
                    nextButton = `<a href="${newURLNext}"><button class="nextButton">Next</button></a>`;
                    prevButton = `<button class="prevButton" disabled>Prev</button>`;
                }else if(currentPage === totalPageNumber){ // On the Last page. Show remaining items
                    console.log("last page");
                    nextButton = `<button class="nextButton" disabled>Next</button>`;
                    prevButton = `<a href="${newURLPrev}"><button class="prevButton">Prev</button></a>`;
                }else{
                    console.log("default");
                    nextButton = `<a href="${newURLNext}"><button class="nextButton">Next</button></a>`;
                    prevButton = `<a href="${newURLPrev}"><button class="prevButton">Prev</button></a>`;
                }

                response = response.replace('$$PREV_NEXTBUTTON$$', `
                    ${prevButton}
                    ${nextButton}
                    <h4>Page ${currentPage} of ${totalPageNumber}</h4>
                `);
                if(blockCounter === 0){ //Only happens if the user enter a random number. Throw error.
                    res.status(404).type('html').sendFile(`${root}/error.html`);
                    res.redirect(`/error.html`);
                }else{
                    res.status(200).type('html').send(response);
                }


            }else{ //error
                response = data.replace('$$State$$', "No results on: '"+searching+"'");
                response = response.replace('$$PREV_NEXTBUTTON$$', `<h4>Please try again.</h4>`);
                response = response.replace('$$TABLE_BODY$$', `<img class="noResultImage" src="/images/hollow-knight.gif" draggable="false" />`);
                res.status(404).type('html').send(response);
            }

        });
    };


    db.all("SELECT * FROM covidTable WHERE LOWER(MMSA) LIKE ? AND MMSA != 'MMSA'", ['%' + searching + '%'], (err, rows) => {
        if (err || !rows) {
            res.status(404).type('html').sendFile(`${root}/error.html`);
            res.redirect(`/error.html`);
        }else {
            itemCount = rows.length;
            otherData = rows;
            if (otherData !== null) {
                finishAndSend();
            }else{
                res.status(404).type('html').sendFile(`${root}/error.html`);
                res.redirect(`/error.html`);
            }
        }
    });
});









//COMPLETED
//Search by Hospital numbers
app.get('/search/searchHospitals/:value/:value2/:value3', (req, res) => {

    let searching = req.params.value;
    let siteNum = req.params.value3; //page number
    let otherData = null;

    let itemCount = 0; //results on how many items are there based of the query.
    //console.log(searching);


    let finishAndSend = function() {
        fs.readFile(path.join(template, 'searchHospitals.html'), 'utf-8', (err, data) => {
            let response;
            let totalPageNumber = (itemCount / 6);
            console.log("How many items based on search: "+itemCount);
            //console.log("How many pages in total: "+(itemCount / 6));

            if (totalPageNumber !== Math.floor(totalPageNumber)){ //If it is a decimal, round it and add 1
                totalPageNumber = Math.floor(totalPageNumber) + 1;
            }

            //If there are items, do the following. Otherwise, throw a no result.
            if (itemCount >= 1){
                if(encodeURIComponent(req.params.value2) !== encodeURIComponent(URLplaceholder)){
                    response = data.replace('$$State$$', "Search Results for: '"+req.params.value2+"'");
                }else{
                    response = data.replace('$$State$$', "Search Results for Hospitals");
                }
                let table_body = `<div class="covidTable grid-x grid-margin-x small-up-1 medium-up-2 large-up-3">`;

                let pageCalculate = siteNum * 6; //6 means show 6 items
                //console.log("pageCOunt "+pageCalculate);



                //Prev and Next button calculations
                //String URL to array
                var stringURL = req.url;
                stringURL = stringURL.split("/");
                stringURL[stringURL.length - 1] = parseInt(stringURL[stringURL.length - 1]);

                //New URL for Next and Prev Pages
                let newURLPrev = "";
                let newURLNext = "";
                let currentPage = parseInt(stringURL[stringURL.length - 1]);
                for (let i = 0; i < stringURL.length; i++){
                    if (stringURL[i] === " "){ //beginning
                        newURLPrev += "/";
                        newURLNext += "/";
                    }else if (i === stringURL.length - 1){ //end
                        let nextPage = stringURL[i] + 1;
                        let prevPage = stringURL[i] - 1;
                        newURLPrev += prevPage;
                        newURLNext += nextPage;
                    }else{
                        newURLPrev += stringURL[i]+"/";
                        newURLNext += stringURL[i]+"/";
                    }
                }
                //console.log("New Prev URL: "+newURLPrev);
                //console.log("New Next URL: "+newURLNext);


                let counter = 1; //Overall Counter
                let blockCounter = 0; //If-Condition Counter
                //console.log("Max: "+pageCalculate);
                //console.log("min: "+(pageCalculate - 6));


                otherData.forEach((HospData) => {


                    //If the counter is between the Max and the min, give us content to show on web
                    if (counter <= pageCalculate && counter > (parseInt(pageCalculate) - 6)){

                        let table_row = '<div class="boxResults cell">';
                        table_row += "<h4 class='bRTitle'>" + HospData.MMSA + '</h4>';

                        let covidPercent = parseFloat(HospData.total_percent_at_risk.replace("%", ""));
                        if (covidPercent <= 60){ //Low Risk
                            table_row += "<h5>Covid Status: <img id='covidStatus' src='/images/green.png' draggable='false' loading='lazy' /></h5>";
                        }else if (covidPercent > 60 && covidPercent <= 75){ //Medium Risk
                            table_row += "<h5>Covid Status: <img id='covidStatus' src='/images/orange.png' draggable='false' loading='lazy' /></h5>";
                        }else{ //High Risk
                            table_row += "<h5>Covid Status: <img id='covidStatus' src='/images/COVID-19.png' draggable='false' loading='lazy' /></h5>";
                        }

                        table_row += '<p>Number of Hospitals: ' + HospData.hospitals + '</p>';
                        table_row += "<p><a href='../../../info/Hospitals/"+encodeURIComponent(HospData.MMSA)+"'><button class='learnMoreButton'>Learn More</button></a></p>";
                        table_row += '</div>\n';

                        table_body += table_row;
                        blockCounter += 1;
                    }
                    counter += 1;
                });



                console.log("Highest counter: "+blockCounter);
                response = response.replace('$$TABLE_BODY$$', table_body+"</div>");

                //check to see if it is the last or first item
                let prevButton;
                let nextButton;
                console.log("pageCalc"+pageCalculate+" === itemCount"+itemCount);
                if (currentPage <= 1 && (itemCount <= pageCalculate)){ //On the first page w/ less than 6 items
                    console.log("First page");
                    nextButton = `<button class="nextButton" disabled>Next</button>`;
                    prevButton = `<button class="prevButton" disabled>Prev</button>`;
                }else if (currentPage <= 1){ //On the first page
                    console.log("First page with lots of items coming up");
                    nextButton = `<a href="${newURLNext}"><button class="nextButton">Next</button></a>`;
                    prevButton = `<button class="prevButton" disabled>Prev</button>`;
                }else if(currentPage === totalPageNumber){ // On the Last page. Show remaining items
                    console.log("last page");
                    nextButton = `<button class="nextButton" disabled>Next</button>`;
                    prevButton = `<a href="${newURLPrev}"><button class="prevButton">Prev</button></a>`;
                }else{
                    console.log("default");
                    nextButton = `<a href="${newURLNext}"><button class="nextButton">Next</button></a>`;
                    prevButton = `<a href="${newURLPrev}"><button class="prevButton">Prev</button></a>`;
                }

                response = response.replace('$$PREV_NEXTBUTTON$$', `
                    ${prevButton}
                    ${nextButton}
                    <h4>Page ${currentPage} of ${totalPageNumber}</h4>
                `);
                if(blockCounter === 0){ //Only happens if the user enter a random number. Throw error.
                    res.status(404).type('html').sendFile(`${root}/error.html`);
                    res.redirect(`/error.html`);
                }else{
                    res.status(200).type('html').send(response);
                }

            
            }else{ //error
                if(encodeURIComponent(req.params.value2) !== encodeURIComponent(URLplaceholder)){
                    response = data.replace('$$State$$', "No results on: '"+req.params.value2+"'");
                }else{
                    response = data.replace('$$State$$', "Something went wrong...");
                }
                response = response.replace('$$PREV_NEXTBUTTON$$', `<h4>Please try again.</h4>`);
                response = response.replace('$$TABLE_BODY$$', `<img class="noResultImage" src="/images/hollow-knight.gif" draggable="false" />`);
                res.status(404).type('html').send(response);
            }

        });
    };


    let query1;
    if (searching === "LowHosp"){
        query1 = 'SELECT * FROM covidTable WHERE hospitals < 10';
    }else if (searching === "MedHosp"){
        query1 = 'SELECT * FROM covidTable WHERE hospitals >= 10 AND hospitals <= 20';
    }else if (searching === "HighHosp"){
        query1 = "SELECT * FROM covidTable WHERE hospitals > 20 AND hospitals is not 'hospitals' AND hospitals is not 'NA'";
    }else{
        res.status(404).type('html').sendFile(`${root}/error.html`);
        res.redirect(`/error.html`);
    }

    //console.log(req.params.value2);
    if (req.params.value2 !== URLplaceholder){
        query1 = query1.concat(" ", "AND LOWER(MMSA) LIKE "+"'%"+encodeURIComponent(req.params.value2)+"%'");
    }

    db.all(query1.concat(" ", "ORDER BY hospitals;"), (err, rows) => {
        console.log(rows);
        if (err || !rows) {
            res.status(404).type('html').sendFile(`${root}/error.html`);
            res.redirect(`/error.html`);
        }else {
            itemCount = rows.length;
            otherData = rows;
            if (otherData !== null) {
                finishAndSend();
            }else{
                res.status(404).type('html').sendFile(`${root}/error.html`);
                res.redirect(`/error.html`);
            }
        }
    });
});















//COMPLETED
//Search by Total number of Risk
app.get("/search/searchRisk/:value/:value2/:value3", (req, res) => {

    let searching = req.params.value;
    let siteNum = req.params.value3; //page number
    let otherData = null;
    //console.log(searching);

    let itemCount = 0; //results on how many items are there based of the query.
    //console.log(searching);

    let finishAndSend = function() {
        fs.readFile(path.join(template, 'searchRisk.html'), 'utf-8', (err, data) => {
            let response;
            let totalPageNumber = (itemCount / 6);
            console.log("How many items based on search: "+itemCount);
            //console.log("How many pages in total: "+(itemCount / 6));

            if (totalPageNumber !== Math.floor(totalPageNumber)){ //If it is a decimal, round it and add 1
                totalPageNumber = Math.floor(totalPageNumber) + 1;
            }

            //If there are items, do the following. Otherwise, throw a no result.
            if (itemCount >= 1){
                if(encodeURIComponent(req.params.value2) !== encodeURIComponent(URLplaceholder)){
                    response = data.replace('$$State$$', "Search Results for: '"+req.params.value2+"'");
                }else{
                    response = data.replace('$$State$$', "Search Results for Risks");
                }
                let table_body = `<div class="covidTable grid-x grid-margin-x small-up-1 medium-up-2 large-up-3">`;

                let pageCalculate = siteNum * 6; //6 means show 6 items
                //console.log("pageCOunt "+pageCalculate);



                //Prev and Next button calculations
                //String URL to array
                var stringURL = req.url;
                stringURL = stringURL.split("/");
                stringURL[stringURL.length - 1] = parseInt(stringURL[stringURL.length - 1]);

                //New URL for Next and Prev Pages
                let newURLPrev = "";
                let newURLNext = "";
                let currentPage = parseInt(stringURL[stringURL.length - 1]);
                for (let i = 0; i < stringURL.length; i++){
                    if (stringURL[i] === " "){ //beginning
                        newURLPrev += "/";
                        newURLNext += "/";
                    }else if (i === stringURL.length - 1){ //end
                        let nextPage = stringURL[i] + 1;
                        let prevPage = stringURL[i] - 1;
                        newURLPrev += prevPage;
                        newURLNext += nextPage;
                    }else{
                        newURLPrev += stringURL[i]+"/";
                        newURLNext += stringURL[i]+"/";
                    }
                }
                //console.log("New Prev URL: "+newURLPrev);
                //console.log("New Next URL: "+newURLNext);


                let counter = 1; //Overall Counter
                let blockCounter = 0; //If-Condition Counter
                //console.log("Max: "+pageCalculate);
                //console.log("min: "+(pageCalculate - 6));





                otherData.forEach((RiskData) => {

                    //If the counter is between the Max and the min, give us content to show on web
                    if (counter <= pageCalculate && counter > (parseInt(pageCalculate) - 6)){

                        let table_row = '<div class="boxResults cell">';
                        table_row += "<h4 class='bRTitle'>" + RiskData.MMSA + '</h4>';

                        let covidPercent = parseFloat(RiskData.total_percent_at_risk.replace("%", ""));
                        if (covidPercent <= 60){ //Low Risk
                            table_row += "<h5>Covid Status: <img id='covidStatus' src='/images/green.png' draggable='false' loading='lazy' /></h5>";
                        }else if (covidPercent > 60 && covidPercent <= 75){ //Medium Risk
                            table_row += "<h5>Covid Status: <img id='covidStatus' src='/images/orange.png' draggable='false' loading='lazy' /></h5>";
                        }else{ //High Risk
                            table_row += "<h5>Covid Status: <img id='covidStatus' src='/images/COVID-19.png' draggable='false' loading='lazy' /></h5>";
                        }

                        table_row += '<p>Total at Risk: ' + Math.floor(RiskData.total_at_risk) + '</p>';
                        table_row += "<p><a href='../../../info/Risk/"+encodeURIComponent(RiskData.MMSA)+"'><button class='learnMoreButton'>Learn More</button></a></p>";
                        table_row += '</div>\n';

                        table_body += table_row;
                        blockCounter += 1;
                    }
                    counter += 1;
                });
                

                console.log("Highest counter: "+blockCounter);
                response = response.replace('$$TABLE_BODY$$', table_body+"</div>");

                //check to see if it is the last or first item
                let prevButton;
                let nextButton;
                console.log("pageCalc"+pageCalculate+" === itemCount"+itemCount);
                if (currentPage <= 1 && (itemCount <= pageCalculate)){ //On the first page w/ less than 6 items
                    console.log("First page");
                    nextButton = `<button class="nextButton" disabled>Next</button>`;
                    prevButton = `<button class="prevButton" disabled>Prev</button>`;
                }else if (currentPage <= 1){ //On the first page
                    console.log("First page with lots of items coming up");
                    nextButton = `<a href="${newURLNext}"><button class="nextButton">Next</button></a>`;
                    prevButton = `<button class="prevButton" disabled>Prev</button>`;
                }else if(currentPage === totalPageNumber){ // On the Last page. Show remaining items
                    console.log("last page");
                    nextButton = `<button class="nextButton" disabled>Next</button>`;
                    prevButton = `<a href="${newURLPrev}"><button class="prevButton">Prev</button></a>`;
                }else{
                    console.log("default");
                    nextButton = `<a href="${newURLNext}"><button class="nextButton">Next</button></a>`;
                    prevButton = `<a href="${newURLPrev}"><button class="prevButton">Prev</button></a>`;
                }

                response = response.replace('$$PREV_NEXTBUTTON$$', `
                    ${prevButton}
                    ${nextButton}
                    <h4>Page ${currentPage} of ${totalPageNumber}</h4>
                `);
                if(blockCounter === 0){ //Only happens if the user enter a random number. Throw error.
                    res.status(404).type('html').sendFile(`${root}/error.html`);
                    res.redirect(`/error.html`);
                }else{
                    res.status(200).type('html').send(response);
                }


            }else{ //error
                if(encodeURIComponent(req.params.value2) !== encodeURIComponent(URLplaceholder)){
                    response = data.replace('$$State$$', "No results on: '"+req.params.value2+"'");
                }else{
                    response = data.replace('$$State$$', "Something went wrong...");
                }
                response = response.replace('$$PREV_NEXTBUTTON$$', `<h4>Please try again.</h4>`);
                response = response.replace('$$TABLE_BODY$$', `<img class="noResultImage" src="/images/hollow-knight.gif" draggable="false" />`);
                res.status(404).type('html').send(response);
            }

        });
    };


    let query1;
    if (searching === "LowRisk"){
        query1 = 'SELECT * FROM covidTable WHERE total_at_risk < 100000';
    }else if (searching === "MedRisk"){
        query1 = 'SELECT * FROM covidTable WHERE total_at_risk >= 100000 AND total_at_risk <= 500000';
    }else if (searching === "HighRisk"){
        query1 = "SELECT * FROM covidTable WHERE total_at_risk > 500000 AND total_at_risk is not 'total_at_risk'";
    }else{
        res.status(404).type('html').sendFile(`${root}/error.html`);
        res.redirect(`/error.html`);
    }


    if (req.params.value2 !== URLplaceholder){
        query1 = query1.concat(" ", "AND LOWER(MMSA) LIKE "+"'%"+encodeURIComponent(req.params.value2)+"%'");
    }

    db.all(query1.concat(" ", "ORDER BY total_at_risk;"), (err, rows) => {
        console.log(rows);
        if (err || !rows) {
            res.status(404).type('html').sendFile(`${root}/error.html`);
            res.redirect(`/error.html`);
        }else {
            itemCount = rows.length;
            otherData = rows;
            if (otherData !== null) {
                finishAndSend();
            }else{
                res.status(404).type('html').sendFile(`${root}/error.html`);
                res.redirect(`/error.html`);
            }
        }
    });
});






//COMPLETED
// Info page for each location
app.get('/search/info/:value/:value2', (req, res) => {
    //value is the route
    //value2 is the name of interest
    let searchRoute = req.params.value;
    let searchName = req.params.value2;

    let specificData = null; //Location data
    let otherData = null; //All data

    //console.log(searchRoute);
    //console.log(searchName);

    //The user view this data and it is stored UNLESS they viewed it more than twice
    if (viewHistory.length === 0){
        viewHistory.push(searchName);
        recentSearches.push(`<div class="boxResults cell">
        <h4 class='bRTitle'>${searchName}</h4>
        <p><a href='/search/info/${searchRoute}/${encodeURIComponent(searchName)}'><button class='learnMoreButton'>View Again</button></a></p>
        </div>`);
    }
    viewHistory.forEach((item) => {
        if (item !== searchName){
            viewHistory.push(searchName);
            recentSearches.push(`<div class="boxResults cell">
            <h4 class='bRTitle'>${searchName}</h4>
            <p><a href='/search/info/${searchRoute}/${encodeURIComponent(searchName)}'><button class='learnMoreButton'>View Again</button></a></p>
            </div>`);
        }
    });





    let finishAndSend = function() {
        fs.readFile(path.join(template, 'info.html'), 'utf-8', (err, data) => {

            if (otherData.length >= 1){
                let response = data.replace('$$LOCATION_NAME$$', searchName.toString());
                response = response.replace('$$LOCATION_TOTAL$$', Math.floor(specificData.total_at_risk));


                if (searchRoute === "Location" || searchRoute === "Hospitals" || searchRoute === "Risk"){
                    //Get the average Total Risk and compare to the Location of interest
                    let dataLabel = []; //data w/ average data
                    let riskAvg = 0;

                    dataLabel.push(parseFloat(specificData.total_percent_at_risk.replace("%", "")));

                    otherData.forEach((datapresent) => {
                        if(datapresent.total_percent_at_risk !== "total_percent_at_risk"){
                            riskAvg += parseFloat(datapresent.total_percent_at_risk.replace("%", "")) / 100;
                        }
                    });

                    riskAvg = (riskAvg / 136) * 100;
                    dataLabel.push(riskAvg);
                    //--------------------------------------------


                    // Hospitals and ICU Beds
                    let dataLabel2 = [];

                    otherData.forEach((datapresent) => {
                        if(datapresent.hospitals !== "hospitals" || datapresent.MMSA !== specificData.MMSA ){
                            dataLabel2.push(JSON.stringify({x: datapresent.hospitals, y: datapresent.icu_beds, r: 5}));
                        }
                    });
                    //--------------------------------------------




                    // Hospitals and ICU Beds for High Risk
                    let dataLabel3 = [];

                    otherData.forEach((datapresent) => {
                        if(datapresent.high_risk_per_ICU_bed !== "high_risk_per_ICU_bed" || datapresent.MMSA !== specificData.MMSA ){
                            dataLabel3.push(JSON.stringify({x: datapresent.high_risk_per_hospital, y: datapresent.high_risk_per_ICU_bed, r: 5}));
                        }
                    });
                    //--------------------------------------------



                    searchName = JSON.stringify(searchName);
                    response = response.replace('$$DisplayData$$', `<script>
                    const ctx = document.getElementById('TotalRisk');
                    const ctx2 = document.getElementById('HospBed');
                    const ctx3 = document.getElementById('HighRiskHospBed');

                    const plugin = {
                        id: 'customCanvasBackgroundColor',
                        beforeDraw: (chart, args, options) => {
                          const {ctx} = chart;
                          ctx.save();
                          ctx.globalCompositeOperation = 'destination-over';
                          ctx.fillStyle = options.color || '#99ffff';
                          ctx.fillRect(0, 0, chart.width, chart.height);
                          ctx.restore();
                        }
                    };



                    //Risk
                    new Chart(ctx, {
                        type: 'doughnut',
                        data: {
                        labels: [${searchName}, 'Average Percentage at Risk'],
                        datasets: [{
                             data: [${dataLabel}],
                             borderWidth: 1
                        }]
                        },

                        options: {
                            responsive: true
                        }
                    });



                    //Hospitals VS ICU Beds
                    new Chart(ctx2, {
                        type: 'bubble',
                        data: {
                            datasets: [{
                                label: ${searchName},
                                data: [${JSON.stringify({x: specificData.hospitals, y: specificData.icu_beds, r: 10})}],
                                backgroundColor: 'blueviolet'
                            },
                            {
                                label: 'Other Locations',
                                data: [${dataLabel2}],
                                backgroundColor: 'rgb(255, 99, 132)'
                            }],
                        },
                        options: {
                            responsive: true,
                            plugins: {
                              customCanvasBackgroundColor: {
                                color: 'rgb(200, 211, 222)',
                              }
                            },

                            scales: {
                                x: {
                                  display: true,
                                  title: {
                                    display: true,
                                    text: 'Number of Hospitals',
                                    color: 'black'
                                  }
                                },
                                y: {
                                  display: true,
                                  title: {
                                    display: true,
                                    text: 'Number of ICU Beds',
                                    color: 'black'
                                  }
                                }
                              }
                          },
                          
                          plugins: [plugin],
                    });



                    //Hospitals VS ICU Beds (High Risk)
                    new Chart(ctx3, {
                        type: 'bubble',
                        data: {
                            datasets: [{
                                label: ${searchName},
                                data: [${JSON.stringify({x: specificData.high_risk_per_hospital, y: specificData.high_risk_per_ICU_bed, r: 10})}],
                                backgroundColor: 'blueviolet'
                            },
                            {
                                label: 'Other Locations',
                                data: [${dataLabel3}],
                                backgroundColor: 'rgb(255, 99, 132)'
                            }],
                        },
                        options: {
                            responsive: true,
                            plugins: {
                              customCanvasBackgroundColor: {
                                color: 'rgb(200, 211, 222)',
                              }
                            },

                            scales: {
                                x: {
                                  display: true,
                                  title: {
                                    display: true,
                                    text: 'High Risk Individuals per Hospital',
                                    color: 'black'
                                  }
                                },
                                y: {
                                  display: true,
                                  title: {
                                    display: true,
                                    text: 'High Risk Individuals per ICU Beds',
                                    color: 'black'
                                  }
                                }
                              }
                          },
                          
                          plugins: [plugin],
                    });
                    </script>`);


                    res.status(200).type('html').send(response);
                }else{
                    res.status(404).type('html').sendFile(`${root}/error.html`);
                    res.redirect(`/error.html`);
                }
            }else{ //error
                res.status(404).type('html').sendFile(`${root}/error.html`);
                res.redirect(`/error.html`);
            }

        });
    };



    //Get all the data
    db.all("SELECT * FROM covidTable WHERE MMSA != ? AND MMSA != 'MMSA'", searchName, (err, rows) => {
        if (err || !rows) {
            //console.log(err);
            res.status(404).type('html').sendFile(`${root}/error.html`);
            res.redirect(`/error.html`);
        }else {
            otherData = rows;
        }
    });

    //Get a specific data from a specific location
    db.get("SELECT * FROM covidTable WHERE MMSA = ?", searchName, (err, row) => {
        if (err || !row) {
            //console.log(err);
            res.status(404).type('html').sendFile(`${root}/error.html`);
            res.redirect(`/error.html`);
        }else {
            specificData = row;

            if (specificData !== null) {
                finishAndSend();
            }else{
                res.status(404).type('html').sendFile(`${root}/error.html`);
                res.redirect(`/error.html`);
            }
        }
    });
});










//COMPLETED
// If the URL is not valid, get a 404 error page
app.all('*', (req, res) => {
    res.status(404).type('html').sendFile(`${root}/error.html`);
    res.redirect(`/error.html`);
});

app.listen(port, () => {
    console.log('Now listening on port ' + port);
});
