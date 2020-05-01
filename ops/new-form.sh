#!/bin/bash
set -e

name="$1";

if [[ -z "$name" ]]
then echo "Provide the name of the form (eg f1040s1) as the first & only arg" && exit;
fi

echo "Adding support for form $name"

if [[ ! -f "modules/taxes/ops/forms/$name.pdf" ]]
then bash "modules/taxes/ops/fetch.sh" $name
fi

test_file="modules/taxes/test.json";
mv $test_file $test_file.backup
cat $test_file.backup | jq '.forms |= . + ["'$name'"]' > $test_file
rm $test_file.backup

cd modules/taxes
node ops/update-mappings.js -y

filers=src/filers
cp $filers/template.ts $filers/$name.ts

index=$filers/index.ts
mv $index $index.backup
echo 'export * from "./'$name'";' | cat - $index.backup | sort > $index
rm $index.backup

echo "1. Add $name to mappings index & Form type in: modules/taxes/src/mappings/index.ts"
echo "2. Modify $name filer to export a properly named function: modules/taxes/src/filers/$name.ts"
echo "3. Run 'make test' & see how it looks"
