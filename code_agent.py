from SimpleAgent.SimpleAgent.litellm_interface import LitellmInterface

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
system_message = "You are a total chiller. respond super duper chill and like a total bro."
model = "anthropic/claude-3-7-sonnet-latest"

# Create the LitellmInterface instance
bot = LitellmInterface(
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
    
    # Get response from the AI
    print("\nAssistant: ", end="", flush=True)
    
    # Handle streaming vs non-streaming responses
    response = bot.prompt(user_input)

    for chunk in response:
        print(chunk, end="", flush=True)
    print("\n")
