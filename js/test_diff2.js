"use strict";
// Load data wrangling dependencies
const dataForge = require("data-forge");
require("data-forge-fs"); // For readFile/writeFile.
const fs = require("fs"); // For saving results to a .html to visualize
const utils = require("./utils");
const daff = require("daff"); // Load diff algorithm dependencies.

const ancestorRawURL = "https://raw.githubusercontent.com/inclusive-design/covid-assessment-centres/main/ODC/assessment_centre_locations_2020_05_29.csv";
const latestAncestorRawURL = "https://raw.githubusercontent.com/inclusive-design/covid-assessment-centres/main/ODC/";
// const latestAncestorRawURL = "https://raw.githubusercontent.com/inclusive-design/covid-assessment-centres/main/WeCount/";

async function main() {
	// Load data from CSV files.
	const primaryDataString = await utils.getRemoteFileContent( ancestorRawURL );
	const foreignDataString = await utils.getLatestRemoteFileContent( latestAncestorRawURL );

	let data1 = dataForge.fromCSV( primaryDataString );
	let data2 = dataForge.fromCSV( foreignDataString );

	// Change data to row format to be used as inputs for daff's diff algorithm.
	// Note: when data is changed to row format title row is excluded so it must be added manually.
	const data1ColumnNames = data1.getColumnNames();
	data1 = [data1ColumnNames].concat(data1.toRows());

	const data2ColumnNames = data2.getColumnNames();
	data2 = [data2ColumnNames].concat(data2.toRows());

	// To make those tables accessible to the library, we wrap them in daff.TableView.
	var table1 = new daff.TableView(data1);
	var table2 = new daff.TableView(data2);

	// Compute the alignment between the rows and columns in the two tables.
	var alignment = daff.compareTables(table1,table2).align();

	// To produce a diff from the alignment, we first need a table for the output.
	var data_diff = [];
	var table_diff = new daff.TableView(data_diff);

	// Using default options for the diff.
	// See documentation for other option setting: http://paulfitz.github.io/daff-doc/types/coopy/CompareFlags.html
	var flags = new daff.CompareFlags();
	flags.ordered = false;
	flags.show_unchanged = true;
	flags.show_unchanged_columns = true;
	flags.show_unchanged_meta = true;
	var highlighter = new daff.TableDiff(alignment,flags);
	highlighter.hilite(table_diff);

	// The diff is now in data_diff in highlighter format.
	// console.log(data_diff);

	// Visualize results by rendering diff in html format and saving results to a .html file then running the resulting file in a browser.
	var diff2html = new daff.DiffRender();
	diff2html.render(table_diff);
	diff2html.completeHtml(table_diff);
	var table_diff_html = diff2html.html();

	fs.writeFileSync("daff_viz/diff2_odc1_odc2.html", table_diff_html);
};

main();
