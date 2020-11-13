const axios = require("axios");

module.exports = {
	/**
	 * Find the number of unique intersected valus between two columns
	 * @param {Column} PCol - Column from data set to compare
	 * @param {Column} FCol - Column from data set to compare
	 */
	inclusion: function (PCol, FCol) {
		if (PCol.length===0 || FCol.length===0) {
			return 0
		}

		PCol = [...new Set(PCol)];
		FCol = [...new Set(FCol)];

		return PCol.filter(x => FCol.includes(x)).length; // Intersection
	},

	/**
	 * Gets latest csv data in string format for a given data directory in https://github.com/inclusive-design/covid-assessment-centres repository.
	 * @param {String} dataInfo - String of url for a given data directory.
	 */
	getLatestRemoteFileContent: async function (dataInfo) {
		const dataRepoUrl = dataInfo;
		const latestInfoUrl = dataRepoUrl + "latest.json";

		const dataInfoResponse = await axios.get( latestInfoUrl )
		const latestFileContent = dataInfoResponse.data;
		const dataFileUrl = dataRepoUrl + latestFileContent.fileName;

		const csvResponse = await axios.get(dataFileUrl)
		const csvString = csvResponse.data

		return csvString
	},

	/**
	 * Returns an object where the keys are primary column names and the values are an array of objects representing similar foreign columns for the respective primary column.
	 * @param {DataFrame} primaryData - A Data Forge data frame of ancestrial data.
	 * @param {DataFrame} foreignData - A Data Forge data frame that is to be merged with the ancestrial data.
	 * @param {Number} threshold - A minimum amount of observation that appear in two seperate columns from two different tables for those columns to be considered possibly similar.
	 */
	similarityResults: function ( primaryData, foreignData, threshold=20 ) {
		// Declare results object where each key is the title of a primary column and each value is an array of objects
		// where each object contains a given foreign column's name and a similarity score between the given foreign column to the respective primary column.
		let results = {}

		for (const primaryColumnSeries of primaryData.getColumns()) {
			primaryColumnArray = primaryColumnSeries.series.toArray();
			// Declare similarityArray to hold objects of foreign column names and similarity scores.
			let similarityArray = []
			for (const foreignColumnSeries of foreignData.getColumns()) {
				foreignColumnArray = foreignColumnSeries.series.toArray();

				// Similarity score between the given foreign column and respective primary column.
				// For now the similarity score is a count of how many values are in the intersection between a given foreign column and respective primary column.
				// The inclusion function may be interatively improved upon.
				let similarityScore = this.inclusion(primaryColumnArray, foreignColumnArray)

				// Only add foreign columns to similarityArray where their similarityScore between the respective primary column is greather than similaryThreshold value.
				if (similarityScore > threshold) {
					similarityArray = similarityArray.concat( { colName: foreignColumnSeries.name, simScore:  similarityScore } )
				}
			}
			// Sort each similarityArray by decreasing similarityScore
			results[primaryColumnSeries.name] = similarityArray.sort( (a, b) => a.simScore - b.simScore ).reverse()
		}
		return results
	},

	/**
	 * Remove a given column from all values in similarityResults where values are an array of objects representing similar foreign columns for the respective primary column.
	 * @param {Array} similarityResultsArray - An array of similarityResults.
	 * @param {String} selectedColumnNames - The name of the foreign column that is to be removed from similarityResults values.
	 */
	removePickedColumns: function (similarityResultsArray, selectedColumnNames ) {
		let similarityResultsObject = {}
		for (let [primaryColumnName, similarForeignColumns] of similarityResultsArray) {
			similarForeignColumns = similarForeignColumns.filter(foreignColumn => !selectedColumnNames.includes( foreignColumn.colName ))
			similarityResultsObject[primaryColumnName] = similarForeignColumns
		}
		return similarityResultsObject
	},

	/**
	 * Filters out items of an objects whos values are empty arrays.
	 * @param {Object} similarityResults - An object where the keys are primary column names and the values are an array of objects representing similar foreign columns for the respective primary column.
	 */
	removeEmptySimilarColumns: function( similarityResults ) {
		return Object.fromEntries(Object.entries( similarityResults ).filter( ([key, value]) => value.length ))
	},

	/**
	 * Gets content of a get request to an URL.
	 * @param {String} rawURL - An object where the keys are primary column names and the values are an array of objects representing similar foreign columns for the respective primary column.
	 */
	getRemoteFileContent: async function ( rawURL ) {
		response = await axios.get( rawURL );
		return response.data
	}
};
