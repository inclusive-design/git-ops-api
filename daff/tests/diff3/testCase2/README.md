# Diff3 Case 2

This test considers the case where preprocessing removed columns in ancestor and
remote files that the locale file doesn’t care about has been completed. The removed
columns are A*R and A.

## Input data files

* `daff/tests/data/testCase2/case2Ancestor.csv`
* `daff/tests/data/testCase2/case2Local.csv`
* `daff/tests/data/testCase2/case2Remote.csv`

## Output file

* `daff/tests/diff3/testCase2/testDiff3_A_L_R.html`
* `daff/tests/mergedData/testCase2/diff3_merge_A_L_R.csv`
