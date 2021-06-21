/*
Copyright 2021 OCAD University

Licensed under the New BSD license. You may not use this file except in compliance with this licence.
You may obtain a copy of the BSD License at
https://raw.githubusercontent.com/inclusive-design/data-update-github/main/LICENSE
*/

// API for Github operations.

"use strict";

module.exports = {
	/**
	 * An object that contains required information for fetching a file.
	 * @typedef {Object} FetchRemoteFileOptions
	 * @param {String} repoOwner - The repo owner.
	 * @param {String} repoName - The repo name.
	 * @param {String} branchName - The name of the remote branch to operate.
	 * @param {String} filePath - The location of the file including the path and the file name.
	 */

	/**
	 * Fetch the content of a file from a remote branch.
	 * @param {Object} octokit - An instance of octokit with authentication being set.
	 * @param {FetchRemoteFileOptions} options - Required parameters for this github operation.
	 * @return {Promise} Three return actions in different cases:
	 * 1. When the file exists, the resolved value returns an object in a structure of
	 * {exists: true, content: [fileContent], sha: [sha-of-the-file]};
	 * 2. Wheen the file doesn"t exist, the resolved value returns an object in a structure of {exists: false};
	 * 3. When the fetch fails for any other reason, the promise rejects with an object in a structure of
	 * {isError: true, message: [error-message]};
	 */
	fetchRemoteFile: async (octokit, options) => {
	  return new Promise((resolve, reject) => {
			octokit.request("GET /repos/{owner}/{repo}/contents/{path}", {
				headers: {
					"Cache-Control": "no-store, max-age=0"
				},
				owner: options.repoOwner,
				repo: options.repoName,
				path: options.filePath,
				ref: options.branchName
			}).then((response) => {
				resolve({
					exists: true,
					content: Buffer.from(response.data.content, "base64").toString("utf-8"),
					sha: response.data.sha
				});
			}, (e) => {
				if (e.message === "Not Found") {
					resolve({
						exists: false
					});
				} else {
					reject({
						isError: true,
						message: "Error at fetching file: " + e.message
					});
				}
			});
		});
	},

	/**
	 * An object that contains required information for submitting multiple files in one commit.
	 * @typedef {Object} CommitMultipleFilesOptions
	 * @param {String} repoOwner - The repo owner.
	 * @param {String} repoName - The repo name.
	 * @param {String} branchName - The name of the remote branch to operate.
	 * @param {Object[]} files - An array of objects. Each object contains a file information in a structure of
	 * [{filePath: {String}, content: {String}}, ...].
	 * @param {String} commitMsg - The commit message.
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
		const commitMsg = options.commitMsg;

		/**
		 * Returns a single reference of a github branch.
		 * @param {String} repoOwner - The repo owner.
		 * @param {String} repoName - The repo name.
		 * @param {String} branchName - The name of the remote branch to get the reference from.
		 * @return {Promise} The resolve or reject of the promise indicates whether the operation completes successfully.
		 */
		const getBranchRef = async function (repoOwner, repoName, branchName) {
			return octokit.request("GET /repos/{owner}/{repo}/git/ref/{ref}", {
				owner: repoOwner,
				repo: repoName,
				ref: "heads/" + branchName
			});
		};

		/**
		 * Returns a single tree using the SHA1 value for that tree.
		 * @param {String} repoOwner - The repo owner.
		 * @param {String} repoName - The repo name.
		 * @param {String} branchName - The name of the remote branch to get the tree from.
		 * @return {Promise} The resolve or reject of the promise indicates whether the operation completes successfully.
		 */
		const getTree = async function (repoOwner, repoName, branchName) {
			return getBranchRef(repoOwner, repoName, branchName).then((commit) => {
				parentCommit = commit;
				return octokit.request("GET /repos/{owner}/{repo}/git/trees/{tree_sha}", {
					owner: repoOwner,
					repo: repoName,
					tree_sha: commit.data.object.sha
				});
			});
		};

		return Promise.all(files.map((file) => {
			return octokit.request("POST /repos/{owner}/{repo}/git/blobs", {
				owner: repoOwner,
				repo: repoName,
				content: file.content
			});
		})).then((blobs) => {
			return getTree(repoOwner, repoName, branchName).then(function (tree) {
				return octokit.request("POST /repos/{owner}/{repo}/git/trees", {
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
			});
		}).then((tree) => {
			return octokit.request("POST /repos/{owner}/{repo}/git/commits", {
				owner: repoOwner,
				repo: repoName,
				message: commitMsg,
				tree: tree.data.sha,
				parents: [parentCommit.data.object.sha]
			});
		}).then((commit) => {
			return octokit.request("PATCH /repos/{owner}/{repo}/git/refs/{ref}", {
				owner: repoOwner,
				repo: repoName,
				ref: "heads/" + branchName,
				sha: commit.data.sha
			});
		});
	},

	/**
	 * An object that contains required information for submitting multiple files in one commit.
	 * @typedef {Object} IssuePullRequestOptions
	 * @param {String} repoOwner - The repo owner.
	 * @param {String} repoName - The repo name.
	 * @param {String} issuerGithubId - The Github id of the issuer.
	 * @param {String} branchName - The name of the remote branch to operate.
	 * @param {String} prTitle - The pull request title.
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
		return new Promise((resolve, reject) => {
			octokit.graphql(
				`query {
					repository(owner: "${options.repoOwner}", name: "${options.repoName}") {
						url
						id
					}
				}`
			).then((repoInfoResponse) => {
				const repoId = repoInfoResponse.repository.id;
				octokit.graphql(
					`mutation {
						createPullRequest (
							input: {
								baseRefName: "main",
								headRefName: "${options.issuerGithubId}:${options.branchName}",
								repositoryId: "${repoId}",
								title: "${options.prTitle}"
							}) {
							pullRequest {
							  url
							}
						  }
					}`
				).then((createPRResponse) => {
					resolve(createPRResponse.createPullRequest.pullRequest.url);
				}).catch((e) => {
					reject({
						isError: true,
						message: e.message
					});
				});
			}).catch((e) => {
				reject({
					isError: true,
					message: e.message
				});
			});
		});
	}
};
