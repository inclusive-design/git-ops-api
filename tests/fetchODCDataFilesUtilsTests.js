/*
Copyright 2020 OCAD University

Licensed under the New BSD license. You may not use this file except in compliance with this licence.
You may obtain a copy of the BSD License at
https://raw.githubusercontent.com/inclusive-design/data-update-github/main/LICENSE
*/

"use strict";

const fluid = require("infusion");
const jqUnit = fluid.require("node-jqunit", require, "jqUnit");
const fs = require("fs");
const nock = require("nock");
const rimraf = require("rimraf");

const utils = require("../scripts/fetchODCDataFilesUtils.js");

jqUnit.module("Fetch ODC data files tests");

const odsHostname = "https://data.ontario.ca";
const odsPath = "/dataset/covid-19-assessment-centre-locations";
const fullSitePath = odsHostname + odsPath;

//****************** Test getDataSource() ******************

const getDataSourceTestCases = {
	hasCsv: {
		message: "The response contains a download link pointing to a csv format: download link and the published date is returned",
		nockConfig: {
			status: 200,
			response: fs.readFileSync(__dirname + "/data/responseWithCsv.html")
		},
		expected: {
			downloadUrl: "https://data.ontario.ca/dataset/8ba078b2-ca9b-44c1-b5db-9674d85421f9/resource/c60993bb-3988-4648-9be9-398dee480514/download/assessment_centre_locations.csv",
			publishedDate: "2020-11-17"
		}
	},
	noCsv: {
		message: "The response doesn't contain a download link pointing to a csv format: download link and the published date returns undefined",
		nockConfig: {
			status: 200,
			response: fs.readFileSync(__dirname + "/data/responseWithoutCsv.html")
		},
		expected: {
			downloadUrl: undefined,
			publishedDate: undefined
		}
	},
	serverDown: {
		message: "No respose from the server",
		nockConfig: {
			status: 400,
			response: ""
		},
		expected: {
			downloadUrl: undefined,
			publishedDate: undefined
		}
	}
};

fluid.each(getDataSourceTestCases, function (oneCase, key) {
	jqUnit.asyncTest("Test getDataSource() - " + key, function () {
		jqUnit.expect(1);
		// setup nock to mock the response from the data source
		nock(odsHostname).get(odsPath).reply(oneCase.nockConfig.status, oneCase.nockConfig.response);

		utils.getDataSource(fullSitePath).then(function (result) {
			jqUnit.assertDeepEq(oneCase.message, oneCase.expected, result);
			jqUnit.start();
		});
	});
});

// ****************** Test formatDate() ******************

jqUnit.test("Test formatDate()", function () {
	const testCases = {
		format1: {
			message: "Convert the input format of November 17, 2020",
			input: "November 17, 2020",
			expected: "2020-11-17"
		},
		format2: {
			message: "Convert the input format of 11/17/2020",
			input: "11/17/2020",
			expected: "2020-11-17"
		},
		format3: {
			message: "Convert the input format of 17 November 2020",
			input: "17 November 2020",
			expected: "2020-11-17"
		},
		special1: {
			message: "The input is undefined",
			input: undefined,
			expected: "NaN-NaN-NaN"
		},
		special2: {
			message: "The input is empty",
			input: "",
			expected: "NaN-NaN-NaN"
		},
		special3: {
			message: "The input format is invalid",
			input: "a random string1",
			expected: "NaN-NaN-NaN"
		}
	};

	jqUnit.expect(6);
	fluid.each(testCases, function (oneCase) {
		jqUnit.assertEquals(oneCase.message, oneCase.expected, utils.formatDate(oneCase.input));
	});
});

// ****************** Test fileNotExists() ******************

jqUnit.test("Test fileNotExists()", function () {
	const testCases = {
		nonexistent: {
			message: "The file doesn't exist",
			filename: "nonexistent.file",
			directory: __dirname + "/data",
			expected: true
		},
		existsAsFirst: {
			message: "The file already exist - first file in alphabetical order",
			filename: "responseWithCsv.html",
			directory: __dirname + "/data",
			expected: false
		},
		existsAsLast: {
			message: "The file already exist - last file in alphabetical order",
			filename: "responseWithoutCsv.html",
			directory: __dirname + "/data",
			expected: false
		}
	};

	jqUnit.expect(3);
	fluid.each(testCases, function (oneCase) {
		jqUnit.assertEquals(oneCase.message, oneCase.expected, utils.fileNotExists(oneCase.filename, oneCase.directory));
	});
});

//****************** Test downloadDataFile() ******************

const downloadDataFileTestCases = {
	writeContent: {
		message: "The downloaded content is written to the disk",
		nockConfig: {
			status: 200,
			response: "test file content"
		},
		fileExists: true,
		targetFileLocation: __dirname + "/data/temp.txt"
	},
	downloadFail: {
		message: "Unable to download the file content",
		nockConfig: {
			status: 400,
			response: undefined
		},
		fileExists: false,
		targetFileLocation: __dirname + "/data/temp.txt"
	}
};

fluid.each(downloadDataFileTestCases, function (oneCase, key) {
	jqUnit.asyncTest("Test downloadDataFile() - " + key, function () {
		jqUnit.expect(1);
		// setup nock to mock the response from the data source
		nock(odsHostname).get(odsPath).reply(oneCase.nockConfig.status, oneCase.nockConfig.response);

		utils.downloadDataFile(fullSitePath, oneCase.targetFileLocation).then(function () {
			if (oneCase.fileExists) {
				const resultContent = fs.readFileSync(oneCase.targetFileLocation, "utf8");
				jqUnit.assertEquals(oneCase.message, oneCase.nockConfig.response, resultContent);
				rimraf.sync(oneCase.targetFileLocation);
			} else {
				jqUnit.assertFalse("The target file does not exist", fs.existsSync(oneCase.targetFileLocation));
			}
			jqUnit.start();
		});
	});
});
