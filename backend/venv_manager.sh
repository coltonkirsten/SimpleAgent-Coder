#!/bin/bash

VENV_DIR=".venv"
VENV_ACTIVATE="$VENV_DIR/bin/activate"

# Show usage if no arguments or help flag
if [ $# -eq 0 ] || [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
    echo "Usage: source ./venv_manager.sh [on|off]"
    echo ""
    echo "Commands:"
    echo "  on    - Activate the virtual environment"
    echo "  off   - Deactivate the virtual environment"
    echo "  --help, -h  - Show this help message"
    return 2>/dev/null || exit 0
fi

# Make sure the script is sourced, not executed
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    echo "Error: Script must be sourced, not executed."
    echo "Usage: source ./venv_manager.sh [on|off]"
    exit 1
fi

case "$1" in
    "on")
        if [ ! -f "$VENV_ACTIVATE" ]; then
            echo "Error: Virtual environment not found at $VENV_DIR"
            echo "Run 'python3 -m venv $VENV_DIR' to create it first."
            return 1
        fi
        
        echo "Activating virtual environment..."
        source "$VENV_ACTIVATE"
        echo "Virtual environment activated. Use 'source ./venv_manager.sh off' to deactivate."
        ;;
    "off")
        if [ -z "$VIRTUAL_ENV" ]; then
            echo "No active virtual environment detected."
            return 0
        fi
        
        echo "Deactivating virtual environment..."
        deactivate
        echo "Virtual environment deactivated."
        ;;
    *)
        echo "Unknown command: $1"
        echo "Usage: source ./venv_manager.sh [on|off]"
        return 1
        ;;
esac 