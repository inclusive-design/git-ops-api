# data-update-github

A remote data change triggers the issue of a pull request to a specified Github repository.

## Install

Run `npm ci` to install all dependencies.

## Linting

Run `npm run lint` or `grunt lint` to lint.

## Scripts

### Auto update ODC data files

* Script: scripts/fetchODCDataFiles.js

* Goal: Check if a new version of the open dataset documenting COVID-19 assessment centre locations has been published
on the [Ontario Data Catalogue](https://data.ontario.ca/dataset/covid-19-assessment-centre-locations). If the dataset
has been updated, this script downloads the file, updates the corresponding latest.json, and issues a pull request
against the [COVID assessment centres data repository](https://github.com/inclusive-design/covid-assessment-centres/).

* Prerequisites: Tasks below need to complete before running the script:
  * Define an environment variable `GITHUB_ACCOUNT_URL`: This variable defines the Github repository URL with an
embedded authenticated Github account that pull requests will be issued on behalf. Refer to [the Github documentation](https://docs.github.com/en/free-pro-team@latest/github/authenticating-to-github/creating-a-personal-access-token)
about how to create a Github personal access token and use it for authenticating HTTPS Git operations.
An example: `https://{username}:{personal-access-token}@github.com/wecountproject/covid-assessment-centres.git`
  * Visit [the config file](./scripts/fetchODCConfig.json5) to set proper config values. Purpose of these values are
explained in the config file.

* How to run:
`node scripts/fetchODCDataFiles.js https://data.ontario.ca/dataset/covid-19-assessment-centre-locations ODC`

### Diff/merge 2 or 3 datasets

* Script: scripts/test_daff.js

* Goal: This script runs a diffing algorithm and produces html that shows a visulization of the diff and optionally an updated local data set that is a result of mergeing in the diff results. The visuliztion can be seen by running the produced html file in a browser. This script takes three arguments maximum but needs at least two arugments minimum to run successfully. Possible arguments are 1, 2, and 3. Corresponding to temporarily hard-coded dataset files. In future implementation arguments will be user selected files.

* Arguments:
	- first argument: URL of local data
	- second argument: URL of remote data
	- third argument: URL of ancestor data

* How to run:
`node scripts/test_daff.js 3 2 1`

### Test diff 2

* Script: scripts/test_diff2.js

* Goal: This script tests diff2 algorithm in daff library and uses the data in data/test_data to do so. This script takes two arguments Possible arguments are 1 and 2. Corresponding to temporarily hard-coded dataset files.

* Arguments:
	- first argument: URL of local data
	- second argument: URL of remote data

* How to run:
`node scripts/test_daff.js 3 2`

### Test diff 3

* Script: scripts/test_diff3.js

* Goal: This script tests diff2 algorithm in daff library and uses the data in data/test_data to do so. This script takes three arguments maximum but needs at least two arugments minimum to run successfully. Possible arguments are 1, 2, and 3. Corresponding to temporarily hard-coded dataset files.

* Arguments:
	- first argument: URL of local data
	- second argument: URL of remote data
	- third argument: URL of ancestor data

* How to run:
`node scripts/test_daff.js 3 2 1`
