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

const cleanup = function (branchName, testError) {
	return gitOpsApi.deleteBranch(octokit, {
		repoOwner: repoOwner,
		repoName: repoName,
		branchName: branchName
	}).then(function () {
		console.log("Cleaned up: removed the branch " + branchName);
		jqUnit.fail("The test sequence for testing success cases of API fails with this error: ", testError.message);
	}).catch(function (e) {
		console.log("Failed at the clean up to remove the branch " + branchName + " with an error: ", e.message);
		jqUnit.fail("The test sequence for testing success cases of API fails with this error: ", testError.message);
	});
};

// Test createBranch() and deleteBranch()
jqUnit.test("Test createBranch() and deleteBranch(), success case - ", async function () {
	jqUnit.expect(2);
	const branchName = "test-createDeleteBranch";
	let response;

	try {
		response = await gitOpsApi.createBranch(octokit, {
			repoOwner: repoOwner,
			repoName: repoName,
			baseBranchName: "main",
			targetBranchName: branchName
		});
		jqUnit.assertEquals("The success case of createBranch() completes successfully.", "refs/heads/" + branchName, response.ref);

		response = await gitOpsApi.deleteBranch(octokit, {
			repoOwner: repoOwner,
			repoName: repoName,
			branchName: branchName
		});
		jqUnit.assertTrue("The success case of deleteBranch() completes successfully.", response.includes("has been deleted successfully"));
	} catch (error) {
		return cleanup(branchName, error);
	}
});

jqUnit.test("Test createBranch(), failed case - ", async function () {
	jqUnit.expect(1);
	const repoNameWrong = "nonexistent-repo";
	const branchName = "test-createDeleteBranch";
	try {
		await gitOpsApi.createBranch(octokit, {
			repoOwner: repoOwner,
			repoName: repoNameWrong,
			baseBranchName: "main",
			targetBranchName: branchName
		});
	} catch (error) {
		jqUnit.assertTrue("The failed case of createBranch() completes successfully.", error.isError);
	};
});

jqUnit.test("Test deleteBranch(), failed case - ", async function () {
	jqUnit.expect(1);
	const repoNameWrong = "nonexistent-repo";
	const branchName = "test-createDeleteBranch";
	try {
		await gitOpsApi.deleteBranch(octokit, {
			repoOwner: repoOwner,
			repoName: repoNameWrong,
			branchName: branchName
		});
	} catch (error) {
		jqUnit.assertTrue("The failed case of deleteBranch() completes successfully.", error.isError);
	};
});

// Test getBranchRef()
jqUnit.test("Test getBranchRef(), success case - ", async function () {
	jqUnit.expect(1);
	const branchName = "test-getBranchRef";

	try {
		await gitOpsApi.createBranch(octokit, {
			repoOwner: repoOwner,
			repoName: repoName,
			baseBranchName: "main",
			targetBranchName: branchName
		});

		const response = await gitOpsApi.getBranchRef(octokit, {
			repoOwner: repoOwner,
			repoName: repoName,
			branchName: branchName
		});
		jqUnit.assertEquals("getBranchRef() completes successfully.", "refs/heads/" + branchName, response.ref);

		await gitOpsApi.deleteBranch(octokit, {
			repoOwner: repoOwner,
			repoName: repoName,
			branchName: branchName
		});
	} catch (error) {
		return cleanup(branchName, error);
	}
});

jqUnit.test("Test getBranchRef(), failed case - ", async function () {
	jqUnit.expect(1);
	const branchName = "test-getBranchRef";
	const repoNameWrong = "nonexistent-repo";

	try {
		await gitOpsApi.getBranchRef(octokit, {
			repoOwner: repoOwner,
			repoName: repoNameWrong,
			branchName: branchName
		});
	} catch (error) {
		jqUnit.assertTrue("The failed case of getBranchRef() completes successfully.", error.isError);
	};
});

// Test getAllBranches()
jqUnit.test("Test getAllBranches(), success case - ", async function () {
	jqUnit.expect(1);

	try {
		const response = await gitOpsApi.getAllBranches(octokit, {
			repoOwner: repoOwner,
			repoName: repoName
		});
		jqUnit.assertTrue("getAllBranches() completes successfully.", Array.isArray(response));
	} catch (error) {
		jqUnit.fail("The test for getAllBranches() failed with error: ", error);
	}
});

jqUnit.test("Test getAllBranches(), failed case - ", async function () {
	jqUnit.expect(1);
	const repoNameWrong = "nonexistent-repo";

	try {
		await gitOpsApi.getAllBranches(octokit, {
			repoOwner: repoOwner,
			repoName: repoNameWrong
		});
	} catch (error) {
		jqUnit.assertTrue("The failed case of getAllBranches() completes successfully.", error.isError);
	};
});

// Test createSingleFile()
jqUnit.test("Test createSingleFile(), success case - ", async function () {
	jqUnit.expect(1);
	const branchName = "test-createSingleFile";
	const filePath = branchName + "/answers.json";

	try {
		await gitOpsApi.createBranch(octokit, {
			repoOwner: repoOwner,
			repoName: repoName,
			baseBranchName: "main",
			targetBranchName: branchName
		});

		const response = await gitOpsApi.createSingleFile(octokit, {
			repoOwner: repoOwner,
			repoName: repoName,
			branchName: branchName,
			filePath: filePath,
			fileContent: "{\"key\": \"from createSingleFile()\"}",
			commitMessage: "A test commit created by createSingleFile()"
		});
		jqUnit.assertTrue("createSingleFile() completes successfully.", response.includes("has been created successfully."));

		await gitOpsApi.deleteBranch(octokit, {
			repoOwner: repoOwner,
			repoName: repoName,
			branchName: branchName
		});
	} catch (error) {
		return cleanup(branchName, error);
	}
});

jqUnit.test("Test createSingleFile(), failed case - ", async function () {
	jqUnit.expect(1);
	const branchName = "test-createSingleFile";
	const repoNameWrong = "nonexistent-repo";

	try {
		await gitOpsApi.createSingleFile(octokit, {
			repoOwner: repoOwner,
			repoName: repoNameWrong,
			branchName: branchName,
			filePath: "src/_data/answers.json",
			fileContent: "{\"key\": \"test value\"}",
			commitMessage: "A test commit created by createSingleFile()"
		});
	} catch (error) {
		jqUnit.assertTrue("The failed case of createSingleFile() completes successfully.", error.isError);
	};
});

// Test getFileLastCommit()
jqUnit.test("Test getFileLastCommit(), success case - ", async function () {
	jqUnit.expect(1);
	const branchName = "test-getFileLastCommit";
	const filePath = branchName + "/answers.json";

	try {
		await gitOpsApi.createBranch(octokit, {
			repoOwner: repoOwner,
			repoName: repoName,
			baseBranchName: "main",
			targetBranchName: branchName
		});

		await gitOpsApi.createSingleFile(octokit, {
			repoOwner: repoOwner,
			repoName: repoName,
			branchName: branchName,
			filePath: filePath,
			fileContent: "{\"key\": \"from createSingleFile()\"}",
			commitMessage: "A test commit created by createSingleFile()"
		});

		const response = await gitOpsApi.getFileLastCommit(octokit, {
			repoOwner: repoOwner,
			repoName: repoName,
			branchName: branchName,
			filePath: filePath
		});
		jqUnit.assertTrue("getFileLastCommit() completes successfully.", typeof response.author === "object");

		await gitOpsApi.deleteBranch(octokit, {
			repoOwner: repoOwner,
			repoName: repoName,
			branchName: branchName
		});
	} catch (error) {
		return cleanup(branchName, error);
	}
});

jqUnit.test("Test getFileLastCommit(), failed case - ", async function () {
	jqUnit.expect(1);
	const branchName = "test-getFileLastCommit";
	const repoNameWrong = "nonexistent-repo";

	try {
		await gitOpsApi.getFileLastCommit(octokit, {
			repoOwner: repoOwner,
			repoName: repoNameWrong,
			branchName: branchName,
			filePath: "src/_data/answers.json"
		});
	} catch (error) {
		jqUnit.assertTrue("The failed case of getFileLastCommit() completes successfully.", error.isError);
	};
});

// Test fetchRemoteFile()
jqUnit.test("Test fetchRemoteFile(), success case - ", async function () {
	jqUnit.expect(1);
	const branchName = "test-fetchRemoteFile";
	const filePath = branchName + "/answers.json";
	const fileContent = "{\"key\": \"from createSingleFile()\"}";

	try {
		await gitOpsApi.createBranch(octokit, {
			repoOwner: repoOwner,
			repoName: repoName,
			baseBranchName: "main",
			targetBranchName: branchName
		});

		await gitOpsApi.createSingleFile(octokit, {
			repoOwner: repoOwner,
			repoName: repoName,
			branchName: branchName,
			filePath: filePath,
			fileContent: fileContent,
			commitMessage: "A test commit created by createSingleFile()"
		});

		const response = await gitOpsApi.fetchRemoteFile(octokit, {
			repoOwner: repoOwner,
			repoName: repoName,
			branchName: branchName,
			filePath: filePath
		});
		jqUnit.assertEquals("fetchRemoteFile() completes successfully.", fileContent, response.content);

		await gitOpsApi.deleteBranch(octokit, {
			repoOwner: repoOwner,
			repoName: repoName,
			branchName: branchName
		});
	} catch (error) {
		return cleanup(branchName, error);
	}
});

jqUnit.test("Test fetchRemoteFile(), file not found - ", async function () {
	jqUnit.expect(1);
	const repoNameWrong = "nonexistent-repo";

	const response = await gitOpsApi.fetchRemoteFile(octokit, {
		repoOwner: repoOwner,
		repoName: repoNameWrong,
		branchName: "main",
		filePath: "README.md"
	});
	jqUnit.assertFalse("The file not found case of fetchRemoteFile() completes successfully.", response.exists);
});

// Test getDirInfo()
jqUnit.test("Test getDirInfo() - success case", async function () {
	jqUnit.expect(1);
	const branchName = "test-getDirInfo";
	const fileName = "answers.json";
	const filePath = branchName + "/" + fileName;
	const dirPath = branchName;

	try {
		await gitOpsApi.createBranch(octokit, {
			repoOwner: repoOwner,
			repoName: repoName,
			baseBranchName: "main",
			targetBranchName: branchName
		});

		await gitOpsApi.createSingleFile(octokit, {
			repoOwner: repoOwner,
			repoName: repoName,
			branchName: branchName,
			filePath: filePath,
			fileContent: "{\"key\": \"from createSingleFile()\"}",
			commitMessage: "A test commit created by createSingleFile()"
		});

		const response = await gitOpsApi.getDirInfo(octokit, {
			repoOwner: repoOwner,
			repoName: repoName,
			path: dirPath,
			ref: branchName
		});
		jqUnit.assertEquals("getDirInfo() completes successfully.", fileName, response[0].name);

		await gitOpsApi.deleteBranch(octokit, {
			repoOwner: repoOwner,
			repoName: repoName,
			branchName: branchName
		});
	} catch (error) {
		return cleanup(branchName, error);
	}
});

jqUnit.test("Test getDirInfo() - failed case", async function () {
	jqUnit.expect(1);
	const repoNameWrong = "nonexistent-repo";

	try {
		await gitOpsApi.getDirInfo(octokit, {
			repoOwner: repoOwner,
			repoName: repoNameWrong
		});
	} catch (error) {
		jqUnit.assertTrue("The failed case of getDirInfo() completes successfully.", error.isError);
	};
});

// Test updateSingleFile()
jqUnit.test("Test updateSingleFile() - success case", async function () {
	jqUnit.expect(1);
	const branchName = "test-updateSingleFile";
	const filePath = branchName + "/answers.json";

	try {
		await gitOpsApi.createBranch(octokit, {
			repoOwner: repoOwner,
			repoName: repoName,
			baseBranchName: "main",
			targetBranchName: branchName
		});

		await gitOpsApi.createSingleFile(octokit, {
			repoOwner: repoOwner,
			repoName: repoName,
			branchName: branchName,
			filePath: filePath,
			fileContent: "{\"key\": \"from createSingleFile()\"}",
			commitMessage: "A test commit created by createSingleFile()"
		});

		const fileInfo = await gitOpsApi.fetchRemoteFile(octokit, {
			repoOwner: repoOwner,
			repoName: repoName,
			branchName: branchName,
			filePath: filePath
		});

		const response = await gitOpsApi.updateSingleFile(octokit, {
			repoOwner: repoOwner,
			repoName: repoName,
			branchName: branchName,
			filePath: filePath,
			fileContent: "{\"key\": \"from createSingleFile()\", \"key2\": \"from updateSingleFile()\"}",
			commitMessage: "A test commit updated by updateSingleFile()",
			sha: fileInfo.sha
		});
		jqUnit.assertTrue("updateSingleFile() completes successfully.", response.includes("has been updated successfully."));

		await gitOpsApi.deleteBranch(octokit, {
			repoOwner: repoOwner,
			repoName: repoName,
			branchName: branchName
		});
	} catch (error) {
		return cleanup(branchName, error);
	}
});

jqUnit.test("Test updateSingleFile() - failed case", async function () {
	jqUnit.expect(1);
	const repoNameWrong = "nonexistent-repo";

	try {
		const fileInfo = gitOpsApi.fetchRemoteFile(octokit, {
			repoOwner: repoOwner,
			repoName: repoName,
			branchName: "main",
			filePath: "README.md"
		});

		await gitOpsApi.updateSingleFile(octokit, {
			repoOwner: repoOwner,
			repoName: repoNameWrong,
			branchName: "main",
			filePath: "README.md",
			fileContent: "{\"key\": \"test value\", \"key2\": \"from updateSingleFile()\"}",
			commitMessage: "A test commit updated by updateSingleFile()",
			sha: fileInfo.sha
		});
	} catch (error) {
		jqUnit.assertTrue("The failed case of updateSingleFile() completes successfully.", error.isError);
	};
});

// Test commitMultipleFiles()
jqUnit.test("Test commitMultipleFiles() - success case", async function () {
	jqUnit.expect(1);
	const branchName = "test-commitMultipleFiles";
	const filePath = branchName + "/answers.json";

	try {
		await gitOpsApi.createBranch(octokit, {
			repoOwner: repoOwner,
			repoName: repoName,
			baseBranchName: "main",
			targetBranchName: branchName
		});

		await gitOpsApi.createSingleFile(octokit, {
			repoOwner: repoOwner,
			repoName: repoName,
			branchName: branchName,
			filePath: filePath,
			fileContent: "{\"key\": \"from createSingleFile()\"}",
			commitMessage: "A test commit created by createSingleFile()"
		});

		const response = await gitOpsApi.commitMultipleFiles(octokit, {
			repoOwner: repoOwner,
			repoName: repoName,
			branchName: branchName,
			files: [{
				path: "src/_data/answers.json",
				content: "{\"key\": \"from createSingleFile()\", \"key2\": \"from updateSingleFile()\", \"key3\": \"from commitMultipleFiles()\"}"
			}, {
				path: "src/_data/new.txt",
				content: "a new file created by commitMultipleFiles()"
			}, {
				path: filePath,
				operation: "delete"
			}],
			commitMessage: "A test commit from commitMultipleFiles()"
		});
		jqUnit.assertTrue("commitMultipleFiles() completes successfully.", response.includes("successfully."));

		await gitOpsApi.deleteBranch(octokit, {
			repoOwner: repoOwner,
			repoName: repoName,
			branchName: branchName
		});
	} catch (error) {
		return cleanup(branchName, error);
	}
});

jqUnit.test("Test commitMultipleFiles() - failed case", async function () {
	jqUnit.expect(1);
	const repoNameWrong = "nonexistent-repo";

	try {
		await gitOpsApi.commitMultipleFiles(octokit, {
			repoOwner: repoOwner,
			repoName: repoNameWrong,
			branchName: "main",
			files: [{
				path: "src/_data/answers.json",
				content: "{\"key\": \"test value\", \"key2\": \"extra value\", \"key3\": \"from commitMultipleFiles()\"}"
			}, {
				path: "src/_data/new.txt",
				content: "a new file created by commitMultipleFiles()"
			}],
			commitMessage: "A test commit from commitMultipleFiles()"
		});
	} catch (error) {
		jqUnit.assertTrue("The failed case of commitMultipleFiles() completes successfully.", error.isError);
	};
});

// Test issuePullRequest()
jqUnit.test("Test issuePullRequest() - success case", async function () {
	jqUnit.expect(1);
	const branchName = "test-issuePullRequest";
	const filePath = branchName + "/answers.json";

	try {
		await gitOpsApi.createBranch(octokit, {
			repoOwner: repoOwner,
			repoName: repoName,
			baseBranchName: "main",
			targetBranchName: branchName
		});

		await gitOpsApi.createSingleFile(octokit, {
			repoOwner: repoOwner,
			repoName: repoName,
			branchName: branchName,
			filePath: filePath,
			fileContent: "{\"key\": \"from createSingleFile()\"}",
			commitMessage: "A test commit created by createSingleFile()"
		});

		const response = await gitOpsApi.issuePullRequest(octokit, {
			repoOwner: repoOwner,
			repoName: repoName,
			issuerGithubId: repoOwner,
			branchName: branchName,
			pullRequestTitle: "A test pull request issued by issuePullRequest()"
		});
		jqUnit.assertTrue("The pull request url is returned", response.startsWith("https://github.com/"));

		await gitOpsApi.deleteBranch(octokit, {
			repoOwner: repoOwner,
			repoName: repoName,
			branchName: branchName
		});
	} catch (error) {
		return cleanup(branchName, error);
	}
});

jqUnit.test("Test issuePullRequest() - failed case", async function () {
	jqUnit.expect(1);
	const repoNameWrong = "nonexistent-repo";

	try {
		await gitOpsApi.issuePullRequest(octokit, {
			repoOwner: repoOwner,
			repoName: repoNameWrong,
			issuerGithubId: repoOwner,
			branchName: "main",
			pullRequestTitle: "A test pull request issued by the API issuePullRequest()"
		});
	} catch (error) {
		jqUnit.assertTrue("The failed case of issuePullRequest() completes successfully.", error.isError);
	};
});

// Test deleteSingleFile()
jqUnit.test("Test deleteSingleFile() - success case", async function () {
	jqUnit.expect(1);
	const branchName = "test-deleteSingleFile";
	const filePath = branchName + "/answers.json";

	try {
		await gitOpsApi.createBranch(octokit, {
			repoOwner: repoOwner,
			repoName: repoName,
			baseBranchName: "main",
			targetBranchName: branchName
		});

		await gitOpsApi.createSingleFile(octokit, {
			repoOwner: repoOwner,
			repoName: repoName,
			branchName: branchName,
			filePath: filePath,
			fileContent: "{\"key\": \"from createSingleFile()\"}",
			commitMessage: "A test commit created by createSingleFile()"
		});

		const fileInfo = await gitOpsApi.fetchRemoteFile(octokit, {
			repoOwner: repoOwner,
			repoName: repoName,
			branchName: branchName,
			filePath: filePath
		});

		const response = await gitOpsApi.deleteSingleFile(octokit, {
			repoOwner: repoOwner,
			repoName: repoName,
			branchName: branchName,
			filePath: filePath,
			commitMessage: "A test commit by deleteSingleFile()",
			sha: fileInfo.sha
		});
		jqUnit.assertTrue("deleteSingleFile() completes successfully.", response.includes("has been deleted successfully."));

		await gitOpsApi.deleteBranch(octokit, {
			repoOwner: repoOwner,
			repoName: repoName,
			branchName: branchName
		});
	} catch (error) {
		return cleanup(branchName, error);
	}
});

jqUnit.test("Test deleteSingleFile() - failed case", async function () {
	jqUnit.expect(1);
	const repoNameWrong = "nonexistent-repo";

	try {
		const fileInfo = await gitOpsApi.fetchRemoteFile(octokit, {
			repoOwner: repoOwner,
			repoName: repoName,
			branchName: "main",
			filePath: "README.md"
		});

		await gitOpsApi.deleteSingleFile(octokit, {
			repoOwner: repoOwner,
			repoName: repoNameWrong,
			branchName: "main",
			filePath: "src/_data/answers.json",
			commitMessage: "A test commit by deleteSingleFile()",
			sha: fileInfo.sha
		});
	} catch (error) {
		jqUnit.assertTrue("The failed case of deleteSingleFile() completes successfully.", error.isError);
	};
});
