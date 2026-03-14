#!/bin/bash

# Change to API directory
cd /home/cmo/atlas-api

# Load environment variables from .env file
set -a
source /home/cmo/atlas-api/.env
set +a

# Set production mode
export NODE_ENV=production

# Start the application
exec node dist/src/main.js
