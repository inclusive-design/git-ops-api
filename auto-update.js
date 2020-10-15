const path = require("path");
const fs = require("fs");
const axios = require("axios");
const JSDOM = require("jsdom").JSDOM;
const { spawn } = require("child_process");

// grab constants from the configuration file
const config = require("./auto-update-config.json");


/*
 * TODO:
 *  - finish shell scripts
 *  - determine what externalities need to be configurable for testing and put them in the config file, e.g. the target rep/branch for the PR
 *  - test that config.repoFolder exists/contains a git repo, and if not, run the cloneRepo script
 *  - figure out how to make the bash script send commits/PRs on behalf of a specific account
 */

/*
 * Scrape the download link and date of last update from the ODS repository page 
 */
async function getDataSource(config) {

    let res = await axios.get(config.dataSourceURL);
    let data = res.data;
    let dom = new JSDOM(data);

    const findElements = function (selector) {
        return dom.window.document.querySelectorAll(selector);
    };

    // find the CSV download link
    let downloadLink = undefined;
    let as = findElements("a.dataset-download-link");
    for (let a of as) {
        let link = a.getAttribute("href");
        if (link.slice(-4) === ".csv") {
            downloadLink = link;
            break;
        }
    }

    // find the last date the dataset was updated
    let lastUpdate = undefined;
    let tableHeaders = findElements("th.dataset-label");
    for (let header of tableHeaders) {
        if (header.innerHTML === "Last Validated Date") {
            lastUpdate = header.parentElement.querySelector('td.dataset-details').innerHTML.trim();
            break;
        }
    }

    return {
        downloadURL: downloadLink,
        date: lastUpdate
    };
};

/**
 * Fetch the local git repo
 */
/* TODO: deprecate in favor of bash script
async function doUpdate(config, downloadURL, branchName, dataFileName) {
    try {
        debugger;
        let repo = await Git.Repository.open(__dirname);
        let fileToStage = path.join('./versions/', dataFileName);

        // git fetch upstream
        await repo.fetch("upstream");

        // git checkout -b {branchName}
        let headCommit = await repo.getHeadCommit();
        let branchRef = await repo.createBranch(branchName, headCommit, 0);
        await repo.checkoutBranch(branchRef, {});

        await downloadDataFile(downloadURL, dataFileName);

        // git add {fileToStage}
        // git commit -m {config.commitMessage}
        let index = await repo.index();
        index.addByPath(fileToStage);
        index.write();
        let oid = await index.writeTree();
        let head = await Git.Reference.nameToId(repo, "HEAD");
        let parent = await repo.getCommit(head);
        let author = Git.Signature.now("Author Name", config.author);
        let commiter = Git.Signature.now("Committer Name", config.committer);
        let commitId = await repo.createCommit("HEAD", author, commiter, config.commitMessage, oid, [parent]);

        throw new Error("TODO");

        // TODO: git push origin {generated branch name}
        // (below is untested code based on an example)
        let remote = await repo.getRemote("origin");
        remote.setCallbacks({
            credentials: function (url, userName) {
                return nodegit.Cred.sshKeyFromAgent(userName);
            }
        });
        await remote.connect(Git.Enums.DIRECTION.PUSH);
        await remote.push(
            ["refs/head/" + branchName],
            null,
            repo.defaultSignature(),
            "Push to " + branchName
        );

        // TODO: make a pull request from origin/{branch} to upstream/{branch}
    } catch (reason) {
        console.log(reason);
    }
};
*/

/* TODO: deprecate in favor of bash script
async function downloadDataFile(downloadURL, dataFileName) {
    // let dataFile = fs.createWriteStream(dataFileName);
    let res = await axios.get(downloadURL);
    fs.writeFileSync(path.join("./versions/", dataFileName), res.data, "utf8");
};
*/

/**
 * Generate the name for a data file based on the date it was uploaded
 * @param {string} date the date the file was uploaded, in ISO 8601 format (YYYY-MM-DD)
 * @returns filename in format assessment_centre_locations_YYYY_MM_DD.csv
 */
function generateDataFileName(date) {
    return "assessment_centre_locations_" + date.replace(/-/g, "_") + ".csv";
};

/**
 *  Generate the name for the new remote branch an update will be packaged in
 * @param {string} date the date the file was uploaded, in ISO 8601 format (YYYY-MM-DD)
 * @returns new branch name, format "data-ontario-YYYY-MM-DD"
 */
function generateBranchName(date) {
    return "data-ontario-" + date;
}

/**
 * FIXME: this method of checking doesn't work anymore, since we have restructured the data repository
 * Check whether a given version of the data is in the repository
 * @param {string} dataFileName the name of the file to look for
 * @returns true if the file name is already present in the versions folder, false if not
 */
function dataFileIsInRepo(dataFileName) {
    let versions = fs.readdirSync(path.join(__dirname, config.repoFolder, "/versions/"));
    return versions.includes(dataFileName);
};


// FIXME: all of this work should occur as a transaction, so that if an error happens e.g. while trying to push the file, the download from data.ontario.ca is undone
async function main() {
    let { downloadURL, date } = await getDataSource(config);
    let dataFileName = generateDataFileName(date);
    let branchName = generateBranchName(date);
    if (!dataFileIsInRepo(dataFileName)) {
        const deploySh = spawn("sh", [
            "doUpdate.sh",
            branchName,
            dataFileURL,
            path.join("/versions/", dataFileName),
            config.commitMessage
        ], {
            cwd: path.join(__dirname),
            env: Object.assign({}, process.env, {
                PATH: process.env.PATH + ":/usr/local/bin"
            })
        });
    }
};

main();
