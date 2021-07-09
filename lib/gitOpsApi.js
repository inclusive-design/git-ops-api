/*
Copyright 2021 OCAD University

Licensed under the New BSD license. You may not use this file except in compliance with this licence.
You may obtain a copy of the BSD License at
https://raw.githubusercontent.com/inclusive-design/git-ops-api/main/LICENSE
*/

// API for Github operations.

"use strict";

module.exports = {
	getBranchRef: getBranchRef,

	/**
	 * An object that contains required information for fetching a file.
	 * @typedef {Object} GetAllBranchesOptions
	 * @param {String} repoOwner - The repo owner.
	 * @param {String} repoName - The repo name.
	 */

	/**
	 * Returns all branches of a repository.
	 * @param {Object} octokit - An instance of octokit with authentication being set.
	 * @param {GetAllBranchesOptions} options - Required parameters for this github operation.
	 * @return {Promise} When the operation completes successfully, the resolved value is an array of objects.
	 * Each object contains the information of a branch in a structure of:
	 * {name: {String}, commit}
	 * When the operation fails, the promise rejects with an object in a structure of
	 * {isError: true, message: [error-message]};
	 */
	getAllBranches: async (octokit, options) => {
		try {
			const response = await octokit.request("GET /repos/{owner}/{repo}/branches", {
				headers: {
					"Cache-Control": "no-store, max-age=0"
				},
				owner: options.repoOwner,
				repo: options.repoName
			});
			return response.data;
		} catch(e) {
			throw {
				isError: true,
				message: "Error at getAllBranches(): " + e.message
			};
		}
	},

	/**
	 * An object that contains required information for fetching a file.
	 * @typedef {Object} CreateBranchOptions
	 * @param {String} repoOwner - The repo owner.
	 * @param {String} repoName - The repo name.
	 * @param {String} baseBranchName - The name of the base branch that the target branch will be based off to create.
	 * This branch must already exist.
	 * @param {String} targetBranchName - The name of the target branch to create. This branch should not exist.
	 */

	/**
	 * Create a new branch based off another branch.
	 * @param {Object} octokit - An instance of octokit with authentication being set.
	 * @param {CreateBranchOptions} options - Required parameters for this github operation.
	 * @return {Promise} When the operation completes successfully, the resolved value is an object in a structure of:
	 * {ref: {String}, node_id: {String}, url: {String}, object: {sha: {String}, type: {String}, url: {String}}}
	 * When the operation fails, the promise rejects with an object in a structure of
	 * {isError: true, message: [error-message]};
	 */
	createBranch: async (octokit, options) => {
		try {
			const commit = await getBranchRef(octokit, {
				repoOwner: options.repoOwner,
				repoName: options.repoName,
				branchName: options.baseBranchName
			});
			const response = await octokit.request("POST /repos/{owner}/{repo}/git/refs", {
				owner: options.repoOwner,
				repo: options.repoName,
				ref: "refs/heads/" + options.targetBranchName,
				sha: commit.object.sha
			});
			return response.data;
		} catch(e) {
			throw {
				isError: true,
				message: "Error at createBranch(): " + e.message
			};
		}
	},

	/**
	 * An object that contains required information for fetching a file.
	 * @typedef {Object} DeleteBranchOptions
	 * @param {String} repoOwner - The repo owner.
	 * @param {String} repoName - The repo name.
	 * @param {String} branchName - The name of the base branch to delete.
	 */

	/**
	 * Create a new branch based off another branch.
	 * @param {Object} octokit - An instance of octokit with authentication being set.
	 * @param {DeleteBranchOptions} options - Required parameters for this github operation.
	 * @return {Promise} When the operation completes successfully, the resolved value is an object in a structure of:
	 * {ref: {String}, node_id: {String}, url: {String}, object: {sha: {String}, type: {String}, url: {String}}}
	 * When the operation fails, the promise rejects with an object in a structure of
	 * {isError: true, message: [error-message]};
	 */
	deleteBranch: async (octokit, options) => {
		try {
			const response = await octokit.request("DELETE /repos/{owner}/{repo}/git/refs/{ref}", {
				owner: options.repoOwner,
				repo: options.repoName,
				ref: "heads/" + options.branchName
			});
			return options.branchName + " has been deleted successfully.";
		} catch(e) {
			throw {
				isError: true,
				message: "Error at deleteBranch(): " + e.message
			};
		}
	},

	/**
	 * An object that contains required information for fetching a file.
	 * @typedef {Object} FileOptions
	 * @param {String} repoOwner - The repo owner.
	 * @param {String} repoName - The repo name.
	 * @param {String} branchName - The name of the remote branch to operate.
	 * @param {String} filePath - The location of the file including the path and the file name.
	 */

	/**
	 * Fetch the content of a file from a remote branch.
	 * @param {Object} octokit - An instance of octokit with authentication being set.
	 * @param {FileOptions} options - Required parameters for this github operation.
	 * @return {Promise} Three return actions in different cases:
	 * 1. When the file exists, the resolved value returns an object in a structure of
	 * {exists: true, content: [fileContent], sha: [sha-of-the-file]};
	 * 2. Wheen the file doesn"t exist, the resolved value returns an object in a structure of {exists: false};
	 * 3. When the fetch fails for any other reason, the promise rejects with an object in a structure of
	 * {isError: true, message: [error-message]};
	 */
	fetchRemoteFile: async (octokit, options) => {
		try {
			const response = await octokit.request("GET /repos/{owner}/{repo}/contents/{path}", {
				headers: {
					"Cache-Control": "no-store, max-age=0"
				},
				owner: options.repoOwner,
				repo: options.repoName,
				path: options.filePath,
				ref: options.branchName
			});
			return {
				exists: true,
				content: Buffer.from(response.data.content, "base64").toString("utf-8"),
				sha: response.data.sha
			};
		} catch(e) {
			if (e.message === "Not Found") {
				return {
					exists: false
				};
			} else {
				throw {
					isError: true,
					message: "Error at fetchRemoteFile(): " + e.message
				};
			}
		}
	},

	/**
	 * Find the information of the last commit of a file.
	 * @param {Object} octokit - An instance of octokit with authentication being set.
	 * @param {FileOptions} options - Required parameters for this github operation.
	 * @return {Promise} When the operation completes successfully, the resolved value is an object in a structure of:
	 * {
	 *	author: {name: {String}, email: {String}, date: {String}},
	 *	committer: {name: {String}, email: {String}, date: {String}},
	 *	message: {String},
	 *	tree: {sha: {String}, url: {String}},
	 *	url: {String},
	 *	comment_count: {Number},
  	 *	verification: {verified: {Boolean}, reason: {String}, signature: {String}, payload: {String}}
 	 * }
	 * When the operation fails, the promise rejects with an object in a structure of
	 * {isError: true, message: [error-message]};
	 */
	getFileLastCommit: async (octokit, options) => {
		try {
			const response = await octokit.request("GET /repos/{owner}/{repo}/commits", {
				headers: {
					"Cache-Control": "no-store, max-age=0"
				},
				owner: options.repoOwner,
				repo: options.repoName,
				path: options.filePath,
				sha: options.branchName,
				page: 1,
				per_page: 1
			});
			return response.data[0].commit;
		} catch(e) {
			throw {
				isError: true,
				message: "Error at getFileLastCommit(): " + e.message
			};
		}
	},

	/**
	 * An object that contains required information for creating a single file.
	 * @typedef {Object} CreateSingleFileOptions
	 * @param {String} repoOwner - The repo owner.
	 * @param {String} repoName - The repo name.
	 * @param {String} branchName - The name of the remote branch to operate.
	 * @param {String} filePath - The location of the file including the path and the file name.
	 * @param {String} fileContent - The file content.
	 * @param {String} commitMessage - The commit message.
	 */

	/**
	 * Create a single file.
	 * @param {Object} octokit - An instance of octokit with authentication being set.
	 * @param {CreateSingleFileOptions} options - Required parameters for this github operation.
	 * @return {Promise} The resolve or reject of the promise indicates whether the operation completes successfully or
	 * unsuccessfully. When successful, the resolved value is a string with the success message. When failed, rejects
	 * with an object in a structure of: {isError: true, message: {error-message}}
	 */
	createSingleFile: async (octokit, options) => {
		try {
			await octokit.request("PUT /repos/{owner}/{repo}/contents/{path}", {
	            owner: options.repoOwner,
	            repo: options.repoName,
	            path: options.filePath,
	            message: options.commitMessage,
	            content: Buffer.from(options.fileContent).toString("base64"),
	            branch: options.branchName
	        });
			return options.filePath + " has been created successfully.";
		} catch(e) {
			throw {
				isError: true,
				message: "Error at createSingleFile(): " + e.message
			};
		}
	},

	/**
	 * An object that contains required information for updating a single existing file.
	 * @typedef {Object} UpdateSingleFileOptions
	 * @param {String} repoOwner - The repo owner.
	 * @param {String} repoName - The repo name.
	 * @param {String} branchName - The name of the remote branch to operate.
	 * @param {String} filePath - The location of the file including the path and the file name.
	 * @param {String} fileContent - The file content.
	 * @param {String} commitMessage - The commit message.
	 * @param {String} sha - The sha of the existing file.
	 */

	/**
	 * Create a single file.
	 * @param {Object} octokit - An instance of octokit with authentication being set.
	 * @param {UpdateSingleFileOptions} options - Required parameters for this github operation.
	 * @return {Promise} The resolve or reject of the promise indicates whether the operation completes successfully or
	 * unsuccessfully. When successful, the resolved value is a string with the success message. When failed, rejects
	 * with an object in a structure of: {isError: true, message: {error-message}}
	 */
	updateSingleFile: async (octokit, options) => {
		try {
			await octokit.request("PUT /repos/{owner}/{repo}/contents/{path}", {
	            owner: options.repoOwner,
	            repo: options.repoName,
	            path: options.filePath,
	            message: options.commitMessage,
	            content: Buffer.from(options.fileContent).toString("base64"),
	            branch: options.branchName,
				sha: options.sha
	        });
			return options.filePath + " has been updated successfully.";
		} catch(e) {
			throw {
				isError: true,
				message: "Error at updateSingleFile(): " + e.message
			};
		}
	},

	/**
	 * An object that contains required information for submitting multiple files in one commit.
	 * Note that when creating or updating a single file, API functions createSingleFile() and updateSingleFile()
	 * are recommended for better performance.
	 * @typedef {Object} CommitMultipleFilesOptions
	 * @param {String} repoOwner - The repo owner.
	 * @param {String} repoName - The repo name.
	 * @param {String} branchName - The name of the remote branch to operate.
	 * @param {Object[]} files - An array of objects. Each object contains a file information in a structure of
	 * [{path: {String}, content: {String}}, ...].
	 * @param {String} commitMessage - The commit message.
	 */

	 /**
 	 * Submit multiple files in one commit.
 	 * @param {Object} octokit - An instance of octokit with authentication being set.
 	 * @param {CommitMultipleFilesOptions} options - Required parameters for this github operation.
 	 * @return {Promise} The resolve or reject of the promise indicates whether the operation completes successfully.
 	 */
	commitMultipleFiles: async (octokit, options) => {
		let parentCommit;
		const repoOwner = options.repoOwner;
		const repoName = options.repoName;
		const branchName = options.branchName;
		const files = options.files;
		const commitMessage = options.commitMessage;

		/**
		 * Returns a single tree using the SHA1 value for that tree.
		 * @param {String} repoOwner - The repo owner.
		 * @param {String} repoName - The repo name.
		 * @param {String} branchName - The name of the remote branch to get the tree from.
		 * @return {Promise} The resolve or reject of the promise indicates whether the operation completes successfully.
		 */
		const getTree = async function (repoOwner, repoName, branchName) {
			parentCommit = await module.exports.getBranchRef(octokit, {
				repoOwner: repoOwner,
				repoName: repoName,
				branchName: branchName
			});
			const tree = await octokit.request("GET /repos/{owner}/{repo}/git/trees/{tree_sha}", {
				owner: repoOwner,
				repo: repoName,
				tree_sha: parentCommit.object.sha
			});
			return tree;
		};

		// This sequence for submitting multiple files in one commit is referenced from
		// https://gist.github.com/StephanHoyer/91d8175507fcae8fb31a
		try {
			const blobs = await Promise.all(files.map((file) => {
				return octokit.request("POST /repos/{owner}/{repo}/git/blobs", {
					owner: repoOwner,
					repo: repoName,
					content: file.content
				});
			}));

			const tree = await getTree(repoOwner, repoName, branchName);

			const newTree = await octokit.request("POST /repos/{owner}/{repo}/git/trees", {
				owner: repoOwner,
				repo: repoName,
				tree: files.map(function (file, index) {
					return {
						path: file.path,
						mode: "100644",
						type: "blob",
						sha: blobs[index].data.sha
					};
				}),
				base_tree: tree.data.sha
			});

			const commit = await octokit.request("POST /repos/{owner}/{repo}/git/commits", {
				owner: repoOwner,
				repo: repoName,
				message: commitMessage,
				tree: newTree.data.sha,
				parents: [parentCommit.object.sha]
			});

			await octokit.request("PATCH /repos/{owner}/{repo}/git/refs/{ref}", {
				owner: repoOwner,
				repo: repoName,
				ref: "heads/" + branchName,
				sha: commit.data.sha
			});
			console.log("done");

			return "Committed successfully.";
		} catch(e) {
			throw {
				isError: true,
				message: "Error at commitMultipleFiles(): " + e.message
			};
		}
	},

	/**
	 * An object that contains required information for submitting multiple files in one commit.
	 * @typedef {Object} IssuePullRequestOptions
	 * @param {String} repoOwner - The repo owner.
	 * @param {String} repoName - The repo name.
	 * @param {String} issuerGithubId - The Github id of the issuer.
	 * @param {String} branchName - The name of the remote branch to operate.
	 * @param {String} pullRequestTitle - The pull request title.
	 */

	/**
	 * Issue pull request against the data repo on behalf of an issuer account
	 * @param {Object} octokit - An instance of octokit with authentication being set.
	 * @param {IssuePullRequestOptions} options - Required parameters for this github operation.
	 * @return {Promise} The resolve or reject of the promise indicates whether the operation completes successfully.
	 * When the pull request is issued successfully, the resolved value is the URL of the pull request. When it fails,
	 * rejects with {isError: true, message: {String}}
	 */
	issuePullRequest: async (octokit, options) => {
		try {
			const repoInfoResponse = await octokit.graphql(
				`query {
					repository(owner: "${options.repoOwner}", name: "${options.repoName}") {
						url
						id
					}
				}`
			);
			const repoId = repoInfoResponse.repository.id;
			const createPRResponse = await octokit.graphql(
				`mutation {
					createPullRequest (
						input: {
							baseRefName: "main",
							headRefName: "${options.issuerGithubId}:${options.branchName}",
							repositoryId: "${repoId}",
							title: "${options.pullRequestTitle}"
						}) {
						pullRequest {
						  url
						}
					  }
				}`
			);
			return createPRResponse.createPullRequest.pullRequest.url;
		} catch(e) {
			throw {
				isError: true,
				message: "Error at issuePullRequest(): " + e.message
			};
		}
	}
};

/**
 * An object that contains required information for retrieving a branch reference.
 * @typedef {Object} GetBranchRefOptions
 * @param {String} repoOwner - The repo owner.
 * @param {String} repoName - The repo name.
 * @param {String} branchName - The branch name.
 */

/**
 * Returns the reference of a branch.
 * @param {Object} octokit - An instance of octokit with authentication being set.
 * @param {GetBranchRefOptions} options - Required parameters for this github operation.
 * @return {Promise} When the operation completes successfully, the resolved value is an array of objects.
 * Each object contains the information of a branch in a structure of:
 * {name: {String}, commit}
 * When the operation fails, the promise rejects with an object in a structure of
 * {isError: true, message: [error-message]};
 */
async function getBranchRef(octokit, options) {
	try {
		const response = await octokit.request("GET /repos/{owner}/{repo}/git/ref/{ref}", {
			headers: {
				"Cache-Control": "no-store, max-age=0"
			},
			owner: options.repoOwner,
			repo: options.repoName,
			ref: "heads/" + options.branchName
		});

		return response.data;
	} catch(e) {
		throw {
			isError: true,
			message: "Error at getBranchRef(): " + e.message
		};
	}
}
