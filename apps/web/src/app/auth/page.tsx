'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useCsrf } from '@/hooks/useCsrf';
import { useGlassmorphicTheme } from '@/providers/GlassmorphicThemeProvider';

export default function AuthPage() {
  const { theme } = useGlassmorphicTheme();
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [step, setStep] = useState<'phone' | 'otp' | 'profile'>('phone');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'error' | 'success' | 'info'>('info');
  const [isLoading, setLoading] = useState(false);
  const [timer, setTimer] = useState(300);
  const [resendCount, setResendCount] = useState(0);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const { requestOtp, login } = useAuth();
  const router = useRouter();
  const codeInputs = useRef<(HTMLInputElement | null)[]>([]);
  const phoneInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (step === 'otp' && timer > 0) {
      const interval = setInterval(() => setTimer((t) => t - 1), 1000);
      return () => clearInterval(interval);
    }
  }, [step, timer]);

  const normalizePhone = (input: string): string => {
    let p = input.replace(/[^\d+]/g, '');
    if (p.startsWith('+98')) p = '0' + p.slice(3);
    else if (p.startsWith('0098')) p = '0' + p.slice(4);
    return p;
  };

  const { csrfToken } = useCsrf();

  const handleRequestOtp = async () => {
    const normalized = normalizePhone(phone);
    if (!/^09\d{9}$/.test(normalized)) {
      setMessage('شماره تلفن نامعتبر است. فرمت: 09123456789');
      setMessageType('error');
      return;
    }
    setLoading(true);
    setMessage('');
    try {
      const msg = await requestOtp(normalized, csrfToken);
      setMessage(msg);
      setMessageType('success');
      setStep('otp');
      setTimer(300);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setMessage(axiosErr.response?.data?.message || 'خطا در ارسال کد تایید');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  const handleCodeChange = (index: number, value: string) => {
    if (!/^\d?$/.test(value)) return;
    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);
    if (value && index < 5) {
      codeInputs.current[index + 1]?.focus();
    }
    if (value && index === 5) {
      setTimeout(() => handleVerify(newCode.join('')), 100);
    }
  };

  const handleCodeKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      codeInputs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async (fullCode?: string) => {
    const codeValue = fullCode || code.join('');
    if (codeValue.length !== 6) {
      setMessage('لطفاً کد ۶ رقمی را کامل وارد کنید');
      setMessageType('error');
      return;
    }
    setLoading(true);
    setMessage('');
    try {
      const isNew = await login(normalizePhone(phone), codeValue);
      if (isNew) {
        setStep('profile');
      } else {
        router.push('/dashboard');
      }
    } catch (err: unknown) {
      const error = err as { message?: string };
      const msg = error.message || 'خطا در بررسی کد';
      setMessage(msg);
      setMessageType('error');
      setCode(['', '', '', '', '', '']);
      setTimeout(() => codeInputs.current[0]?.focus(), 100);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCount >= 3) {
      setMessage('حداکثر تعداد ارسال مجدد. ۱۰ دقیقه صبر کنید.');
      setMessageType('error');
      return;
    }
    setResendCount((c) => c + 1);
    setTimer(300);
    setMessage('');
    const normalized = normalizePhone(phone);
    setLoading(true);
    try {
      const msg = await requestOtp(normalized);
      setMessage(msg);
      setMessageType('success');
      setCode(['', '', '', '', '', '']);
      setTimeout(() => codeInputs.current[0]?.focus(), 100);
    } catch (err: unknown) {
      const error = err as { message?: string };
      setMessage(error.message || 'خطا در ارسال مجدد');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  const handleProfileComplete = async () => {
    if (!firstName.trim()) {
      setMessage('لطفاً نام خود را وارد کنید');
      setMessageType('error');
      return;
    }
    setLoading(true);
    try {
      await api.patch('/users/profile', { firstName: firstName.trim(), lastName: lastName.trim() });
      router.push('/dashboard');
    } catch (err: unknown) {
      const error = err as { message?: string };
      setMessage(error.message || 'خطا در ذخیره اطلاعات');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  // Theme-based styling
  const isDark = theme === 'dark';
  const cardBg = isDark ? 'bg-background-secondary/80 backdrop-blur-xl' : 'bg-background-primary/90';
  const cardBorder = isDark ? 'border-border-gold' : 'border-border-gold/50';
  const inputBg = isDark ? 'bg-background-tertiary' : 'bg-surface/60';
  const inputBorder = isDark ? 'border-border-gold/30' : 'border-border-gold/40';
  const textColor = isDark ? 'text-text-primary' : 'text-text-primary';
  const textMuted = isDark ? 'text-text-secondary' : 'text-text-tertiary';

  const showMessage = () => {
    if (!message) return null;
    const colors = {
      error: 'text-red-400 bg-red-900/20 border-red-800/30',
      success: 'text-green-400 bg-green-900/20 border-green-800/30',
      info: 'text-gold-400 bg-gold-900/10 border-gold-800/20',
    };
    return (
      <div className={`mt-4 p-3 rounded-lg text-center text-sm border ${colors[messageType]} animate-fade-in`}>
        {message}
      </div>
    );
  };

  return (
    <div className="min-h-[calc(100vh-200px)] flex items-center justify-center px-4 py-12 bg-background-primary">
      <div className="w-full max-w-md">
        {/* Auth Card with Glassmorphic Effect */}
        <div className={`glass-card ${cardBg} ${cardBorder} p-8 rounded-3xl shadow-gold-lg animate-reveal-up`}>
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-gold-400 to-gold-600 mb-4 shadow-gold-md">
              <span className="text-3xl font-black text-background-primary">آ</span>
            </div>
            <h1 className="text-2xl font-black text-gradient-gold mb-2">
              {step === 'phone' ? 'ورود / ثبت‌نام' : step === 'otp' ? 'تایید کد' : 'تکمیل پروفایل'}
            </h1>
            <p className={`text-sm ${textMuted}`}>
              {step === 'phone'
                ? 'شماره تلفن خود را وارد کنید. کد تایید پیامک می‌شود.'
                : step === 'otp'
                  ? `کد ۶ رقمی ارسال شده به ${normalizePhone(phone).slice(0, 4)}***${normalizePhone(phone).slice(7)} را وارد کنید`
                  : 'نام خود را وارد کنید'}
            </p>
          </div>

          {/* Phone Step */}
          {step === 'phone' && (
            <>
              <input
                ref={phoneInputRef}
                type="tel"
                placeholder="شماره تلفن (مثال: 09123456789)"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className={`w-full ${inputBg} ${inputBorder} ${textColor} p-4 rounded-xl text-left tracking-wide mb-4 focus:outline-none focus:border-gold-400 focus:ring-2 focus:ring-gold-400/20 transition-all`}
                dir="ltr"
                onKeyDown={(e) => e.key === 'Enter' && handleRequestOtp()}
                autoFocus
              />
              <p className={`text-xs ${textMuted} mb-6 text-center`}>کد تایید به این شماره ارسال می‌شود</p>
              <button
                onClick={handleRequestOtp}
                disabled={isLoading}
                className="w-full bg-gradient-to-l from-gold-400 to-gold-500 text-background-primary py-4 rounded-xl font-bold text-lg hover:shadow-gold-md active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <div className="flex gap-1.5">
                      <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce bounce-delay-0" />
                      <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce bounce-delay-150" />
                      <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce bounce-delay-300" />
                    </div>
                    در حال ارسال...
                  </>
                ) : (
                  'دریافت کد تایید'
                )}
              </button>
              {showMessage()}
            </>
          )}

          {/* OTP Step */}
          {step === 'otp' && (
            <>
              <div className="flex justify-center gap-2 mb-6" dir="ltr">
                {code.map((digit, i) => (
                  <input
                    key={i}
                    ref={(el) => {
                      codeInputs.current[i] = el;
                    }}
                    type="text"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleCodeChange(i, e.target.value)}
                    onKeyDown={(e) => handleCodeKeyDown(i, e)}
                    className={`w-10 h-12 sm:w-12 sm:h-14 text-center text-xl sm:text-2xl font-bold ${inputBg} border ${digit ? 'border-gold-400' : inputBorder} rounded-xl focus:ring-2 focus:ring-gold-400 focus:border-gold-400 outline-none ${textColor} transition-all`}
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    disabled={isLoading}
                  />
                ))}
              </div>
              <div className="flex justify-between items-center mb-6 text-sm">
                <span className={timer > 60 ? textMuted : 'text-red-400'}>
                  {timer > 0 ? formatTime(timer) : 'منقضی شده'}
                </span>
                <button
                  onClick={handleResend}
                  disabled={timer > 0 || resendCount >= 3 || isLoading}
                  className="text-gold-400 hover:text-gold-300 disabled:text-text-tertiary disabled:cursor-not-allowed transition-colors"
                >
                  ارسال مجدد ({3 - resendCount})
                </button>
              </div>
              <button
                onClick={() => handleVerify()}
                disabled={isLoading || code.join('').length !== 6}
                className="w-full bg-gradient-to-l from-gold-400 to-gold-500 text-background-primary py-4 rounded-xl font-bold text-lg hover:shadow-gold-md active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <div className="flex gap-1.5">
                      <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce bounce-delay-0" />
                      <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce bounce-delay-150" />
                      <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce bounce-delay-300" />
                    </div>
                    در حال بررسی...
                  </>
                ) : (
                  'تایید'
                )}
              </button>
              <button
                onClick={() => {
                  setStep('phone');
                  setCode(['', '', '', '', '', '']);
                  setMessage('');
                  setTimer(300);
                }}
                className="w-full text-text-secondary p-3 mt-3 hover:text-text-primary text-sm transition-colors"
                disabled={isLoading}
              >
                تغییر شماره
              </button>
              {showMessage()}
            </>
          )}

          {/* Profile Step */}
          {step === 'profile' && (
            <>
              <input
                placeholder="نام"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className={`w-full ${inputBg} ${inputBorder} ${textColor} p-4 rounded-xl mb-3 focus:outline-none focus:border-gold-400 focus:ring-2 focus:ring-gold-400/20 transition-all`}
                autoFocus
                disabled={isLoading}
              />
              <input
                placeholder="نام خانوادگی (اختیاری)"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className={`w-full ${inputBg} ${inputBorder} ${textColor} p-4 rounded-xl mb-4 focus:outline-none focus:border-gold-400 focus:ring-2 focus:ring-gold-400/20 transition-all`}
                disabled={isLoading}
              />
              <p className={`text-xs ${textMuted} mb-6`}>این اطلاعات برای ارتباط بهتر با شماست</p>
              <button
                onClick={handleProfileComplete}
                disabled={isLoading}
                className="w-full bg-gradient-to-l from-gold-400 to-gold-500 text-background-primary py-4 rounded-xl font-bold text-lg hover:shadow-gold-md active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <div className="flex gap-1.5">
                      <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce bounce-delay-0" />
                      <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce bounce-delay-150" />
                      <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce bounce-delay-300" />
                    </div>
                    در حال ثبت...
                  </>
                ) : (
                  'ورود به پنل'
                )}
              </button>
              {showMessage()}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
