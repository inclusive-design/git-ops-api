/*
Copyright 2020 OCAD University

Licensed under the New BSD license. You may not use this file except in compliance with this licence.
You may obtain a copy of the BSD License at
https://raw.githubusercontent.com/inclusive-design/data-update-github/main/LICENSE
*/

// This script tests diff3 algorithm in daff library and uses the data in data/test_data to do so.
// This script takes three arguments. Possible arguments are 1, 2, and 3. The datasets these numbers correspond
// to can be seen in line 30-32.
//
// Arguments:
// first argument: URL of local data
// second argument: URL of remote data
// third argument: URL of ancestor data
//
// A sample command that runs this script in the universal root directory:
// node scripts/test_daff.js 3 2 1

"use strict";
// Load data wrangling dependencies
const dataForge = require("data-forge");
require("data-forge-fs"); // For readFile/writeFile.
const fs = require("fs"); // For saving results to a .html to visualize.
const daff = require("daff"); // Load diff algorithm dependencies.

// Load in Data
let fileInputs = {};
fileInputs[1] = ["A", "data/test_data/case3_Ancestor.csv"];
fileInputs[2] = ["R", "data/test_data/case3_Remote.csv"];
fileInputs[3] = ["L", "data/test_data/case3_Local.csv"];

const local = fileInputs[ process.argv[2] ? process.argv[2] : 1 ];
const remote = fileInputs[ process.argv[3] ? process.argv[3] : 2 ];
const ancestor = fileInputs[ process.argv[4] ? process.argv[4] : 1 ];

let localData = dataForge.readFileSync( local[1] ).parseCSV();
let remoteData = dataForge.readFileSync( remote[1] ).parseCSV();
let ancestorData = dataForge.readFileSync( ancestor[1] ).parseCSV();

async function main() {
	// Load data from CSV files.

	// Change data to row format to be used as inputs for daff's diff algorithm.
	// Note: when data is changed to row format title row is excluded so it must be added manually.
	const ancestorDataColumnNames = ancestorData.getColumnNames();
	ancestorData = [ancestorDataColumnNames].concat(ancestorData.toRows());

	const localDataColumnNames = localData.getColumnNames();
	localData = [localDataColumnNames].concat(localData.toRows());

	const remoteDataColumnNames = remoteData.getColumnNames();
	remoteData = [remoteDataColumnNames].concat(remoteData.toRows());

	// To make those tables accessible to the library, we wrap them in daff.TableView.
	var localTable = new daff.TableView(localData);
	var remoteTable = new daff.TableView(remoteData);
	var ancestorTable = new daff.TableView(ancestorData);

	// Compute the alignment between the rows and columns in the two tables.
	var alignment = daff.compareTables3(ancestorTable, localTable, remoteTable).align();

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
	// flags.parent = process.argv[4] ? daff.TableView( ancestorData ) : null;
	var highlighter = new daff.TableDiff(alignment,flags);
	highlighter.hilite(table_diff);

	// The diff is now in data_diff in highlighter format.
	// console.log(data_diff);

	// Visualize results by rendering diff in html format and saving results to a .html file then running the resulting file in a browser.
	var diff2html = new daff.DiffRender();
	diff2html.render(table_diff);
	diff2html.completeHtml(table_diff);
	var table_diff_html = diff2html.html();

	const Case = local[1]
	fs.writeFileSync(`daff/tests/diff3/${Case}/diff_viz/testDiff3_${ancestor[0]}_${local[0]}_${remote[0]}.html`, table_diff_html);

	console.log("\nScript complete!\n");

	if (process.argv[4]) {
		console.log(`\nThe following was used as ancestor data: ${ancestor[0]}\n`);
	}

	// Merge results of diff into local dataset
	let merged = new daff.Merger( ancestorTable, localTable, remoteTable, flags);
	merged.apply();
	let daff2CSV = new daff.Csv();
	let mergedCSV = daff2CSV.renderTable( localTable );
	fs.writeFileSync(`daff/tests/mergedData/${Case}/diff3_merge_${ancestor[0]}_${local[0]}_${remote[0]}.csv`, mergedCSV);
};
main();
