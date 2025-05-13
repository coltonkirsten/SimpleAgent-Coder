from SimpleAgent.SimpleAgent.litellm_interface import LitellmInterface

# Settings to control which backend and mode to use
settings = {
    "backend": "anthropic",  # "openai" or "anthropic"
    "stream": True,       # True for streaming, False for non-streaming
}

Tools = {
  "tools": [
    "tools.weather_tool",
    "tools.util_tools",
    "tools.web_search_tool",
  ]
}

# System message for both backends
system_message = "You are a total chiller. respond super duper chill and like a total bro."

# Initialize LitellmInterface with the appropriate model based on settings
if settings["backend"] == "openai":
    model = "openai/gpt-4o-mini"
    print(f"=== OpenAI Backend (Streaming: {settings['stream']}) ===")
else:
    model = "anthropic/claude-3-5-haiku-latest"
    print(f"=== Anthropic Backend (Streaming: {settings['stream']}) ===")

# Create the LitellmInterface instance
bot = LitellmInterface(
    model=model,
    system_role=system_message,
    stream=settings["stream"],
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
    
    # Check for special commands
    if user_input.lower() == "history":
        print("\nConversation History:")
        for message in bot.show_chat():
            if message.get("role") == "user":
                print(f"You: {message.get('content')}")
            elif message.get("role") == "assistant":
                print(f"Assistant: {message.get('content')}")
            # Skip system messages
        print("-" * 50)
        continue
    
    # Get response from the AI
    print("\nAssistant: ", end="", flush=True)
    
    # Handle streaming vs non-streaming responses
    response = bot.prompt(user_input)
    
    if settings["stream"]:
        for chunk in response:
            print(chunk, end="", flush=True)
        print("\n")
    else:
        print(response)