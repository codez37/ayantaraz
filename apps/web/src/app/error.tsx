'use client';

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center bg-[#0B0B0C]">
      <h1 className="text-4xl font-black text-red-400 mb-4">خطا!</h1>
      <p className="text-lg text-gray-300 mb-8">متأسفانه مشکلی پیش آمده است. لطفاً مجدداً تلاش کنید.</p>
      <button onClick={reset} className="btn-gold">
        تلاش مجدد
      </button>
    </div>
  );
}
