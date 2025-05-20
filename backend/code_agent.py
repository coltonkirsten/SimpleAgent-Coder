from SimpleAgent.SimpleAgent.litellm_interface import LitellmInterface
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
system_message = "You are a coding agent, your name is fred. When creating lists, ALWAYS use a plain text vertical list style."
# model = "anthropic/claude-3-7-sonnet-latest"
model = "openai/gpt-4.1-mini"

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
