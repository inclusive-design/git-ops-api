# Diff3 Case 5

Test if compound primary keys for R*L columns can accurately capture row mapping for
remote-local rows. If it does, manually calculating row similarity should not be required.
Also test minimum number of compound primary keys.

## Input data files

* `daff/tests/data/testCase5/case5Ancestor.csv`
* `daff/tests/data/testCase5/case5Local.csv`
* `daff/tests/data/testCase5/case5Remote.csv`

## Output file

* `daff/tests/diff3/testCase5/testDiff3_A_L_R.html`
* `daff/tests/mergedData/testCase5/diff3_merge_A_L_R.csv`
