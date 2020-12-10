# Diff2 Case 4

Tests compound primary keys by creating multiple columns that exist in all files (ancestor, locale remote). Checks
if daff is able to accurately capture row mapping when using multiple primary keys. If it does, manually calculating
row similarity should not be required.

## Input data files

* `daff/tests/data/testCase4/case4Ancestor.csv`
* `daff/tests/data/testCase4/case4Local.csv`
* `daff/tests/data/testCase4/case4Remote.csv`

## Output file

* `daff/tests/diff2/testCase4/testDiff2_L_R.html`
