/*
Copyright 2021 OCAD University

Licensed under the New BSD license. You may not use this file except in compliance with this licence.
You may obtain a copy of the BSD License at
https://raw.githubusercontent.com/inclusive-design/data-update-github/main/LICENSE
*/

// Utility functions used by fetchODCDataFiles.js

"use strict";

const fs = require("fs");
const axios = require("axios");
const rimraf = require("rimraf");
const git = require("simple-git")();

module.exports = {
	/**
	 * Scrape the download link and date of last update from the ODS repository page
	 * @param {String} dataSourceUrl - The URL to the webpage where the information of the data file is published
	 * @return {Object} An object keyed by "downloadUrl" (the url to download the new data file) and
	 * "date" (the last updated date of the data file in a format of YYYY-MM-DD). These values are `undefined` when
	 * the csv link is not found or any error happens.
	 */
	getDataSource: async (dataSourceUrl) => {
		try {
			let res = await axios.get(dataSourceUrl);

			// find the CSV download link
			let csvLinks = [];
			let dataLinks = res.data.result.resources;

			for (let oneLink of dataLinks) {
				const link = oneLink.url;
				if (link.endsWith(".csv")) {
					if (!module.exports.isValidDate(oneLink.data_last_updated)) {
						return {
							isError: true,
							message: "The published date (" + oneLink.data_last_updated + ") is invalid. Check if it is in the format or \"yyyy-mm-dd\""
						};
					}
					csvLinks.push({
						downloadUrl: link,
						publishedDate: oneLink.data_last_updated
					});
				}
			}

			const numOfCsvLinks = csvLinks.length;

			// Return the csv link and its published date only when one and only one csv link is found. Otherwise, report error.
			if (numOfCsvLinks === 1) {
				return csvLinks[0];
			} else if (numOfCsvLinks === 0) {
				return {
					isError: true,
					message: "CSV download link is not found on the data source (" + dataSourceUrl + ")"
				};
			} else {
				return {
					isError: true,
					message: "More than one CSV download link are found on the data source (" + dataSourceUrl + "): " + JSON.stringify(csvLinks)
				};
			}
		} catch (error) {
			return {
				isError: true,
				message: "Error in getDataSource() - " + error
			};
		}
	},

	/**
	 * Validate the date is in the format of "yyyy-mm-dd". "mm" and "dd" allow one or two digits
	 * @param {String} date - A date in any format. In the context of this script, a valid input format is: 2020-11-17
	 * @return {Boolean} Return true if the format is correct. Otherwise, return false.
	 */
	isValidDate: (date) => {
		if (!date) {
			return false;
		}
		const pattern = /^(\d{4})-(\d{1,2})-(\d{1,2})$/;
		const matches = pattern.exec(date.trim());
		return matches !== null;
	},

	/**
	 * Download a file from the given download URL and return the file content.
	 * @param {String} downloadURL - The download URL
	 * @return {String|Object} return the file content when the operation completes successfully. When an error occurs,
	 * return the error object in a structure of: {isError: true, message: detailed-error-message}
	 */
	downloadDataFile: async (downloadURL, targetFileLocation) => {
		try {
			let res = await axios.get(downloadURL);
			return res.data;
		} catch (error) {
			return {
				isError: true,
				message: error
			};
		}
	}
};
