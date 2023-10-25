import * as fs from 'node:fs';
import * as path from 'node:path';
import * as url from 'node:url';

import { default as express } from 'express';
import { default as sqlite3 } from 'sqlite3';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));

const port = 8000;
const root = path.join(__dirname, 'public');
const template = path.join(__dirname, 'templates');

let app = express();
app.use(express.static(root));

app.use(express.json());
app.use(express.urlencoded());

let dynRoute;
let searchContent;


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
            response = data.replace('$$TABLE_BODY$$', table_body);
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


    //Get the User Input based on the User
    if (req.body['Searchbar'] !== '' && req.body['HospitalNum'] === '' && req.body['RiskNum'] === ''){
        searchContent = req.body['Searchbar'];
    }else if (req.body['Searchbar'] == '' && req.body['HospitalNum'] !== '' && req.body['RiskNum'] === ''){
        searchContent = req.body['HospitalNum'];
    }else if (req.body['Searchbar'] === '' && req.body['HospitalNum'] === '' && req.body['RiskNum'] !== ''){
        searchContent = req.body['RiskNum'];
    }else{
        //input error
        console.log('input error');
        res.status(404).send('Error 404: Page Not found');
    }



    //Redirect to the appropriate page
    if (dynRoute === 'searchState'){
        res.redirect(`/searchState/${searchContent}`);
    }else if (dynRoute === 'searchHospitals'){
        res.redirect(`/searchHospitals/${searchContent}`);
    }else if (dynRoute === 'searchRisk'){
        res.redirect(`/searchRisk/${searchContent}`);
    }else{
        //404 error
        console.log('redirect error');
        res.status(404).send('Error 404: Page Not found');
    }

});


//Search by State
app.get('/searchState/:value', (req, res) => {

    let searching = req.params.value;
    let otherData = null;
    console.log(searching);
    let finishAndSend = function() {
        fs.readFile(path.join(template, 'searchState.html'), 'utf-8', (err, data) => {
            console.log(otherData);
            let response = data.replace('$$State$$', "Search Results");


            if (otherData.length >= 1){
                response = response.replace('$$TABLE_CONTENT$$', 
                `<table id="covidTable">
                    <tr>
                        <th>Location</th>
                        <th>Learn More</th>
                    </tr>
                    $$TABLE_BODY$$
                </table>`);

                let table_body = '';
                otherData.forEach((StateData) => {
                    let table_row = '<tr>';
                    table_row += '<td>' + StateData.MMSA + '</td>';
                    table_row += "<td><a href='search.html'><button class='learnMoreButton'>Learn More</button></a></td>";
                    table_row += '</tr>\n';
                    table_body += table_row;
                });
                response = response.replace('$TABLE_BODY$', table_body);
                res.status(200).type('html').send(response);
            }else{ //error
                response = response.replace('$$TABLE_CONTENT$$', "<h4>No results on: "+searching+"</h4>");
                res.status(404).type('html').send(response);
            }

        });
    };

    
    db.all("SELECT * FROM covidTable WHERE LOWER(MMSA) LIKE "+"'%"+searching+"%'", (err, rows) => {
        console.log('this is the params: '+ "'%"+searching+"%'");
        console.log("Show the error:"+err);
        if (err || !rows) {
            res.status(404).send('Error 404: Page Not found');
        }else {
            otherData = rows;
            console.log('this is the first checkpoint' + otherData);
            if (otherData !== null) {
                finishAndSend();
            }
            }
        });
    });



//Search by Hospital numbers
app.get('/searchHospitals/:value', (req, res) => {

    let searching = req.params.value;
    let otherData = null;
    console.log(searching);

    let finishAndSend = function() {
        fs.readFile(path.join(template, 'searchHospitals.html'), 'utf-8', (err, data) => {
            let response = data.replace('$$State$$', "Hospitals");
            let table_body = '';
            otherData.forEach((HospData) => {
                let table_row = '<tr>';
                table_row += "<td><a href='search.html'><button class='learnMoreButton'>"+HospData.MMSA+"</button></a></td>";
                table_row += '<td>' + HospData.hospitals + '</td>';
                table_row += '<td>' + HospData.high_risk_per_hospital + '</td>';
                table_row += '<td>' + HospData.icu_beds + '</td>';
                table_row += '</tr>\n';
                table_body += table_row;
            });
            response = response.replace('$$TABLE_BODY$$', table_body);
            res.status(200).type('html').send(response);
        });
    };


    let query1;
    if (searching === "LowHosp"){
        query1 = 'SELECT * FROM covidTable WHERE hospitals < 10 ORDER BY hospitals;';
    }else if (searching === "MedHosp"){
        query1 = 'SELECT * FROM covidTable WHERE hospitals >= 10 AND hospitals <= 20 ORDER BY hospitals;';
    }else if (searching === "HighHosp"){
        query1 = "SELECT * FROM covidTable WHERE hospitals > 20 AND hospitals IS NOT 'hospitals' AND hospitals IS NOT 'NA' ORDER BY hospitals;";
    }
    db.all(query1, (err, rows) => {
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
















//Search by Total number of Risk
app.get('/searchRisk/:value', (req, res) => {
    let searching = req.params.value;
    let otherData = null;
    console.log(searching);

    let finishAndSend = function() {
        fs.readFile(path.join(template, 'searchRisk.html'), 'utf-8', (err, data) => {
            let response = data.replace('$$State$$', "Total Risks of Covid");
            let table_body = '';
            otherData.forEach((HospData) => {
                let table_row = '<tr>';
                table_row += "<td><a href='search.html'><button class='learnMoreButton'>"+HospData.MMSA+"</button></a></td>";
                table_row += '<td>' + HospData.total_at_risk + '</td>';
                table_row += '<td>' + HospData.total_percent_at_risk + '</td>';
                table_row += '</tr>\n';
                table_body += table_row;
            });
            response = response.replace('$$TABLE_BODY$$', table_body);
            res.status(200).type('html').send(response);
        });
    };


    let query1;
    if (searching === "LowRisk"){
        query1 = 'SELECT * FROM covidTable WHERE total_at_risk < 100000 ORDER BY total_at_risk;';
    }else if (searching === "MedRisk"){
        query1 = 'SELECT * FROM covidTable WHERE total_at_risk >= 100000 AND total_at_risk <= 500000 ORDER BY total_at_risk;';
    }else if (searching === "HighRisk"){
        query1 = "SELECT * FROM covidTable WHERE total_at_risk > 500000 AND total_at_risk is not 'total_at_risk' ORDER BY total_at_risk;";
    }
    db.all(query1, (err, rows) => {
        console.log(rows);
        if (err || !rows) {
            console.log(err);
            res.redirect(`https://www.youtube.com/watch?v=dQw4w9WgXcQ`);
        }else {
            otherData = rows;
            if (otherData !== null) {
                finishAndSend();
            }
        }
    });
});




app.listen(port, () => {
    console.log('Now listening on port ' + port);
});