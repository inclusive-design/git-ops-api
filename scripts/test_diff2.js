/*
Copyright 2020 OCAD University

Licensed under the New BSD license. You may not use this file except in compliance with this licence.
You may obtain a copy of the BSD License at
https://raw.githubusercontent.com/inclusive-design/data-update-github/main/LICENSE
*/

// This script tests diff2 algorithm in daff library and uses the data in data/test_data to do so.
// This script takes two arguments. Possible arguments are 1, 2, and 3. The datasets these numbers
// correspond to can be seen in line 29-31.
//
// Arguments:
// first argument: URL of local data
// second argument: URL of remote data
//
// A sample command that runs this script in the universal root directory:
// node scripts/test_daff.js 3 2

"use strict";
// Load data wrangling dependencies
const dataForge = require("data-forge");
require("data-forge-fs"); // For readFile/writeFile.
const fs = require("fs"); // For saving results to a .html to visualize
const daff = require("daff"); // Load diff algorithm dependencies.

// Load in Data
let fileInputs = {};
fileInputs[1] = ["A", "daff/tests/data/testCase5/case5Ancestor.csv"];
fileInputs[2] = ["R", "daff/tests/data/testCase5/case5Remote.csv"];
fileInputs[3] = ["L", "daff/tests/data/testCase5/case5Local.csv"];

const local = fileInputs[ process.argv[2] ? process.argv[2] : 1 ];
const remote = fileInputs[ process.argv[3] ? process.argv[3] : 2 ];

let localData = dataForge.readFileSync( local[1] ).parseCSV();
let remoteData = dataForge.readFileSync( remote[1] ).parseCSV();

async function main() {
	// Change data to row format to be used as inputs for daff's diff algorithm.
	// Note: when data is changed to row format title row is excluded so it must be added manually.
	const localDataColumnNames = localData.getColumnNames();
	localData = [localDataColumnNames].concat(localData.toRows());

	const remoteDataColumnNames = remoteData.getColumnNames();
	remoteData = [remoteDataColumnNames].concat(remoteData.toRows());

	// To make those tables accessible to the library, we wrap them in daff.TableView.
	var localTable = new daff.TableView(localData);
	var remoteTable = new daff.TableView(remoteData);

	// Compute the alignment between the rows and columns in the two tables.
	var alignment = daff.compareTables(localTable,remoteTable).align();

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


	const caseIndex = local[1].indexOf("ase");
	const Case = local[1].slice(caseIndex, caseIndex + 4);
	fs.writeFileSync(`daff/tests/diff2/testC${Case}/testDiff2_${local[0]}_${remote[0]}.html`, table_diff_html);

	console.log("\nScript complete!\n");

};

main();
