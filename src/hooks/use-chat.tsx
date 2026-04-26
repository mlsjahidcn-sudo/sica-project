'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { 
  parseChatContent, 
  splitByCardPlaceholders, 
  getQuickActions, 
  detectContext,
  getFollowUpQuestions 
} from '@/lib/chat-utils';

// ============================================================================
// Types
// ============================================================================

export interface UniversityCardData {
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

export interface ProgramCardData {
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

export interface ChatMessage {
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

export interface UseChatOptions {
  sessionId?: string | null;
  onSessionChange?: (sessionId: string) => void;
  leadCaptureAfterMessages?: number;
}

// ============================================================================
// ID Generation
// ============================================================================

const generateId = (): string => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
};

// ============================================================================
// Main Hook
// ============================================================================

export function useChat(options: UseChatOptions = {}) {
  const {
    sessionId: initialSessionId,
    onSessionChange,
    leadCaptureAfterMessages = 5,
  } = options;

  // State
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(initialSessionId || null);
  const [followUpQuestions, setFollowUpQuestions] = useState<string[]>([]);
  const [messageCount, setMessageCount] = useState(0);
  const [showLeadCapture, setShowLeadCapture] = useState(false);
  const [collectedUniversityIds, setCollectedUniversityIds] = useState<string[]>([]);
  const [collectedProgramIds, setCollectedProgramIds] = useState<string[]>([]);

  // Refs
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesRef = useRef(messages);
  
  // Keep ref in sync with state
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // Auto scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  // Check lead capture
  useEffect(() => {
    const leadCaptured = localStorage.getItem('sica-lead-captured');
    if (!leadCaptured && messageCount >= leadCaptureAfterMessages && !showLeadCapture) {
      setShowLeadCapture(true);
    }
  }, [messageCount, showLeadCapture, leadCaptureAfterMessages]);

  // Context detection
  const currentContext = useMemo(() => {
    const lastUserMessage = [...messages].reverse().find(m => m.role === 'user');
    return detectContext(lastUserMessage?.content || '');
  }, [messages]);
  
  const quickActions = useMemo(() => getQuickActions(currentContext), [currentContext]);

  // ============================================================================
  // Card Data Fetching
  // ============================================================================

  const fetchCardData = useCallback(async (
    messageId: string, 
    universityIds: string[], 
    programIds: string[]
  ) => {
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
            const index = universityIds.indexOf(uni.id);
            if (index !== -1) {
              universityData.set(index, uni);
            }
          });
        }

        if (data.programs) {
          data.programs.forEach((prog: ProgramCardData) => {
            const index = programIds.indexOf(prog.id);
            if (index !== -1) {
              programData.set(index, prog);
            }
          });
        }

        setMessages(prev => prev.map(m => 
          m.id === messageId 
            ? { ...m, universityData, programData, loading: false }
            : m
        ));
      }
    } catch (error) {
      console.error('Failed to fetch card data:', error);
      setMessages(prev => prev.map(m => 
        m.id === messageId 
          ? { ...m, loading: false }
          : m
      ));
    }
  }, []);

  // ============================================================================
  // Send Message
  // ============================================================================

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isLoading) return;

    const userMessage: ChatMessage = {
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
    const placeholderMessage: ChatMessage = {
      id: assistantId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      loading: true,
    };
    
    setMessages(prev => [...prev, placeholderMessage]);

    // Abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 45000);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: userMessage.content,
          session_id: sessionId,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

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
                  onSessionChange?.(parsed.session_id);
                } else if (parsed.type === 'content' && parsed.content) {
                  fullContent += parsed.content;
                  setMessages(prev => prev.map(m => 
                    m.id === assistantId 
                      ? { ...m, content: fullContent }
                      : m
                  ));
                }
              } catch {
                // Skip invalid JSON
              }
            }
          }
        }
      }

      const { text, universityIds, programIds } = parseChatContent(fullContent);
      
      setMessages(prev => prev.map(m => 
        m.id === assistantId 
          ? { ...m, content: text, universityIds, programIds }
          : m
      ));
      
      if (text) {
        setFollowUpQuestions(getFollowUpQuestions(text, currentContext));
      }

      if (universityIds.length > 0 || programIds.length > 0) {
        setCollectedUniversityIds(prev => [...new Set([...prev, ...universityIds])]);
        setCollectedProgramIds(prev => [...new Set([...prev, ...programIds])]);
        await fetchCardData(assistantId, universityIds, programIds);
      } else {
        setMessages(prev => prev.map(m => 
          m.id === assistantId 
            ? { ...m, loading: false }
            : m
        ));
      }

      if (!fullContent) {
        setMessages(prev => prev.map(m => 
          m.id === assistantId 
            ? { ...m, content: 'Sorry, I encountered an error. Please try again.', loading: false }
            : m
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
        m.id === assistantId 
          ? { ...m, content: errorMessage, loading: false }
          : m
      ));
    } finally {
      clearTimeout(timeoutId);
      setIsLoading(false);
    }
  }, [isLoading, sessionId, fetchCardData, currentContext, onSessionChange]);

  // ============================================================================
  // Actions
  // ============================================================================

  const handleCopy = useCallback(async (content: string, messageId: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedId(messageId);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  }, []);

  const handleRating = useCallback((messageId: string, rating: 'positive' | 'negative') => {
    setMessages(prev => prev.map(m => 
      m.id === messageId ? { ...m, rating } : m
    ));
  }, []);

  const regenerateLastResponse = useCallback(() => {
    const lastUserMessage = [...messagesRef.current].reverse().find(m => m.role === 'user');
    if (lastUserMessage) {
      setMessages(prev => prev.slice(0, -1));
      sendMessage(lastUserMessage.content);
    }
  }, [sendMessage]);

  const handleLeadSubmit = useCallback(() => {
    localStorage.setItem('sica-lead-captured', 'true');
    setShowLeadCapture(false);
  }, []);

  // ============================================================================
  // Return
  // ============================================================================

  return {
    // State
    messages,
    inputValue,
    setInputValue,
    isLoading,
    isTyping,
    copiedId,
    sessionId,
    followUpQuestions,
    showLeadCapture,
    collectedUniversityIds,
    collectedProgramIds,
    
    // Refs
    scrollRef,
    inputRef,
    
    // Context
    currentContext,
    quickActions,
    
    // Actions
    sendMessage,
    handleCopy,
    handleRating,
    regenerateLastResponse,
    handleLeadSubmit,
    setShowLeadCapture,
  };
}

// Export types
export type { ChatMessage as Message };
