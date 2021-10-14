# git-ops-api

This repository supports GitHub operation API for manipulating branches and files in remote GitHub repositories.
This API makes use of [GitHub REST API](https://docs.github.com/en/rest) and [GitHub GraphQL API](https://docs.github.com/en/graphql).

## Git Operation API

* Script: lib/gitOpsApi.js

Includes API for operating remote Github branches and files. All API functions return a promise. Refer to the JSDoc
in the script for the detail of parameters.

* getBranchRef(octokit, options)
* getAllBranches(octokit, options)
* getDirInfo(octokit, options)
* createBranch(octokit, options)
* deleteBranch(octokit, options)
* fetchRemoteFile(octokit, options)
* getFileLastCommit(octokit, options)
* createSingleFile(octokit, options)
* updateSingleFile(octokit, options)
* deleteSingleFile(octokit, options)
* commitMultipleFiles(octokit, options)
* issuePullRequest(octokit, options)

## Install

Run `npm ci` to install all dependencies.

## Linting

Run `npm run lint` to lint.

## Tests

Run `npm run test` to run tests.

### Git operation API Tests

Note that tests for Git operation API (`tests/gitOpsApiTests.js`) is not included in `npm run test` command. This test
requires a personal access token that has the privilege to operate
[inclusive-design/git-ops-api](https://github.com/inclusive-design/git-ops-api/).
This access token can be supplied by defining an environment variable named "ACCESS_TOKEN" or passed as an argument
when running the script `node tests/gitOpsApiTests.js {access_token}`.

## Define Environment Variables

Create a `.env` at the root directory with a content:

```profile
ACCESS_TOKEN={String}
```

## Demos

### Auto update ODC data files

* Script: demos/fetchODCDataFiles.js

* Goal: Check if a new version of the open dataset documenting COVID-19 assessment centre locations has been published
on the [Ontario Data Catalogue API](https://data.ontario.ca/api/3/action/package_show?id=covid-19-assessment-centre-locations).
If the dataset has been updated, this script downloads the file, updates the corresponding latest.json, and commits
them into [COVID assessment centres data repository](https://github.com/inclusive-design/covid-assessment-centres/).

* Prerequisites: Tasks below need to complete before running the script:
  * Define an environment variable `ACCESS_TOKEN`: The personal access token of a Github account that commits will be
   issued on behalf. Refer to [the Github documentation](https://docs.github.com/en/free-pro-team@latest/github/authenticating-to-github/creating-a-personal-access-token)
about how to create a Github personal access token.
  * Visit [the config file](./demos/fetchODCConfig.json5) to set proper config values. Purpose of these values are
explained in the config file.

* How to run:
`node demos/fetchODCDataFiles.js`
