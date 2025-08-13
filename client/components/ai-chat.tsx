import React, { useState, useRef, useEffect } from 'react';
import { PaperPlaneTilt, Robot, User } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';

interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  mappingSuggestion?: {
    csvColumn: string;
    targetCaption: string;
    confidence: number;
  };
}

interface AIChatProps {
  csvColumns: string[];
  captions: string[];
  currentMappings: Record<string, string>;
  onMappingUpdate: (csvColumn: string, caption: string) => void;
  onMappingRemove: (csvColumn: string) => void;
}

export function AIChat({
  csvColumns,
  captions,
  currentMappings,
  onMappingUpdate,
  onMappingRemove,
}: AIChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Call serverless function (mock-only)
  const generateAIResponse = async (userMessage: string): Promise<Message> => {
    try {
      const response = await fetch('/.netlify/functions/ai-chat-mock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage, csvColumns, captions, currentMappings }),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`${response.status} ${errText}`);
      }

      const data = await response.json();
      return {
        id: Date.now().toString(),
        type: 'assistant',
        content: `${data.content}`,
        timestamp: new Date(),
        mappingSuggestion: data.mappingSuggestion,
      };
    } catch (error) {
      console.error('AI Chat error:', error);
      return {
        id: Date.now().toString(),
        type: 'assistant',
        content:
          'There was a problem contacting the AI service. Check your API key and internet connection, then try again.',
        timestamp: new Date(),
      };
    }
  };

  const sendMessage = async () => {
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: inputValue,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);

    try {
      const aiResponse = await generateAIResponse(userMessage.content);
      setMessages((prev) => [...prev, aiResponse]);
    } catch (error) {
      console.error('Error generating AI response:', error);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const applyMapping = (csvColumn: string, caption: string) => {
    onMappingUpdate(csvColumn, caption);
    const confirmMessage: Message = {
      id: Date.now().toString(),
      type: 'assistant',
      content: `Perfect! I've mapped "${csvColumn}" to "${caption}".`,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, confirmMessage]);
  };

  useEffect(() => {
    if (messages.length === 0 && csvColumns.length > 0) {
      const welcomeMessage: Message = {
        id: 'welcome',
        type: 'assistant',
        content: `Hello! I can see you have ${csvColumns.length} columns in your CSV: ${csvColumns.join(
          ', '
        )}. I'm ready to help you map these to your ${captions.length} captions. What would you like me to help you with?`,
        timestamp: new Date(),
      };
      setMessages([welcomeMessage]);
    }
  }, [csvColumns, captions, messages.length]);

  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollElement = scrollAreaRef.current.querySelector(
        '[data-radix-scroll-area-viewport]'
      );
      if (scrollElement) {
        (scrollElement as HTMLElement).scrollTop = (scrollElement as HTMLElement).scrollHeight;
      }
    }
  }, [messages, isTyping]);

  return (
    <Card className="flex h-[500px] w-full flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg font-semibold">
          <Robot className="h-5 w-5 text-blue-500" weight="regular" />
          AI Mapping Assistant
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col p-0">
        <ScrollArea className="flex-1 px-4" ref={scrollAreaRef}>
          <div className="space-y-4 pb-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex items-start space-x-2 ${
                  message.type === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                {message.type === 'assistant' && (
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-blue-500">
                    <Robot className="h-4 w-4 text-white" weight="regular" />
                  </div>
                )}
                <div
                  className={`max-w-[80%] rounded-lg p-3 ${
                    message.type === 'user' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  <p className="text-sm">{message.content}</p>
                  {message.mappingSuggestion && (
                    <div className="mt-3 space-y-2 rounded border bg-white p-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-gray-600">Suggested Mapping:</span>
                        <Badge variant="secondary" className="text-xs">
                          {Math.round(message.mappingSuggestion.confidence * 100)}% match
                        </Badge>
                      </div>
                      <div className="text-sm">
                        <span className="font-medium">{message.mappingSuggestion.csvColumn}</span>
                        <span className="mx-2">→</span>
                        <span className="font-medium">{message.mappingSuggestion.targetCaption}</span>
                      </div>
                      <Button
                        size="sm"
                        onClick={() =>
                          applyMapping(
                            message.mappingSuggestion!.csvColumn,
                            message.mappingSuggestion!.targetCaption,
                          )
                        }
                        className="w-full"
                      >
                        Apply Mapping
                      </Button>
                    </div>
                  )}
                </div>
                {message.type === 'user' && (
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gray-500">
                    <User className="h-4 w-4 text-white" />
                  </div>
                )}
              </div>
            ))}
            {isTyping && (
              <div className="flex items-start space-x-2">
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-blue-500">
                  <Robot className="h-4 w-4 text-white" weight="regular" />
                </div>
                <div className="rounded-lg bg-gray-100 p-3">
                  <div className="flex space-x-1">
                    <div className="h-2 w-2 animate-bounce rounded-full bg-gray-400"></div>
                    <div className="h-2 w-2 animate-bounce rounded-full bg-gray-400" style={{ animationDelay: '0.1s' }}></div>
                    <div className="h-2 w-2 animate-bounce rounded-full bg-gray-400" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
        <div className="border-t p-4">
          <div className="flex space-x-2">
            <Input
              placeholder="Ask me to map columns to captions..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              className="flex-1"
            />
            <Button onClick={sendMessage} disabled={!inputValue.trim() || isTyping}>
              <PaperPlaneTilt className="h-4 w-4" weight="regular" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
