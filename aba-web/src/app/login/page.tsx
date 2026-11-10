'use client';
import React, { useState, FormEvent } from 'react';
import { signIn, getSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useTranslation, Trans } from 'react-i18next';
import Link from 'next/link';
import Stack from '@/components/Stack/Stack';
import Box from '@/components/Box/Box';
import TextField from '@/components/TextField/TextField';
import Button from '@/components/Button/Button';
import Alert from '@/components/Alert/Alert';
import Paper from '@/components/Paper/Paper';
import { UrlMapper } from '@/shared/types/URLMapper';

// Each error code maps to a translation key prefix.
// The page renders <prefix>-message and optionally <prefix>-hint.
const ERROR_KEY_MAP: Record<string, string> = {
  'invalid-credentials': 'login-err-credentials',
  'validation-error':    'login-err-validation',
  'service-unreachable': 'login-err-unreachable',
  'service-unavailable': 'login-err-unavailable',
  'invalid-server-response': 'login-err-server',
  'CredentialsSignin':   'login-err-credentials', // NextAuth null-return fallback
};

function errorKey(code: string): string {
  return ERROR_KEY_MAP[code] ?? 'login-err-unexpected';
}

export default function LoginPage() {
  const router = useRouter();
  const { t } = useTranslation();

  const [isLoading, setIsLoading] = useState(false);
  const [errorCode, setErrorCode] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorCode(null);
    setIsLoading(true);

    const form = new FormData(e.currentTarget);
    const email = (form.get('email') as string).trim();
    const password = form.get('password') as string;

    if (!email || !password) {
      setErrorCode('fields-required');
      setIsLoading(false);
      return;
    }

    try {
      const result = await signIn('credentials', {
        redirect: false,
        email,
        password,
      });

      if (!result) {
        setErrorCode('unexpected-error');
        return;
      }

      if (result.error) {
        setErrorCode(result.error);
        return;
      }

      const session = await getSession();
      const role      = (session?.user as any)?.role as string | undefined;
      const companyId = (session?.user as any)?.companyId as string | undefined;

      if (role === 'SUPER_ADMIN' || role === 'ADMIN') {
        router.push(UrlMapper.ADMIN);
      } else if (companyId && ['BUSINESS_OWNER', 'BUSINESS_ADMIN', 'BUSINESS_MEMBER'].includes(role ?? '')) {
        router.push(`/company/${companyId}`);
      } else {
        router.push(UrlMapper.HOME);
      }
      router.refresh();
    } catch {
      setErrorCode('unexpected-error');
    } finally {
      setIsLoading(false);
    }
  };

  const key = errorCode ? errorKey(errorCode) : null;

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 2,
      }}
    >
      <Paper elevation={3} sx={{ p: 4, width: '100%', maxWidth: 400 }}>
        <Stack spacing={3}>
          <Box component="h1" sx={{ m: 0, fontSize: '1.5rem', fontWeight: 600 }}>
            {t('login-title')}
          </Box>

          {errorCode === 'fields-required' && (
            <Alert role="error" onDismiss={() => setErrorCode(null)}>
              {t('login-fields-required')}
            </Alert>
          )}

          {key && errorCode !== 'fields-required' && (
            <Alert role="error" onDismiss={() => setErrorCode(null)}>
              <strong>{t(`${key}-message`)}</strong>
              <Box component="p" sx={{ m: 0, mt: 0.5, fontSize: '0.875rem' }}>
                {/* Trans lets us embed links inside translated strings */}
                <Trans
                  i18nKey={`${key}-hint`}
                  components={{
                    registerLink: <Link href={UrlMapper.REGISTER} />,
                    supportLink: <a href="mailto:support@example.com" />,
                  }}
                />
              </Box>
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit as unknown as React.FormEventHandler}>
            <Stack spacing={2}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <label htmlFor="email">{t('email')}</label>
                <TextField
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  disabled={isLoading}
                />
              </Box>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <label htmlFor="password">{t('password')}</label>
                  <Link href={UrlMapper.FORGOT_PASSWORD} style={{ fontSize: '0.8rem' }}>
                    {t('forgot-password-link')}
                  </Link>
                </Box>
                <TextField
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  disabled={isLoading}
                />
              </Box>

              <Button
                type="submit"
                disabled={isLoading}
                isProcessing={isLoading}
                sx={{ mt: 1 }}
              >
                {isLoading ? t('login-loading') : t('login-submit')}
              </Button>
            </Stack>
          </Box>

          <Box sx={{ textAlign: 'center', fontSize: '0.875rem' }}>
            <Trans
              i18nKey="login-no-account"
              components={{ registerLink: <Link href={UrlMapper.REGISTER} /> }}
            />
          </Box>
        </Stack>
      </Paper>
    </Box>
  );
}
