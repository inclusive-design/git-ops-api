// This script checks if a new data file is published on the data source URL. If there is,
// it downloads the file, writes into a local file and updates the corresponding latest.json.
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

const wecountprojectRepoUrl = process.env.GITHUB_ACCOUNT_URL;

if (!wecountprojectRepoUrl) {
	console.log("Error: Please define an environment variable \"GITHUB_ACCOUNT_URL\" with a value of an authenticated Github account URL that will be used to create remote branches on behalf of this account.\n");
	console.log("The command to define an temporary environment variable in a terminal: export GITHUB_ACCOUNT_URL={value}\n");
	console.log("An example of the environment variable value: https://{username}:{personal-access-token}@github.com/wecountproject/covid-assessment-centres.git");
	process.exit(1);
}

var dataSourceURL = process.argv[2];
var dataDirInRepo = process.argv[3];

if (process.argv.length < 3) {
	console.log("Usage: node scripts/fetchODCDataFiles.js dataSourceURL dataDirInRepo\n");
	console.log("dataSourceURL: The URL to webpage where the data file for COVID-19 assessment centre locations is published. An example: https://data.ontario.ca/dataset/covid-19-assessment-centre-locations");
	console.log("dataDirInRepo: The directory where the downloaded data file should be placed in the COVID-19 data repository(https://github.com/inclusive-design/covid-assessment-centres/). This directory is relative to the root directory of the repository ");
	process.exit(1);
}

// The central COVID-19 data repository on Github
const covidDataRepoUrl = "https://github.com/cindyli/covid-assessment-centres.git";
// const covidDataRepoUrl = "https://github.com/inclusive-design/covid-assessment-centres.git";
const clonedLocalDir = "covid-data-repo";
const githubAPI = "https://api.github.com/graphql";

const latestFileTemplate = "{\n\t\"fileName\": \"$filename\"\n}\n";
const branchNameTemplate = "ODC-new-data-file-$timestamp";

// Use regex to parse out the personal access token and the repo name embedded in the `wecountprojectRepoUrl`
const re = /https:.*:(.*)@.*/;
const matches = re.exec(wecountprojectRepoUrl);
const accessToken = matches[1];

// The main function
async function main() {
	// Find the date of the data file currently on the ODC website
	let { downloadURL, publishedDate } = await utils.getDataSource(dataSourceURL);
	let dataFileName = utils.generateDataFileName(publishedDate);

	// Clone the COVID data repo to local directory to check if the data file on the ODC website is new
	console.log("Checking if a new data file is published on the ODC website: " + dataSourceURL + "...");
	await utils.prepareLocalRepo(covidDataRepoUrl, clonedLocalDir, wecountprojectRepoUrl);

	const dataFileDir = "./" + clonedLocalDir + "/" + dataDirInRepo + "/";
	if (utils.fileNotExists(dataFileName, dataFileDir)) {
		console.log("Downloading the new data file...");
		await utils.downloadDataFile(downloadURL, dataFileDir + dataFileName);

		console.log("Updating latest.json with the new data file name...");
		fs.writeFileSync(dataFileDir + "latest.json", latestFileTemplate.replace("$filename", dataFileName), "utf8");

		const branchName = branchNameTemplate.replace("$timestamp", publishedDate);
		console.log("Pushing updated files to a remote branch named \"" + branchName + "\"...");
		await utils.createRemoteBranch(branchName, publishedDate, clonedLocalDir);

		console.log("Removing the local temporary directory...");
		rimraf.sync(clonedLocalDir);

		console.log("Issuing a pull request based off the remote branch...");
		const prUrl = await utils.issuePullRequest(githubAPI, covidDataRepoUrl, accessToken, branchName, publishedDate);
		console.log("Done: A pull request with the new ODC data file has been issued at " + prUrl);
	} else {
		rimraf.sync(clonedLocalDir);
		console.log("Done: No new data file");
	}
};

main();
