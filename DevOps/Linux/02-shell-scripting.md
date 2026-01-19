# Shell Scripting for DevOps

## Overview

Shell scripting is the automation backbone of DevOps. Bash scripts automate repetitive tasks, manage infrastructure, orchestrate deployments, and integrate with CI/CD pipelines.

**Why Shell Scripting for DevOps:**
- Automate server setup and configuration
- Create deployment scripts
- Integrate with AWS CLI and other tools
- Build CI/CD pipeline steps
- System monitoring and health checks
- Log analysis and data processing

**Shell Script Use Cases:**

| Use Case | Example | Complexity |
|----------|---------|------------|
| **Automation** | Server setup, backups | Low |
| **Deployment** | Application deployment | Medium |
| **Monitoring** | Health checks, alerts | Medium |
| **AWS Automation** | Resource provisioning | High |
| **CI/CD** | Build, test, deploy | High |

## Bash Scripting Basics

### Script Structure

```bash
#!/bin/bash
# Shebang - specifies interpreter

#################################################
# Script: deploy-app.sh
# Description: Deploy application to production
# Author: DevOps Team
# Usage: ./deploy-app.sh <environment>
#################################################

# Exit on error
set -e

# Exit on undefined variable
set -u

# Exit on pipe failure
set -o pipefail

# Enable debug mode (uncomment for troubleshooting)
# set -x

# Script constants
readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly APP_NAME="my-application"
readonly VERSION="1.0.0"

# Main execution
main() {
    echo "Starting deployment..."
    check_prerequisites
    deploy_application
    verify_deployment
    echo "Deployment complete!"
}

# Functions (defined before main)
check_prerequisites() {
    echo "Checking prerequisites..."
    # Implementation here
}

deploy_application() {
    echo "Deploying application..."
    # Implementation here
}

verify_deployment() {
    echo "Verifying deployment..."
    # Implementation here
}

# Execute main function
main "$@"
```

### Variables and Data Types

```bash
#!/bin/bash

# ========================================
# Variable Declaration
# ========================================

# Simple assignment (no spaces around =)
name="DevOps"
age=25
is_active=true

# Command substitution
current_date=$(date +%Y-%m-%d)
current_user=$(whoami)
file_count=$(ls -1 | wc -l)

# Read-only variables (constants)
readonly MAX_RETRIES=3
readonly API_URL="https://api.example.com"

# Environment variables
export AWS_REGION="us-east-1"
export NODE_ENV="production"

# ========================================
# Variable Usage
# ========================================

# Standard syntax
echo "Name: $name"
echo "Age: $age"

# Preferred syntax (protects from ambiguity)
echo "User: ${current_user}"
echo "Date: ${current_date}"

# Default values
echo "${UNDEFINED_VAR:-default_value}"          # Use default if unset
echo "${UNDEFINED_VAR:=default_value}"          # Set and use default
echo "${UNDEFINED_VAR:?Error: variable not set}" # Error if unset

# String operations
string="Hello World"
echo "${string^}"           # Capitalize first letter
echo "${string^^}"          # Uppercase all
echo "${string,,}"          # Lowercase all
echo "${#string}"           # String length
echo "${string:0:5}"        # Substring (Hello)
echo "${string/World/DevOps}" # Replace

# ========================================
# Arrays
# ========================================

# Indexed arrays
servers=("web1" "web2" "web3")
echo "${servers[0]}"        # First element
echo "${servers[@]}"        # All elements
echo "${#servers[@]}"       # Array length

# Add element
servers+=("web4")

# Loop through array
for server in "${servers[@]}"; do
    echo "Server: $server"
done

# Associative arrays (Bash 4+)
declare -A config
config[host]="localhost"
config[port]="8080"
config[ssl]="true"

echo "${config[host]}"
echo "${!config[@]}"        # All keys
echo "${config[@]}"         # All values

# ========================================
# Special Variables
# ========================================

# $0  - Script name
# $1, $2, ... - Positional arguments
# $#  - Number of arguments
# $@  - All arguments as separate words
# $*  - All arguments as single string
# $?  - Exit status of last command
# $$  - Current process ID
# $!  - PID of last background command

echo "Script: $0"
echo "First arg: $1"
echo "All args: $@"
echo "Arg count: $#"
echo "Exit status: $?"
echo "Process ID: $$"
```

### Control Structures

```bash
#!/bin/bash

# ========================================
# If Statements
# ========================================

# Basic if
if [ "$USER" = "root" ]; then
    echo "Running as root"
fi

# If-else
if [ -f "/etc/nginx/nginx.conf" ]; then
    echo "Nginx config exists"
else
    echo "Nginx config not found"
fi

# If-elif-else
if [ "$1" = "start" ]; then
    echo "Starting service..."
elif [ "$1" = "stop" ]; then
    echo "Stopping service..."
elif [ "$1" = "restart" ]; then
    echo "Restarting service..."
else
    echo "Usage: $0 {start|stop|restart}"
    exit 1
fi

# Modern test syntax [[ ]] (preferred)
if [[ "$NODE_ENV" == "production" ]]; then
    echo "Production environment"
fi

# Multiple conditions
if [[ "$age" -gt 18 && "$country" == "US" ]]; then
    echo "Adult in US"
fi

# Pattern matching
if [[ "$filename" == *.txt ]]; then
    echo "Text file"
fi

# Regex matching
if [[ "$email" =~ ^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$ ]]; then
    echo "Valid email"
fi

# ========================================
# Test Operators
# ========================================

# String comparisons
[ "$a" = "$b" ]      # Equal
[ "$a" != "$b" ]     # Not equal
[ -z "$a" ]          # Empty string
[ -n "$a" ]          # Not empty string

# Numeric comparisons
[ "$a" -eq "$b" ]    # Equal
[ "$a" -ne "$b" ]    # Not equal
[ "$a" -lt "$b" ]    # Less than
[ "$a" -le "$b" ]    # Less than or equal
[ "$a" -gt "$b" ]    # Greater than
[ "$a" -ge "$b" ]    # Greater than or equal

# File tests
[ -e file ]          # File exists
[ -f file ]          # Regular file exists
[ -d dir ]           # Directory exists
[ -r file ]          # File is readable
[ -w file ]          # File is writable
[ -x file ]          # File is executable
[ -s file ]          # File is not empty
[ file1 -nt file2 ]  # file1 newer than file2
[ file1 -ot file2 ]  # file1 older than file2

# ========================================
# Loops
# ========================================

# For loop - list
for item in item1 item2 item3; do
    echo "Processing: $item"
done

# For loop - range
for i in {1..5}; do
    echo "Number: $i"
done

# For loop - C-style
for ((i=1; i<=5; i++)); do
    echo "Count: $i"
done

# For loop - files
for file in /var/log/*.log; do
    echo "Log file: $file"
done

# While loop
counter=0
while [ $counter -lt 5 ]; do
    echo "Counter: $counter"
    ((counter++))
done

# Until loop
counter=0
until [ $counter -ge 5 ]; do
    echo "Counter: $counter"
    ((counter++))
done

# Read file line by line
while IFS= read -r line; do
    echo "Line: $line"
done < /etc/hosts

# Infinite loop with break
while true; do
    echo "Running..."
    sleep 1
    if [[ condition ]]; then
        break
    fi
done

# Continue to next iteration
for i in {1..10}; do
    if [ $((i % 2)) -eq 0 ]; then
        continue    # Skip even numbers
    fi
    echo "Odd: $i"
done

# ========================================
# Case Statements
# ========================================

case "$1" in
    start)
        echo "Starting service..."
        systemctl start myapp
        ;;
    stop)
        echo "Stopping service..."
        systemctl stop myapp
        ;;
    restart)
        echo "Restarting service..."
        systemctl restart myapp
        ;;
    status)
        systemctl status myapp
        ;;
    *)
        echo "Usage: $0 {start|stop|restart|status}"
        exit 1
        ;;
esac

# Pattern matching in case
case "$filename" in
    *.txt)
        echo "Text file"
        ;;
    *.jpg|*.png)
        echo "Image file"
        ;;
    *.sh)
        echo "Shell script"
        ;;
    *)
        echo "Unknown file type"
        ;;
esac
```

## Functions

### Function Basics

```bash
#!/bin/bash

# ========================================
# Function Definition
# ========================================

# Simple function
greet() {
    echo "Hello, World!"
}

# Function with parameters
greet_user() {
    local name="$1"
    echo "Hello, $name!"
}

# Function with return value
add() {
    local num1="$1"
    local num2="$2"
    echo $((num1 + num2))
}

# Function with return status
check_file() {
    local file="$1"

    if [ -f "$file" ]; then
        return 0    # Success
    else
        return 1    # Failure
    fi
}

# ========================================
# Function Usage
# ========================================

# Call simple function
greet

# Call with arguments
greet_user "DevOps"

# Capture function output
result=$(add 5 10)
echo "Result: $result"

# Check function return status
if check_file "/etc/hosts"; then
    echo "File exists"
else
    echo "File not found"
fi

# ========================================
# Advanced Functions
# ========================================

# Function with local variables
calculate() {
    local num1="$1"
    local num2="$2"
    local operation="$3"

    case "$operation" in
        add)
            echo $((num1 + num2))
            ;;
        sub)
            echo $((num1 - num2))
            ;;
        mul)
            echo $((num1 * num2))
            ;;
        div)
            if [ "$num2" -eq 0 ]; then
                echo "Error: Division by zero" >&2
                return 1
            fi
            echo $((num1 / num2))
            ;;
        *)
            echo "Unknown operation" >&2
            return 1
            ;;
    esac
}

# Function with default parameters
deploy() {
    local env="${1:-staging}"
    local version="${2:-latest}"

    echo "Deploying version $version to $env"
}

# Function with validation
validate_input() {
    local input="$1"

    if [ -z "$input" ]; then
        echo "Error: Input cannot be empty" >&2
        return 1
    fi

    if ! [[ "$input" =~ ^[0-9]+$ ]]; then
        echo "Error: Input must be a number" >&2
        return 1
    fi

    return 0
}
```

## Error Handling

```bash
#!/bin/bash

# ========================================
# Error Handling Best Practices
# ========================================

# Exit on error
set -e

# Exit on undefined variable
set -u

# Fail on pipe errors
set -o pipefail

# Trap errors
trap 'error_handler $? $LINENO' ERR

error_handler() {
    local exit_code=$1
    local line_number=$2

    echo "Error: Command failed with exit code $exit_code at line $line_number" >&2
    cleanup
    exit $exit_code
}

# Cleanup function
cleanup() {
    echo "Performing cleanup..."
    rm -f /tmp/temp_file
}

# Trap exit for cleanup
trap cleanup EXIT

# ========================================
# Error Handling Patterns
# ========================================

# Pattern 1: Check exit status
if ! command_that_might_fail; then
    echo "Error: Command failed" >&2
    exit 1
fi

# Pattern 2: OR operator
command_that_might_fail || { echo "Error: Command failed" >&2; exit 1; }

# Pattern 3: Try-catch style
{
    risky_command
    another_risky_command
} || {
    echo "Error: One of the commands failed" >&2
    exit 1
}

# Pattern 4: Continue on error
set +e
command_that_might_fail
if [ $? -ne 0 ]; then
    echo "Warning: Command failed, continuing..."
fi
set -e

# Pattern 5: Retry logic
retry() {
    local max_attempts=3
    local attempt=1
    local delay=5

    while [ $attempt -le $max_attempts ]; do
        echo "Attempt $attempt of $max_attempts..."

        if "$@"; then
            echo "Success!"
            return 0
        fi

        echo "Failed. Retrying in $delay seconds..."
        sleep $delay
        ((attempt++))
    done

    echo "Error: All $max_attempts attempts failed" >&2
    return 1
}

# Usage
retry curl -f https://api.example.com/health

# ========================================
# Logging
# ========================================

# Setup logging
LOG_FILE="/var/log/myapp.log"
LOG_LEVEL="INFO"  # DEBUG, INFO, WARN, ERROR

log() {
    local level="$1"
    shift
    local message="$@"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')

    echo "[$timestamp] [$level] $message" | tee -a "$LOG_FILE"
}

log_debug() { [ "$LOG_LEVEL" = "DEBUG" ] && log "DEBUG" "$@"; }
log_info() { log "INFO" "$@"; }
log_warn() { log "WARN" "$@"; }
log_error() { log "ERROR" "$@" >&2; }

# Usage
log_info "Starting deployment..."
log_warn "Using default configuration"
log_error "Deployment failed"

# ========================================
# Input Validation
# ========================================

validate_args() {
    if [ $# -lt 2 ]; then
        echo "Usage: $0 <environment> <version>" >&2
        echo "Example: $0 production 1.2.0" >&2
        exit 1
    fi

    local env="$1"
    local version="$2"

    # Validate environment
    case "$env" in
        dev|staging|production)
            # Valid
            ;;
        *)
            echo "Error: Invalid environment '$env'" >&2
            echo "Valid environments: dev, staging, production" >&2
            exit 1
            ;;
    esac

    # Validate version format (semantic versioning)
    if ! [[ "$version" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
        echo "Error: Invalid version format '$version'" >&2
        echo "Expected format: X.Y.Z" >&2
        exit 1
    fi
}

validate_args "$@"
```

## Practical DevOps Scripts

### AWS Automation Script

```bash
#!/bin/bash
#################################################
# Script: aws-ec2-manager.sh
# Description: Manage EC2 instances
# Usage: ./aws-ec2-manager.sh <action> <environment>
#################################################

set -euo pipefail

# Constants
readonly SCRIPT_NAME=$(basename "$0")
readonly AWS_REGION="${AWS_REGION:-us-east-1}"

# Logging
log_info() { echo "[INFO] $*"; }
log_error() { echo "[ERROR] $*" >&2; }

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."

    if ! command -v aws &> /dev/null; then
        log_error "AWS CLI not found. Please install it first."
        exit 1
    fi

    if ! aws sts get-caller-identity &> /dev/null; then
        log_error "AWS credentials not configured."
        exit 1
    fi

    log_info "Prerequisites check passed."
}

# List instances
list_instances() {
    local env="$1"

    log_info "Listing $env instances..."

    aws ec2 describe-instances \
        --region "$AWS_REGION" \
        --filters "Name=tag:Environment,Values=$env" \
                  "Name=instance-state-name,Values=running" \
        --query 'Reservations[].Instances[].[InstanceId,Tags[?Key==`Name`].Value|[0],State.Name,PrivateIpAddress]' \
        --output table
}

# Start instances
start_instances() {
    local env="$1"

    log_info "Starting $env instances..."

    local instance_ids=$(aws ec2 describe-instances \
        --region "$AWS_REGION" \
        --filters "Name=tag:Environment,Values=$env" \
                  "Name=instance-state-name,Values=stopped" \
        --query 'Reservations[].Instances[].InstanceId' \
        --output text)

    if [ -z "$instance_ids" ]; then
        log_info "No stopped instances found."
        return 0
    fi

    aws ec2 start-instances \
        --region "$AWS_REGION" \
        --instance-ids $instance_ids

    log_info "Waiting for instances to start..."
    aws ec2 wait instance-running \
        --region "$AWS_REGION" \
        --instance-ids $instance_ids

    log_info "Instances started successfully."
}

# Stop instances
stop_instances() {
    local env="$1"

    log_info "Stopping $env instances..."

    local instance_ids=$(aws ec2 describe-instances \
        --region "$AWS_REGION" \
        --filters "Name=tag:Environment,Values=$env" \
                  "Name=instance-state-name,Values=running" \
        --query 'Reservations[].Instances[].InstanceId' \
        --output text)

    if [ -z "$instance_ids" ]; then
        log_info "No running instances found."
        return 0
    fi

    # Confirmation
    read -p "Are you sure you want to stop these instances? (yes/no): " confirm
    if [ "$confirm" != "yes" ]; then
        log_info "Operation cancelled."
        return 0
    fi

    aws ec2 stop-instances \
        --region "$AWS_REGION" \
        --instance-ids $instance_ids

    log_info "Instances stopped successfully."
}

# Main function
main() {
    if [ $# -lt 2 ]; then
        echo "Usage: $SCRIPT_NAME <action> <environment>"
        echo "Actions: list, start, stop"
        echo "Environments: dev, staging, production"
        exit 1
    fi

    local action="$1"
    local env="$2"

    check_prerequisites

    case "$action" in
        list)
            list_instances "$env"
            ;;
        start)
            start_instances "$env"
            ;;
        stop)
            stop_instances "$env"
            ;;
        *)
            log_error "Unknown action: $action"
            exit 1
            ;;
    esac
}

main "$@"
```

### Deployment Script

```bash
#!/bin/bash
#################################################
# Script: deploy.sh
# Description: Deploy application to servers
# Usage: ./deploy.sh <environment> <version>
#################################################

set -euo pipefail

# Configuration
readonly APP_NAME="myapp"
readonly DEPLOY_USER="deploy"
readonly HEALTH_CHECK_URL="/health"
readonly MAX_DEPLOY_TIME=300  # 5 minutes

# Colors for output
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly NC='\033[0m' # No Color

# Logging with colors
log_info() { echo -e "${GREEN}[INFO]${NC} $*"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $*"; }
log_error() { echo -e "${RED}[ERROR]${NC} $*" >&2; }

# Get servers for environment
get_servers() {
    local env="$1"

    case "$env" in
        staging)
            echo "staging-web-1 staging-web-2"
            ;;
        production)
            echo "prod-web-1 prod-web-2 prod-web-3"
            ;;
        *)
            log_error "Unknown environment: $env"
            exit 1
            ;;
    esac
}

# Health check
health_check() {
    local server="$1"
    local max_attempts=10
    local attempt=1

    log_info "Health checking $server..."

    while [ $attempt -le $max_attempts ]; do
        if curl -sf "http://$server$HEALTH_CHECK_URL" > /dev/null; then
            log_info "✓ $server is healthy"
            return 0
        fi

        log_warn "Attempt $attempt/$max_attempts failed, retrying..."
        sleep 5
        ((attempt++))
    done

    log_error "✗ $server health check failed"
    return 1
}

# Deploy to single server
deploy_to_server() {
    local server="$1"
    local version="$2"

    log_info "Deploying $version to $server..."

    # Stop application
    ssh "$DEPLOY_USER@$server" "systemctl stop $APP_NAME" || true

    # Deploy new version
    scp "build/$APP_NAME-$version.tar.gz" "$DEPLOY_USER@$server:/tmp/"

    ssh "$DEPLOY_USER@$server" << EOF
        cd /opt/$APP_NAME
        tar -xzf /tmp/$APP_NAME-$version.tar.gz
        systemctl start $APP_NAME
EOF

    # Health check
    if ! health_check "$server"; then
        log_error "Deployment to $server failed"
        return 1
    fi

    log_info "✓ Successfully deployed to $server"
    return 0
}

# Rollback
rollback() {
    local server="$1"

    log_warn "Rolling back $server..."

    ssh "$DEPLOY_USER@$server" << EOF
        cd /opt/$APP_NAME
        systemctl stop $APP_NAME
        rm -rf current
        ln -s previous current
        systemctl start $APP_NAME
EOF

    health_check "$server"
}

# Main deployment
deploy() {
    local env="$1"
    local version="$2"

    log_info "Starting deployment of $version to $env..."

    local servers=$(get_servers "$env")
    local failed_servers=""

    # Deploy to each server
    for server in $servers; do
        if ! deploy_to_server "$server" "$version"; then
            failed_servers="$failed_servers $server"

            # Ask to continue or rollback
            read -p "Deploy failed on $server. Continue? (yes/no): " continue
            if [ "$continue" != "yes" ]; then
                log_error "Deployment cancelled. Rolling back..."
                for deployed_server in $servers; do
                    if [ "$deployed_server" = "$server" ]; then
                        break
                    fi
                    rollback "$deployed_server"
                done
                exit 1
            fi
        fi
    done

    if [ -n "$failed_servers" ]; then
        log_error "Deployment completed with failures: $failed_servers"
        exit 1
    fi

    log_info "✓ Deployment completed successfully!"
}

# Validate arguments
if [ $# -lt 2 ]; then
    echo "Usage: $0 <environment> <version>"
    echo "Example: $0 production 1.2.0"
    exit 1
fi

# Execute deployment
deploy "$1" "$2"
```

### Backup Script

```bash
#!/bin/bash
#################################################
# Script: backup.sh
# Description: Backup database and files to S3
# Usage: ./backup.sh
#################################################

set -euo pipefail

# Configuration
readonly BACKUP_DIR="/tmp/backups"
readonly DB_NAME="myapp_db"
readonly DB_USER="backup_user"
readonly APP_DIR="/var/www/myapp"
readonly S3_BUCKET="s3://myapp-backups"
readonly RETENTION_DAYS=30

# Logging
log_info() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] [INFO] $*"; }
log_error() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] [ERROR] $*" >&2; }

# Create backup directory
prepare_backup() {
    log_info "Preparing backup directory..."

    mkdir -p "$BACKUP_DIR"

    if [ ! -w "$BACKUP_DIR" ]; then
        log_error "Backup directory not writable"
        exit 1
    fi
}

# Backup database
backup_database() {
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_file="$BACKUP_DIR/db_${DB_NAME}_${timestamp}.sql.gz"

    log_info "Backing up database: $DB_NAME..."

    if ! pg_dump -U "$DB_USER" "$DB_NAME" | gzip > "$backup_file"; then
        log_error "Database backup failed"
        return 1
    fi

    log_info "Database backed up to: $backup_file"
    log_info "Size: $(du -h "$backup_file" | cut -f1)"

    echo "$backup_file"
}

# Backup files
backup_files() {
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_file="$BACKUP_DIR/files_${timestamp}.tar.gz"

    log_info "Backing up files from: $APP_DIR..."

    if ! tar -czf "$backup_file" -C "$(dirname "$APP_DIR")" "$(basename "$APP_DIR")"; then
        log_error "File backup failed"
        return 1
    fi

    log_info "Files backed up to: $backup_file"
    log_info "Size: $(du -h "$backup_file" | cut -f1)"

    echo "$backup_file"
}

# Upload to S3
upload_to_s3() {
    local file="$1"

    log_info "Uploading to S3: $file..."

    if ! aws s3 cp "$file" "$S3_BUCKET/$(basename "$file")"; then
        log_error "S3 upload failed"
        return 1
    fi

    log_info "Successfully uploaded to S3"
}

# Clean old backups
cleanup_old_backups() {
    log_info "Cleaning up backups older than $RETENTION_DAYS days..."

    # Clean local backups
    find "$BACKUP_DIR" -type f -mtime +"$RETENTION_DAYS" -delete

    # Clean S3 backups (requires lifecycle policy or manual cleanup)
    local cutoff_date=$(date -d "$RETENTION_DAYS days ago" +%Y-%m-%d)

    aws s3 ls "$S3_BUCKET/" | while read -r line; do
        local file_date=$(echo "$line" | awk '{print $1}')
        local file_name=$(echo "$line" | awk '{print $4}')

        if [[ "$file_date" < "$cutoff_date" ]]; then
            log_info "Deleting old backup: $file_name"
            aws s3 rm "$S3_BUCKET/$file_name"
        fi
    done

    log_info "Cleanup completed"
}

# Verify backup
verify_backup() {
    local file="$1"

    log_info "Verifying backup: $file..."

    case "$file" in
        *.sql.gz)
            if ! gunzip -t "$file"; then
                log_error "Backup verification failed"
                return 1
            fi
            ;;
        *.tar.gz)
            if ! tar -tzf "$file" > /dev/null; then
                log_error "Backup verification failed"
                return 1
            fi
            ;;
    esac

    log_info "Backup verified successfully"
    return 0
}

# Main backup process
main() {
    log_info "=== Starting backup process ==="

    prepare_backup

    # Backup database
    db_backup=$(backup_database)
    if verify_backup "$db_backup"; then
        upload_to_s3 "$db_backup"
    fi

    # Backup files
    files_backup=$(backup_files)
    if verify_backup "$files_backup"; then
        upload_to_s3 "$files_backup"
    fi

    # Cleanup
    cleanup_old_backups

    log_info "=== Backup process completed ==="
}

# Execute with error handling
if ! main; then
    log_error "Backup process failed"
    exit 1
fi
```

## Interview Questions

**Q1: What is the shebang (#!/bin/bash) and why is it important?**
A: The shebang tells the system which interpreter to use for the script. `#!/bin/bash` specifies Bash. It's crucial for script portability and correct execution.

**Q2: What's the difference between $@ and $*?**
A: `$@` treats each argument as a separate word (preserves spacing). `$*` treats all arguments as a single string. Always use `"$@"` with quotes for proper argument handling.

**Q3: Explain set -e, set -u, and set -o pipefail.**
A:
- `set -e`: Exit immediately if any command fails
- `set -u`: Treat undefined variables as errors
- `set -o pipefail`: Return exit code of first failed command in pipeline

**Q4: How do you handle errors in bash scripts?**
A: Use `set -e`, check exit codes with `$?`, use trap for cleanup, implement retry logic, and log errors appropriately.

**Q5: What's the difference between [ ] and [[ ]]?**
A: `[[ ]]` is a Bash keyword (not POSIX) with enhanced features: no word splitting, pattern matching, regex support, logical operators. It's preferred for Bash scripts.

## Summary

**Shell Scripting Essentials:**

1. **Script Structure:**
   - ✅ Shebang (#!/bin/bash)
   - ✅ Error handling (set -euo pipefail)
   - ✅ Functions before main
   - ✅ Logging and validation

2. **Variables:**
   - ✅ Use "${variable}" syntax
   - ✅ readonly for constants
   - ✅ local for function variables
   - ✅ Proper quoting to prevent word splitting

3. **Error Handling:**
   - ✅ set -e (exit on error)
   - ✅ Trap for cleanup
   - ✅ Check exit codes
   - ✅ Retry logic for flaky operations

4. **Best Practices:**
   - ✅ Validate inputs
   - ✅ Use functions for reusability
   - ✅ Add logging and progress indicators
   - ✅ Handle signals (trap)
   - ✅ Test scripts thoroughly

5. **Common Patterns:**
   - AWS automation with AWS CLI
   - Deployment with health checks
   - Backup with S3 integration
   - Monitoring and alerting

**Key Insights:**
> - Shell scripts are the glue of DevOps automation
> - Error handling is critical for reliable automation
> - Always validate inputs and check prerequisites
> - Use functions for maintainability
> - Log everything for debugging and auditing

---
[← Back: Linux Fundamentals](./01-linux-fundamentals.md) | [Next: System Monitoring →](./03-system-monitoring.md)
