/*
Copyright 2021 OCAD University

Licensed under the New BSD license. You may not use this file except in compliance with this licence.
You may obtain a copy of the BSD License at
https://raw.githubusercontent.com/inclusive-design/data-update-github/main/LICENSE
*/

// Utility functions used by fetchODCDataFiles.js

"use strict";

const axios = require("axios");
const {
    Octokit
} = require("@octokit/core");

const octokit = new Octokit({
    auth: process.env.ACCESS_TOKEN
});

module.exports = {
	/**
	 * Fetch the content of a file from a remote branch.
	 * @param {String} repoOwner - The repo owner.
	 * @param {String} repoName - The repo name.
	 * @param {String} branch - The name of the remote branch to fetch the file from.
	 * @param {String} filePath - The location of the file including the path and the file name.
	 * @return {Promise} Three return actions in different cases:
	 * 1. When the file exists, the resolved value returns an object in a structure of
	 * {exists: true, content: [fileContent], sha: [sha-of-the-file]};
	 * 2. Wheen the file doesn't exist, the resolved value returns an object in a structure of {exists: false};
	 * 3. When the fetch fails for any other reason, the promise rejects with an object in a structure of
	 * {isError: true, message: [error-message]};
	 */
	fetchRemoteFile: async (repoOwner, repoName, branch, filePath) => {
	  return new Promise((resolve, reject) => {
	        octokit.request("GET /repos/{owner}/{repo}/contents/{path}", {
	            headers: {
	                "Cache-Control": "no-store, max-age=0"
	            },
	            owner: repoOwner,
	            repo: repoName,
	            path: filePath,
	            ref: branch
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
     * Create a new remote file.
     * @param {String} repoOwner - The repo owner.
	 * @param {String} repoName - The repo name.
	 * @param {String} branch - The name of the remote branch to fetch the file from.
     * @param {Array} files - An array of objects. Each object contains a file information in a structure of
     * [{filePath: {String}, content: {String}}, ...].
     * @param {String} commitMsg - The commit message.
     * @param {Object} fileContent - The answer written into the new file.
     * @return {Promise} The resolve or reject of the promise indicates whether the operation completes successfully.
     */
    commitMultipleFiles: async (repoOwner, repoName, branch, files, commitMsg) => {
        let parentCommit;

        /**
         * Returns a single reference of a github branch.
         * @param {String} repoOwner - The repo owner.
    	 * @param {String} repoName - The repo name.
    	 * @param {String} branch - The name of the remote branch to get the reference from.
         * @return {Promise} The resolve or reject of the promise indicates whether the operation completes successfully.
         */
        const getBranchRef = async function(repoOwner, repoName, branch) {
            return octokit.request("GET /repos/{owner}/{repo}/git/ref/{ref}", {
                owner: repoOwner,
                repo: repoName,
                ref: "heads/" + branch
            });
        };

        /**
         * Returns a single tree using the SHA1 value for that tree.
         * @param {String} repoOwner - The repo owner.
    	 * @param {String} repoName - The repo name.
    	 * @param {String} branch - The name of the remote branch to get the tree from.
         * @return {Promise} The resolve or reject of the promise indicates whether the operation completes successfully.
         */
        const getTree = async function (repoOwner, repoName, branch) {
            return getBranchRef(repoOwner, repoName, branch).then((commit) => {
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
            return getTree(repoOwner, repoName, branch).then(function (tree) {
                return octokit.request("POST /repos/{owner}/{repo}/git/trees", {
                    owner: repoOwner,
                    repo: repoName,
                    tree: files.map(function(file, index) {
                        return {
                            path: file.path,
                            mode: '100644',
                            type: 'blob',
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
                ref: "heads/" + branch,
                sha: commit.data.sha
            });
        });
    },

	/**
	 * Issue pull request against the data repo on behalf of an issuer account
	 * @param {String} githubGraphqlAPI - The URL of the Github GraphQL API
	 * @param {String} issuerGithubId - The Github account that the pull request will be issued on behalf of
	 * @param {String} issuerAccessToken - The personal access token of the Github account that the pull request will
	 * be issued on behalf of
	 * @param {String} branchName - The name of the remote branch
	 * @param {String} publishedDate - The published date of the new data files. Used in the commit message
	 * @return {String|Object} return the URL of the issued pull request when the pull request is issued successfully.
	 * otherwise, return the error object in a structure of: {isError: true, message: detailed-error-message}
	 */
	issuePullRequest: async (githubGraphqlAPI, issuerGithubId, issuerAccessToken, branchName, publishedDate) => {
		const repoOwner = process.env.REPO_OWNER;
		const repoName = process.env.REPO_NAME;

		const headers = {
			"Authorization": "bearer " + issuerAccessToken
		};

		const repoInfoResponse = await axios.post(githubGraphqlAPI, {
			query: `query {
			repository(owner: "${repoOwner}", name: "${repoName}") {
				url
				id
			}
			}`
		}, {
			headers:headers
		});

		const repoId = repoInfoResponse.data.data.repository.id;

		const createPRResponse = await axios.post(githubGraphqlAPI, {
			query: `mutation {
			createPullRequest (
				input: {
					baseRefName:"main",
					headRefName: "${issuerGithubId}:${branchName}",
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
			return {
				isError: true,
				message: createPRResponse.data.errors
			};
		} else {
			return createPRResponse.data.data.createPullRequest.pullRequest.url;
		}
	}
};
