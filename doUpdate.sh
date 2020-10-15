# !/bin/sh
# ./doUpdate.sh ./data test-update https://data.ontario.ca/dataset/8ba078b2-ca9b-44c1-b5db-9674d85421f9/resource/04bede2c-5e30-4a05-b890-cd407043485e/download/assessment-centre-locations.csv versions/assessment_centre_locations_2020_08_20.csv "test update"
repoFolder=$1
branchName=$2
dataFileURL=$3
dataFile=$4
commitMessage=$5

cd $repoFolder
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
