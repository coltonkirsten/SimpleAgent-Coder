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
system_message = "You are a coding agent"
# model = "anthropic/claude-3-7-sonnet-latest"
model = "openai/gpt-4.1"

# Create the LitellmInterface instance
bot = LitellmInterface(
    name="Code Agent",
    model=model,
    system_role=system_message,
    stream=True,
    tools=Tools
)

# Start conversation loop
print("\nType 'exit', 'quit', or 'bye' to end the conversation.")
print("Type 'history' to see the conversation history.")
print("-" * 50)

while True:
    # Get user input
    user_input = input("\nYou: ")

    
    
    # Check for exit commands
    if user_input.lower() in ["exit", "quit", "bye"]:
        print(bot.show_chat())
        print("\nGoodbye!")
        break
    
    # Check for images in image_input directory
    image_dir = "image_input"
    image_files = [f for f in os.listdir(image_dir) if f.lower().endswith((".png", ".jpg", ".jpeg"))]
    base64_image = None
    image_path = None
    if image_files:
        image_path = os.path.join(image_dir, image_files[0])
        img = Image.open(image_path)
        buffer = io.BytesIO()
        img.convert('RGB').save(buffer, format='JPEG')
        buffer.seek(0)
        base64_image = base64.b64encode(buffer.read()).decode("utf-8")
        # Delete the image after processing
        os.remove(image_path)

    # Get response from the AI
    print("\nAssistant: ", end="", flush=True)
    
    # Handle streaming vs non-streaming responses
    response = bot.prompt(user_input, image=base64_image)

    for chunk in response:
        print(chunk, end="", flush=True)
    print("\n")
