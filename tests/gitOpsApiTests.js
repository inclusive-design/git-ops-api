/*
Copyright 2021 OCAD University

Licensed under the New BSD license. You may not use this file except in compliance with this licence.
You may obtain a copy of the BSD License at
https://raw.githubusercontent.com/inclusive-design/data-update-github/main/LICENSE
*/

"use strict";

const fluid = require("infusion");
const jqUnit = fluid.require("node-jqunit", require, "jqUnit");

require("dotenv").config();

const gitOpsApi = require("../scripts/gitOpsApi.js");

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
const repoName = "data-update-github";
const branchName = "test-gitOpsApi";
const filePath = branchName + "/answers.json";

const repoNameWrong = "nonexistent-repo";

//****************** Success cases ******************

jqUnit.test("Success cases for all API functions - ", function () {
	jqUnit.expect(8);

	return gitOpsApi.createBranch(octokit, {
		repoOwner: repoOwner,
		repoName: repoName,
		baseBranchName: "main",
		targetBranchName: branchName
	}).then(function (res) {
		jqUnit.assertEquals("createBranch() completes successfully.", "refs/heads/" + branchName, res.ref);
		return gitOpsApi.getBranchRef(octokit, {
			repoOwner: repoOwner,
			repoName: repoName,
			branchName: branchName
		});
	}).then(function (res) {
		jqUnit.assertEquals("getBranchRef() completes successfully.", "refs/heads/" + branchName, res.ref);
		return gitOpsApi.getAllBranches(octokit, {
			repoOwner: repoOwner,
			repoName: repoName
		});
	}).then(function (res) {
		jqUnit.assertTrue("getAllBranches() completes successfully.", Array.isArray(res));
		return gitOpsApi.createSingleFile(octokit, {
			repoOwner: repoOwner,
			repoName: repoName,
			branchName: branchName,
			filePath: filePath,
			fileContent: "{\"key\": \"from createSingleFile()\"}",
			commitMessage: "A test commit created by createSingleFile()"
		});
	}).then(function (res) {
		jqUnit.assertTrue("createSingleFile() completes successfully.", res.includes("has been created successfully."));
		return gitOpsApi.fetchRemoteFile(octokit, {
			repoOwner: repoOwner,
			repoName: repoName,
			branchName: branchName,
			filePath: filePath
		});
	}).then((fileInfo) => {
		return gitOpsApi.updateSingleFile(octokit, {
			repoOwner: repoOwner,
			repoName: repoName,
			branchName: branchName,
			filePath: filePath,
			fileContent: "{\"key\": \"from createSingleFile()\", \"key2\": \"from updateSingleFile()\"}",
			commitMessage: "A test commit updated by updateSingleFile()",
			sha: fileInfo.sha
		});
	}).then(function (res) {
		jqUnit.assertTrue("updateSingleFile() completes successfully.", res.includes("has been updated successfully."));
		return gitOpsApi.commitMultipleFiles(octokit, {
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
	}).then((res) => {
		jqUnit.assertTrue("commitMultipleFiles() completes successfully.", res.includes("successfully."));
		return gitOpsApi.issuePullRequest(octokit, {
			repoOwner: repoOwner,
			repoName: repoName,
			issuerGithubId: repoOwner,
			branchName: branchName,
			pullRequestTitle: "A test pull request issued by issuePullRequest()"
		});
	}).then(function (res) {
		jqUnit.assertTrue("The pull request url is returned", res.startsWith("https://github.com/"));
		return gitOpsApi.deleteBranch(octokit, {
			repoOwner: repoOwner,
			repoName: repoName,
			branchName: branchName
		});
	}).then(function (res) {
		jqUnit.assertTrue("deleteBranch() completes successfully.", res.includes("has been deleted successfully"));
	}).catch(function (error) {
		gitOpsApi.deleteBranch(octokit, {
			repoOwner: repoOwner,
			repoName: repoName,
			branchName: branchName
		}).then(() => {
			console.log("Cleaned up.");
			jqUnit.fail("The test sequence for testing success cases of API fails with this error: ", error.message);
		}).catch((e) => {
			console.log("Failed at the clean up with an error: ", e.message);
			jqUnit.fail("The test sequence for testing success cases of API fails with this error: ", error.message);
		});
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