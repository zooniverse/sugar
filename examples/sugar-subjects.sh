#!/bin/bash
curl -vv \
     -X "POST" "https://notifications-staging.zooniverse.org/experiment" \
     -H 'Content-Type: application/json' \
     -u 'USER:PASSWORD' \
     -d $'{
  "experiments": [{
    "message": {
       "type": "subject_queue", 
       "subject_ids": ["4234"],
       "workflow_id": "1483"
    },
    "user_id": "1755",
    "url": "http://test.net",
    "delivered": false
  }]
}'