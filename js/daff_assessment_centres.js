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
const primaryDataDirectory = process.argv[3] ? process.argv[3] : "ODC";
const foreignDataDirectory = process.argv[4] ? process.argv[4] : "WeCount";

const primaryData = `https://raw.githubusercontent.com/inclusive-design/covid-assessment-centres/main/${primaryDataDirectory}/`;
const foreignData = `https://raw.githubusercontent.com/inclusive-design/covid-assessment-centres/main/${foreignDataDirectory}/`;

async function main() {
	// Load data from CSV files.
	const primaryDataString = await utils.getLatestRemoteFileContent( primaryData );
	const foreignDataString = await utils.getLatestRemoteFileContent( foreignData );

	let data1 = dataForge.fromCSV( primaryDataString );
	let data2 = dataForge.fromCSV( foreignDataString );

	// Declare a similarityThreshold value that is a threshold of similarity scores to return if a given score is greater than the similarityThreshold value.
	// Default similarityThreshold value is set to 20.
	const similarityThreshold = process.argv[2] ? process.argv[2] : 20;

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
		columnQuestion.message = `Choose which column is the same as the following column: "${primaryColumnName}"`;
		let columnChoices = similarForeignColumns.map(column => `${column.colName} (similarity score: ${column.simScore})`);
		if (columnChoices.length) {
			columnQuestion.choices = columnChoices.concat(["None"]);
			columnQuestion.filter = function (value) {
				return value.split(" (similarity score: ")[0];
			};

			inquirer.prompt(columnQuestion).then( ( answer ) => {
				// If user selects "None" do not add this to answersArray
				if (answer[primaryColumnName] !== "None") {
					answersArray.push(answer);
				};
				// Remove current primaryColumn from results because it has been processed
				resultsArray.splice(0, 1);

				// Following primary columns with no similar foreign columns
				while (resultsArray.length && !resultsArray[0][1].length) {
					resultsArray.splice(0, 1);
				};

				// If there are more primary columns to process move on to the next
				if (resultsArray.length) {
					// Remove picked columns from similarity results array for all primary columns
					similarityResultsInput = utils.removePickedColumns( resultsArray, answer[primaryColumnName] );
					daff_ui(similarityResultsInput);
				} else {
					if (answersArray.length) {
						// Combine all answers into a single object
						let answersObject = Object.assign(...answersArray);

						// Invert similarityAnswers object's keys and values so the foreign column names are keys and primary column names are values.
						// This format is needed for renameSeries() method.
						answersObject = _.invert(answersObject);
						data2 = data2.renameSeries( answersObject );

						for (let [fCol, pCol] of Object.entries(answersObject)) {
							if (fCol !== "None") {
								console.log(`The column "${fCol}" is renamed to "${pCol}"`);
							};
						};

						// Capture renaming choice for same tables in a separate JSON file.
						fs.writeFileSync(`js/column_renaming_${foreignDataDirectory}_${primaryDataDirectory}.json`, JSON.stringify(answersObject, null, "\n"));

						console.log("----FINAL ANSWERS-----");
						console.log(answersObject);
					} else {
						console.log("----FINAL ANSWERS-----");
						console.log("There are no similiar columns between the tables.");
					}

					// Print renamed column names in foreign table.
					console.log("----- Final Column Names -----\n");
					console.log(data2.getColumnNames());

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
					var highlighter = new daff.TableDiff(alignment,flags);
					highlighter.hilite(table_diff);

					// The diff is now in data_diff in highlighter format.
					// console.log(data_diff);

					// Visualize results by rendering diff in html format and saving results to a .html file then running the resulting file in a browser.
					var diff2html = new daff.DiffRender();
					diff2html.render(table_diff);
					diff2html.completeHtml(table_diff);
					var table_diff_html = diff2html.html();

					// let head_element = "<head><title>daff</title><link rel='stylesheet' type='text/css' href='css/daff_poc.css'/></head>";
					// table_diff_html = head_element + table_diff_html;

					fs.writeFileSync("daff_viz/diff2_odc2_wecount1.html", table_diff_html);
					console.log("Created html to visualize daff!\nSee 'daff_viz' folder");
				};
			});
			// If there is no similar foreign columns for the given primary column delete this entry from the similarityResultsInput and move on to the next
		} else {
			delete similarityResultsInput[primaryColumnName];
			daff_ui(similarityResultsInput);
		};
	};

	// Print initial column names in foreign table.
	console.log("----- Initial Foreign Column Names -----\n");
	console.log(data2.getColumnNames());

	console.log("Select which columns are the same.\n");
	daff_ui( similarityResults );
}

main();
