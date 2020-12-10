# Diff3 Case 4

Tests compound primary keys by creating multiple columns that exist in all files (ancestor, locale remote). Checks
if daff is able to accurately capture row mapping when using multiple primary keys. If it does, manually calculating
row similarity should not be required.

## Input data files

* `daff/tests/data/testCase4/case4Ancestor.csv`
* `daff/tests/data/testCase4/case4Local.csv`
* `daff/tests/data/testCase4/case4Remote.csv`

## Output file

* `daff/tests/diff3/testCase4/testDiff3_A_L_R.html`
* `daff/tests/mergedData/testCase4/diff3_merge_A_L_R.csv`
