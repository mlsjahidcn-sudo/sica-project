'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { 
  MessageSquare, 
  X, 
  Send, 
  Loader2, 
  Copy, 
  Check, 
  ThumbsUp,
  ThumbsDown,
  ExternalLink,
  MessageCircle,
  Phone,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ChatMarkdown } from '@/components/chat-markdown';
import { ChatUniversityCard, ChatUniversityCardSkeleton } from '@/components/chat-university-card';
import { ChatProgramCard, ChatProgramCardSkeleton } from '@/components/chat-program-card';
import { LeadCaptureForm } from '@/components/chat/lead-capture-form';
import Link from 'next/link';
import { 
  parseChatContent, 
  splitByCardPlaceholders, 
  getQuickActions, 
  detectContext,
  getFollowUpQuestions
} from '@/lib/chat-utils';

// Generate unique IDs
const generateId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
};

// Card data types
interface UniversityCardData {
  id: string;
  name: string;
  nameCn: string | null;
  city: string | null;
  province: string | null;
  ranking: number | null;
  types: string[];
  tuitionMin: number | null;
  tuitionMax: number | null;
  currency: string;
  logoUrl: string | null;
}

interface ProgramCardData {
  id: string;
  name: string;
  degree: string | null;
  category: string | null;
  universityName: string | null;
  universityId: string | null;
  language: string | null;
  duration: string | null;
  durationYears: number | null;
  tuition: number | null;
  currency: string;
  scholarshipAvailable: boolean;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  universityIds?: string[];
  programIds?: string[];
  universityData?: Map<number, UniversityCardData>;
  programData?: Map<number, ProgramCardData>;
  loading?: boolean;
  rating?: 'positive' | 'negative';
}

const WHATSAPP_NUMBER = '+8617325764171';
const WHATSAPP_LINK = `https://wa.me/${WHATSAPP_NUMBER.replace(/\+/g, '')}`;

const LEAD_CAPTURE_KEY = 'sica-lead-captured';
const LEAD_CAPTURE_AFTER_MESSAGES = 5;

export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [followUpQuestions, setFollowUpQuestions] = useState<string[]>([]);
  const [messageCount, setMessageCount] = useState(0);
  const [showLeadCapture, setShowLeadCapture] = useState(false);
  const [collectedUniversityIds, setCollectedUniversityIds] = useState<string[]>([]);
  const [collectedProgramIds, setCollectedProgramIds] = useState<string[]>([]);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesRef = useRef(messages);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    const leadCaptured = localStorage.getItem(LEAD_CAPTURE_KEY);
    if (!leadCaptured && messageCount >= LEAD_CAPTURE_AFTER_MESSAGES && !showLeadCapture) {
      setShowLeadCapture(true);
    }
  }, [messageCount, showLeadCapture]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const currentContext = useMemo(() => {
    const lastUserMessage = [...messages].reverse().find(m => m.role === 'user');
    return detectContext(lastUserMessage?.content || '');
  }, [messages]);
  const quickActions = useMemo(() => getQuickActions(currentContext), [currentContext]);

  const fetchCardData = useCallback(async (messageId: string, universityIds: string[], programIds: string[]) => {
    try {
      const response = await fetch('/api/chat/cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ universityIds, programIds }),
      });

      if (response.ok) {
        const data = await response.json();
        
        const universityData = new Map<number, UniversityCardData>();
        const programData = new Map<number, ProgramCardData>();

        if (data.universities) {
          data.universities.forEach((uni: UniversityCardData) => {
            const idx = universityIds.indexOf(uni.id);
            if (idx !== -1) universityData.set(idx, uni);
          });
        }

        if (data.programs) {
          data.programs.forEach((prog: ProgramCardData) => {
            const idx = programIds.indexOf(prog.id);
            if (idx !== -1) programData.set(idx, prog);
          });
        }

        setMessages(prev => prev.map(m => 
          m.id === messageId ? { ...m, universityData, programData, loading: false } : m
        ));
      }
    } catch (error) {
      console.error('Failed to fetch card data:', error);
      setMessages(prev => prev.map(m => 
        m.id === messageId ? { ...m, loading: false } : m
      ));
    }
  }, []);

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isLoading) return;

    const userMessage: Message = {
      id: generateId(),
      role: 'user',
      content: content.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);
    setIsTyping(true);
    setFollowUpQuestions([]);
    setMessageCount(prev => prev + 1);

    const assistantId = generateId();
    const placeholderMessage: Message = {
      id: assistantId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      loading: true,
    };
    
    setMessages(prev => [...prev, placeholderMessage]);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 45000);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage.content, session_id: sessionId }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) throw new Error('Failed to get response');

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullContent = '';
      setIsTyping(false);

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') continue;

              try {
                const parsed = JSON.parse(data);
                if (parsed.type === 'session') {
                  setSessionId(parsed.session_id);
                } else if (parsed.type === 'content' && parsed.content) {
                  fullContent += parsed.content;
                  setMessages(prev => prev.map(m => 
                    m.id === assistantId ? { ...m, content: fullContent } : m
                  ));
                }
              } catch { /* Skip invalid JSON */ }
            }
          }
        }
      }

      const { text, universityIds, programIds } = parseChatContent(fullContent);
      
      setMessages(prev => prev.map(m => 
        m.id === assistantId ? { ...m, content: text, universityIds, programIds } : m
      ));
      
      if (text) setFollowUpQuestions(getFollowUpQuestions(text, currentContext));

      if (universityIds.length > 0 || programIds.length > 0) {
        setCollectedUniversityIds(prev => [...new Set([...prev, ...universityIds])]);
        setCollectedProgramIds(prev => [...new Set([...prev, ...programIds])]);
        await fetchCardData(assistantId, universityIds, programIds);
      } else {
        setMessages(prev => prev.map(m => 
          m.id === assistantId ? { ...m, loading: false } : m
        ));
      }

      if (!fullContent) {
        setMessages(prev => prev.map(m => 
          m.id === assistantId ? { ...m, content: 'Sorry, I encountered an error. Please try again.', loading: false } : m
        ));
      }
    } catch (error) {
      clearTimeout(timeoutId);
      console.error('Chat error:', error);
      setIsTyping(false);
      
      const errorMessage = error instanceof Error && error.name === 'AbortError'
        ? 'Request timed out. Please try again.'
        : 'Sorry, I encountered an error. Please try again.';
      
      setMessages(prev => prev.map(m => 
        m.id === assistantId ? { ...m, content: errorMessage, loading: false } : m
      ));
    } finally {
      clearTimeout(timeoutId);
      setIsLoading(false);
    }
  }, [messages, isLoading, sessionId, fetchCardData, currentContext]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(inputValue);
  };

  const handleQuickAction = (query: string) => sendMessage(query);

  const handleCopy = async (content: string, messageId: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedId(messageId);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const handleRating = (messageId: string, rating: 'positive' | 'negative') => {
    setMessages(prev => prev.map(m => m.id === messageId ? { ...m, rating } : m));
  };

  const handleLeadSubmit = () => {
    localStorage.setItem(LEAD_CAPTURE_KEY, 'true');
    setShowLeadCapture(false);
    toast.success('Thanks! We\'ll be in touch soon.');
  };

  const regenerateLastResponse = () => {
    const lastUserMessage = [...messagesRef.current].reverse().find(m => m.role === 'user');
    if (lastUserMessage) {
      setMessages(prev => prev.slice(0, -1));
      sendMessage(lastUserMessage.content);
    }
  };

  const formatTime = (date: Date) => date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const renderMessageContent = (message: Message) => {
    const parts = splitByCardPlaceholders(message.content);

    return (
      <div className="space-y-3">
        {parts.map((part, index) => {
          const uniqueKey = `${message.id}-${index}-${part.type}`;
          
          if (part.type === 'text') {
            return <ChatMarkdown key={uniqueKey} content={part.content} />;
          } else if (part.type === 'uni-card' && part.index !== undefined) {
            const uniData = message.universityData?.get(part.index);
            if (uniData) {
              return (
                <ChatUniversityCard
                  key={uniqueKey}
                  id={uniData.id}
                  name={uniData.name}
                  nameCn={uniData.nameCn}
                  city={uniData.city}
                  province={uniData.province}
                  ranking={uniData.ranking}
                  types={uniData.types}
                  tuitionMin={uniData.tuitionMin}
                  tuitionMax={uniData.tuitionMax}
                  currency={uniData.currency}
                  logoUrl={uniData.logoUrl}
                />
              );
            }
            return message.loading ? <ChatUniversityCardSkeleton key={uniqueKey} /> : null;
          } else if (part.type === 'prog-card' && part.index !== undefined) {
            const progData = message.programData?.get(part.index);
            if (progData) {
              return (
                <ChatProgramCard
                  key={uniqueKey}
                  id={progData.id}
                  name={progData.name}
                  degree={progData.degree}
                  category={progData.category}
                  universityName={progData.universityName}
                  universityId={progData.universityId}
                  language={progData.language}
                  duration={progData.duration}
                  durationYears={progData.durationYears}
                  tuition={progData.tuition}
                  currency={progData.currency}
                  scholarshipAvailable={progData.scholarshipAvailable}
                />
              );
            }
            return message.loading ? <ChatProgramCardSkeleton key={uniqueKey} /> : null;
          }
          return null;
        })}
      </div>
    );
  };

  return (
    <>
      {/* Chat Window */}
      <div
        className={cn(
          'fixed z-50 flex flex-col bg-background border rounded-xl shadow-lg transition-all duration-300 ease-out',
          'bottom-24 right-4 w-[calc(100vw-2rem)] sm:w-96',
          isOpen ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-4 scale-95 pointer-events-none'
        )}
        style={{ height: 'min(70vh, 580px)' }}
      >
        {/* Header - Clean and friendly */}
        <div className="flex items-center justify-between px-4 py-3 border-b rounded-t-xl">
          <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9 bg-primary/10">
              <AvatarFallback className="bg-primary/10 text-primary">
                <MessageCircle className="h-4 w-4" />
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-semibold text-sm">Chat with Us</h3>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                Here to help
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsOpen(false)}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 && (
              <div className="text-center py-8">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-muted mb-4">
                  <MessageCircle className="h-6 w-6 text-muted-foreground" />
                </div>
                <h3 className="font-medium mb-1">Welcome!</h3>
                <p className="text-sm text-muted-foreground">Ask us anything about studying in China</p>
              </div>
            )}
            
            {messages.map((message) => (
              <div key={message.id} className={cn('flex gap-2', message.role === 'user' ? 'justify-end' : 'justify-start')}>
                {message.role === 'assistant' && (
                  <Avatar className="h-7 w-7 flex-shrink-0 mt-1">
                    <AvatarFallback className="bg-muted text-xs">
                      <MessageCircle className="h-3.5 w-3.5" />
                    </AvatarFallback>
                  </Avatar>
                )}
                <div className="max-w-[85%]">
                  <div className={cn(
                    'rounded-2xl px-3 py-2.5 text-sm',
                    message.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'
                  )}>
                    {message.content === '' ? (
                      <span className="flex items-center gap-2 text-muted-foreground text-xs">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Typing...
                      </span>
                    ) : message.role === 'user' ? (
                      <p className="whitespace-pre-wrap">{message.content}</p>
                    ) : (
                      <>
                        {renderMessageContent(message)}
                        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border/30">
                          <button onClick={() => handleCopy(message.content, message.id)} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                            {copiedId === message.id ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                          </button>
                          <button onClick={() => handleRating(message.id, 'positive')} className={cn('text-xs', message.rating === 'positive' ? 'text-emerald-500' : 'text-muted-foreground hover:text-emerald-500')}>
                            <ThumbsUp className="h-3 w-3" />
                          </button>
                          <button onClick={() => handleRating(message.id, 'negative')} className={cn('text-xs', message.rating === 'negative' ? 'text-red-500' : 'text-muted-foreground hover:text-red-500')}>
                            <ThumbsDown className="h-3 w-3" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                  <div className={cn('text-[10px] text-muted-foreground mt-1', message.role === 'user' ? 'text-right' : 'text-left')}>
                    {formatTime(message.timestamp)}
                  </div>
                </div>
                {message.role === 'user' && (
                  <Avatar className="h-7 w-7 flex-shrink-0 mt-1">
                    <AvatarFallback className="bg-muted text-xs">U</AvatarFallback>
                  </Avatar>
                )}
              </div>
            ))}
            
            {isTyping && (
              <div className="flex gap-2 justify-start">
                <Avatar className="h-7 w-7 flex-shrink-0 mt-1">
                  <AvatarFallback className="bg-muted text-xs">
                    <MessageCircle className="h-3.5 w-3.5" />
                  </AvatarFallback>
                </Avatar>
                <div className="bg-muted rounded-2xl px-3 py-2.5">
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-pulse" />
                    <span className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-pulse delay-75" />
                    <span className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-pulse delay-150" />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Quick Actions */}
          {messages.length <= 2 && !isLoading && (
            <div className="px-4 pb-2">
              <div className="flex flex-wrap gap-1.5">
                {quickActions.slice(0, 4).map((action, index) => (
                  <Button key={index} variant="outline" size="sm" className="text-xs rounded-full h-7 px-3"
                    onClick={() => handleQuickAction(action.query)}>
                    {action.label}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* WhatsApp Link */}
          <div className="px-4 py-2 border-t bg-muted/30">
            <div className="flex items-center justify-between">
              <a href={WHATSAPP_LINK} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 text-xs font-medium text-emerald-600 hover:text-emerald-700">
                <Phone className="h-3.5 w-3.5" />
                WhatsApp Us
              </a>
              <Link href="/chat" target="_blank" className="flex items-center gap-1 text-xs text-primary hover:underline">
                Full Chat <ExternalLink className="h-3 w-3" />
              </Link>
            </div>
          </div>

          {/* Input */}
          <form onSubmit={handleSubmit} className="p-3 border-t">
            <div className="flex gap-2">
              <Input ref={inputRef} value={inputValue} onChange={(e) => setInputValue(e.target.value)}
                placeholder="Ask about universities, programs..." className="flex-1 rounded-full text-sm"
                disabled={isLoading} />
              <Button type="submit" size="icon" className="rounded-full h-10 w-10"
                disabled={!inputValue.trim() || isLoading}>
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
          </form>
        </div>
      </div>

      {/* Floating Button */}
      <Button onClick={() => setIsOpen(!isOpen)}
        className={cn('fixed bottom-4 right-4 z-50 h-12 w-12 rounded-full shadow-md transition-all', isOpen && 'rotate-90')}
        size="icon">
        {isOpen ? <X className="h-5 w-5" /> : <MessageSquare className="h-5 w-5" />}
      </Button>

      {/* Lead Capture Form */}
      {showLeadCapture && (
        <div className="fixed bottom-24 right-4 z-50 w-[calc(100vw-2rem)] sm:w-96">
          <LeadCaptureForm sessionId={sessionId || undefined}
            programIds={collectedProgramIds.length > 0 ? collectedProgramIds : undefined}
            universityIds={collectedUniversityIds.length > 0 ? collectedUniversityIds : undefined}
            onSubmit={handleLeadSubmit} onCancel={() => setShowLeadCapture(false)} />
        </div>
      )}
    </>
  );
}
