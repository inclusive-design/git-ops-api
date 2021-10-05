/*
Copyright 2021 OCAD University

Licensed under the New BSD license. You may not use this file except in compliance with this licence.
You may obtain a copy of the BSD License at
https://raw.githubusercontent.com/inclusive-design/git-ops-api/main/LICENSE
*/

"use strict";

const fluid = require("infusion");
const jqUnit = fluid.require("node-jqunit", require, "jqUnit");

require("dotenv").config();

const gitOpsApi = require("../lib/gitOpsApi.js");

const access_token = process.argv[2] ? process.argv[2] : process.env.ACCESS_TOKEN;
if (!access_token) {
	console.log("Error: Please pass in an access token as a script argument or define it as an environment variable named ACCESS_TOKEN.");
	process.exit(1);
}

jqUnit.module("Test GITHUB Operation API");

const {
	Octokit
} = require("@octokit/core");

const octokit = new Octokit({
	auth: access_token
});

const repoOwner = "inclusive-design";
const repoName = "git-ops-api";
const branchName = "test-gitOpsApi";
const filePath = branchName + "/answers.json";
const dirPath = branchName;

const repoNameWrong = "nonexistent-repo";

//****************** Success cases ******************

jqUnit.test("Success cases for all API functions - ", async function () {
	jqUnit.expect(9);
	let response;

	try {
		response = await gitOpsApi.createBranch(octokit, {
			repoOwner: repoOwner,
			repoName: repoName,
			baseBranchName: "main",
			targetBranchName: branchName
		});
		jqUnit.assertEquals("createBranch() completes successfully.", "refs/heads/" + branchName, response.ref);

		response = await gitOpsApi.getBranchRef(octokit, {
			repoOwner: repoOwner,
			repoName: repoName,
			branchName: branchName
		});
		jqUnit.assertEquals("getBranchRef() completes successfully.", "refs/heads/" + branchName, response.ref);

		response = await gitOpsApi.getAllBranches(octokit, {
			repoOwner: repoOwner,
			repoName: repoName
		});
		jqUnit.assertTrue("getAllBranches() completes successfully.", Array.isArray(response));

		response = await gitOpsApi.getDirInfo(octokit, {
			repoOwner: repoOwner,
			repoName: repoName,
			path: dirPath,
			ref: branchName
		});
		jqUnit.assertTrue("getAllBranches() completes successfully.", Array.isArray(response));

		response = await gitOpsApi.createSingleFile(octokit, {
			repoOwner: repoOwner,
			repoName: repoName,
			branchName: branchName,
			filePath: filePath,
			fileContent: "{\"key\": \"from createSingleFile()\"}",
			commitMessage: "A test commit created by createSingleFile()"
		});
		jqUnit.assertTrue("createSingleFile() completes successfully.", response.includes("has been created successfully."));

		response = await gitOpsApi.getFileLastCommit(octokit, {
			repoOwner: repoOwner,
			repoName: repoName,
			branchName: branchName,
			filePath: filePath
		});
		jqUnit.assertTrue("getFileLastCommit() completes successfully.", typeof response.author === "object");

		const fileInfo = await gitOpsApi.fetchRemoteFile(octokit, {
			repoOwner: repoOwner,
			repoName: repoName,
			branchName: branchName,
			filePath: filePath
		});

		response = await gitOpsApi.updateSingleFile(octokit, {
			repoOwner: repoOwner,
			repoName: repoName,
			branchName: branchName,
			filePath: filePath,
			fileContent: "{\"key\": \"from createSingleFile()\", \"key2\": \"from updateSingleFile()\"}",
			commitMessage: "A test commit updated by updateSingleFile()",
			sha: fileInfo.sha
		});
		jqUnit.assertTrue("updateSingleFile() completes successfully.", response.includes("has been updated successfully."));

		response = await gitOpsApi.commitMultipleFiles(octokit, {
			repoOwner: repoOwner,
			repoName: repoName,
			branchName: branchName,
			files: [{
				path: "src/_data/answers.json",
				content: "{\"key\": \"from createSingleFile()\", \"key2\": \"from updateSingleFile()\", \"key3\": \"from commitMultipleFiles()\"}"
			}, {
				path: "src/_data/new.txt",
				content: "a new file created by commitMultipleFiles()"
			}],
			commitMessage: "A test commit from commitMultipleFiles()"
		});
		jqUnit.assertTrue("commitMultipleFiles() completes successfully.", response.includes("successfully."));

		response = await gitOpsApi.issuePullRequest(octokit, {
			repoOwner: repoOwner,
			repoName: repoName,
			issuerGithubId: repoOwner,
			branchName: branchName,
			pullRequestTitle: "A test pull request issued by issuePullRequest()"
		});
		jqUnit.assertTrue("The pull request url is returned", response.startsWith("https://github.com/"));

		return gitOpsApi.deleteBranch(octokit, {
			repoOwner: repoOwner,
			repoName: repoName,
			branchName: branchName
		}).then(function (response) {
			jqUnit.assertTrue("deleteBranch() completes successfully.", response.includes("has been deleted successfully"));
		});
	} catch (error) {
		return gitOpsApi.deleteBranch(octokit, {
			repoOwner: repoOwner,
			repoName: repoName,
			branchName: branchName
		}).then(function () {
			console.log("Cleaned up.");
			jqUnit.fail("The test sequence for testing success cases of API fails with this error: ", error.message);
		}).catch(function (e) {
			console.log("Failed at the clean up with an error: ", e.message);
			jqUnit.fail("The test sequence for testing success cases of API fails with this error: ", error.message);
		});
	}
});

//****************** Test fetchRemoteFile() - Not found case ******************
jqUnit.test("Test fetchRemoteFile() - the file does not exist", function () {
	jqUnit.expect(1);
	return gitOpsApi.fetchRemoteFile(octokit, {
		repoOwner: repoOwner,
		repoName: repoNameWrong,
		branchName: branchName,
		filePath: "src/_data/answers.json"
	}).then(function (response) {
		jqUnit.assertFalse("File is not found.", response.exists);
	}).catch(function () {
		jqUnit.fail("fetchRemoteFile() should not fail.");
	});
});

//****************** Failed cases ******************

//****************** Test createBranch() ******************
jqUnit.test("Failed case for createBranch()", function () {
	jqUnit.expect(1);
	return gitOpsApi.createBranch(octokit, {
		repoOwner: repoOwner,
		repoName: repoNameWrong,
		baseBranchName: "main",
		targetBranchName: branchName
	}).then(function () {
		jqUnit.fail("createBranch() should not complete successfully.");
	}).catch(function (error) {
		jqUnit.assertTrue("The value of isError is set to true", error.isError);
	});
});

//****************** Test deleteBranch() ******************
jqUnit.test("Failed case for deleteBranch()", function () {
	jqUnit.expect(1);
	return gitOpsApi.deleteBranch(octokit, {
		repoOwner: repoOwner,
		repoName: repoNameWrong,
		branchName: branchName
	}).then(function () {
		jqUnit.fail("deleteBranch() should not complete successfully.");
	}).catch(function (error) {
		jqUnit.assertTrue("The value of isError is set to true", error.isError);
	});
});

//****************** Test getBranchRef() ******************
jqUnit.test("Failed case for getBranchRef()", function () {
	jqUnit.expect(1);
	return gitOpsApi.getBranchRef(octokit, {
		repoOwner: repoOwner,
		repoName: repoNameWrong,
		branchName: branchName
	}).then(function () {
		jqUnit.fail("getBranchRef() should not complete successfully.");
	}).catch(function (error) {
		jqUnit.assertTrue("The value of isError is set to true", error.isError);
	});
});

//****************** Test getAllBranches() ******************
jqUnit.test("Failed case for getAllBranches()", function () {
	jqUnit.expect(1);
	return gitOpsApi.getAllBranches(octokit, {
		repoOwner: repoOwner,
		repoName: repoNameWrong
	}).then(function () {
		jqUnit.fail("getAllBranches() should not complete successfully.");
	}).catch(function (error) {
		jqUnit.assertTrue("The value of isError is set to true", error.isError);
	});
});

//****************** Test getDirInfo() ******************
jqUnit.test("Failed case for getDirInfo()", function () {
	jqUnit.expect(1);
	return gitOpsApi.getDirInfo(octokit, {
		repoOwner: repoOwner,
		repoName: repoNameWrong
	}).then(function () {
		jqUnit.fail("getDirInfo() should not complete successfully.");
	}).catch(function (error) {
		jqUnit.assertTrue("The value of isError is set to true", error.isError);
	});
});

//****************** Test getFileLastCommit() ******************
jqUnit.test("Failed case for getFileLastCommit()", function () {
	jqUnit.expect(1);
	return gitOpsApi.getFileLastCommit(octokit, {
		repoOwner: repoOwner,
		repoName: repoNameWrong,
		branchName: branchName,
		filePath: "src/_data/answers.json"
	}).then(function () {
		jqUnit.fail("getFileLastCommit() should not complete successfully.");
	}).catch(function (error) {
		jqUnit.assertTrue("The value of isError is set to true", error.isError);
	});
});

//****************** Test createSingleFile() ******************
jqUnit.test("Failed case for createSingleFile()", function () {
	jqUnit.expect(1);
	return gitOpsApi.createSingleFile(octokit, {
		repoOwner: repoOwner,
		repoName: repoNameWrong,
		branchName: branchName,
		filePath: "src/_data/answers.json",
		fileContent: "{\"key\": \"test value\"}",
		commitMessage: "A test commit created by createSingleFile()"
	}).then(function () {
		jqUnit.fail("createSingleFile() should not complete successfully.");
	}).catch(function (error) {
		jqUnit.assertTrue("The value of isError is set to true", error.isError);
	});
});

//****************** Test updateSingleFile() ******************
jqUnit.test("Failed case for updateSingleFile()", function () {
	jqUnit.expect(1);

	return gitOpsApi.fetchRemoteFile(octokit, {
		repoOwner: repoOwner,
		repoName: repoName,
		branchName: "main",
		filePath: "README.md"
	}).then((fileInfo) => {
		return gitOpsApi.updateSingleFile(octokit, {
			repoOwner: repoOwner,
			repoName: repoNameWrong,
			branchName: branchName,
			filePath: "src/_data/answers.json",
			fileContent: "{\"key\": \"test value\", \"key2\": \"from updateSingleFile()\"}",
			commitMessage: "A test commit updated by updateSingleFile()",
			sha: fileInfo.sha
		}).then(function () {
			jqUnit.fail("updateSingleFile() should not complete successfully.");
		}).catch(function (error) {
			jqUnit.assertTrue("The value of isError is set to true", error.isError);
		});
	});
});

//****************** Test commitMultipleFiles() ******************
jqUnit.test("Failed case for commitMultipleFiles()", function () {
	jqUnit.expect(1);

	return gitOpsApi.commitMultipleFiles(octokit, {
		repoOwner: repoOwner,
		repoName: repoNameWrong,
		branchName: branchName,
		files: [{
			path: "src/_data/answers.json",
			content: "{\"key\": \"test value\", \"key2\": \"extra value\", \"key3\": \"from commitMultipleFiles()\"}"
		}, {
			path: "src/_data/new.txt",
			content: "a new file created by commitMultipleFiles()"
		}],
		commitMessage: "A test commit from commitMultipleFiles()"
	}).then(() => {
		jqUnit.fail("commitMultipleFiles() should not complete successfully.");
	}).catch(function (error) {
		jqUnit.assertTrue("The value of isError is set to true", error.isError);
	});
});

//****************** Test issuePullRequest() ******************
jqUnit.test("Failed case for issuePullRequest()", function () {
	jqUnit.expect(1);
	return gitOpsApi.issuePullRequest(octokit, {
		repoOwner: repoOwner,
		repoName: repoNameWrong,
		issuerGithubId: repoOwner,
		branchName: branchName,
		pullRequestTitle: "A test pull request issued by the API issuePullRequest()"
	}).then(function () {
		jqUnit.fail("issuePullRequest() should not complete successfully.");
	}).catch(function (error) {
		jqUnit.assertTrue("The value of isError is set to true", error.isError);
	});
});
