# file utils
# purpose: read/write/delete files on the active project path
# TODO: funcs should throw error and stop execution if critical error
from pathlib import Path
import json
import os
import asyncio
import requests
from .active_project_path import load_active_project_path


def verify_file_path(file_path):
    active_project_path = load_active_project_path()
    """checks if read/modify on allowed path"""
    if not file_path.startswith(active_project_path):
        print(f"Error: tried to read or modify {file_path} which is not on the active project path {active_project_path}.")
        return False
    return True

def write_file(file_path, contents):
    """overwrites the file with the new contents, 
    returns:
    0 if file written successfully, 
    2 if file not allowed, 
    3 if error writing file
    """
    if not verify_file_path(file_path):
        return 2
    
    try:
        with open(file_path, 'w') as file:
            file.write(contents)
        send_file_change_notification(file_path)
        return 0
    except Exception as e:
        return 3
    
def read_file(file_path):
    """
    reads the file and returns the contents, 
    returns:
    file contents if successful, 
    1 if file does not exist, 
    2 if file not allowed, 
    3 if error reading file
    """
    if not verify_file_path(file_path):
        return 2
    
    if not os.path.exists(file_path):
        return 1
    try:
        with open(file_path, 'r') as file:
            return str(file.read())
    except Exception as e:
        return 3
    
def delete_file(file_path):
    """
    deletes a file at specified path, 
    returns
    0 if file deleted successfully, 
    1 if file does not exist, 
    2 if file not allowed, 
    3 if error deleting file
    """
    if not verify_file_path(file_path):
        return 2
    
    if not os.path.exists(file_path):
        return 1
    try:
        os.remove(file_path)
        return 0
    except Exception as e:
        return 3

def send_file_change_notification(file_path):
    """Send notification about file changes to connected clients"""
    try:
        # Get current active project for notification
        active_project_path = load_active_project_path()
        active_project_name = os.path.basename(active_project_path) if active_project_path else None
        
        # Send notification via HTTP to avoid async complications
        notification_data = {
            "type": "file_changed",
            "file_path": file_path,
            "message": f"File updated: {os.path.basename(file_path)}",
            "active_project_name": active_project_name,
            "timestamp": os.path.getmtime(file_path) if os.path.exists(file_path) else None
        }
        
        # Post to a notification endpoint (we'll create this)
        requests.post(
            "http://localhost:8000/notify_file_change",
            json=notification_data,
            timeout=1
        )
    except:
        # Fail silently if notification can't be sent
        pass