/*
Copyright 2020 OCAD University

Licensed under the New BSD license. You may not use this file except in compliance with this licence.
You may obtain a copy of the BSD License at
https://raw.githubusercontent.com/inclusive-design/data-update-github/main/LICENSE
*/

// This calculates the similarity between columns, generates the column match metadata file for the input
// data files and replaces column names so columns that are considered to be similar have matching column names.
// This script takes four arguments. The first three are required and the last one is optional.
//
// Arguments:
// first argument: url of local table
// second argument: url of remote table
// third argument: location to output the metadata between the two input tables
// fourth argument(optional): a number from 0 to 1 reprenting percentage of identical values existing between two columns
// for the two columns to be considered similar.
//
// Sample commands that runs this script in the universal root directory:
// node daff/calcColumnSimilarity.js daff/data/case8/local.csv daff/data/case8/remote.csv daff/data/case8/metadata_local_remote.json
// node daff/calcColumnSimilarity.js daff/data/case8/local.csv daff/data/case8/remote.csv daff/data/case8/metadata_local_remote.json 0.5

"use strict";
// Load data wrangling dependencies
const dataForge = require("data-forge");
require("data-forge-fs");
const fs = require("fs");
const diffUtils = require("../scripts/diffUtils");
const inquirer = require("inquirer");
const _ = require("lodash");

if (!process.argv[2] || !process.argv[3] || !process.argv[4]) {
	console.log("\nPlease enter all necessary arguments. \nRefer to docs in script if need be.\n");
	return;
}

if ((process.argv[5] < 0) || (process.argv[5] > 1)) {
	console.log("\nPlease enter a number between 0 and 1 for the fourth argument \nRefer to docs in script if need be.\n");
	return;
}
// Load in Data
const local = process.argv[2];
const remote = process.argv[3];

// Comment out to load data from Github URLs.
let localData = dataForge.readFileSync( local ).parseCSV();
let remoteData = dataForge.readFileSync( remote ).parseCSV();

async function main() {
	// Uncomment to load data from Github URLs.
	// const local = "https://raw.githubusercontent.com/inclusive-design/covid-assessment-centres/main/WeCount/assessment_centre_data_collection_2020_09_02.csv"
	// const remote = "https://raw.githubusercontent.com/inclusive-design/covid-assessment-centres/main/ODC/assessment_centre_locations_2020_08_20.csv"
	// const localDataString = await diffUtils.getRemoteFileContent( local );
	// const remoteDataString = await diffUtils.getRemoteFileContent( remote );
	// let localData = dataForge.fromCSV( localDataString );
	// let remoteData = dataForge.fromCSV( remoteDataString );

	// Declare a similarityThreshold value that is a threshold of similarity scores to return if a given score is greater than the similarityThreshold value.
	// Default similarityThreshold value is set to 0.2.
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
			const localDataDirectory = local.split("/")[local.split("/").length - 2];
			const remoteDataDirectory = remote.split("/")[remote.split("/").length - 2];
			if ((localData.getColumnNames().toString() === remoteData.getColumnNames() || localDataDirectory === remoteDataDirectory) && localDataDirectory.toLowerCase().slice(0,4) !== "case" ) {
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
				if ( resultsArray.length > 0 && columnChoices.length) {
					// Remove picked columns from similarity results array for all local columns
					similarityResultsInput = diffUtils.removePickedColumns( resultsArray, answer[localColumnName] );
					daff_ui(similarityResultsInput);
				} else {
					if (columnChoices.length && answersArray.length ) {
						// Combine all answers into a single object
						let answersObject = Object.assign(...answersArray);

						// Rename columns.
						// Invert similarityAnswers object's keys and values so the remote column names are keys and local column names are values.
						// This format is needed for renameSeries() method.
						answersObject = _.invert(answersObject);
						remoteData = remoteData.renameSeries( answersObject );

						for (let [remoteColumnName, localColumnName] of Object.entries(answersObject)) {
							console.log(`The column "${remoteColumnName}" is renamed to "${localColumnName}"`);
						};

						// Add additional meta infomati
						let metaData = {};
						metaData.rename = answersObject;
						metaData["from:"] = remote.split("/main/")[ remote.split("/main/").length - 1 ];
						metaData["to:"] = local.split("/main/")[ local.split("/main/").length - 1 ];
						metaData.include = [];
						metaData.exclude = [];

						// Capture metadata between the two input tables.
						fs.writeFileSync(process.argv[4], JSON.stringify(metaData, null, "\n") + "\n");
						console.log(`\nMetadata has been saved to:\n${process.argv[4]}\n`);

						console.log("----FINAL ANSWERS-----");
						console.log(answersObject);
					} else {
						console.log("\n----FINAL ANSWERS-----");
						console.log("There are no similiar columns between the tables.\n");
					}

					// Print renamed column names in remote table.
					console.log("\n----- Final Remote Column Names -----");
					console.log(remoteData.getColumnNames());
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
