# project manager
# Functions:
# create/init project with proper structure
# list all projects
# delete project

import os
import json
import shutil
from datetime import datetime

# Project environment path
PROJECT_ENV_PATH = "/Users/coltonkirsten/Desktop/SeniorThesis/SimpleAgent-coder/backend/project_env"
PROJECTS_JSON_PATH = os.path.join(PROJECT_ENV_PATH, "projects.json")

def _load_projects():
    """Load projects from projects.json file"""
    try:
        if os.path.exists(PROJECTS_JSON_PATH):
            with open(PROJECTS_JSON_PATH, 'r') as f:
                content = f.read().strip()
                if content:
                    return json.loads(content)
        return []
    except (json.JSONDecodeError, FileNotFoundError):
        return []

def _save_projects(projects):
    """Save projects to projects.json file"""
    try:
        with open(PROJECTS_JSON_PATH, 'w') as f:
            json.dump(projects, f, indent=2)
        return True
    except Exception as e:
        return False

def create_project(project_name):
    """
    Creates a project in the folder with the name <project name>_(current datetime string)
    The current datetime string ensures that projects with the same name can be created without overwriting others.
    In the project folder create an empty index.js file. Then update projects.json with the new project.
    
    Args:
        project_name (str): The base name of the project
        
    Returns:
        str: SUCCESS message or failure message
    """
    try:
        # Generate datetime string in YYYYMMDD_HHMMSS format
        datetime_str = datetime.now().strftime("%Y%m%d_%H%M%S")
        full_project_name = f"{project_name}_{datetime_str}"
        
        # Create project directory path
        project_dir = os.path.join(PROJECT_ENV_PATH, full_project_name)
        
        # Check if directory already exists (unlikely but possible)
        if os.path.exists(project_dir):
            return f"FAILURE: Project directory {full_project_name} already exists"
        
        # Create project directory
        os.makedirs(project_dir)
        
        # Create empty index.html file
        index_html_path = os.path.join(project_dir, "index.html")
        with open(index_html_path, 'w') as f:
            f.write("")
        
        # Load current projects
        projects = _load_projects()
        
        # Add new project to the list
        projects.append(full_project_name)
        
        # Save updated projects list
        if not _save_projects(projects):
            # If saving fails, clean up the created directory
            shutil.rmtree(project_dir)
            return "FAILURE: Could not update projects.json"
        
        return f"SUCCESS: Created project {full_project_name}"
        
    except Exception as e:
        return f"FAILURE: {str(e)}"

def delete_project(full_project_name):
    """
    Deletes a project from projects.json and deletes the actual project directory.
    
    Args:
        full_project_name (str): The full project name including datetime
        
    Returns:
        str: SUCCESS message or failure message
    """
    try:
        # Load current projects
        projects = _load_projects()
        
        # Check if project exists in projects.json
        if full_project_name not in projects:
            return f"FAILURE: Project {full_project_name} not found in projects list"
        
        # Remove project from list
        projects.remove(full_project_name)
        
        # Save updated projects list
        if not _save_projects(projects):
            return "FAILURE: Could not update projects.json"
        
        # Delete project directory
        project_dir = os.path.join(PROJECT_ENV_PATH, full_project_name)
        if os.path.exists(project_dir):
            shutil.rmtree(project_dir)
        
        return f"SUCCESS: Deleted project {full_project_name}"
        
    except Exception as e:
        return f"FAILURE: {str(e)}"

def list_projects():
    """
    Lists all projects in the project folder (referring to the projects.json file).
    
    Returns:
        list: List of full project names
    """
    try:
        projects = _load_projects()
        return projects
    except Exception as e:
        return []