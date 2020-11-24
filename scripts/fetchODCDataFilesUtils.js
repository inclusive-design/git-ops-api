/*
Copyright 2020 OCAD University

Licensed under the New BSD license. You may not use this file except in compliance with this licence.
You may obtain a copy of the BSD License at
https://raw.githubusercontent.com/inclusive-design/data-update-github/main/LICENSE
*/

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
	 * @param {String} dataSourceUrl The URL to the webpage where the information of the data file is published
	 * @return {Object} An object keyed by "downloadUrl" (the url to download the new data file) and
	 * "date" (the last updated date of the data file in a format of YYYY-MM-DD). These values are `undefined` when
	 * the csv link is not found or any error happens.
	 */
	getDataSource: async (dataSourceUrl) => {
		try {
			let res = await axios.get(dataSourceUrl);
			let dom = new JSDOM(res.data);

			// find the CSV download link
			let publishedDate;
			let csvLinks = [];
			let as = dom.window.document.querySelectorAll("a.dataset-download-link");

			for (let a of as) {
				const link = a.getAttribute("href").trim();
				if (link.endsWith(".csv")) {
					var dateElmContent = a.closest(".resource-item").querySelector(".description.details").innerHTML;
					const pattern = /Last\sUpdated:\s(.*)\s\|/;
					const matches = pattern.exec(dateElmContent);
					publishedDate = module.exports.formatDate(matches[1]);
					if (publishedDate === "NaN-NaN-NaN") {
						return {
							isError: true,
							message: "The published date (" + matches[1] + ") is not recognizable. Check if it is in the format or \"month dd, yyyy\""
						};
					}
					csvLinks.push({
						downloadUrl: link,
						publishedDate: publishedDate
					});
				}
			}

			const numOfCsvLinks = csvLinks.length;
			if (numOfCsvLinks === 1) {
				return csvLinks[0];
			} else if (numOfCsvLinks === 0) {
				return {
					isError: true,
					message: "CSV download link is not found on the data source (" + dataSourceUrl + ")"
				};
			} else {
				return {
					isError: true,
					message: "More than one CSV download link are found on the data source (" + dataSourceUrl + "): " + JSON.stringify(csvLinks)
				};
			}
		} catch (error) {
			return {
				isError: true,
				message: "Error in getDataSource() - " + error
			};
		}
	},

	/**
	 * Validate the date is in the format of "month dd, yyyy"
	 * @param {String} date A date in any format. In the context of this script, the input format is: November 17, 2020
	 * @return {Boolean} Return true if the format is correct. Otherwise, return false.
	 */
	isValidDate: (date) => {
		if (!date) {
			return false;
		}
		const pattern = /^([a-zA-Z]*)\s(\d{1,2}),\s(\d{4})$/;
		const matches = pattern.exec(date.trim());
		return matches !== null;
	},

	/**
	 * Format the date format to YYYY-MM-DD
	 * @param {String} date A date in any format. In the context of this script, the input format is: November 17, 2020
	 * @return {String} A date in a format of YYYY-MM-DD. If the input is invalid, return NaN-NaN-NaN
	 */
	formatDate: (date) => {
		if (!module.exports.isValidDate(date)) {
			return "NaN-NaN-NaN";
		}
		const d = new Date(date);
		let month = "" + (d.getMonth() + 1),
			day = "" + d.getDate(),
			year = d.getFullYear();

		month = month.length < 2 ? "0" + month : month;
		day = day.length < 2 ? "0" + day : day;

		return [year, month, day].join("-");
	},

	/**
	 * Check whether a given version of the data is in the directory
	 * @param {String} dataFileName The name of the file to look for
	 * @param {String} dataFileDir The directory where all data files are located
	 * @return {Boolean} true if the file name is already present in the data folder, false if not
	 */
	fileNotExists: (dataFileName, dataFileDir) => {
		let allFiles = fs.readdirSync(dataFileDir);
		return !allFiles.includes(dataFileName);
	},

	/**
	 * Download a file from the given download URL and write into a target local file.
	 * @param {String} downloadURL The download URL
	 * @param {String} targetFileLocation The target file location including the path and file name
	 * @return {Boolean|Object} return true when the operation completes successfully. When an error occurs,
	 * return the error object in a structure of: {isError: true, message: detailed-error-message}
	 */
	downloadDataFile: async (downloadURL, targetFileLocation) => {
		try {
			let res = await axios.get(downloadURL);
			fs.writeFileSync(targetFileLocation, res.data, "utf8");
			return true;
		} catch (error) {
			return {
				isError: true,
				message: error
			};
		}
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
	},

	issuePullRequest: async (githubAPI, covidDataRepoUrl, accessToken, branchName, publishedDate) => {
		// Parse out the owner and repo name that the pull request will be issued for
		const pattern = /https:\/\/github.com\/(.*)\/(.*).git/;
		const matches = pattern.exec(covidDataRepoUrl);
		const headers = {
			"Authorization": "bearer " + accessToken
		};

		const repoInfoResponse = await axios.post(githubAPI, {
			query: `query {
			repository(owner: "${matches[1]}", name: "${matches[2]}") {
				url
				id
			}
			}`
		}, {
			headers:headers
		});

		const repoId = repoInfoResponse.data.data.repository.id;

		const createPRResponse = await axios.post(githubAPI, {
			query: `mutation {
			createPullRequest (
				input: {
					baseRefName:"main",
					headRefName: "wecountproject:${branchName}",
					repositoryId: "${repoId}",
					title: "Add a new ODC data file published on ${publishedDate}"
				}) {
				pullRequest {
				  url
				}
			  }
			}`
		}, {
			headers:headers
		});

		if (createPRResponse.data.errors) {
			return {
				isError: true,
				message: createPRResponse.data.errors
			};
		} else {
			return createPRResponse.data.data.createPullRequest.pullRequest.url;
		}
	}
};
