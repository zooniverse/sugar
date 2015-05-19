#!/bin/bash

if [ -z "$VAGRANT_APP" ]
then
    ln -s /production_config/* /node_app/lib/
fi

/node_app/node_modules/.bin/coffee /node_app/index.coffee
