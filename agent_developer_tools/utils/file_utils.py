# file utils
# purpose: read/write/delete files on the active project path
# TODO: funcs should throw error and stop execution if critical error
from pathlib import Path
import json
import os
from .active_project_path import load_active_project_path

active_project_path = load_active_project_path()

def verify_file_path(file_path):
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