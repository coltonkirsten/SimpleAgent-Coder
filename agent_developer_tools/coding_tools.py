
from SimpleAgent.SimpleAgent.litellm_interface import LitellmInterface
import prompts

import os

def write_file(filename, contents):
    try:
        # Define the solutions directory path
        # Read the solutions directory path from the file
        with open("sol_dir_path.txt", "r") as f:
            solutions_dir = f.read().strip()
        # Ensure the solutions directory exists
        os.makedirs(solutions_dir, exist_ok=True)
        
        # Create the full path for the file
        file_path = os.path.join(solutions_dir, filename)
        
        # Write the contents to the file
        with open(file_path, 'w') as file:
            file.write(contents)
        
        return f"Successfully wrote to {file_path}"
    
    except Exception as e:
        return f"Error writing file: {str(e)}"
    
def edit_file_tool(file_path, code):
    """for minor edits, use this tool"""
    system_message = prompts.apply_edit_tool_system_prompt

    bot = LitellmInterface(
        name="code_predictor",
        model="openai/gpt-4o-mini", # TODO: check if this is the fastest 
        system_role=system_message,
        stream=False,
    )

    # get code from filepath

    bot._add_user_msg(prompts.apply_edit_tool_prompt)
    response = bot.prompt(prompt=code, predicted_output=code)
    write_file(file_path, response)

    return response # return output so the agent can see how well the edit was applied