/*
Copyright 2020 OCAD University

Licensed under the New BSD license. You may not use this file except in compliance with this licence.
You may obtain a copy of the BSD License at
https://raw.githubusercontent.com/inclusive-design/data-update-github/main/LICENSE
*/

// This script performs diff3 algorithm in daff library and outputs visualization of the diff in an html file
// and an updated local file after having diff changes merged in. This script takes five arguments.
//
// Arguments:
// first argument: ancestor table
// second argument: local table
// third argument: remote table
// fourth argument: location to output the html diff table
// fifth argument: location to output the updated local file with merged changes
//
// A sample command that runs this script in the universal root directory:
// node daff/diff3.js daff/data/case1/ancestor.csv daff/data/case1/local.csv daff/data/case1/remote.csv diff3_ancestor_local_remote.html diff3_merged.csv

"use strict";
// Load data wrangling dependencies
const dataForge = require("data-forge");
require("data-forge-fs");
const fs = require("fs");
const daff = require("daff"); // Load diff algorithm dependencies.

if (!process.argv[2] || !process.argv[3] || !process.argv[4 || !process.argv[5] || !process.argv[6]]) {
	console.log("\nPlease enter all necessary arguments. \nRefer to docs in script if need be.\n");
	return;
}

// Load in Data
const ancestor = process.argv[2];
const local = process.argv[3];
const remote = process.argv[4];

let ancestorData = dataForge.readFileSync( ancestor ).parseCSV();
let localData = dataForge.readFileSync( local ).parseCSV();
let remoteData = dataForge.readFileSync( remote ).parseCSV();

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

	fs.writeFileSync(process.argv[5], table_diff_html);

	console.log("\nScript complete!\n");

	console.log(`\nThe following was used as ancestor data: ${ancestor}\n`);


	// Merge results of diff into local dataset
	let merged = new daff.Merger( ancestorTable, localTable, remoteTable, flags);
	merged.apply();
	console.log("------------------------------------------");
	console.log( "\nNumber of merge conflicts", merged.apply() );
	console.log("------------------------------------------");
	console.log(merged.getConflictInfos());
	console.log("------------------------------------------");
	let daff2CSV = new daff.Csv();
	let mergedCSV = daff2CSV.renderTable( localTable );
	fs.writeFileSync(process.argv[6], mergedCSV);
};
main();
