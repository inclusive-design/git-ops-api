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
	hasOneCsv: {
		message: "Return the download link and the published date when the data source contains and only contains one csv download link",
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
		message: "Report the error when the data source doesn't contain any csv download link",
		nockConfig: {
			status: 200,
			response: fs.readFileSync(__dirname + "/data/responseWithoutCsv.html")
		},
		expected: {
			"isError": true,
    	"message": "CSV download link is not found on the data source (https://data.ontario.ca/dataset/covid-19-assessment-centre-locations)"
		}
	},
	moreThanOneCsv: {
		message: "Report the error when the data source contains more than one csv download links",
		nockConfig: {
			status: 200,
			response: fs.readFileSync(__dirname + "/data/responseWithMoreThanOneCsv.html")
		},
		expected: {
			"isError": true,
    	"message": "More than one CSV download link are found on the data source (https://data.ontario.ca/dataset/covid-19-assessment-centre-locations): [{\"downloadUrl\":\"https://data.ontario.ca/dataset/1.csv\",\"publishedDate\":\"2020-11-17\"},{\"downloadUrl\":\"https://data.ontario.ca/dataset/2.csv\",\"publishedDate\":\"2020-11-18\"},{\"downloadUrl\":\"https://data.ontario.ca/dataset/3.csv\",\"publishedDate\":\"2020-11-19\"}]"
		}
	},
	wrongPublishedDate: {
		message: "Report the error when any published date is wrong",
		nockConfig: {
			status: 200,
			response: fs.readFileSync(__dirname + "/data/responseWithWrongPublishedDate.html")
		},
		expected: {
			"isError": true,
    	"message": "The published date (2020/11/18) is not recognizable. Check if it is in the format or \"month dd, yyyy\""
		}
	},
	serverDown: {
		message: "No respose from the server",
		nockConfig: {
			status: 400,
			response: ""
		},
		expected: {
			"isError": true,
    	"message": "Error in getDataSource() - Error: Request failed with status code 400"
		}
	}
};

fluid.each(getDataSourceTestCases, function (oneCase, key) {
	jqUnit.test("Test getDataSource() - " + key, function () {
		jqUnit.expect(1);
		// setup nock to mock the response from the data source
		nock(odsHostname).get(odsPath).reply(oneCase.nockConfig.status, oneCase.nockConfig.response);
		return utils.getDataSource(fullSitePath).then(function (result) {
			jqUnit.assertDeepEq(oneCase.message, oneCase.expected, result);
		});
	});
});

// ****************** Test isValidDate() ******************

jqUnit.test("Test isValidDate()", function () {
	const testCases = {
		correct1: {
			message: "Correct format",
			input: "November 17, 2020",
			expected: true
		},
		missingMonth: {
			message: "Correct format",
			input: " 17, 2020",
			expected: false
		},
		incorrectFormat1: {
			message: "Convert the input format of 11/17/2020",
			input: "11/17/2020",
			expected: false
		},
		incorrectFormat2: {
			message: "Convert the input format of 17 November 2020",
			input: "17 November 2020",
			expected: false
		},
		undefinedInput: {
			message: "The input is undefined",
			input: undefined,
			expected: false
		},
		emptyInput: {
			message: "The input is empty",
			input: "",
			expected: false
		},
		missingYear: {
			message: "The input format is invalid",
			input: "20 November",
			expected: false
		}
	};

	jqUnit.expect(7);
	fluid.each(testCases, function (oneCase) {
		jqUnit.assertEquals(oneCase.message, oneCase.expected, utils.isValidDate(oneCase.input));
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
			message: "Convert the input format of November 17, 2020",
			input: "Nov 17, 2020",
			expected: "2020-11-17"
		},
		wrongMonth: {
			message: "Correct format with a wrong mon",
			input: "wrong 17, 2020",
			expected: "NaN-NaN-NaN"
		},
		wrongDay: {
			message: "Correct format with a wrong mon",
			input: "Nov 32, 2020",
			expected: "NaN-NaN-NaN"
		},
		incorrectFormat1: {
			message: "Convert the input format of 11/17/2020",
			input: "11/17/2020",
			expected: "NaN-NaN-NaN"
		},
		incorrectFormat2: {
			message: "Convert the input format of 17 November 2020",
			input: "17 November 2020",
			expected: "NaN-NaN-NaN"
		},
		undefinedInput: {
			message: "The input is undefined",
			input: undefined,
			expected: "NaN-NaN-NaN"
		},
		emptyInput: {
			message: "The input is empty",
			input: "",
			expected: "NaN-NaN-NaN"
		},
		stringInput: {
			message: "The input format is invalid",
			input: "a random string1",
			expected: "NaN-NaN-NaN"
		},
		missingYear: {
			message: "The input format is invalid",
			input: "20 November",
			expected: "NaN-NaN-NaN"
		},
		missingDay: {
			message: "The input format is invalid",
			input: "November 2020",
			expected: "NaN-NaN-NaN"
		}
	};

	jqUnit.expect(11);
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
		response: true,
		targetFileLocation: __dirname + "/data/temp.txt"
	},
	downloadFail: {
		message: "Unable to download the file content",
		nockConfig: {
			status: 400,
			response: undefined
		},
		fileExists: false,
		response: {
			isError: true
		},
		targetFileLocation: __dirname + "/data/temp.txt"
	}
};

fluid.each(downloadDataFileTestCases, function (oneCase, key) {
	jqUnit.test("Test downloadDataFile() - " + key, function () {
		jqUnit.expect(2);
		// setup nock to mock the response from the data source
		nock(odsHostname).get(odsPath).reply(oneCase.nockConfig.status, oneCase.nockConfig.response);

		return utils.downloadDataFile(fullSitePath, oneCase.targetFileLocation).then(function (res) {
			if (oneCase.fileExists) {
				const resultContent = fs.readFileSync(oneCase.targetFileLocation, "utf8");
				jqUnit.assertEquals(oneCase.message, oneCase.nockConfig.response, resultContent);
				rimraf.sync(oneCase.targetFileLocation);
			} else {
				jqUnit.assertFalse("The target file does not exist", fs.existsSync(oneCase.targetFileLocation));
			}
			if (oneCase.response.isError) {
				jqUnit.assertEquals("The value of isError is expected", oneCase.response.isError, res.isError);
			} else {
				jqUnit.assertEquals("The value of isError is expected", oneCase.response, res);
			}
		});
	});
});
