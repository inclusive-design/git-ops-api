# data-update-github

A remote data change triggers the issue of a pull request to a specified Github repository.

## Install

Run `npm ci` to install all dependencies.

## Linting

Run `npm run lint` or `grunt lint` to lint.

## Scripts

### Auto update ODS data files

* Script: scripts/fetchODCDataFiles.js

* Goal: Check if a new data file of COVID-19 assessment centre locations is published at the [Ontario Data Service
website](https://data.ontario.ca/dataset/covid-19-assessment-centre-locations). If there is one, this script downloads
the file, updates the corresponding latest.json and issues a pull request against [the COVID data repository](https://github.com/inclusive-design/covid-assessment-centres/).

* Prerequisites: Before running the script, an environment variable `GITHUB_ACCOUNT_URL` must be defined . This
variable defines the Github repository URL with an embedded authenticated Github account that pull requests will be
issued on behalf. Refer to [the Github documentation](https://docs.github.com/en/free-pro-team@latest/github/authenticating-to-github/creating-a-personal-access-token)
about how to create a Github personal access token and use it for authenticating HTTPS Git operations.
An example: `https://{username}:{personal-access-token}@github.com/wecountproject/covid-assessment-centres.git`

* How to run:
`node scripts/fetchODCDataFiles.js https://data.ontario.ca/dataset/covid-19-assessment-centre-locations ODC`
