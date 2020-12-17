#!/bin/bash
FILE=$1
echo "Processing $FILE..."
zcat $FILE | sed -e 's/"_from":"\(.*\)\/\(.*\)","_to"/"_from":"\1\/\2","vertex":"\2","_to"/g' | gzip -9 > "$FILE.fixed"