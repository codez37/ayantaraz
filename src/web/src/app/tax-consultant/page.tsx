'use client';

import { useState, useRef, useEffect } from 'react';
import { api } from '@/lib/api';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  step?: string;
  referencedArticles?: string[];
}

interface SendResponse {
  sessionId: string;
  type: 'SEARCH' | 'CALC' | 'PROCEDURE' | 'UNKNOWN';
  answer?: string;
  referencedArticles?: string[];
}

interface StartResponse {
  sessionId: string;
}

export default function TaxConsultantPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: 'سلام! به موتور هوشمند مالیاتی خوش آمدید. هر سوالی درباره قانون مالیاتهای مستقیم دارید بپرسید.',
      step: 'initial',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    api
      .post<StartResponse>('/tax-engine/start', {})
      .then((res) => setSessionId(res.sessionId))
      .catch(() => {});
  }, []);

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const userMessage = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);
    try {
      const res = await api.post<SendResponse>('/tax-engine/query', {
        message: userMessage,
        sessionId: sessionId,
      });
      if (res.sessionId) {
        setSessionId(res.sessionId);
      }
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: res.answer ?? '', referencedArticles: res.referencedArticles },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'متأسفم، خطایی در ارتباط با سرور رخ داد. لطفاً دوباره تلاش کنید.',
          step: 'error',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    setSessionId(null);
    setMessages([
      {
        role: 'assistant',
        content: 'سلام! به موتور هوشمند مالیاتی خوش آمدید. هر سوالی درباره قانون مالیاتهای مستقیم دارید بپرسید.',
        step: 'initial',
      },
    ]);
    try {
      const res = await api.post<StartResponse>('/tax-engine/start', {});
      setSessionId(res.sessionId);
    } catch {}
  };

  return (
    <div className="min-h-screen bg-[#121212]" dir="rtl">
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-black text-gold-gradient">پرسش و پاسخ مالیاتی</h1>
          <p className="text-gray-400 mt-2">پاسخگویی دقیق بر اساس قانون مالیاتهای مستقیم ایران</p>
        </div>
        <div className="bg-[#1A1A1A] rounded-2xl border border-[#C9A227]/20 overflow-hidden shadow-lg shadow-black/30">
          <div className="bg-gradient-to-l from-[#C9A227] to-[#FFA000] p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-black/20 rounded-full flex items-center justify-center text-xl">⚖️</div>
              <div>
                <h2 className="font-bold text-[#121212]">سامانه پاسخگویی</h2>
                <p className="text-sm text-[#121212]/70">قانون مالیاتهای مستقیم</p>
              </div>
            </div>
            <button
              onClick={handleReset}
              className="text-[#121212]/70 hover:text-[#121212] text-sm px-3 py-1 rounded-lg bg-black/10 hover:bg-black/20 transition"
            >
              شروع جدید
            </button>
          </div>

          <div className="h-[50vh] max-h-[500px] overflow-y-auto p-4 space-y-4 bg-[#121212]">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-start' : 'justify-end'}`}>
                <div
                  className={`max-w-[85%] p-4 rounded-2xl text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-[#1A1A1A] border border-[#C9A227]/10 text-gray-200 rounded-br-md'
                      : msg.step === 'error'
                        ? 'bg-red-900/20 border border-red-500/20 text-gray-200 rounded-bl-md'
                        : 'bg-[#1C1C1C] border border-[#C9A227]/10 text-gray-200 rounded-bl-md shadow-sm font-medium'
                  }`}
                >
                  <div className="whitespace-pre-wrap overflow-x-auto custom-scrollbar">{msg.content}</div>
                  {msg.referencedArticles && msg.referencedArticles.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-[#C9A227]/10">
                      <div className="text-xs text-gray-500 mb-1">مواد قانونی مرتبط:</div>
                      <div className="flex flex-wrap gap-1.5">
                        {msg.referencedArticles.map((art, j) => (
                          <span
                            key={j}
                            className="px-2 py-0.5 bg-[#C9A227]/20 text-[#C9A227] rounded text-xs font-medium"
                          >
                            ماده {art}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-end">
                <div className="bg-[#1C1C1C] border border-[#C9A227]/10 p-4 rounded-2xl rounded-bl-md">
                  <div className="flex gap-1.5">
                    <div className="w-2 h-2 bg-[#C9A227] rounded-full animate-bounce bounce-delay-0" />
                    <div className="w-2 h-2 bg-[#C9A227] rounded-full animate-bounce bounce-delay-150" />
                    <div className="w-2 h-2 bg-[#C9A227] rounded-full animate-bounce bounce-delay-300" />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="border-t border-[#C9A227]/10 p-4 bg-[#1A1A1A]">
            <div className="flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="سوال خود را بپرسید..."
                className="flex-1 bg-[#121212] border border-[#C9A227]/20 text-gray-200 p-3 rounded-xl text-sm focus:outline-none focus:border-[#C9A227] placeholder-gray-600"
                disabled={loading}
              />
              <button
                onClick={handleSend}
                disabled={loading || !input.trim()}
                className="bg-gradient-to-l from-[#C9A227] to-[#FFA000] text-[#121212] font-bold px-6 py-3 rounded-xl text-sm hover:shadow-lg hover:shadow-[#C9A227]/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                ارسال
              </button>
            </div>
            <p className="text-xs text-gray-600 mt-2 text-center">
              پاسخ‌ها صرفاً بر اساس قانون مالیاتهای مستقیم ارائه می‌شوند و جایگزین مشاوره حقوقی تخصصی نیستند
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
