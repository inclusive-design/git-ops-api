
/*
Copyright 2020 OCAD University

Licensed under the New BSD license. You may not use this file except in compliance with this licence.
You may obtain a copy of the BSD License at
https://raw.githubusercontent.com/inclusive-design/data-update-github/main/LICENSE
*/

// Utility functions used by test_daff.js

"use strict";
const axios = require("axios");

module.exports = {
	/**
	 * Find the portion of unique intersected values between two columns.
	 * @param {Column} localColumn - Column from data set to compare.
	 * @param {Column} remoteColumn - Column from data set to compare.
	 * @return {Number} - Number between 0 and 1 representing the percentage of items in the intersection.
	 */
	inclusion: function (localColumn, remoteColumn) {
		if (localColumn.length === 0 || remoteColumn.length === 0) {
			return 0;
		};

		const numberOfLocalRows = localColumn.length;

		localColumn = [...new Set(localColumn)];
		remoteColumn = [...new Set(remoteColumn)];

		return localColumn.filter(x => remoteColumn.includes(x)).length / numberOfLocalRows; // Intersection
	},

	/**
	 * Gets latest csv data in string format for a given data directory in https://github.com/inclusive-design/covid-assessment-centres repository.
	 * @param {String} dataInfo - String of url for a given data directory.
	 */
	getLatestRemoteFileContent: async function (dataInfo) {
		const dataRepoUrl = dataInfo;
		const latestInfoUrl = dataRepoUrl + "latest.json";

		const dataInfoResponse = await axios.get( latestInfoUrl );
		const latestFileContent = dataInfoResponse.data;
		const dataFileUrl = dataRepoUrl + latestFileContent.fileName;

		const csvResponse = await axios.get(dataFileUrl);
		const csvString = csvResponse.data;

		return csvString;
	},

	/**
	 * Returns an object where the keys are local column names and the values are an array of objects representing similar remote columns for the respective local column.
	 * @param {DataFrame} localData - A Data Forge data frame of inhertiting changes.
	 * @param {DataFrame} remoteData - A Data Forge data frame that is used to update a local dataset.
	 * @param {Number} threshold - A minimum amount of observation that appear in two seperate columns from two different tables for those columns to be considered possibly similar.
	 * @return {Object} - Similarity results
	 */
	similarityResults: function ( localData, remoteData, threshold = 0.2 ) {
		// Declare results object where each key is the title of a local column and each value is an array of objects
		// where each object contains a given remote column's name and a similarity score between the given remote column to the respective local column.
		let results = {};

		for (const localColumnSeries of localData.getColumns()) {
			let localColumnArray = localColumnSeries.series.toArray();
			// Declare similarityArray to hold objects of remote column names and similarity scores.
			let similarityArray = [];
			for (const remoteColumnSeries of remoteData.getColumns()) {
				let remoteColumnArray = remoteColumnSeries.series.toArray();

				// Similarity score between the given remote column and respective local column.
				// For now the similarity score is a count of how many values are in the intersection between a given remote column and respective local column.
				// The inclusion function may be interatively improved upon.
				let similarityScore = this.inclusion(localColumnArray, remoteColumnArray);

				// Only add remote columns to similarityArray where their similarityScore between the respective local column is greather than similaryThreshold value.
				if (similarityScore > threshold) {
					similarityArray = similarityArray.concat( { colName: remoteColumnSeries.name, simScore:  similarityScore } );
				}
			}
			// Sort each similarityArray by decreasing similarityScore
			results[localColumnSeries.name] = similarityArray.sort( (a, b) => a.simScore - b.simScore ).reverse();
		}
		return results;
	},

	/**
	 * Remove a given column from all values in similarityResults where values are an array of objects representing similar remote columns for the respective local column.
	 * @param {Array} similarityResultsArray - An array of similarityResults.
	 * @param {String} selectedColumnNames - The name of the remote column that is to be removed from similarityResults values.
	 * @return {Object} - Similarity results with selected column names removed
	 */
	removePickedColumns: function (similarityResultsArray, selectedColumnNames ) {
		let similarityResultsObject = {};
		for (let [localColumnName, similarForeignColumns] of similarityResultsArray) {
			similarForeignColumns = similarForeignColumns.filter(remoteColumn => !selectedColumnNames.includes( remoteColumn.colName ));
			similarityResultsObject[localColumnName] = similarForeignColumns;
		}
		return similarityResultsObject;
	},

	/**
	 * Filters out items of an objects whos values are empty arrays.
	 * @param {Object} similarityResults - An object where the keys are local column names and the values are an array of objects representing similar remote columns for the respective local column.
	 * @return {Object} - Similarity results with items that haave empty arrays for values removed.
	 */
	removeEmptySimilarColumns: function ( similarityResults ) {
		return Object.fromEntries(Object.entries( similarityResults ).filter( ( item ) => item[0].length ));
	},

	/**
	 * Gets content of a get request to an URL.
	 * @param {String} rawURL - An object where the keys are local column names and the values are an array of objects representing similar remote columns for the respective local column.
	 */
	getRemoteFileContent: async function ( rawURL ) {
		let response = await axios.get( rawURL );;
		return response.data;
	}
};
