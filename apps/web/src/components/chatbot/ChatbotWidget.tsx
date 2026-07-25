'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { useGlassmorphicTheme } from '@/providers/GlassmorphicThemeProvider';

interface Message {
  id: string;
  role: 'user' | 'bot';
  content: string;
  timestamp: Date;
  status?: 'sending' | 'delivered' | 'error';
}

const GREETING_RESPONSES = [
  'سلام! من سامانه هوشمند پاسخگویی مالیاتی آیان تراز هستم. می‌توانم به سوالات شما درباره مالیات، حسابداری، قوانین و مقررات پاسخ دهم.',
  'در خدمت شما هستم. سامانه پرسش و پاسخ آیان تراز آماده پاسخگویی به سوالات مالیاتی و حسابداری شما است.',
  'سلام. برای سوالات مالیاتی، حسابداری، تنظیم اظهارنامه و مشاوره مالی در خدمت شما هستم.',
  'با سلام. من چت‌بات تخصصی مالیات و حسابداری هستم. سوالات خود را بپرسید.',
];

const FALLBACK_MESSAGES = [
  'برای این سوال پاسخ مستند کافی در دانشنامه فعال پیدا نشد. اگر سال مالی، مبلغ، نوع کسب‌وکار و مرحله پرونده را اضافه کنید دقیق‌تر راهنمایی می‌کنم.',
  'این موضوع به اطلاعات پرونده وابسته است. مسیر امن: جزئیات را کامل‌تر بفرستید یا از فرم مشاوره برای بررسی انسانی استفاده کنید.',
  'برای پاسخ دقیق‌تر، سوال را با ساختار موضوع، سال، شخص حقیقی/حقوقی، مبلغ و هدف اقدام ارسال کنید.',
  'پاسخ قطعی بدون مستندات کافی ممکن نیست؛ لطفاً داده‌های اثرگذار را اضافه کنید تا پاسخ حرفه‌ای‌تر ارائه شود.',
];

const SUGGESTED_QUESTIONS = [
  'مالیات بر ارزش افزوده چگونه محاسبه می‌شود؟',
  'مدارک لازم برای تنظیم اظهارنامه مالیاتی چیست؟',
  'معافیت‌های مالیاتی شامل چه مواردی می‌شود؟',
  'تفاوت حسابداری صنعتی و مالی در چیست؟',
  'چگونه می‌توانم مالیات خود را کاهش دهم؟',
  'مهلت ارسال اظهارنامه مالیاتی چه زمانی است؟',
];

export default function ChatbotWidget() {
  const { theme } = useGlassmorphicTheme();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'initial',
      role: 'bot',
      content: GREETING_RESPONSES[0],
      timestamp: new Date(),
      status: 'delivered',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [open]);

  const generateId = useCallback(() => {
    return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }, []);

  const formatTime = useCallback((date: Date): string => {
    return date.toLocaleTimeString('fa-IR', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  }, []);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const question = input.trim();
    setInput('');
    setError(null);
    setShowSuggestions(false);

    const userMessage: Message = {
      id: generateId(),
      role: 'user',
      content: question,
      timestamp: new Date(),
      status: 'delivered',
    };
    setMessages((prev) => [...prev, userMessage]);
    setLoading(true);

    try {
      const res = await api.post<{ answer: string; source?: string; riskLevel?: string }>('/chatbot/query', {
        question,
      });

      const botMessage: Message = {
        id: generateId(),
        role: 'bot',
        content: res.answer || FALLBACK_MESSAGES[0],
        timestamp: new Date(),
        status: 'delivered',
      };
      setMessages((prev) => [...prev, botMessage]);

      if (res.source === 'fallback') {
        setShowSuggestions(true);
      }
    } catch (err) {
      setError('خطایی رخ داد. لطفاً دوباره تلاش کنید.');
      const errorMessage: Message = {
        id: generateId(),
        role: 'bot',
        content: 'متأسفم، خطایی در ارتباط با سرور رخ داد. لطفاً دوباره تلاش کنید.',
        timestamp: new Date(),
        status: 'error',
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestedClick = (question: string) => {
    setInput(question);
    setShowSuggestions(false);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleClearChat = () => {
    setMessages([
      {
        id: generateId(),
        role: 'bot',
        content: 'گفتگوی جدید شروع شد. چگونه می‌توانم به شما کمک کنم؟',
        timestamp: new Date(),
        status: 'delivered',
      },
    ]);
    setInput('');
    setError(null);
    setShowSuggestions(true);
  };

  const handleChatClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  // Luxury color scheme based on theme
  const isDark = theme === 'dark';
  const chatHeaderBg = isDark
    ? 'bg-gradient-to-l from-gold-400 to-gold-500'
    : 'bg-gradient-to-l from-gold-600 to-gold-700';
  const chatHeaderText = isDark ? 'text-background-primary' : 'text-white';
  const chatBg = isDark ? 'bg-background-secondary' : 'bg-background-primary';
  const chatInputBg = isDark ? 'bg-background-tertiary' : 'bg-surface/80';
  const messageUserBg = isDark ? 'bg-background-tertiary' : 'bg-surface/60';
  const messageBotBg = isDark ? 'bg-gold-900/10 border-gold-800/20' : 'bg-gold-700/10 border-gold-700/20';

  return (
    <>
      {/* Floating Chat Button */}
      <button
        onClick={() => {
          setOpen(!open);
          if (!open) setShowSuggestions(true);
        }}
        className="fixed bottom-6 left-6 z-[60] flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-gold-400 to-gold-500 text-2xl text-background-primary shadow-lg shadow-gold-400/20 transition-all duration-300 hover:scale-105 hover:shadow-gold-400/40 active:scale-95"
        aria-label="چت‌بات مالیاتی"
        title="پرسش و پاسخ مالیاتی"
      >
        {open ? (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
            />
          </svg>
        )}
        {messages.length > 1 && !open && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-gold-400 text-background-primary text-xs font-bold rounded-full flex items-center justify-center animate-pulse-gold">
            {messages.filter((m) => m.role === 'user').length}
          </span>
        )}
      </button>

      {/* Chat Panel */}
      {open && (
        <div
          onClick={handleChatClick}
          className="glass-card fixed bottom-24 left-6 z-[60] flex h-[560px] max-h-[calc(100vh-200px)] w-[380px] max-w-[calc(100vw-48px)] flex-col overflow-hidden rounded-3xl safe-area-bottom border-border-gold"
        >
          {/* Header */}
          <div className={`${chatHeaderBg} p-4 flex items-center justify-between flex-shrink-0`}>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center text-lg backdrop-blur-sm">
                ⚖️
              </div>
              <div className="flex-1 min-w-0">
                <h3 className={`font-bold ${chatHeaderText} text-sm truncate`}>پرسش و پاسخ مالیاتی</h3>
                <p className={`text-xs truncate ${chatHeaderText}/70`}>پاسخگویی بر اساس دانشنامه تخصصی</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={handleClearChat}
                className={`text-background-primary/60 hover:text-background-primary transition-colors p-1.5 rounded-lg hover:bg-white/20`}
                title="پاک کردن گفتگو"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </button>
              <button
                onClick={() => setOpen(false)}
                className={`text-background-primary/60 hover:text-background-primary transition-colors p-1.5 rounded-lg hover:bg-white/20`}
                title="بستن"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Messages Area */}
          <div
            className={`flex-1 overflow-y-auto p-4 space-y-3 ${chatBg} custom-scrollbar`}
            onClick={(e) => e.stopPropagation()}
          >
            {error && (
              <div className="bg-gold-700/10 border border-gold-700/30 text-gold-400 p-3 rounded-xl text-sm text-center animate-fade-in">
                {error}
              </div>
            )}

            {messages.map((msg, i) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === 'user' ? 'justify-start' : 'justify-end'} animate-fade-in-up`}
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <div
                  className={`max-w-[85%] p-3 rounded-2xl text-sm leading-relaxed relative ${msg.role === 'user' ? `${messageUserBg} text-text-primary rounded-br-md border border-border-gold/30` : `${messageBotBg} text-text-primary rounded-bl-md border`}`}
                >
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                  <span
                    className={`absolute bottom-1 text-[10px] opacity-50 ${msg.role === 'user' ? 'left-3' : 'right-3'}`}
                  >
                    {formatTime(msg.timestamp)}
                  </span>
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-end">
                <div className={`${messageBotBg} p-3 rounded-2xl rounded-bl-md border`}>
                  <div className="flex gap-1.5">
                    <div className="w-2 h-2 bg-gold-400 rounded-full animate-bounce bounce-delay-0" />
                    <div className="w-2 h-2 bg-gold-400 rounded-full animate-bounce bounce-delay-150" />
                    <div className="w-2 h-2 bg-gold-400 rounded-full animate-bounce bounce-delay-300" />
                  </div>
                </div>
              </div>
            )}

            {showSuggestions && messages.length <= 2 && (
              <div className="space-y-2 pt-2 animate-fade-in">
                <p className="text-[11px] text-text-secondary text-center">پیشنهادهای ما:</p>
                <div className="grid grid-cols-1 gap-2">
                  {SUGGESTED_QUESTIONS.slice(0, 3).map((q, i) => (
                    <button
                      key={i}
                      onClick={() => handleSuggestedClick(q)}
                      className="w-full text-left bg-background-tertiary/50 border border-border-gold/20 text-text-secondary p-2.5 rounded-xl text-xs hover:bg-background-tertiary/80 hover:border-border-gold/40 hover:text-text-primary transition-all truncate"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="border-t border-border-gold/30 p-3 bg-background-secondary flex gap-2 flex-shrink-0">
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="سوال خود را درباره مالیات، حسابداری یا قوانین بپرسید..."
              className={`flex-1 ${chatInputBg} border border-border-gold/40 text-text-primary p-2.5 rounded-xl text-sm focus:outline-none focus:border-gold-400 focus:ring-2 focus:ring-gold-400/20 placeholder:text-text-tertiary transition-all`}
              disabled={loading}
            />
            <button
              onClick={handleSend}
              disabled={loading || !input.trim()}
              className="bg-gradient-to-l from-gold-400 to-gold-500 text-background-primary px-4 py-2.5 rounded-xl text-sm font-bold hover:shadow-gold-md disabled:opacity-50 disabled:cursor-not-allowed transition-all flex-shrink-0"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19V5m0 0l-7 7m7-7l7 7" />
              </svg>
            </button>
          </div>

          <div className="text-center py-2 text-[10px] text-text-tertiary bg-background-secondary/50">
            سامانه هوشمند پاسخگویی آیان تراز
          </div>
        </div>
      )}

      {/* Backdrop Overlay */}
      {open && (
        <div
          className="fixed inset-0 z-[55] bg-black/30 backdrop-blur-sm transition-opacity duration-300"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}
    </>
  );
}
