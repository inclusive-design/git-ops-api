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
	 * @return {Object} An object keyed by "downloadUrl" (the url to download the new data file) and
	 * "date" (the last updated date of the data file in a format of YYYY-MM-DD). These values are `undefined` when
	 * the csv link is not found or any error happens.
	 */
	getDataSource: async (dataSourceURL) => {
		try {
			let res = await axios.get(dataSourceURL);
			let dom = new JSDOM(res.data);

			// find the CSV download link
			let downloadLink, publishedDate;
			let as = dom.window.document.querySelectorAll("a.dataset-download-link");
			for (let a of as) {
				const link = a.getAttribute("href");
				if (link.slice(-4) === ".csv") {
					downloadLink = link;
					var dateElmContent = a.closest(".resource-item").querySelector(".description.details").innerHTML;
					const matchStartStr = "Last Updated: ";
					const matchEndStr = " |";
					publishedDate = dateElmContent.substring(dateElmContent.lastIndexOf(matchStartStr) + matchStartStr.length, dateElmContent.lastIndexOf(matchEndStr));
					publishedDate = module.exports.formatDate(publishedDate);
					break;
				}
			}

			return {
				downloadUrl: downloadLink,
				publishedDate: publishedDate
			};
		} catch (error) {
			console.log("Error in getDataSource(): " + error);
			return {
				downloadUrl: undefined,
				publishedDate: undefined
			};
		}
	},

	/**
	 * Format the date format to YYYY-MM-DD
	 * @param {String} date A date in any format. In the context of this script, the input format is: November 17, 2020
	 * @return {String} A date in a format of YYYY-MM-DD. If the input is invalid, return NaN-NaN-NaN
	 */
	formatDate: (date) => {
		const d = new Date(date);
		let month = "" + (d.getMonth() + 1),
			day = "" + d.getDate(),
			year = d.getFullYear();

		month = month.length < 2 ? "0" + month : month;
		day = day.length < 2 ? "0" + day : day;

		return [year, month, day].join("-");
	},

	/**
	 * Check whether a given version of the data is in the repository
	 * @param {String} dataFileName The name of the file to look for
	 * @param {String} dataFileDir The folder where all data files are located
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
	 */
	downloadDataFile: async (downloadURL, targetFileLocation) => {
		try {
			let res = await axios.get(downloadURL);
			fs.writeFileSync(targetFileLocation, res.data, "utf8");
		} catch (error) {
			// do nothing
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
			console.log("Error at creating the new pull request: ", createPRResponse.data.errors);
			process.exit(1);
		} else {
			return createPRResponse.data.data.createPullRequest.pullRequest.url;
		}
	}
};
