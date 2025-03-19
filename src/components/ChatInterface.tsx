
import { useState, useRef, useEffect } from 'react';
import { Send, Image, Paperclip } from 'lucide-react';
import { ChatMessage } from '@/lib/types';

const ChatInterface = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Hi there! How can I help you today?',
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSendMessage = () => {
    if (!inputValue.trim()) return;

    const newUserMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, newUserMessage]);
    setInputValue('');

    // Simulate a reply after 1 second
    setTimeout(() => {
      const newAssistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "I'm a simulated response. When connected to LM Studio, I'll provide real answers based on your notes and queries.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, newAssistantMessage]);
    }, 1000);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
    
    // Auto-grow textarea
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
  };

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-border">
        <h2 className="text-lg font-medium">Chat</h2>
        <p className="text-sm text-muted-foreground">
          Ask questions about your notes or upload images for analysis.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                message.role === 'user'
                  ? 'bg-primary text-primary-foreground'
                  : 'glass'
              }`}
            >
              <p className="whitespace-pre-wrap break-words">{message.content}</p>
              <div className={`text-xs mt-1 ${message.role === 'user' ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 border-t border-border">
        <div className="glass rounded-xl overflow-hidden">
          <div className="flex items-end">
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={handleTextareaChange}
              onKeyDown={handleKeyDown}
              placeholder="Ask something..."
              className="flex-1 bg-transparent border-0 p-3 max-h-32 focus:outline-none resize-none scrollbar-thin"
              style={{ height: '40px' }}
            />
            <div className="flex items-center p-2 gap-1">
              <button
                className="p-2 rounded-lg text-muted-foreground hover:text-foreground button-hover-effect focus-ring"
                aria-label="Upload image"
              >
                <Image className="w-5 h-5" />
              </button>
              <button
                className="p-2 rounded-lg text-muted-foreground hover:text-foreground button-hover-effect focus-ring"
                aria-label="Upload file"
              >
                <Paperclip className="w-5 h-5" />
              </button>
              <button
                onClick={handleSendMessage}
                disabled={!inputValue.trim()}
                className={`p-2 rounded-lg focus-ring ${
                  inputValue.trim()
                    ? 'text-primary hover:bg-primary/10 button-hover-effect'
                    : 'text-muted-foreground cursor-not-allowed'
                }`}
                aria-label="Send message"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;
