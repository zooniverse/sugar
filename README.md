[![pullreminders](https://pullreminders.com/badge.svg)](https://pullreminders.com?ref=badge)

# What is Sugar?
Sugar is a server side event notification system to deliver event data payloads to subscribed clients.
By default it will attempt to connect the client to the server using websockets and will fall back to long polling.

See https://github.com/zooniverse/Sugar-Client for the client implementation details.

## How it works
The server is a wrapper around Redis pub/sub (https://redis.io/topics/pubsub) and real time events (https://github.com/primus/primus#engineio) connections all via a HTTP API.

The HTTP end points are:
1. `get '/presence'`
   + list the subscribed user counts for all channels
0. `get '/active_users?channel=zooniverse'`
   + list the subscribed users for a specific channel
0. `post '/notify'`
   + send a 'notification' message to a specific private user channel
0. `post '/announce'`
   + broadcast an 'announcement' message to a specific section channel, e.g. (project-1 || zooniverse)
0. `post '/experiment'`
   + send a 'experiment' message to a specific private user channel

All requests to the post end points must include a formatted message body for the matching event type as described below.

The 3 types of messages the system accepts are:
1. Notifications
    ``` JSON
    {"notifications": [{"user_id": "1", "message": "Hiya", "url": "test", "delivered": "false"}]}
    ```
0. Announcements
   ``` JSON
   {"announcements": [{"message": "announcment message", "url": "test", "section": "zooniverse", "delivered": "false"}]}
   ```
0. Experiments
   ``` JSON
   {"experiments": [{"user_id": "1", "message": "would you like to participate?", "url": "test", "delivered": "false"}]}
   ```

## Manual testing of notifications
Construct per user notification payloads in JSON and use something like cURL to POST the payload to the notifications server.
E.g.
``` bash
curl -vv \
     -X "POST" "https://notifications-staging.zooniverse.org/notify" \
     -H 'Content-Type: application/json' \
     -u 'username:password' \
     -d $'{
  "notifications": [{
    "message": "A message from curl to user 1",
    "user_id": "1",
    "url": "http://test.net",
    "delivered": false
  }]
}'
```

The `examples` directory has two example scripts. Replace `USER` and `PASSWORD` with the username and password for the staging service:

<dl>
  <dt>`sugar-messages.sh`</dt>
  <dd>Send a message to a user ID</dd>
  <dt>`sugar-notify.sh`</dt>
  <dd>Send a notification to a user ID</dd>
  <dt>`sugar-subjects.sh`</dt>
  <dd>Inject specific subjects into the classification queue for a user ID (PFE only.)</dd>
</dl>

## Debugging
Visit https://notifications-staging.zooniverse.org/ for debug user & testing section announcements and user notifications.

## Development via docker & docker-compose
To Run a local version of the sugar system
  + `docker-compose build`
  + `docker-compose up`

Run run the tests (you may need to rebuild the docker image if the src changes)
  + `docker-compose run -T --rm sugar npm test`

Get a bash container via docker to run tests, etc
`docker-compose run --service-ports --rm sugar bash`
