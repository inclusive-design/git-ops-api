/*
Copyright 2020 OCAD University

Licensed under the New BSD license. You may not use this file except in compliance with this licence.
You may obtain a copy of the BSD License at
https://raw.githubusercontent.com/inclusive-design/data-update-github/main/LICENSE
*/

// This script checks if a new data file is published on the data source URL. If there is,
// the script downloads the file, updates the corresponding latest.json and issues a pull request
// against [the COVID data repository](https://github.com/inclusive-design/covid-assessment-centres/).
//
// Prerequisites:
// Before running this script, these environment variables need to be defined.
// ACCESS_TOKEN
// REPO_OWNER
// REPO_NAME
//
// A sample command that runs this script in the universal root directory:
// node scripts/fetchODCDataFiles.js

"use strict";

require('dotenv').config();

const fs = require("fs");
const rimraf = require("rimraf");
const gitOpsApi = require("./gitOpsApi.js");
const utils = require("./fetchODCDataFilesUtils.js");
require("json5/lib/register");

const accessToken = process.env.ACCESS_TOKEN;
const repoOwner = process.env.REPO_OWNER;
const repoName = process.env.REPO_NAME;
const branchName = "test";

if (!accessToken || !repoOwner || !repoName) {
	console.log("Error: Please define these environment variables: ACCESS_TOKEN, REPO_OWNER, REPO_NAME.");
	process.exit(1);
}

const config = require("./fetchODCConfig.json5");

const dataSourceUrl = config.dataSourceUrl;
const dataDirInRepo = config.dataDirInRepo;
const covidDataRepoUrl = config.covidDataRepoUrl;
const githubGraphqlAPI = config.githubGraphqlAPI;
const latestFileTemplate = config.latestFileTemplate;
const branchNameTemplate = config.branchNameTemplate;

// The main function
async function main() {
	// Find the date of the data file currently on the ODC website
	const dataSourceResponse = await utils.getDataSource(dataSourceUrl);

	// Exit with an error if a csv data file is not found at the data source website.
	if (dataSourceResponse.isError) {
		console.log("Error at retrieving CSV download links from " + dataSourceUrl + ": A csv data file is not found at " + dataSourceUrl);
		process.exit(1);
	}

	const downloadUrl = dataSourceResponse.downloadUrl;
	const publishedDate = dataSourceResponse.publishedDate;
	const dataFileName = "assessment_centre_locations_" + publishedDate.replace(/-/g, "_") + ".csv";

	// Clone the COVID data repo to local directory to check if the data file on the ODC website is new
	console.log("Checking if a new data file is published on the ODC website: " + dataSourceUrl + "...");
	const checkFileExists = await gitOpsApi.fetchRemoteFile(repoOwner, repoName, branchName, dataDirInRepo + "/" + dataFileName);

	if (checkFileExists.isError) {
		console.log("Error at fetching data file " + dataDirInRepo + "/" + dataFileName + " from https://github.com/" + repoOwner + "/" + repoName + "/tree/main/: " + checkFileExists.message);
		process.exit(1);
	} else if (checkFileExists.exists) {
		console.log("Done: No new data file");
	} else {
		// download the file and save to the Github repository
		console.log("Downloading the new data file...");
		const newDataFileContent = await utils.downloadDataFile(downloadUrl);

		if (newDataFileContent.isError) {
			console.log("Error at downloading the file from " + downloadUrl + ": " + newDataFileContent.message);
			process.exit(1);
		} else {
			console.log(dataFileName + " is downloaded.");
		}

		const files = [{
			path: dataDirInRepo + "/" + dataFileName,
			content: newDataFileContent
		}, {
			path: dataDirInRepo + "/latest.json",
			content: latestFileTemplate.replace("$filename", dataFileName)
		}];

		gitOpsApi.commitMultipleFiles(repoOwner, repoName, branchName, files, "feat: commit a new ODC data file published at " + dataSourceUrl)
		.then(() => {
			console.log("Done: the new data file and updated latest.json have been committed.");
		}).catch((e) => {
			console.log("Error at committing the new data file and updated latest.json: ", e.message);
			process.exit(1);
		});
	}
};

main();
