/*
Copyright 2020 OCAD University

Licensed under the New BSD license. You may not use this file except in compliance with this licence.
You may obtain a copy of the BSD License at
https://raw.githubusercontent.com/inclusive-design/data-update-github/main/LICENSE
*/

// This script runs a diffing algorithm and produces html that shows a visulization of the diff
// and optionally an updated local data set that is a result of mergeing in the diff results.
// The visuliztion can be seen by running the produced html file in a browser. This script takes
// three arguments maximum but needs at least two arugments minimum to run successfully. Possible
// arguments are 1, 2, and 3. The data sets these numbers correspond to can be seen in line 36-38.
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
const fs = require("fs"); // For saving results to a .html to visualize
const diffUtils = require("./diffUtils");
const inquirer = require("inquirer");
const _ = require("lodash");
const daff = require("daff"); // Load diff algorithm dependencies.

// Find the URL of the latest csv

let fileInputs = {};
fileInputs[1] = ["ODC1", "https://raw.githubusercontent.com/inclusive-design/covid-assessment-centres/main/ODC/assessment_centre_locations_2020_05_29.csv"];
fileInputs[2] = ["ODC2", "https://raw.githubusercontent.com/inclusive-design/covid-assessment-centres/main/ODC/assessment_centre_locations_2020_08_20.csv"];
fileInputs[3] = ["WeCount", "https://raw.githubusercontent.com/inclusive-design/covid-assessment-centres/main/WeCount/assessment_centre_data_collection_2020_09_02.csv"];

const local = fileInputs[ process.argv[2] ? process.argv[2] : 1 ];
const remote = fileInputs[ process.argv[3] ? process.argv[3] : 2 ];
const ancestor = fileInputs[ process.argv[4] ? process.argv[4] : 1 ];

async function main() {
	// Load data from CSV files.
	const localDataString = await diffUtils.getRemoteFileContent( local[1] );
	const remoteDataString = await diffUtils.getRemoteFileContent( remote[1] );
	const ancestorDataString = await diffUtils.getRemoteFileContent( ancestor[1] );

	let localData = dataForge.fromCSV( localDataString );
	let remoteData = dataForge.fromCSV( remoteDataString );
	let ancestorData = dataForge.fromCSV( ancestorDataString );

	// Declare a similarityThreshold value that is a threshold of similarity scores to return if a given score is greater than the similarityThreshold value.
	// Default similarityThreshold value is set to 20.
	const similarityThreshold = process.argv[5] ? process.argv[5] : 0.2;

	let similarityResults = diffUtils.similarityResults( localData, remoteData, similarityThreshold );

	let answersArray = [];
	/**
	 * Allows user to identify simililar columns with same information between remote and local table and renames the columns according to the local table name.
	 * and captures renaming choice for same tables in a separate JSON file.
	 * @param {Object} similarityResultsInput - Object where each key is the title of a local column and each value is an array of objects where each object contains a given remote column's name and a similarity score between the given remote column to the respective local column.
	 */
	function daff_ui(similarityResultsInput) {
		let resultsArray = Object.entries(similarityResultsInput);
		let localColumnName = resultsArray[0][0];
		let similarRemoteColumns = resultsArray[0][1];

		// Declare inquirer question object for given local column.
		// See https://www.npmjs.com/package/inquirer for details.
		let columnQuestion = {};
		columnQuestion.type = "list";
		columnQuestion.name = localColumnName;
		let columnChoices = similarRemoteColumns.map(column => `${column.colName} (similarity score: ${column.simScore})`);
		if (columnChoices.length || resultsArray.length < 2) {
			// If local and remote dataset columns are the same or if they are differention versions of the same dataset skip to diffing step.
			if (localData.getColumnNames().toString() === remoteData.getColumnNames() || local[0].split(/([0-9]+)/)[0] === remote[0].split(/([0-9]+)/)[0] ) {
				columnChoices.length = 0;
			};
			columnQuestion.choices = columnChoices.length ? columnChoices.concat(["None"]) : ["continue to diff algorithm"];
			columnQuestion.message = columnChoices.length ? `Choose which column is the same as the following column: "${localColumnName}"` : "There are no similiar columns between the tables.\nSelect continue to start diff algorithm.";
			columnQuestion.filter = function (value) {
				return value.split(" (similarity score: ")[0];
			};

			inquirer.prompt(columnQuestion).then( ( answer ) => {
				// If user selects "None" do not add this to answersArray
				if (answer[localColumnName] !== "None" && columnChoices.length) {
					answersArray.push(answer);
				};
				// Remove current localColumn from results because it has been processed
				resultsArray.splice(0, 1);

				// Remove following local columns with no similar remote columns
				while (resultsArray.length && !resultsArray[0][1].length) {
					resultsArray.splice(0, 1);
				};

				// If there are more local columns to process move on to the next
				if ( resultsArray.length > 1 && columnChoices.length) {
					// Remove picked columns from similarity results array for all local columns
					similarityResultsInput = diffUtils.removePickedColumns( resultsArray, answer[localColumnName] );
					daff_ui(similarityResultsInput);
				} else {
					if (columnChoices.length && answersArray.length ) {
						// Combine all answers into a single object
						let answersObject = Object.assign(...answersArray);

						// Rename columns.
						if (process.argv[2] === "3") {
							localData = localData.renameSeries( answersObject );
						} else {
							// Invert similarityAnswers object's keys and values so the remote column names are keys and local column names are values.
							// This format is needed for renameSeries() method.
							answersObject = _.invert(answersObject);
							remoteData = remoteData.renameSeries( answersObject );
						}

						for (let [fCol, pCol] of Object.entries(answersObject)) {
							if ( fCol !== "None" && process.argv[2] !== "3" ) {
								console.log(`The column "${fCol}" is renamed to "${pCol}"`);
							} else {
								console.log(`The column "${pCol}" is renamed to "${fCol}"`);
							};
						};

						// Add additional meta infomation.
						let metaData = {};
						metaData.rename = answersObject;
						metaData["from:"] = remote[1].split("/main/")[ remote[1].split("/main/").length - 1 ];
						metaData["to:"] = local[1].split("/main/")[ local[1].split("/main/").length - 1 ];
						metaData.include = [];
						metaData.exclude = [];

						// Capture renaming choice for same tables in a separate JSON file.
						fs.writeFileSync(`data/meta_${local[0]}_${remote[0]}.json`, JSON.stringify(metaData, null, "\n") + "\n");

						console.log("----FINAL ANSWERS-----");
						console.log(answersObject);
					} else {
						console.log("----FINAL ANSWERS-----");
						console.log("There are no similiar columns between the tables.");
					}

					// Print renamed column names in remote table.
					console.log("----- Final Column Names -----\n");
					console.log(remoteData.getColumnNames());

					// Change data to row format to be used as inputs for daff's diff algorithm.
					// Note: when data is changed to row format title row is excluded so it must be added manually.
					const localDataColumnNames = localData.getColumnNames();
					localData = [localDataColumnNames].concat(localData.toRows());

					const remoteDataColumnNames = remoteData.getColumnNames();
					remoteData = [remoteDataColumnNames].concat(remoteData.toRows());

					const ancestorDataColumnNames = ancestorData.getColumnNames();
					ancestorData = [ancestorDataColumnNames].concat(ancestorData.toRows());

					// To make those tables accessible to the library, we wrap them in daff.TableView.
					var localTable = new daff.TableView(localData);
					var remoteTable = new daff.TableView(remoteData);
					var ancestorTable = process.argv[4] ? new daff.TableView( ancestorData ) : null;

					// Compute the alignment between the rows and columns in the two tables.
					var alignment = process.argv[4] ? daff.compareTables3(ancestorTable,localTable,remoteTable).align() : daff.compareTables(localTable,remoteTable).align();


					// To produce a diff from the alignment, we first need a table for the output.
					var data_diff = [];
					var table_diff = new daff.TableView(data_diff);

					// Set options for the diff.
					// See documentation for other option setting: http://paulfitz.github.io/daff-doc/types/coopy/CompareFlags.html
					var flags = new daff.CompareFlags();
					flags.ordered = false;
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
					// diff2html.usePrettyArrows(true);
					diff2html.render(table_diff);
					diff2html.completeHtml(table_diff);
					var table_diff_html = diff2html.html();

					if (process.argv[4]) {
						fs.writeFileSync(`daff/diff_viz/diff3_${ancestor[0]}_${local[0]}_${remote[0]}.html`, table_diff_html);
						console.log(`\nYou have slected the following as ancestor data:\n${ancestor[0]}`);
					} else {
						fs.writeFileSync(`daff/diff_viz/diff2_${local[0]}_${remote[0]}.html`, table_diff_html);
					}
					console.log("\nCreated html to visualize daff! See 'daff/diff_viz' folder.\n");

					// Merge results of diff into local dataset
					if (process.argv[4]) {
						let mergeQuestion = {};
						mergeQuestion.type = "confirm";
						mergeQuestion.name = "merge";
						mergeQuestion.message = `Do you want to merge in these diffing results into ${local[0]}?`;
						// mergeQuestion.default = false;
						inquirer.prompt( mergeQuestion ).then( (answer) => {
							if (answer.merge) {
								let merged = new daff.Merger( ancestorTable, localTable, remoteTable, flags);
								merged.apply();
								console.log("------------------------------------------");
								console.log( "\nNumber of merge conflicts", merged.apply() );
								console.log("------------------------------------------");
								console.log(merged.getConflictInfos());
								console.log("------------------------------------------");
								// Convert a daff table to a string in CSV format.
								let daff2CSV = new daff.Csv();
								let mergedCSV = daff2CSV.renderTable( localTable );
								console.log("\nMerge complete.");
								console.log("\nA .csv file of the merge has been created in the 'daff/merged_data' folder.");
								fs.writeFileSync(`daff/merged_data/diff3_merge_${ancestor[0]}_${local[0]}_${remote[0]}.csv`, mergedCSV);
							};
						});
					};
				};
			});
			// If there is no similar remote columns for the given local column delete this entry from the similarityResultsInput and move on to the next
		} else {
			delete similarityResultsInput[localColumnName];
			daff_ui(similarityResultsInput);
		};
	};

	// Print initial column names in remote table.
	console.log("----- Initial Remote Column Names -----");
	console.log(remoteData.getColumnNames());

	console.log("\nSelect which columns are the same.\n");
	daff_ui( similarityResults );
}

main();
