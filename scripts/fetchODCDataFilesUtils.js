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
const rimraf = require("rimraf");
const git = require("simple-git")();

module.exports = {
	/**
	 * Scrape the download link and date of last update from the ODS repository page
	 * @param {String} dataSourceUrl - The URL to the webpage where the information of the data file is published
	 * @return {Object} An object keyed by "downloadUrl" (the url to download the new data file) and
	 * "date" (the last updated date of the data file in a format of YYYY-MM-DD). These values are `undefined` when
	 * the csv link is not found or any error happens.
	 */
	getDataSource: async (dataSourceUrl) => {
		try {
			let res = await axios.get(dataSourceUrl);

			// find the CSV download link
			let csvLinks = [];
			let dataLinks = res.data.result.resources;

			for (let oneLink of dataLinks) {
				const link = oneLink.url;
				if (link.endsWith(".csv")) {
					if (!module.exports.isValidDate(oneLink.data_last_updated)) {
						return {
							isError: true,
							message: "The published date (" + oneLink.data_last_updated + ") is invalid. Check if it is in the format or \"yyyy-mm-dd\""
						};
					}
					csvLinks.push({
						downloadUrl: link,
						publishedDate: oneLink.data_last_updated
					});
				}
			}

			const numOfCsvLinks = csvLinks.length;

			// Return the csv link and its published date only when one and only one csv link is found. Otherwise, report error.
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
	 * Validate the date is in the format of "yyyy-mm-dd". "mm" and "dd" allow one or two digits
	 * @param {String} date - A date in any format. In the context of this script, a valid input format is: 2020-11-17
	 * @return {Boolean} Return true if the format is correct. Otherwise, return false.
	 */
	isValidDate: (date) => {
		if (!date) {
			return false;
		}
		const pattern = /^(\d{4})-(\d{1,2})-(\d{1,2})$/;
		const matches = pattern.exec(date.trim());
		return matches !== null;
	},

	/**
	 * Check whether a given version of the data is in the directory
	 * @param {String} dataFileName - The name of the file to look for
	 * @param {String} dataFileDir - The directory where all data files are located
	 * @return {Boolean} true if the file name is already present in the data folder, false if not
	 */
	fileNotExists: (dataFileName, dataFileDir) => {
		let allFiles = fs.readdirSync(dataFileDir);
		return !allFiles.includes(dataFileName);
	},

	/**
	 * Download a file from the given download URL and write into a target local file.
	 * @param {String} downloadURL - The download URL
	 * @param {String} targetFileLocation - The target file location including the path and file name
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

	/**
	 * Clone the COVID data repository and the issuer account as a git remote
	 * @param {String} covidDataRepoUrl - The URL of the data repo to clone
	 * @param {String} clonedLocalDir - The name of the local directory that the data repo will be cloned to
	 * @param {String} issuerRepoUrl - The Github repository URL with an embedded authenticated Github account
 	*  that pull requests will be issued on behalf
	 */
	prepareLocalRepo: async (covidDataRepoUrl, clonedLocalDir, issuerRepoUrl) => {
		await git.clone(covidDataRepoUrl, clonedLocalDir)
			.cwd(clonedLocalDir)
			.addRemote("wecountproject", issuerRepoUrl)
			.catch((err) => module.exports.exitWithError(err, clonedLocalDir));
	},

	/**
	 * Push new data files to a remote branch
	 * @param {String} branchName - The name of the remote branch
	 * @param {String} publishedDate - The published date of the new data files. Used in the commit message
	 * @param {String} clonedLocalDir - The name of the local directory that the data repo will be cloned to
	 */
	createRemoteBranch: async (branchName, publishedDate, clonedLocalDir) => {
		await git.checkoutLocalBranch(branchName)
			.add("./*")
			.commit("feat: commit a new ODC data file published on " + publishedDate)
			.push("wecountproject", branchName)
			.catch((err) => module.exports.exitWithError("Error at pushing to a remote branch named " + branchName + ". Check either the authentication or whether the remote branch " + branchName + " already exists.\n" + err, clonedLocalDir));
	},

	/**
	 * Issue pull request against the data repo on behalf of an issuer account
	 * @param {String} githubAPI - The URL of the Github GraphQL API
	 * @param {String} covidDataRepoUrl - The URL of the data repo that the pull request will be issued against
	 * @param {String} issuerGithubId - The Github account that the pull request will be issued on behalf of
	 * @param {String} issuerAccessToken - The personal access token of the Github account that the pull request will
	 * be issued on behalf of
	 * @param {String} branchName - The name of the remote branch
	 * @param {String} publishedDate - The published date of the new data files. Used in the commit message
	 * @return {String|Object} return the URL of the issued pull request when the pull request is issued successfully.
	 * otherwise, return the error object in a structure of: {isError: true, message: detailed-error-message}
	 */
	issuePullRequest: async (githubAPI, covidDataRepoUrl, issuerGithubId, issuerAccessToken, branchName, publishedDate) => {
		// Parse out the owner and repo name that the pull request will be issued against
		const pattern = /https:\/\/github.com\/(.*)\/(.*).git/;
		const matches = pattern.exec(covidDataRepoUrl);
		const repoOwner = matches[1];
		const repoName = matches[2];

		const headers = {
			"Authorization": "bearer " + issuerAccessToken
		};

		const repoInfoResponse = await axios.post(githubAPI, {
			query: `query {
			repository(owner: "${repoOwner}", name: "${repoName}") {
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
					headRefName: "${issuerGithubId}:${branchName}",
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
