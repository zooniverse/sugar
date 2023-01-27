#!/bin/bash
curl -vv \
     -X "POST" "https://notifications-staging.zooniverse.org/announce" \
     -H 'Content-Type: application/json' \
     -u 'USER:PASSWORD' \
     -d $'{
  "announcements": [{
    "message": "HELLO!",
    "section": "project:testing",
    "url": "http://test.net",
    "delivered": false
  }]
}'