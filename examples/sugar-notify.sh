#!/bin/bash
curl -vv \
     -X "POST" "https://notifications-staging.zooniverse.org/notify" \
     -H 'Content-Type: application/json' \
     -u 'USER:PASSWORD' \
     -d $'{
  "notifications": [{
    "message": "HELLO!",
    "user_id": "1755",
    "url": "http://test.net",
    "delivered": false
  }]
}'