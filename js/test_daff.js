"use strict";
// Load data wrangling dependencies
const dataForge = require("data-forge");
require("data-forge-fs"); // For readFile/writeFile.
const fs = require("fs"); // For saving results to a .html to visualize
const utils = require("./utils");
const inquirer = require("inquirer");
const _ = require("lodash");
const daff = require("daff"); // Load diff algorithm dependencies.

// Find the URL of the latest csv

let fileInputs = {};
fileInputs[1] = ["ODC1", "https://raw.githubusercontent.com/inclusive-design/covid-assessment-centres/main/ODC/assessment_centre_locations_2020_05_29.csv"];
fileInputs[2] = ["ODC2", "https://raw.githubusercontent.com/inclusive-design/covid-assessment-centres/main/ODC/assessment_centre_locations_2020_08_20.csv"];
fileInputs[3] = ["WeCount", "https://raw.githubusercontent.com/inclusive-design/covid-assessment-centres/main/WeCount/assessment_centre_data_collection_2020_09_02.csv"];

const primaryData = fileInputs[ process.argv[2] ? process.argv[2] : 1 ];
const foreignData = fileInputs[ process.argv[3] ? process.argv[3] : 2 ];
const ancestor = fileInputs[ process.argv[4] ? process.argv[4] : 1 ];

async function main() {
	// Load data from CSV files.
	const primaryDataString = await utils.getRemoteFileContent( primaryData[1] );
	const foreignDataString = await utils.getRemoteFileContent( foreignData[1] );
	const ancestorDataString = await utils.getRemoteFileContent( ancestor[1] );

	let data1 = dataForge.fromCSV( primaryDataString );
	let data2 = dataForge.fromCSV( foreignDataString );
	let ancestorData = dataForge.fromCSV( ancestorDataString );

	// Declare a similarityThreshold value that is a threshold of similarity scores to return if a given score is greater than the similarityThreshold value.
	// Default similarityThreshold value is set to 20.
	const similarityThreshold = process.argv[5] ? process.argv[5] : 20;

	let similarityResults = utils.similarityResults( data1, data2, similarityThreshold );

	let answersArray = [];
	/**
	 * Allows user to identify simililar columns with same information between foreign and primary table and renames the columns according to the primary table name.
	 * and captures renaming choice for same tables in a separate JSON file.
	 * @param {Object} similarityResultsInput - Object where each key is the title of a primary column and each value is an array of objects where each object contains a given foreign column's name and a similarity score between the given foreign column to the respective primary column.
	 */
	function daff_ui(similarityResultsInput) {
		let resultsArray = Object.entries(similarityResultsInput);
		let primaryColumnName = resultsArray[0][0];
		let similarForeignColumns = resultsArray[0][1];

		// Declare inquirer question object for given primary column.
		// See https://www.npmjs.com/package/inquirer for details.
		let columnQuestion = {};
		columnQuestion.type = "list";
		columnQuestion.name = primaryColumnName;
		let columnChoices = similarForeignColumns.map(column => `${column.colName} (similarity score: ${column.simScore})`);
		if (columnChoices.length || resultsArray.length < 2) {
			// If primary and foreign dataset columns are the same or if they are differention versions of the same dataset skip to diffing step.
			if (data1.getColumnNames().toString() === data2.getColumnNames() || primaryData[0].split(/([0-9]+)/)[0] === foreignData[0].split(/([0-9]+)/)[0] ) {
				columnChoices.length = 0;
			};
			columnQuestion.choices = columnChoices.length ? columnChoices.concat(["None"]) : ["continue to diff algorithm"];
			columnQuestion.message = columnChoices.length ? `Choose which column is the same as the following column: "${primaryColumnName}"` : "There are no similiar columns between the tables.\nSelect continue to start diff algorithm.";
			columnQuestion.filter = function (value) {
				return value.split(" (similarity score: ")[0];
			};

			inquirer.prompt(columnQuestion).then( ( answer ) => {
				// If user selects "None" do not add this to answersArray
				if (answer[primaryColumnName] !== "None" && columnChoices.length) {
					answersArray.push(answer);
				};
				// Remove current primaryColumn from results because it has been processed
				resultsArray.splice(0, 1);

				// Remove following primary columns with no similar foreign columns
				while (resultsArray.length && !resultsArray[0][1].length) {
					resultsArray.splice(0, 1);
				};

				// If there are more primary columns to process move on to the next
				if ( resultsArray.length > 1 && columnChoices.length) {
					// Remove picked columns from similarity results array for all primary columns
					similarityResultsInput = utils.removePickedColumns( resultsArray, answer[primaryColumnName] );
					daff_ui(similarityResultsInput);
				} else {
					if (columnChoices.length && answersArray.length ) {
						// Combine all answers into a single object
						let answersObject = Object.assign(...answersArray);

						// Rename columns.
						if (process.argv[2] === 3) {
							data1 = data1.renameSeries( answersObject );
						} else {
							// Invert similarityAnswers object's keys and values so the foreign column names are keys and primary column names are values.
							// This format is needed for renameSeries() method.
							answersObject = _.invert(answersObject);
							data2 = data2.renameSeries( answersObject );
						}

						for (let [fCol, pCol] of Object.entries(answersObject)) {
							if ( fCol !== "None" && process.argv[2] !== 3 ) {
								console.log(`The column "${fCol}" is renamed to "${pCol}"`);
							} else {
								console.log(`The column "${pCol}" is renamed to "${fCol}"`);
							};
						};

						// Capture renaming choice for same tables in a separate JSON file.
						fs.writeFileSync(`js/meta_${primaryData[0]}_${foreignData[0]}.json`, JSON.stringify(answersObject, null, "\n") + "\n");

						console.log("----FINAL ANSWERS-----");
						console.log(answersObject);
					} else {
						console.log("----FINAL ANSWERS-----");
						console.log("There are no similiar columns between the tables.");
					}

					// Print renamed column names in foreign table.
					// console.log("----- Final Column Names -----\n");
					// console.log(data2.getColumnNames());

					// Change data to row format to be used as inputs for daff's diff algorithm.
					// Note: when data is changed to row format title row is excluded so it must be added manually.
					const data1ColumnNames = data1.getColumnNames();
					data1 = [data1ColumnNames].concat(data1.toRows());

					const data2ColumnNames = data2.getColumnNames();
					data2 = [data2ColumnNames].concat(data2.toRows());

					const ancestorDataColumnNames = ancestorData.getColumnNames();
					ancestorData = [ancestorDataColumnNames].concat(ancestorData.toRows());

					// To make those tables accessible to the library, we wrap them in daff.TableView.
					var table1 = new daff.TableView(data1);
					var table2 = new daff.TableView(data2);
					var ancestorTable = process.argv[4] ? new daff.TableView( ancestorData ) : null;

					// Compute the alignment between the rows and columns in the two tables.
					var alignment = process.argv[4] ? daff.compareTables3(ancestorTable,table1,table2).align() : daff.compareTables(table1,table2).align();


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
					diff2html.render(table_diff);
					diff2html.completeHtml(table_diff);
					var table_diff_html = diff2html.html();

					if (process.argv[4]) {
						fs.writeFileSync(`daff_viz/diff3_${ancestor[0]}_${primaryData[0]}_${foreignData[0]}.html`, table_diff_html);
						console.log(`\nYou have slected the following as ancestor data:\n${ancestor[0]}`);
					} else {
						fs.writeFileSync(`daff_viz/diff2_${primaryData[0]}_${foreignData[0]}.html`, table_diff_html);
					}
					console.log("\nCreated html to visualize daff! See 'daff_viz' folder.\n");

					// Merge results of diff into primary dataset
					if (process.argv[4]) {
						let mergeQuestion = {};
						mergeQuestion.type = "confirm";
						mergeQuestion.name = "merge";
						mergeQuestion.message = `Do you want to merge in these diffing results into ${primaryData[0]}?`;
						// mergeQuestion.default = false;
						inquirer.prompt( mergeQuestion ).then( (answer) => {
							if (answer.merge) {
								let merged = new daff.Merger( ancestorTable, table1, table2, flags);
								merged.apply();
								console.log("------------------------------------------");
								console.log( "\nNumber of merge conflicts", merged.apply() );
								console.log("------------------------------------------");
								console.log(merged.getConflictInfos());
								console.log("------------------------------------------");
								// Convert a daff table to a string in CSV format.
								let daff2CSV = new daff.Csv();
								let mergedCSV = daff2CSV.renderTable( table1 );
								console.log("\nMerge complete.");
								console.log("\nA .csv file of the merge has been created in the 'daff_merge' folder.");
								fs.writeFileSync(`daff_merge/diff3_merge_${ancestor[0]}_${primaryData[0]}_${foreignData[0]}.csv`, mergedCSV);
							};
						});
					};
				};
			});
			// If there is no similar foreign columns for the given primary column delete this entry from the similarityResultsInput and move on to the next
		} else {
			delete similarityResultsInput[primaryColumnName];
			daff_ui(similarityResultsInput);
		};
	};

	// Print initial column names in foreign table.
	// console.log("----- Initial Foreign Column Names -----");
	// console.log(data2.getColumnNames());

	console.log("\nSelect which columns are the same.\n");
	daff_ui( similarityResults );
}

main();
