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
	getStringCSV: async function (dataInfo) {
		const dataRepoUrl = dataInfo;
		const latestInfoUrl = dataRepoUrl + "latest.json";

		const dataInfoResponse = await axios.get( latestInfoUrl )
		const latestFileContent = dataInfoResponse.data;
		const dataFileUrl = dataRepoUrl + latestFileContent.fileName;

		const csvResponse = await axios.get(dataFileUrl)
		const csvString = csvResponse.data

		return csvString
	}
};
