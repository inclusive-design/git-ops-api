# !/bin/sh

branchName=$1
dataFileURL=$2
dataFile=$3
commitMessage=$4

git fetch origin
git checkout -b $branchName
echo "downloading updated data from \"$dataFileURL\""
curl $dataFileURL > $dataFile
echo "commiting updated data and pushing to remote origin"
git add $dataFile
git commit -m $commitMessage
git push origin $branchName
# TODO create a PR
# pull request script example from https://gist.github.com/tonatiuh/e342073184da92b3b15f
# repo=`git remote -v | grep -m 1 "(push)" | sed -e "s/.*github.com[:/]\(.*\)\.git.*/\1/"`
# echo "... creating pull request for branch \"$branchName\" in \"$repo\""
# open https://github.com/$repo/pull/new/$branchName
