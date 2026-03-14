#!/bin/bash
# =============================================================================
# Atlas Panel - Safe Deployment Script
# =============================================================================
# This script ensures zero-downtime deployments by:
# 1. Building the new version first
# 2. Only restarting PM2 after a successful build
# 3. Verifying the server is healthy after restart
# =============================================================================

set -e  # Exit on any error

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# PM2 configuration
PM2_HOME="${PM2_HOME:-/home/cmo/.pm2}"
PM2_APP_NAME="atlas-panel"
SERVER_PORT=11337
HEALTH_CHECK_RETRIES=10
HEALTH_CHECK_INTERVAL=3

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if server is healthy
health_check() {
    local retries=$HEALTH_CHECK_RETRIES
    local interval=$HEALTH_CHECK_INTERVAL

    log_info "Checking server health..."

    while [ $retries -gt 0 ]; do
        if curl -s -o /dev/null -w "%{http_code}" "http://localhost:$SERVER_PORT" | grep -q "200\|302\|301"; then
            log_success "Server is healthy!"
            return 0
        fi

        retries=$((retries - 1))
        log_warning "Health check failed, $retries retries left..."
        sleep $interval
    done

    log_error "Server health check failed after all retries!"
    return 1
}

# Function to restart PM2 app
restart_pm2() {
    log_info "Restarting PM2 app: $PM2_APP_NAME"

    PM2_HOME="$PM2_HOME" pm2 restart "$PM2_APP_NAME" --update-env

    # Wait a moment for the server to start
    sleep 5
}

# Main deployment process
main() {
    echo ""
    echo "=============================================="
    echo "  Atlas Panel - Safe Deployment"
    echo "=============================================="
    echo ""

    # Step 1: Check if we're in the right directory
    if [ ! -f "package.json" ]; then
        log_error "package.json not found. Are you in the Atlas-Panel directory?"
        exit 1
    fi

    # Step 2: Run the build
    log_info "Starting build process..."

    if npm run build; then
        log_success "Build completed successfully!"
    else
        log_error "Build failed! Aborting deployment."
        exit 1
    fi

    # Step 3: Restart PM2
    log_info "Build successful, restarting server..."
    restart_pm2

    # Step 4: Health check
    if health_check; then
        log_success "Deployment completed successfully!"
        echo ""
        echo "=============================================="
        echo "  Deployment Summary"
        echo "=============================================="
        echo "  - Build: SUCCESS"
        echo "  - Restart: SUCCESS"
        echo "  - Health Check: PASSED"
        echo "=============================================="
        echo ""
    else
        log_error "Deployment completed but health check failed!"
        log_warning "Check PM2 logs: PM2_HOME=$PM2_HOME pm2 logs $PM2_APP_NAME"
        exit 1
    fi
}

# Run main function
main "$@"
