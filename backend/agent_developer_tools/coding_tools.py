# coding tools
# purpose: allows agent to write/read/delete/edit files on the active project path

from SimpleAgent.SimpleAgent.litellm_interface import LitellmInterface
from pathlib import Path
import prompts
import json
import os
# helpers for editing files
from .utils.file_utils import write_file, read_file, delete_file
from .utils.active_project_path import load_active_project_path

active_project_path = load_active_project_path()

def write_file_tool(file_path, file_name, contents):
    full_path = os.path.join(active_project_path, file_path, file_name)
    
    # Create intermediate directories if they don't exist
    directory = os.path.dirname(full_path)
    os.makedirs(directory, exist_ok=True)
    
    result = write_file(full_path, contents)
    if result == 0:
        return f"Successfully wrote to file {file_name}"
    elif result == 2:
        return f"Write access to {file_name} is not allowed"
    elif result == 3:
        return f"Error writing to file {file_name}"
    else:
        return f"Unknown error writing to file {file_name}"
    
def read_file_tool(file_path, file_name):
    full_path = os.path.join(active_project_path, file_path, file_name)
    result = read_file(full_path)
    if result == 1:
        return f"File {file_name} does not exist"
    elif result == 2:
        return f"Read access to {file_name} is not allowed"
    elif result == 3:
        return f"Error reading file {file_name}"
    else:
        return result

def delete_file_tool(file_path, file_name):
    full_path = os.path.join(active_project_path, file_path, file_name)
    result = delete_file(full_path)
    if result == 0:
        return f"Successfully deleted file {file_name}"
    elif result == 1:
        return f"File {file_name} does not exist"
    elif result == 2:
        return f"Delete access to {file_name} is not allowed"
    elif result == 3:
        return f"Error deleting file {file_name}"
    else:
        return f"Unknown error deleting file {file_name}"

def list_project_directory_tool():
    """Returns a JSON representation of the project directory structure"""
    try:
        def build_directory_tree(directory):
            result = []
            
            # Get all items in the directory
            items = sorted(os.listdir(directory))
            
            # Process each item
            for item in items:
                # Skip hidden files and directories
                if item.startswith('.'):
                    continue
                    
                # Create full path
                path = os.path.join(directory, item)
                
                if os.path.isdir(path):
                    # Special handling for node_modules directory
                    if item == "node_modules":
                        result.append({
                            "name": item,
                            "type": "directory",
                            "children": [{"name": "(node modules not shown)", "type": "info"}]
                        })
                    else:
                        # If it's a directory, add it with its children
                        result.append({
                            "name": item,
                            "type": "directory",
                            "children": build_directory_tree(path)
                        })
                else:
                    # If it's a file, just add it
                    result.append({
                        "name": item,
                        "type": "file"
                    })
            
            return result
        
        return build_directory_tree(active_project_path)
        # return json.dumps({
        #     "root": os.path.basename(active_project_path),
        #     "contents": directory_tree
        # }, indent=2)
    except Exception as e:
        return json.dumps({"error": f"Error listing project directory: {str(e)}"})

def edit_file_tool(file_path, file_name, code_snippet, instructions=None):
    """for minor edits, use this tool"""
    full_path = os.path.join(active_project_path, file_path, file_name)
    current_code = read_file(full_path)

    # apply edit instructions to code
    try:
        system_message = prompts.apply_edit_tool_system_prompt
        prompt = prompts.apply_edit_tool_prompt + "<original>" + current_code + "</original>" + "<code_snippet>" + code_snippet + "</code_snippet>"
        if instructions is not None:
            prompt += "<instructions>" + instructions + "</instructions>"
        bot = LitellmInterface(
            name="code_predictor",
            model="openai/gpt-4o-mini",
            system_role=system_message,
            stream=False,
        )
        edited_code = bot.prompt(prompt=prompt, predicted_output=current_code)
    except Exception as e:
        return f"Error applying edit to file {file_name}: {str(e)}"

    # write the edited code to the file
    result = write_file(full_path, edited_code)
    if result == 0:
        return f"Successfully applied edit to file {file_name}. New file contents: {edited_code}"
    elif result == 2:
        return f"Edit access to {file_name} is not allowed"
    elif result == 3:
        return f"Error editing file {file_name}"
    else:
        return f"Unknown error editing file {file_name}"
    

tool_interface = [
    {
        "type": "function",
        "function": {
            "name": "write_file_tool",
            "description": "Creates or overwrites a file. Automatically creates intermediate directories if they don't exist.",
            "parameters": {
                "type": "object",
                "properties": {
                    "file_path": {"type": "string", "description": "Path within the project where the file is located"},
                    "file_name": {"type": "string", "description": "Name of the file to create or overwrite"},
                    "contents": {"type": "string", "description": "Contents to write to the file"}
                },
                "required": ["file_path", "file_name", "contents"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "read_file_tool",
            "description": "Reads contents from a file in the project directory",
            "parameters": {
                "type": "object",
                "properties": {
                    "file_path": {"type": "string", "description": "Path within the project where the file is located"},
                    "file_name": {"type": "string", "description": "Name of the file to read"}
                },
                "required": ["file_path", "file_name"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "delete_file_tool",
            "description": "Deletes a file from the project directory",
            "parameters": {
                "type": "object",
                "properties": {
                    "file_path": {"type": "string", "description": "Path within the project where the file is located"},
                    "file_name": {"type": "string", "description": "Name of the file to delete"}
                },
                "required": ["file_path", "file_name"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "list_project_directory_tool",
            "description": "Lists the project directory structure in a tree format",
            "parameters": {
                "type": "object",
                "properties": {},
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "edit_file_tool",
            "description": "Use this tool to make edits to an existing file, Best for edits where you need to add/remove/modify chunks of code, rather than making major changes to the file.",
            "parameters": {
                "type": "object",
                "properties": {
                    "file_path": {"type": "string", "description": "Path within the project where the file is located"},
                    "file_name": {"type": "string", "description": "Name of the file to edit"},
                    "code_snippet": {"type": "string", "description": "Instructions or code snippet for the edit"},
                    "instructions": {"type": "string", "description": "Plain-English directions for how the snippet must be integrated (optional, best when its not obvious how the snippet should be integrated, like when removing code)"}
                },
                "required": ["file_path", "file_name", "code_snippet"]
            }
        }
    }
]

available_functions = {
    "write_file_tool": write_file_tool,
    "read_file_tool": read_file_tool,
    "delete_file_tool": delete_file_tool,
    "list_project_directory_tool": list_project_directory_tool,
    "edit_file_tool": edit_file_tool
} 