#!/bin/bash

set -a
source .env
set +a


echo "Updating ethstorage-sdk to latest version..."
npm install ethstorage-sdk@latest

node src/test-cjs.js || exit 1
node src/test-mjs.mjs || exit 1
node src/test-browser.js || exit 1


echo ""
echo ""
echo "Updating ethfs-cli to latest version..."
sudo npm install -g ethfs-cli@latest
hash -r

node src/test-cli.js || exit 1


exit 0
