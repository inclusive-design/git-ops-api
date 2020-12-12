# Directory Contents

**diff2/** - This folder contains html diff2 table output of `diff2.js` script.

**diff3/** - This folder contains html diff3 table output of `diff3.js` script.

**mergedData/** - This folder contains updated local file after having diff changes merged in. It is an output of `diff3.js`.

**data/** - This folder contains input files for diff scripts, metadata of input files and results of runinng test cases.

**calcColumnSimilarity.js** - This script completes preproccessing steps for `diff2.js`/`diff3.js` and produces meta data
for its given input data files.

How to run

* For diff2:
```node calcColumnSimilarity.js local.csv remote.csv```

* For diff3:
```node calcColumnSimilarity.js ancestor.csv local.csv remote.csv```

* For diff3 with custom column similarity threshold:
```node calcColumnSimilarity.js ancestor.csv local.csv remote.csv 0.5```

Output file
```node data/meta_local_remote.json```

**diff2.js** - This script runs diff2 for two given input data files and outputs a visualization of the diff in an html file.

How to run
```node diff2.js local.csv remote.csv```

Output file
```diff2/diff2_local_remote.html```

**diff3.js** - This script runs diff3 for three given input data files and outputs a visualization of the diff
in an html file and a updated local file after having diff changes merged in.

How to run
```node diff3.js local.csv remote.csv```

Output file
```mergedData/merged_ancestor_local_remote.html```
```mergedData/merged_ancestor_local_remote.html```

## Test Cases

All test case directories contain the same input data files:

* `ancestor.csv`
* `local.csv`
* `remote.csv`

All test cases generate same set of output files:

* `diff2_local_remote.html`
* `diff3_ancestor_local_remote.html`

### Case 1

Test diff2 and diff3 without any preprocessing and postprocessing. All 3 files have their
own columns/rows and common columns/rows.

### Case 2

This test considers the case where preprocessing removed columns in ancestor and
remote files that the local file doesn’t care about has been completed. The removed
columns are A-R and A.

### Case 3

This test considers the case where local and remote files independently add columns that turn
out to contain the same information. These columns will be called R-L.

### Case 4

Tests compound primary keys by creating multiple columns that exist in all files (ancestor, locale remote). Checks
if daff is able to accurately capture row mapping when using multiple primary keys. If it does, manually calculating
row similarity should not be required.

### Case 5

Test if compound primary keys for R-L columns can accurately capture row mapping for
remote-local rows. If it does, manually calculating row similarity should not be required.
Also test minimum number of compound primary keys.

### Conclusion

Refer to full issue description in [Daff Issue Summary document](https://docs.google.com/document/d/1GlKs9KH3ujwLzuBomwUnA6xcBWsYdZ22cWgSqIiKAfk/edit#)
document.

Diff2 works as expected.

Diff3 output has these issues

* Issue 1 - Deletion of columns/rows found in both ancestor and local files but not remote file
* Issue 2 - Handling conflicts of columns/rows found in both remote and local files but not ancestor file
* Issue 3 - When all values in compound primary key columns/row are changed.
* Issue 4 - Duplicate of row that is found in all three files
