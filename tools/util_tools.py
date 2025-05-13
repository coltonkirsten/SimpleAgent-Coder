import sys
from time import sleep
from datetime import datetime

def wait_for_seconds(wait_time):
    """
    Pause execution for a specified number of seconds.
    """
    sleep(wait_time)
    return f"SLEPT FOR {wait_time}"

def get_datetime():
    """
    Returns the current date and time in ISO format.
    """
    return datetime.now().isoformat()

def end_program():
    """
    Terminate the program execution.
    """
    sys.exit("Program ended by LLM command")

tool_interface = [
    {
        "type": "function",
        "function": {
            "name": "wait_for_seconds",
            "description": "Pause execution for a specified number of seconds",
            "parameters": {
                "type": "object",
                "properties": {
                    "wait_time": {"type": "number", "description": "seconds"}
                },
                "required": ["wait_time"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_datetime",
            "description": "Get the current date and time",
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
            "name": "end_program",
            "description": "Ends the program",
            "parameters": {
                "type": "object",
                "properties": {},
                "required": []
            }
        }
    }
]

available_functions = {
    "wait_for_seconds": wait_for_seconds,
    "get_datetime": get_datetime,
    "end_program": end_program
} 