# active project path
# purpose: load the active project path from the settings file

import json
import os
from pathlib import Path
# settings file path
SETTINGS_FILE = Path("settings.json")

def load_active_project_path():
    if SETTINGS_FILE.exists():
        try:
            with open(SETTINGS_FILE, "r") as f:
                return json.load(f)["active_project_path"]
        except json.JSONDecodeError:
            print(f"Error parsing {SETTINGS_FILE} when loading allowed path.")
    else:
        raise FileNotFoundError(f"Error: Settings file {SETTINGS_FILE} not found.")