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
// Before running this script, an environment variable GITHUB_ACCOUNT_URL must be defined . This variable defines
// the Github repository URL with an embedded authenticated github account that pull requests will be issued on behalf.
// An example: https://{username}:{personal-access-token}@github.com/wecountproject/covid-assessment-centres.git
//
// A sample command that runs this script in the universal root directory:
// node scripts/fetchODCDataFiles.js https://data.ontario.ca/dataset/covid-19-assessment-centre-locations ODC

"use strict";

const fs = require("fs");
const rimraf = require("rimraf");
const utils = require("./fetchODCDataFilesUtils.js");
require("json5/lib/register");

const issuerRepoUrl = process.env.GITHUB_ACCOUNT_URL;

if (!issuerRepoUrl) {
	console.log("Error: Please define an environment variable \"GITHUB_ACCOUNT_URL\" with a value of an authenticated Github account URL that will be used to create remote branches on behalf of this account.\n");
	console.log("The command to define an temporary environment variable in a terminal: export GITHUB_ACCOUNT_URL={value}\n");
	console.log("An example of the environment variable value: https://{username}:{personal-access-token}@github.com/wecountproject/covid-assessment-centres.git");
	process.exit(1);
}

const config = require("./fetchODCConfig.json5");

const dataSourceUrl = config.dataSourceUrl;
const dataDirInRepo = config.dataDirInRepo;
const covidDataRepoUrl = config.covidDataRepoUrl;
const githubAPI = config.githubAPI;
const latestFileTemplate = config.latestFileTemplate;
const branchNameTemplate = config.branchNameTemplate;

// The name of the temporary local directory for cloning the covid data repo locally
const clonedLocalDir = "covid-data-repo";

// Use regex to parse out the personal access token and the repo name embedded in the `issuerRepoUrl`
const re = /https:.*:(.*)@github.com\/(.*)\/.*/;
const matches = re.exec(issuerRepoUrl);
const issuerAccessToken = matches[1];
const issuerGithubId = matches[2];

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
	await utils.prepareLocalRepo(covidDataRepoUrl, clonedLocalDir, issuerRepoUrl);

	const dataFileDir = "./" + clonedLocalDir + "/" + dataDirInRepo + "/";
	if (utils.fileNotExists(dataFileName, dataFileDir)) {
		console.log("Downloading the new data file...");
		const downloadStatus = await utils.downloadDataFile(downloadUrl, dataFileDir + dataFileName);

		if (downloadStatus.isError) {
			console.log("Error at downloading the file from " + downloadUrl + ": " + downloadStatus.message);
			rimraf.sync(clonedLocalDir);
			process.exit(1);
		}

		console.log("Updating latest.json with the new data file name...");
		fs.writeFileSync(dataFileDir + "latest.json", latestFileTemplate.replace("$filename", dataFileName), "utf8");

		const branchName = branchNameTemplate.replace("$timestamp", publishedDate);
		console.log("Pushing updated files to a remote branch named \"" + branchName + "\"...");
		await utils.createRemoteBranch(branchName, publishedDate, clonedLocalDir);

		console.log("Removing the local temporary directory...");
		rimraf.sync(clonedLocalDir);

		console.log("Issuing a pull request based off the remote branch...");
		const pr = await utils.issuePullRequest(githubAPI, covidDataRepoUrl, issuerGithubId, issuerAccessToken, branchName, publishedDate);
		if (pr.isError) {
			console.log("Error at issuing pull request: " + JSON.stringify(pr.message));
			process.exit(1);
		} else {
			console.log("Done: A pull request with the new ODC data file has been issued at " + pr);
		}
	} else {
		rimraf.sync(clonedLocalDir);
		console.log("Done: No new data file");
	}
};

main();
