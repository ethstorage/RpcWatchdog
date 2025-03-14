#!/bin/bash

echo "Updating ethstorage-sdk to latest version..."
npm install ethstorage-sdk@latest

set -a
source .env
set +a
node src/test-cjs.js || exit 1

node src/test-mjs.mjs || exit 1

node src/test-browser.js || exit 1

exit 0
