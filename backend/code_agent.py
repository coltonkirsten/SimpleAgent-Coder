from SimpleAgent.SimpleAgent.litellm_interface import LitellmInterface
import prompts
import os
import base64
from PIL import Image
import io

# notes:
# MVP: agent only edits one file at a time (so no extra logic needed to apply edits, since each file edit is contained in one tool call)
# Second Iteration: allow agent to edit multiple files (will need to parse which snippets apply to which files, and make multiple predicted output edits.)
# Ideaaaa: should be the analogy of writing code with vim. Can use terminal commands to navigate the directory and run commands.

Tools = {
  "tools": [
    "agent_developer_tools.coding_tools",
  ]
}

# System message for both backends
system_message = prompts.code_agent_system_prompt
# model = "anthropic/claude-sonnet-4-20250514"
model = "openai/gpt-4.1"

# Create the LitellmInterface instance
bot = LitellmInterface(
    name="Code Agent",
    model=model,
    system_role=system_message,
    stream=True,
    tools=Tools
)

def prompt_agent(prompt: str, image: str = None):
    return bot.prompt(prompt, image=image)

def reset_conversation():
    bot.forget()
    return bot.show_chat()