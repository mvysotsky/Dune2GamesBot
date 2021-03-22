#!/bin/bash

DIR="/usr/src/app/node_modules/"

if [ ! -d "$DIR" ]; then
  echo "Installing node modules in ${DIR}..."
  npm ci
fi