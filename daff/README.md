# Directory Contents

**data/** - This folder contains input files for diff scripts and results of runinng test cases.

**calcColumnSimilarity.js** - This script completes preproccessing steps for `diff2.js`/`diff3.js` and produces metadata
for its given input data files.

* How to run:

  * with default column similarity threshold of 20%:
```node calcColumnSimilarity.js local.csv remote.csv metadata_local_remote.json```

  * with custom column similarity threshold:
```node calcColumnSimilarity.js local.csv remote.csv metadata_local_remote.json 0.5```

* Output file:
```meta_local_remote.json```

**diff2.js** - This script runs diff2 for two given input data files and outputs a visualization of the diff in an html file.

* How to run:
```node diff2.js local.csv remote.csv diff2_local_remote.html```

* Output file:
```diff2/diff2_local_remote.html```

**diff3.js** - This script runs diff3 for three given input data files and outputs a visualization of the diff
in an html file and a updated local file after having diff changes merged in.

* How to run:
```node diff3.js ancestor.csv local.csv remote.csv diff3_ancestor_local_remote.html diff3_merged.csv```

* Output file:
  * ```diff3_ancestor_local_remote.html```
  * ```diff3_merged.csv```

## Test Cases

All test case directories contain the same input data files except for case 8:

* `ancestor.csv`
* `local.csv`
* `remote.csv`

All test cases generate same set of output files except for case 8:

* `diff2_local_remote.html`
* `diff3_ancestor_local_remote.html`
* `diff3_merged.csv`

### Case 1

**Goal:** Test diffing output of diff2 and diff3 without any preprocessing and postprocessing. All three files
have their own columns/rows and common columns/rows.

**Result:** The output differs from what the WeCount accessibility map needs from a diffing algorithm.

**Relevant Issues:** 1

### Case 2

**Prerequisite:** Assume that the preprocessing been completed. This preprocessing removes columns that the local
file doesn’t care about from the ancestor and remote files.

**Goal:** Test diffing output of diff2 and diff3.

**Result:** The output is what the WeCount accessibility map would expect besides the issue 1.

**Relevant Issues:** 1

### Case 3

Goal:

Result:

**Prerequisite:** Assume that the preprocessing been completed. This preprocessing removes columns that the local
file doesn’t care about from the ancestor and remote files.

**Goal:** When local and remote files independently add the same column that contains the same information, find
out if the daff library is able to identify them as the same column.

**Result:** No, these columns are identified as separate columns and the daff doesn't report any conflict.

**Relevant Issues:** 1, 2

### Case 4

**Prerequisite:** Assume that the preprocessing has been completed. This preprocessing removes columns that the local
file doesn’t care about from the ancestor and remote files. Assume local and remote files independently add
a column that turns out to contain the same information. Assume there are 3 columns that exist in all 3 (ancestor,
local remote) files. In the remote file assume a single compound primary key cell is edited. Asumme that same cell is
edited in the local file.

**Goal:** Tests how compound primary keys work. Checks if daff is able to accurately capture row mapping of rows that
are in all 3 files when using compound primary keys.

**Result:** Daff is able to capture row maping of rows that are 3 files when compound primary keys are in use.

**Relevant Issues:** 1, 2

### Case 5

**Prerequisite:** Assume that the preprocessing has been completed. This preprocessing removes columns that the local
file doesn’t care about from the ancestor and remote files. Assume local and remote files independently add
3 columns that turn out to contain the same information. Assume there are 2 columns that exist in all 3 (ancestor,
local remote) files. In the remote file assume all compound primary key cells are edited.

**Goal:** Test if compound R-L columns can accurately capture row mapping for remote-local rows. Also test the
minimum number of compound primary keys needed to accruately capture row mapping and what errors take place when all
compound primary key cells are updated.

**Result:** Daff is not able to capture row maping for rows that appear in all 3 (ancestor, local, remote) files when
all compound primary key cells are edited in the remote file. Daff is not able to capture row maping for rows that appear
in only remote and local files. This has to do with the fact that daff doesn't show column/row merge conflicts. The daff
library only reports cell level merge conflicts. The minimum number of compound primary keys needed are 2.

**Relevant Issues:** 1, 2, 3

### Case 6

**Prerequisite:** Assume that the preprocessing has been completed. This preprocessing removes columns that the local
file doesn’t care about from the ancestor and remote files. Assume local and remote files independently add
a column that turns out to contain the same information. Assume there are 2 columns that exist in all 3 (ancestor,
local remote) files. In the local file assume the all cell in the A-L column and all compound primary key cells are
edited.

**Goal:** Unlike the remote file no errors occur when all compound primary key cells are edited in the local file. This
case identifies an error that occurs after editing the cells of the local file mentioned in the **prerequisite**.

**Result:** A duplicate row for rows found in all 3 files is added in the diff output.

**Relevant Issues:** 1, 2, 4

### Case 7

**Prerequisite:** Assume that the preprocessing has been completed. This preprocessing removes columns that the local
file doesn’t care about from the ancestor and remote files. Assume local and remote files independently add
a column that turns out to contain the same information. Assume there are 2 columns that exist in all 3 (ancestor,
local remote) files. In the local file assume cells that are found in only ancestor and local files are edited.

**Goal:** Highlight a case where row issue 1 does not occur.

**Result:** Row issue 1 does not occur. The output is what the WeCount accessibility map would expect besides the
issues 2 and column issue 1.

**Relevant Issues:** 1, 2, 5

### Case 8

**Prerequisite:** Assume that the preprocessing has been completed. This preprocessing removes columns that the local
file doesn’t care about from remote file. Assume local and remote files independently add a column
that turns out to contain the same information. Assume columns that the local and remote files have in common are named
differntly in each file. This case uses the local and remote files from case 3 but with the All column and the R-L
column renamed differently in the remote file.

**Goal:** Rename columns in the remote file that are also in local file. Name these columns according to the names given
to them in the local file using `calcColumnSimilarity.js`.

**Result:** Columns in the remote file are renamed according to local file column names. Outputs a metadata file containing
information on the column name mapping between the local and remote files.

**Relevant Issues:** N/A

## Conclusion

Refer to detailed evaluation process and results in [Daff Issue Summary document](https://docs.google.com/document/d/1GlKs9KH3ujwLzuBomwUnA6xcBWsYdZ22cWgSqIiKAfk/edit?usp=sharing)
document.

Diff2 works as expected.

Diff3 output has these issues

### Issue 1

Diff output removes columns/rows found in only ancestor and local files.

**Interpretation:** Diff3 is doing the right thing by removing these columns/rows because they were in the ancestor
table but the remote table has decided to remove it. In our case, this implies ODC no longer maintains cell values
found in both ancestor and local files.

**Proposed Solution:** Provide an option to users to decide if they wanna take the ownership of columns/rows found
in both ancestor and local files but not remote file by retaining it or removing it.

**Relevant Cases:** Relevant in all cases due to all cases possessing A-L column and ancestor-local row.

### Issue 2

When both the remote and the local tables add a column/row that contain the same information, daff treats them as
separate columns/rows.

**Interpretation:** In the diff output, this column/row will always appear as 2 separate columns/rows,
one marked in green (from remote file), the other marked in white (from local file).

**Proposed Solution:** Give user options to merge them or keep one of the columns/rows. Use the column/row from the
local file as the base and update corresponding values with what have been changed in the remote file.

**Relevant Cases:** Relevant in cases 3, 4, 5, 6 and 7 due to those cases possessing R-L column and remote-local row.

### Issue 3

If all the compound primary key cells are edited in the remote file, then the row containing compound primary key cells
from the remote file is added in the diff output. The cell values for columns that are not in the remote file for this row
will be null. This is an error because valid values for these cells exist in the local file in the corresponding row

**Interpretation:** The all row from the remote file gets added as a brand new row. The all row from the local file gets
removed.

**Proposed Solution:** Give user options to merge them or keep one of the rows. Use the all rows from the remote file or
the local file as the base and update corresponding values from that row using values in the other file.

**Relevant Cases:** Relevant in case 5.

### Issue 4

Duplicate of row that is found in all three files.

**Interpretation:** The all row in the remote file gets added as a brand new row. The all row in the local file remains
in the diff output.

**Proposed Solution:** Give user options to merge them or keep one of the rows. Use the all rows from the remote file
or the local file as the base and update corresponding values from that row using values in the other file.

**Relevant Cases:** Relevant in case 6.

### Issue 5

Issue 5 is absence of row issue 1. In all cases this issue occurs except case 7.

**Interpretation:**  Rows found in only ancestor and local files will not be removed. Instead the row will be marked in
white and remain in the table.

**Proposed Solution:** Provide an option to users to decide if they wanna take the ownership of rows found in only
ancestor and local files by retaining it or removing it.

**Relevant Cases:** Relevant in case 7.
