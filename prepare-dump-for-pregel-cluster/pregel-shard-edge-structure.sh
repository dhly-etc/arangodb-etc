#!/bin/bash

FILE=$1
echo "Processing $FILE..."
cat $FILE | sed -e 's/"numberOfShards":1/"numberOfShards":12,"distributeShardsLike":"brand"/g' |  sed -e 's/"shardKeys":\["_key"\]/"shardKeys":["vertex"]/g' > "$FILE.fixed"