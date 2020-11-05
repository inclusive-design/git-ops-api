// Load data wrangling dependencies
const dataForge = require('data-forge');
require('data-forge-fs'); // For readFile/writeFile.
const fs = require('fs'); // For saving results to a .html to visualize
const utils = require('./utils') // Import similarity function
const inquirer = require('inquirer');
const _ = require('lodash');
const daff = require('daff'); // Load diff algorithm dependencies.

// Find the URL of the latest csv
const primaryDataDirectory = process.argv[3] ? process.argv[3] : "ODC"
const foreignDataDirectory = process.argv[4] ? process.argv[4] : "WeCount"

const primaryData = `https://raw.githubusercontent.com/inclusive-design/covid-assessment-centres/main/${primaryDataDirectory}/`
const foreignData = `https://raw.githubusercontent.com/inclusive-design/covid-assessment-centres/main/${foreignDataDirectory}/`

async function main() {
	// Load data from CSV files.
	const primaryDataString = await utils.getStringCSV( primaryData )
	const foreignDataString = await utils.getStringCSV( foreignData )

	let data1 = dataForge.fromCSV( primaryDataString )
	let data2 = dataForge.fromCSV( foreignDataString )

	// Declare similarityResults object where each key is the title of a primary column and each value is an array of objects
	// where each object contains a given foreign column's name and a similarity score between the given foreign column to the respective primary column.
	let similarityResults = {}

	// Declare a similarityThreshold value that is a threshold of similarity scores to return if a given score is greater than the similarityThreshold value.
	// Default similarityThreshold value is set to 20.
	const similarityThreshold = process.argv[2] ? process.argv[2] : 20

	for (const primaryColumnSeries of data1.getColumns()) {
		primaryColumnArray = primaryColumnSeries.series.toArray();
		// Declare similarityArray to hold objects of foreign column names and similarity scores.
		let similarityArray = []
		for (const foreignColumnSeries of data2.getColumns()) {
			foreignColumnArray = foreignColumnSeries.series.toArray();

			// Similarity score between the given foreign column and respective primary column.
			// For now the similarity score is a count of how many values are in the intersection between a given foreign column and respective primary column.
			// The inclusion function may be interatively improved upon.
			let similarityScore = utils.inclusion(primaryColumnArray, foreignColumnArray)

			// Only add foreign columns to similarityArray where their similarityScore between the respective primary column is greather than similaryThreshold value.
			if (similarityScore > similarityThreshold) {
				similarityArray = similarityArray.concat( { colName: foreignColumnSeries.name, simScore:  similarityScore } )
			}
		}
		// Sort each similarityArray by decreasing similarityScore
		similarityResults[primaryColumnSeries.name] = similarityArray.sort( (a, b) => a.simScore - b.simScore ).reverse()
	}

	// Print initial column names in foreign table.
	console.log("Initial Column Names:\n")
	console.log(data2.getColumnNames())

	// Declare array to store questions.
	let questions = []

	for (let [primaryColumnName, similarForeignColumns] of Object.entries(similarityResults)) {
		// If similarForeignColumns array is not empty add inquirer question object to questions array for given primary column.
		if (similarForeignColumns.length) {

			// Declare inquirer question object for given primary column.
			// See https://www.npmjs.com/package/inquirer for details.
			columnQuestion = {}
			columnQuestion["type"] = "list"
			columnQuestion["name"] = primaryColumnName
			columnQuestion["message"] = `Choose which column is the same as the following column: "${primaryColumnName}"`
			let columnChoices = similarForeignColumns.map(column => `${column.colName} (similarity score: ${column.simScore})`)
			columnQuestion["choices"] = columnChoices.concat(["None"])
			columnQuestion["filter"] = function (val) {
				return val.split(" (similarity score: ")[0]
			}
			questions.push(columnQuestion)
		}
	}

	console.log('Select which columns are the same.');
	inquirer.prompt(questions).then((similarityAnswers) => {
		// Invert similarityAnswers object's keys and values so the foreign column names are keys and primary column names are values.
		// This format is needed for renameSeries() method.
		similarityAnswers = _.invert(similarityAnswers)
		data2 = data2.renameSeries( similarityAnswers );

		for (let [fCol, pCol] of Object.entries(similarityAnswers)) {
			if (fCol !== "None") {
				console.log(`The column "${fCol}" is renamed to "${pCol}"`)
			}
		}

		// Print renamed column names in foreign table.
		console.log("Final Column Names:\n")
		console.log(data2.getColumnNames())

		// Capture renaming choice for same tables in a separate JSON file.
		fs.writeFileSync('js/column_renaming_foreigntable_primarytable.json', JSON.stringify(similarityAnswers, null, ' ') + "\n");

		// Change data to row format to be used as inputs for daff's diff algorithm.
		// Note: when data is changed to row format title row is excluded so it must be added manually.
		const data1ColumnNames = data1.getColumnNames();
		data1 = [data1ColumnNames].concat(data1.toRows());

		const data2ColumnNames = data2.getColumnNames();
		data2 = [data2ColumnNames].concat(data2.toRows());

		// To make those tables accessible to the library, we wrap them in daff.TableView.
		var table1 = new daff.TableView(data1);
		var table2 = new daff.TableView(data2);

		// Compute the alignment between the rows and columns in the two tables.
		var alignment = daff.compareTables(table1,table2).align();

		// To produce a diff from the alignment, we first need a table for the output.
		var data_diff = [];
		var table_diff = new daff.TableView(data_diff);

		// Using default options for the diff.
		// See documentation for other option setting: http://paulfitz.github.io/daff-doc/types/coopy/CompareFlags.html
		var flags = new daff.CompareFlags();
		flags.ordered = false;
		var highlighter = new daff.TableDiff(alignment,flags);
		highlighter.hilite(table_diff);

		// The diff is now in data_diff in highlighter format.
		// console.log(data_diff);

		// Visualize results by rendering diff in html format and saving results to a .html file then running the resulting file in a browser.
		var diff2html = new daff.DiffRender();
		diff2html.render(table_diff);
		var table_diff_html = diff2html.html();

		let head_element = ' <head><title>daff</title><link rel="stylesheet" type="text/css" href="css/daff_poc.css"/></head>'
		table_diff_html = head_element + table_diff_html

		fs.writeFileSync('daff_poc_viz.html', table_diff_html);
	})
}

main()
