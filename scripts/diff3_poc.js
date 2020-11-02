// Load data wrangling dependencies
const dataForge = require('data-forge');
require('data-forge-fs'); // For readFile/writeFile.
const fs = require('fs'); // For saving results to a .html to visualize.
const daff = require('daff'); // Load diff algorithm dependencies.

var request = require('request');
request.get('http://www.whatever.com/my.csv', function (error, response, body) {
    if (!error && response.statusCode == 200) {
        var csv = body;
        // Continue with your processing here.
    }
});

// Load data from CSV files.
let data1 = dataForge.readFileSync('versions/assessment_centre_locations_2020_08_06.csv')
						.parseCSV()
						;

let data2 = dataForge.readFileSync('versions/assessment_centre_locations_2020_09_22.csv')
						.parseCSV()
						;

let data3 = dataForge.readFileSync('versions/assessment_centre_data_collection_2020_09_02.csv')
						.parseCSV()
						;


// Change data to row format to be used as inputs for daff's diff algorithm.
// Note: when data is changed to row format title row is excluded so it must be added manually.

const data1ColumnNames = data1.getColumnNames();
data1 = [data1ColumnNames].concat(data1.toRows());

const data2ColumnNames = data2.getColumnNames();
data2 = [data2ColumnNames].concat(data2.toRows());

const data3ColumnNames = data3.getColumnNames();
data3 = [data3ColumnNames].concat(data3.toRows());


// To make those tables accessible to the library, we wrap them in daff.TableView.
var table1 = new daff.TableView(data1);
var table2 = new daff.TableView(data2);
var table3 = new daff.TableView(data3);

// We can now compute the alignment between the rows and columns in the two tables.
// Note: Give ancestor table as the first argument
var alignment = daff.compareTables3(table1, table2, table3).align();

// To produce a diff from the alignment, we first need a table for the output.
var data_diff = [];
var table_diff = new daff.TableView(data_diff);

// Using default options for the diff.
// See documentation for other option setting: http://paulfitz.github.io/daff-doc/types/coopy/CompareFlags.html
var flags = new daff.CompareFlags();
var highlighter = new daff.TableDiff(alignment,flags);
highlighter.hilite(table_diff);

// The diff is now in data_diff in highlighter format.
// console.log(data_diff);

// Visualize results by rendering diff in html format and saving results to a .html file then running the resulting file in a browser.
var diff2html = new daff.DiffRender();
diff2html.render(table_diff);
var table_diff_html = diff2html.html();

let head_element = '<head><title>diff3</title><link rel="stylesheet" type="text/css" href="daff_poc.css"/></head>'
table_diff_html = head_element + table_diff_html

fs.writeFileSync('diff3_poc_viz.html', table_diff_html);
