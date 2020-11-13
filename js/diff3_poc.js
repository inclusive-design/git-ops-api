// Load data wrangling dependencies
const dataForge = require('data-forge');
require('data-forge-fs'); // For readFile/writeFile.
const fs = require('fs'); // For saving results to a .html to visualize.
const daff = require('daff'); // Load diff algorithm dependencies.
const utils = require('./utils'); // Import similarity function
const axios = require('axios');

// Find the URL of the latest csv
// For now the URL will be hard codded for the POC
// const primaryDataDirectory = process.argv[3] ? process.argv[3] : "ODC"
// const foreignDataDirectory1 = process.argv[4] ? process.argv[4] : "WeCount"
// const foreignDataDirectory2 = process.argv[5] ? process.argv[5] : "WeCount"

// const primaryData = `https://raw.githubusercontent.com/inclusive-design/covid-assessment-centres/main/${primaryDataDirectory}/`
// const foreignData1 = `https://raw.githubusercontent.com/inclusive-design/covid-assessment-centres/main/${foreignDataDirectory1}/`
// const foreignData2 = `https://raw.githubusercontent.com/inclusive-design/covid-assessment-centres/main/${foreignDataDirectory2}/`

const ancestorRawURL = "https://raw.githubusercontent.com/inclusive-design/covid-assessment-centres/main/ODC/assessment_centre_locations_2020_05_29.csv"
const latestAncestorRawURL = "https://raw.githubusercontent.com/inclusive-design/covid-assessment-centres/main/ODC/"
const latestRawURL = "https://raw.githubusercontent.com/inclusive-design/covid-assessment-centres/main/WeCount/"



async function main() {
	// Load data from CSV files.
	const ancestorDataString = await utils.getRemoteFileContent( ancestorRawURL )
	const latestAncestorDataString = await utils.getLatestRemoteFileContent( latestAncestorRawURL )
	const latestDataString = await utils.getLatestRemoteFileContent( latestRawURL )

	let ancestorData = dataForge.fromCSV( ancestorDataString )
	let latestAncestorData = dataForge.fromCSV( latestAncestorDataString )
	let latestData = dataForge.fromCSV( latestDataString )

	// Change data to row format to be used as inputs for daff's diff algorithm.
	// Note: when data is changed to row format title row is excluded so it must be added manually.
	const ancestorDataColumnNames = ancestorData.getColumnNames();
	ancestorData = [ancestorDataColumnNames].concat(ancestorData.toRows());

	const latestAncestorDataColumnNames = latestAncestorData.getColumnNames();
	latestAncestorData = [latestAncestorDataColumnNames].concat(latestAncestorData.toRows());

	const latestDataColumnNames = latestData.getColumnNames();
	latestData = [latestDataColumnNames].concat(latestData.toRows());


	// To make those tables accessible to the library, we wrap them in daff.TableView.
	var table1 = new daff.TableView(ancestorData);
	var table2 = new daff.TableView(latestAncestorData);
	var table3 = new daff.TableView(latestData);

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

	let head_element = '<head><title>diff3</title><link rel="stylesheet" type="text/css" href="css/daff_poc.css"/></head>'
	table_diff_html = head_element + table_diff_html

	fs.writeFileSync('diff3_poc_viz.html', table_diff_html);
}

main()
