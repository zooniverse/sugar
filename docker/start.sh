#!/bin/bash

# Copy commit_id.txt to the public folder or create default
[ -f ./commit_id.txt ] && cp ./commit_id.txt ./public/commit_id.txt || echo $REVISION > ./public/commit_id.txt

# https://github.com/nodejs/node/blob/main/doc/api/cli.md#--max-semi-space-sizesize-in-megabytes
# https://github.com/nodejs/node/issues/42511
node --max-semi-space-size=64 /node_app/index.js
