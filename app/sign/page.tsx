'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';

const SignDocument = dynamic(() => import('@/views/SignDocument'), { ssr: false });

export default function SignPage() {
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    // Extract token from URL path: /sign/{token}/ or /sign/{token}
    const parts = window.location.pathname.split('/').filter(Boolean);
    const signIndex = parts.indexOf('sign');
    if (signIndex !== -1 && parts[signIndex + 1]) {
      setToken(parts[signIndex + 1]);
    }
  }, []);

  if (!token) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return <SignDocument token={token} />;
}
