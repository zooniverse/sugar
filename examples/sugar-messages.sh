#!/bin/bash
curl -vv \
     -X "POST" "https://notifications-staging.zooniverse.org/experiment" \
     -H 'Content-Type: application/json' \
     -u 'USER:PASSWORD' \
     -d $'{
  "experiments": [{
    "type": "notification",
    "message": "HI JIM!",
    "user_id": "1755",
    "url": "http://test.net",
    "delivered": false
  }]
}'