#!/bin/bash

# Copy commit_id.txt to the public folder or create default
[ -f ./commit_id.txt ] && cp ./commit_id.txt ./public/commit_id.txt || echo $REVISION > ./public/commit_id.txt

/node_app/node_modules/.bin/coffee /node_app/index.coffee
