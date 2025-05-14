from pathlib import Path
import json

# settings file path
SETTINGS_FILE = Path("settings.json")

def load_active_project_path():
    if SETTINGS_FILE.exists():
        try:
            with open(SETTINGS_FILE, "r") as f:
                return json.load(f)["allowed_path"]
        except json.JSONDecodeError:
            print(f"Error parsing {SETTINGS_FILE} when loading allowed path.")
            return None
    else:
        print(f"Error: Settings file {SETTINGS_FILE} not found.")
        return None

# init active project path
active_project_path = load_active_project_path()

def verify_file_path(file_path):
    # check if edit on allowed path
    pass

def write_file(filename, contents):
    pass
    
def read_file(file_path):
    with open(file_path, 'r') as file:
        return file.read()
    
def delete_file(file_path):
    pass


def create_file(file_path, code):
    pass