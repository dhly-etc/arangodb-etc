#!/bin/bash

sources=$(find arangod arangosh enterprise lib -type f -regextype grep -regex ".*/.*\\.\(cpp\|h\)")
for source in $sources; do
        grep '#include' "$source" | while read -r line; do
                s=$(echo "$line" | grep -oEi '".*"')
                target="${s:1:${#s}-2}"
		if [[ -n "$target" ]]; then
	                echo "{\"source\": \"$source\", \"target\": \"$target\"}"
		fi
        done
done
