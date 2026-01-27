'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type AuthPayload = {
  access_token: string;
  user: {
    id: string;
    name: string;
    username: string;
    email: string;
    avatarMimeType?: string | null;
  };
};

const decodeBase64Url = (value: string) => {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
  const json = atob(padded);
  return JSON.parse(json) as AuthPayload;
};

export default function GoogleCallbackPage() {
  const router = useRouter();
  const login = useAuthStore((state) => state.login);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const hash = window.location.hash || '';
    const params = new URLSearchParams(hash.replace(/^#/, ''));
    const data = params.get('data');

    if (!data) {
      setError('Nao foi possivel concluir o login com Google.');
      return;
    }

    try {
      const payload = decodeBase64Url(data);
      if (!payload?.access_token || !payload?.user) {
        throw new Error('Invalid payload');
      }

      login(payload.user, payload.access_token);
      document.cookie = `token=${payload.access_token}; path=/; max-age=86400; SameSite=Strict`;
      window.history.replaceState(null, '', '/auth/google/callback');
      router.replace('/dashboard');
    } catch (err) {
      setError('Nao foi possivel concluir o login com Google.');
    }
  }, [login, router]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <Card className="w-full max-w-md border-border/60 bg-card/80 shadow-2xl shadow-black/10 backdrop-blur">
        <CardHeader>
          <CardTitle className="text-2xl">Conectando sua conta</CardTitle>
        </CardHeader>
        <CardContent>
          {error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : (
            <p className="text-sm text-muted-foreground">Finalizando o login com Google...</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
