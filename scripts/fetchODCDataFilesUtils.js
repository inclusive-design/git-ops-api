// Utility functions used by fetchODCDataFiles.js

"use strict";

const fs = require("fs");
const axios = require("axios");
const JSDOM = require("jsdom").JSDOM;
const rimraf = require("rimraf");
const git = require("simple-git")();

module.exports = {
	/**
	 * Scrape the download link and date of last update from the ODS repository page
	 * @param {String} dataSourceURL The URL to the webpage where the information of the data file is published
	 * @return {Object} An object keyed by "downloadURL" (the url to download the new data file) and
	 * "date" (the last updated date of the data file).
	 */
	getDataSource: async (dataSourceURL) => {

		let res = await axios.get(dataSourceURL);
		let data = res.data;
		let dom = new JSDOM(data);

		const findElements = function (selector) {
			return dom.window.document.querySelectorAll(selector);
		};

		// find the CSV download link
		let downloadLink;
		let as = findElements("a.dataset-download-link");
		console.log("as: ", as);
		for (let a of as) {
			console.log("a: ", a);
			let link = a.getAttribute("href");
			if (link.slice(-4) === ".csv") {
				downloadLink = link;
				break;
			}
		}

		// find the last date the dataset was updated
		let lastUpdate;
		let tableHeaders = findElements("th.dataset-label");
		for (let header of tableHeaders) {
			if (header.innerHTML === "Last Validated Date") {
				lastUpdate = header.parentElement.querySelector("td.dataset-details").innerHTML.trim();
				break;
			}
		}

		return {
			downloadURL: downloadLink,
			publishedDate: lastUpdate
		};
	},

	/**
	 * Generate the name for a data file based on the date it was uploaded
	 * @param {String} date The date the file was uploaded, in ISO 8601 format (YYYY-MM-DD)
	 * @return {String} The filename in format assessment_centre_locations_YYYY_MM_DD.csv
	 */
	generateDataFileName: (date) => {
		return "assessment_centre_locations_" + date.replace(/-/g, "_") + ".csv";
	},

	/**
	 * Check whether a given version of the data is in the repository
	 * @param {String} dataFileName The name of the file to look for
	 * @param {String} dataFileDir The folder where all data files are located
	 * @return {Boolean} true if the file name is already present in the data folder, false if not
	 */
	hasNewDataFile: (dataFileName, dataFileDir) => {
		let allFiles = fs.readdirSync(dataFileDir);
		return !allFiles.includes(dataFileName);
	},

	/**
	 * Download a file from the given download URL and write into a target local file.
	 * @param {String} downloadURL The download URL
	 * @param {String} targetFileLocation The target file location including the path and file name
	 */
	downloadDataFile: async (downloadURL, targetFileLocation) => {
		let res = await axios.get(downloadURL);
		fs.writeFileSync(targetFileLocation, res.data, "utf8");
	},

	exitWithError: (err, clonedLocalDir) => {
		rimraf.sync(clonedLocalDir);
		console.log(err);
		process.exit(1);
	},

	// Clone the COVID data repository and push the new data file to a remote branch
	prepareLocalRepo: async (covidDataRepoUrl, clonedLocalDir, wecountprojectRepoUrl) => {
		await git.clone(covidDataRepoUrl, clonedLocalDir)
			.cwd(clonedLocalDir)
			.addRemote("wecountproject", wecountprojectRepoUrl)
			.catch((err) => module.exports.exitWithError(err, clonedLocalDir));
	},

	// Clone the COVID data repository and push the new data file to a remote branch
	createRemoteBranch: async (branchName, publishedDate, clonedLocalDir) => {
		await git.checkoutLocalBranch(branchName)
			.add("./*")
			.commit("feat: commit a new ODC data file published on " + publishedDate)
			.push("wecountproject", branchName)
			.catch((err) => module.exports.exitWithError("Error at pushing to a remote branch named " + branchName + ". Check either the authentication or whether the remote branch " + branchName + " already exists.\n" + err, clonedLocalDir));
	}
};
