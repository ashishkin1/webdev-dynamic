import * as fs from 'node:fs';
import * as path from 'node:path';
import * as url from 'node:url';

import { default as express } from 'express';
import { default as sqlite3 } from 'sqlite3';

import Chart from 'chart.js/auto';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));

const port = 8000;
const root = path.join(__dirname, 'public');
const template = path.join(__dirname, 'templates');

//const puppeteer = require('puppeteer');

let app = express();
app.use(express.static(root));

app.use(express.json());
app.use(express.urlencoded());

let dynRoute;
let searchContent;
let userSearchInput = null;




//database
const db = new sqlite3.Database(path.join(__dirname, 'Covid.sqlite3'), sqlite3.OPEN_READONLY, (err) =>{
    if (err){
        console.log("You must be this tall to enter the database (6ft)");
    }else{
        console.log("Welcome to our database. Don't break it or else......");
    }
});


// Home page
app.get('/', (req, res) => {
    res.sendFile(`${root}/index.html`);
});

// If the URL is not valid, get a 404 error page



//Dynamic Search and a list of viewed data by the user
app.get('/search', (req, res) => {
    console.log('Working on Dyanmic Search...');
    let otherData = null;
    let finishAndSend = function() {
        fs.readFile(path.join(root, 'search.html'), 'utf-8', (err, data) => {
            let response;
            let table_body = '';
            otherData.forEach((Data) => {
                let table_row;
                table_row += "<option value='"+Data.MMSA+"'>"+Data.MMSA+"</option>";
                table_body += table_row;
            });
            response = data.replace('$$TABLE_SEARCHRESULT$$', table_body);
            res.status(200).type('html').send(response);
        });
    };


    let query1 = 'SELECT MMSA FROM covidTable;';
    db.all(query1, (err, rows) => {
        console.log(rows);
        if (err || !rows) {
            res.status(404).send('Error 404: Page Not found');
        }else {
            otherData = rows;
            if (otherData !== null) {
                finishAndSend();
            }
        }
    });
});




app.post('/search', (req, res) => {

    dynRoute = req.body['ChooseOption']; //Get the Dynamic Route



    //Redirect to the appropriate page
    //Get the User Input based on the User
    userSearchInput = req.body['Searchbar'];

    if (dynRoute === 'searchState'){
        res.redirect(`/search/searchState/${userSearchInput}`);

    }else if (dynRoute === 'searchHospitals' && req.body['HospitalNum'] !== ''){
        searchContent = req.body['HospitalNum'];
        res.redirect(`/search/searchHospitals/${searchContent}/${userSearchInput}`);

    }else if (dynRoute === 'searchRisk' && req.body['RiskNum'] !== ''){
        searchContent = req.body['RiskNum'];
        res.redirect(`/search/searchRisk/${searchContent}/${userSearchInput}`);

    }else{
        //404 error
        console.log('redirect error');
        res.status(404).send('Error 404: Page Not found');
    }

});


//Search by State
app.get('/search/searchState/:value', (req, res) => {

    let searching = req.params.value;
    let otherData = null;
    console.log(searching);
    let finishAndSend = function() {
        fs.readFile(path.join(template, 'searchState.html'), 'utf-8', (err, data) => {
            console.log(otherData);
            let response = data.replace('$$State$$', "Search Results");


            if (otherData.length >= 1){
                let table_body = '';
                otherData.forEach((StateData) => {
                    let table_row = '<div class="boxResults cell">';
                    table_row += "<h4 class='bRTitle'>" + StateData.MMSA + '</h4>';

                    let covidPercent = parseFloat(StateData.total_percent_at_risk.replace("%", ""));
                    if (covidPercent <= 60){ //Low Risk
                        table_row += "<h5>Covid Status: <img id='covidStatus' src='/images/green.png' draggable='false' loading='lazy' /></h5>";
                    }else if (covidPercent > 60 && covidPercent <= 75){ //Medium Risk
                        table_row += "<h5>Covid Status: <img id='covidStatus' src='/images/orange.png' draggable='false' loading='lazy' /></h5>";
                    }else{ //High Risk
                        table_row += "<h5>Covid Status: <img id='covidStatus' src='/images/COVID-19.png' draggable='false' loading='lazy' /></h5>";
                    }

                    table_row += "<p><a href='../info/Location/"+StateData.MMSA+"'><button class='learnMoreButton'>Learn More</button></a></p>";
                    table_row += '</div>\n';

                    table_body += table_row;
                });

                response = response.replace('$$TABLE_BODY$$', table_body);
                res.status(200).type('html').send(response);
            }else{ //error
                response = response.replace('$$TABLE_CONTENT$$', "<h4>No results on: "+searching+"</h4>");
                res.status(404).type('html').send(response);
            }

        });
    };


    let query1 = "SELECT * FROM covidTable WHERE LOWER(MMSA) LIKE "+"'%"+searching+"%'";
    db.all(query1, (err, rows) => {
        console.log("Show the error:"+rows);
        if (err || !rows) {
            res.status(404).send('Error 404: Page Not found');
        }else {
            otherData = rows;
            if (otherData !== null) {
                finishAndSend();
            }
        }
    });

});














//Search by Hospital numbers
app.get('/search/searchHospitals/:value/:value2?', (req, res) => {

    let searching = req.params.value;
    let otherData = null;
    console.log(searching);

    let finishAndSend = function() {
        fs.readFile(path.join(template, 'searchHospitals.html'), 'utf-8', (err, data) => {
            let response = data.replace('$$State$$', "Search Results");

            if (otherData.length >= 1){

                let table_body = '';
                otherData.forEach((HospData) => {
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
                    table_row += "<p><a href='../../info/Hospitals/"+HospData.MMSA+"'><button class='learnMoreButton'>Learn More</button></a></p>";
                    table_row += '</div>\n';

                    table_body += table_row;
                });

                response = response.replace('$$TABLE_BODY$$', table_body);
                res.status(200).type('html').send(response);
            }else{ //error
                response = response.replace('$$TABLE_CONTENT$$', "<h4>No results on: "+req.params.value2+"</h4>");
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
    }

    if (req.params.value2){
        query1 = query1.concat(" ", "AND LOWER(MMSA) LIKE "+"'%"+req.params.value2+"%'");
    }


    db.all(query1.concat(" ", "ORDER BY hospitals;"), (err, rows) => {
        console.log(rows);
        if (err || !rows) {
            console.log(err);
            console.log(query1);
            res.status(404).send('Error 404: Page Not found');
        }else {
            otherData = rows;
            if (otherData !== null) {
                finishAndSend();
            }
        }
    });

});
















//Search by Total number of Risk
app.get('/search/searchRisk/:value/:value2?', (req, res) => {
    let searching = req.params.value;
    let otherData = null;
    console.log(searching);

    let finishAndSend = function() {
        fs.readFile(path.join(template, 'searchRisk.html'), 'utf-8', (err, data) => {
            let response = data.replace('$$State$$', "Search Results");

            if (otherData.length >= 1){

                let table_body = '';
                otherData.forEach((RiskData) => {
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

                    table_row += '<p>Total at Risk: ' + RiskData.total_percent_at_risk + '</p>';
                    table_row += "<p><a href='../../info/Risk/"+RiskData.MMSA+"'><button class='learnMoreButton'>Learn More</button></a></p>";
                    table_row += '</div>\n';

                    table_body += table_row;
                });
                response = response.replace('$$TABLE_BODY$$', table_body);
                res.status(200).type('html').send(response);
            }else{ //error
                response = response.replace('$$TABLE_CONTENT$$', "<h4>No results on: "+req.params.value2+"</h4>");
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
    }

    if (req.params.value2){
        query1 = query1.concat(" ", "AND LOWER(MMSA) LIKE "+"'%"+req.params.value2+"%'");
    }

    db.all(query1.concat(" ", "ORDER BY total_at_risk;"), (err, rows) => {
        console.log(rows);
        if (err || !rows) {
            console.log(err);
            res.status(404).send('Error 404: Page Not found');
        }else {
            otherData = rows;
            if (otherData !== null) {
                finishAndSend();
            }
        }
    });
});







// Info page for each location
app.get('/search/info/:value/:value2', (req, res) => {
    //value is the route
    //value2 is the name of interest

    let searchRoute = req.params.value;
    let searchName = req.params.value2;

    let specificData = null;
    let otherData = null;

    console.log(searchRoute);
    console.log(searchName);

    let finishAndSend = function() {
        fs.readFile(path.join(template, 'info.html'), 'utf-8', (err, data) => {

            if (otherData.length >= 1){

                //NOTE: Index order matters
                let nameLabel = []; //Random Location Names
                let dataLabel = []; //Location's data


                let response = data.replace('$$LOCATION_NAME$$', searchName);

                nameLabel.push("["+specificData.MMSA+"]"); //name of the data we are viewing


                if (searchRoute === "Location"){
                    dataLabel.push(specificData.total_percent_at_risk); //data correspond to the location name

                    for (let i=0; i < 3; i++){
                        let tempValue = otherData[Math.floor(Math.random() * otherData.length) + 1];
                        nameLabel.push("["+tempValue.MMSA+"]");
                        dataLabel.push(tempValue.total_percent_at_risk);
                    }

                    response = response.replace('$$NameLabel$$', nameLabel);
                    response = response.replace('$$DataLabel$$', dataLabel);
                    res.status(200).type('html').send(response);
                }else if (searchRoute === "Hospitals"){
                    res.status(200).type('html').send(response);
                }else if (searchRoute === "Risk"){
                    res.status(200).type('html').send(response);
                }else{
                    response = response.replace('$$TABLE_CONTENT$$', "<h4>The page you are looking for does not exist.</h4>");
                    res.status(404).type('html').send(response);
                }
            }else{ //error
                response = response.replace('$$TABLE_CONTENT$$', "<h4>The Data for: "+searchName+" is not avaliable.</h4>");
                res.status(404).type('html').send(response);
            }

        });
    };



    //Get all the data
    db.all('SELECT * FROM covidTable WHERE MMSA != ?', searchName, (err, rows) => {
        if (err || !rows) {
            console.log(err);
            res.status(404).send('Error 404: Page Not found');
        }else {
            otherData = rows;
            //console.log(otherData[5].MMSA);
        }
    });

    //Get a specific data from a specific location
    db.get("SELECT * FROM covidTable WHERE MMSA = ?", searchName, (err, row) => {
        if (err || !row) {
            console.log(err);
            res.status(404).send('Error 404: Page Not found');
        }else {
            specificData = row;

            if (specificData !== null) {
                finishAndSend();
            }else{
                res.status(404).send('Error 404: Page Not found');
            }
        }
    });




});




app.listen(port, () => {
    console.log('Now listening on port ' + port);
});
