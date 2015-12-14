#!/bin/sh
# Build the dist file based on individual modules

sources="solid.js auth.js identity.js status.js utils.js web.js"
dist="dist/solid.js"

echo > $dist

for src in "$sources"
do
  cat $src >> $dist
done

echo "\nBuilt dist file in $dist\n"
exit 0
