import React, {
  useState,
  useRef,
  useEffect,
  forwardRef,
  useImperativeHandle,
} from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { FiSend, FiPaperclip } from "react-icons/fi";
import { ImSpinner2 } from "react-icons/im";
import MenuBar from "../MenuBar/MenuBar";
import "./Chat.css";

const typingAnimationFrames = [".  ", ".. ", "...", ".  ", ".. ", "..."];

const Chat = forwardRef(({ onHideChat }, ref) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [isMenuVisible, setIsMenuVisible] = useState(false);
  const fileInputRef = useRef(null);
  const inputRef = useRef(null);
  const [typingFrame, setTypingFrame] = useState(0);
  const typingIntervalRef = useRef(null);
  const [agentMessageIdForAnimation, setAgentMessageIdForAnimation] =
    useState(null);
  const chatMessagesRef = useRef(null);
  const [userScrolledUp, setUserScrolledUp] = useState(false);
  const containerRef = useRef(null);

  // Expose setSelectedImage method to parent
  useImperativeHandle(ref, () => ({
    setSelectedImage: (image) => {
      setSelectedImage(image);
    },
  }));

  useEffect(() => {
    if (isStreaming) {
      typingIntervalRef.current = setInterval(() => {
        setTypingFrame(
          (prevFrame) => (prevFrame + 1) % typingAnimationFrames.length
        );
      }, 300);
    } else {
      clearInterval(typingIntervalRef.current);
      setTypingFrame(0);
      setAgentMessageIdForAnimation(null);
    }
    return () => clearInterval(typingIntervalRef.current);
  }, [isStreaming]);

  useEffect(() => {
    if (chatMessagesRef.current && !userScrolledUp) {
      chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight;
    }
  }, [messages, userScrolledUp]);

  const handleMouseMove = (e) => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const mouseY = e.clientY - rect.top;
      setIsMenuVisible(mouseY < 60); // Show menu when mouse is within 60px of top
    }
  };

  const handleMouseLeave = () => {
    setIsMenuVisible(false);
  };

  const handleResetChat = async () => {
    try {
      const response = await fetch("http://localhost:8000/reset_conversation", {
        method: "GET",
      });

      if (response.ok) {
        // Clear all messages from the chat window
        setMessages([]);
        console.log("Chat reset successfully");
      } else {
        console.error("Failed to reset conversation");
      }
    } catch (error) {
      console.error("Error resetting conversation:", error);
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current.click();
  };

  const removeSelectedImage = () => {
    setSelectedImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || isStreaming) return;

    setUserScrolledUp(false);

    const userMessage = input;
    const newMessages = [
      ...messages,
      {
        id: `user-${Date.now()}`,
        text: userMessage,
        sender: "user",
        image: selectedImage,
      },
    ];

    const responseId = `agent-${Date.now()}`;
    setAgentMessageIdForAnimation(responseId);

    const updatedMessages = [
      ...newMessages,
      { id: responseId, text: "", sender: "agent" },
    ];
    setMessages(updatedMessages);

    setInput("");
    setIsStreaming(true);

    const requestBody = { prompt: userMessage };
    if (selectedImage) {
      requestBody.image = selectedImage;
    }

    try {
      const response = await fetch(
        "http://localhost:8000/prompt_agent_stream",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody),
        }
      );

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let responseText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const dataChunk = decoder.decode(value);

        responseText += dataChunk;

        setMessages((current) => {
          const updated = [...current];
          const messageIndex = updated.findIndex(
            (msg) => msg.id === responseId
          );
          if (messageIndex !== -1) {
            updated[messageIndex] = {
              ...updated[messageIndex],
              text: responseText,
            };
          }
          return updated;
        });
      }
    } catch (error) {
      console.error("Error calling streaming API:", error);
      setMessages((current) => {
        const updated = [...current];
        const messageIndex = updated.findIndex((msg) => msg.id === responseId);
        if (messageIndex !== -1) {
          updated[messageIndex] = {
            ...updated[messageIndex],
            text: "Sorry, there was an error processing your request.",
          };
        }
        return updated;
      });
    } finally {
      setIsStreaming(false);
      setSelectedImage(null);
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }
  };

  const handleScroll = () => {
    if (chatMessagesRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = chatMessagesRef.current;
      if (scrollHeight - scrollTop - clientHeight > 10) {
        setUserScrolledUp(true);
      } else {
        setUserScrolledUp(false);
      }
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      sendMessage();
    }
  };

  return (
    <div
      className="chat-container"
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <MenuBar
        type="chat"
        onResetChat={handleResetChat}
        onHideChat={onHideChat}
        isVisible={isMenuVisible}
      />
      <div
        className="chat-messages"
        ref={chatMessagesRef}
        onScroll={handleScroll}
      >
        {messages.map((message, index) => {
          return (
            <div
              key={message.id || index}
              className={`message ${message.sender}`}
            >
              {message.sender === "agent" ? (
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    code({ node, inline, className, children, ...props }) {
                      const match = /language-(\w+)/.exec(className || "");
                      return !inline && match ? (
                        <SyntaxHighlighter
                          style={vscDarkPlus}
                          language={match[1]}
                          PreTag="div"
                          {...props}
                        >
                          {String(children).replace(/\n$/, "")}
                        </SyntaxHighlighter>
                      ) : (
                        <code className={className} {...props}>
                          {children}
                        </code>
                      );
                    },
                  }}
                >
                  {message.text +
                    (isStreaming && message.id === agentMessageIdForAnimation
                      ? typingAnimationFrames[typingFrame]
                      : "")}
                </ReactMarkdown>
              ) : (
                <div className="user-message-content">
                  {message.image && (
                    <img
                      src={message.image}
                      alt="User uploaded"
                      className="message-image"
                    />
                  )}
                  <div className="user-message-text">{message.text}</div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="chat-input-area">
        {selectedImage && (
          <div className="image-preview-container">
            <img
              src={selectedImage}
              alt="Selected preview"
              className="image-thumbnail"
            />
            <button
              onClick={removeSelectedImage}
              className="remove-image-button"
            >
              X
            </button>
          </div>
        )}
        <div className="chat-input">
          <input
            type="text"
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type a message..."
            disabled={isStreaming}
          />
          <button
            onClick={sendMessage}
            disabled={isStreaming}
            className="chat-button send-button"
          >
            {isStreaming ? <ImSpinner2 className="spinner" /> : <FiSend />}
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImageChange}
            style={{ display: "none" }}
            accept="image/*"
          />
          <button
            onClick={triggerFileInput}
            disabled={isStreaming}
            className="chat-button image-button"
          >
            <FiPaperclip />
          </button>
        </div>
      </div>
    </div>
  );
});

export default Chat;
