"use client";
import React, { useState, FormEvent, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Box from "@/components/Box/Box";
import Stack from "@/components/Stack/Stack";
import TextField from "@/components/TextField/TextField";
import Button from "@/components/Button/Button";
import Alert from "@/components/Alert/Alert";
import Paper from "@/components/Paper/Paper";
import { UrlMapper } from "@/shared/types/URLMapper";
import { confirmPasswordReset } from "@/contexts/user/services/passwordResetService";

export default function ResetPasswordPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) setError(t("reset-password-missing-token"));
  }, [token, t]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    const form = new FormData(e.currentTarget);
    const password = form.get("password") as string;
    const confirm = form.get("confirmPassword") as string;

    if (password !== confirm) {
      setError(t("passwords-do-not-match"));
      setIsLoading(false);
      return;
    }

    if (password.length < 8) {
      setError(t("password-min-length"));
      setIsLoading(false);
      return;
    }

    try {
      await confirmPasswordReset(token, password);
      setSuccess(true);
      setTimeout(() => router.push(UrlMapper.LOGIN), 3000);
    } catch (err) {
      const code = err instanceof Error ? err.message : "service-unavailable";
      if (code === "invalid-token") {
        setError(t("reset-password-invalid-token"));
      } else {
        setError(t("reset-password-error"));
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        p: 2,
      }}
    >
      <Paper elevation={3} sx={{ p: 4, width: "100%", maxWidth: 400 }}>
        <Stack spacing={3}>
          <Box component="h1" sx={{ m: 0, fontSize: "1.5rem", fontWeight: 600 }}>
            {t("reset-password-title")}
          </Box>

          {success ? (
            <Alert role="success">
              <strong>{t("reset-password-success-title")}</strong>
              <Box component="p" sx={{ m: 0, mt: 0.5, fontSize: "0.875rem" }}>
                {t("reset-password-success-hint")}
              </Box>
            </Alert>
          ) : (
            <>
              {error && (
                <Alert role="error" onDismiss={() => setError(null)}>
                  {error}
                </Alert>
              )}

              <Box component="form" onSubmit={handleSubmit as unknown as React.FormEventHandler}>
                <Stack spacing={2}>
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                    <label htmlFor="password">{t("password")}</label>
                    <TextField
                      id="password"
                      name="password"
                      type="password"
                      autoComplete="new-password"
                      required
                      disabled={isLoading || !token}
                    />
                  </Box>

                  <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                    <label htmlFor="confirmPassword">{t("repeat-password")}</label>
                    <TextField
                      id="confirmPassword"
                      name="confirmPassword"
                      type="password"
                      autoComplete="new-password"
                      required
                      disabled={isLoading || !token}
                    />
                  </Box>

                  <Button
                    type="submit"
                    disabled={isLoading || !token}
                    isProcessing={isLoading}
                    sx={{ mt: 1 }}
                  >
                    {isLoading ? t("saving") : t("reset-password-submit")}
                  </Button>
                </Stack>
              </Box>
            </>
          )}

          <Box sx={{ textAlign: "center", fontSize: "0.875rem" }}>
            <Link href={UrlMapper.LOGIN}>{t("back-to-login")}</Link>
          </Box>
        </Stack>
      </Paper>
    </Box>
  );
}
