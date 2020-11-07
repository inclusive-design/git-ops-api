// This script checks if a new data file is published on the data source URL. If there is,
// it downloads the file, writes into a local file and updates the corresponding latest.json.
//
// A sample command that runs this script in the universal root directory:
// node scripts/update.js

"use strict";

const fs = require("fs");
const axios = require("axios");
const JSDOM = require("jsdom").JSDOM;
const rimraf = require("rimraf");
const git = require("simple-git")();

// const dataSourceURL = process.argv[2];
// const localDataFileDir = process.argv[3];
const dataSourceURL = "https://data.ontario.ca/dataset/covid-19-assessment-centre-locations";
const localDataFileDir = "ODC";
const covidDataRepoUrl = "https://github.com/cindyli/covid-assessment-centres.git";
// const covidDataRepoUrl = "https://github.com/inclusive-design/covid-assessment-centres.git";
const clonedLocalDir = "covid-data-repo";
const wecountprojectRepoUrl = "https://wecount.info%40gmail.com:70c1abfb059d545ada3c98ac8519bc1c9de84230@github.com/wecountproject/covid-assessment-centres.git";
const githubAPI = "https://api.github.com/graphql";

const latestFileTemplate = "{\n\t\"fileName\": \"$filename\"\n}\n";
const branchNameTemplate = "ODC-new-data-file-$timestamp";

// Use regex to parse out the personal access token and the repo name embedded in the `wecountprojectRepoUrl`
const re = /https:.*:(.*)@.*/;
const matches = re.exec(wecountprojectRepoUrl);
const accessToken = matches[1];

/**
 * Scrape the download link and date of last update from the ODS repository page
 * @param {String} dataSourceURL The URL to the webpage where the information of the data file is published
 * @return {Object} An object keyed by "downloadURL" (the url to download the new data file) and
 * "date" (the last updated date of the data file).
 */
async function getDataSource(dataSourceURL) {

	let res = await axios.get(dataSourceURL);
	let data = res.data;
	let dom = new JSDOM(data);

	const findElements = function (selector) {
		return dom.window.document.querySelectorAll(selector);
	};

	// find the CSV download link
	let downloadLink;
	let as = findElements("a.dataset-download-link");
	for (let a of as) {
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
};

/**
 * Generate the name for a data file based on the date it was uploaded
 * @param {String} date The date the file was uploaded, in ISO 8601 format (YYYY-MM-DD)
 * @return {String} The filename in format assessment_centre_locations_YYYY_MM_DD.csv
 */
function generateDataFileName(date) {
	return "assessment_centre_locations_" + date.replace(/-/g, "_") + ".csv";
};

/**
 * Check whether a given version of the data is in the repository
 * @param {String} dataFileName The name of the file to look for
 * @param {String} dataFileDir The folder where all data files are located
 * @return {Boolean} true if the file name is already present in the data folder, false if not
 */
function hasNewDataFile(dataFileName, dataFileDir) {
	let allFiles = fs.readdirSync(dataFileDir);
	return !allFiles.includes(dataFileName);
};

/**
 * Download a file from the given download URL and write into a target local file.
 * @param {String} downloadURL The download URL
 * @param {String} targetFileLocation The target file location including the path and file name
 */
async function downloadDataFile(downloadURL, targetFileLocation) {
	let res = await axios.get(downloadURL);
	fs.writeFileSync(targetFileLocation, res.data, "utf8");
};

function exitWithError(err, clonedLocalDir) {
	rimraf.sync(clonedLocalDir);
	console.log(err);
	process.exit(1);
}

// Clone the COVID data repository and push the new data file to a remote branch
async function prepareLocalRepo(covidDataRepoUrl, clonedLocalDir, wecountprojectRepoUrl) {
	await git.clone(covidDataRepoUrl, clonedLocalDir)
		.cwd(clonedLocalDir)
		.addRemote("wecountproject", wecountprojectRepoUrl)
		.catch((err) => exitWithError(err, clonedLocalDir));
}

// Clone the COVID data repository and push the new data file to a remote branch
async function createRemoteBranch(branchName, publishedDate, clonedLocalDir) {
	await git.checkoutLocalBranch(branchName)
		.add("./*")
		.commit("feat: commit a new ODC data file published on " + publishedDate)
		.push("wecountproject", branchName)
		.catch(() => exitWithError("Error at pushing to a remote branch named " + branchName + ". Check if this remote branch already exists.", clonedLocalDir));
}

async function issuePullRequest(githubAPI, covidDataRepoUrl, accessToken, branchName, publishedDate) {
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

// The main function
async function main() {
	// Find the date of the data file currently on the ODC website
	let { downloadURL, publishedDate } = await getDataSource(dataSourceURL);
	let dataFileName = generateDataFileName(publishedDate);

	// Clone the COVID data repo to local directory to check if the data file on the ODC website is new
	await prepareLocalRepo(covidDataRepoUrl, clonedLocalDir, wecountprojectRepoUrl);

	const dataFileDir = "./" + clonedLocalDir + "/" + localDataFileDir + "/";
	if (hasNewDataFile(dataFileName, dataFileDir)) {
		// Download the new data file to the local directory
		await downloadDataFile(downloadURL, dataFileDir + dataFileName);
		// Update latest.json in the local directory
		fs.writeFileSync(dataFileDir + "latest.json", latestFileTemplate.replace("$filename", dataFileName), "utf8");
		// Push updated files to a remote branch
		const branchName = branchNameTemplate.replace("$timestamp", publishedDate);
		await createRemoteBranch(branchName, publishedDate, clonedLocalDir);
		// Clean up by remving the cloned repo at local
		rimraf.sync(clonedLocalDir);
		// Send a pull request
		const prUrl = await issuePullRequest(githubAPI, covidDataRepoUrl, accessToken, branchName, publishedDate);
		console.log("Done: A pull request with the new ODC data file has been issued at " + prUrl);
	} else {
		rimraf.sync(clonedLocalDir);
		console.log("Done: No new data file");
	}
};

main();
