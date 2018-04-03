Sugar is a server side event notification system to deliver event data payloads to subscribed clients. 
By default it will attempt to connect the client to the server using websockets and will fall back to long polling. 

See https://github.com/zooniverse/Sugar-Client for the client implementation details.

There are 3 message payload types:
1. Notifications
    + Used for private channel events for a specific user.
0. Announcements
    + Used to broadcast events for a specified channel (section).
0. Experiments
    + Used to send experiment payloads to specific users.

# Manual testing of notifications
Construct per user notification payloads in JSON and use something like cURL to POST the payload to the notifications server. 
E.g.
``` bash
curl -H "Content-Type: application/json" -d '{"notifications": [{"user_id": "1", "message": "manual test from curl", "url": "test", "section": "zooniverse", "delivered": "false"}]}' https://basic:auth@notifications-staging.zooniverse.org/notify
```

# Debugging
Visit https://notifications.zooniverse.org/ for debug user & testing section announcements and user notifications.
