"use client";
import React, { useState, FormEvent } from "react";
import { useTranslation } from "react-i18next";
import Link from "next/link";
import Box from "@/components/Box/Box";
import Stack from "@/components/Stack/Stack";
import TextField from "@/components/TextField/TextField";
import Button from "@/components/Button/Button";
import Alert from "@/components/Alert/Alert";
import Paper from "@/components/Paper/Paper";
import { UrlMapper } from "@/shared/types/URLMapper";
import { requestPasswordReset } from "@/contexts/user/services/passwordResetService";

export default function ForgotPasswordPage() {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    const email = (new FormData(e.currentTarget).get("email") as string).trim();
    if (!email) {
      setError(t("email-required"));
      setIsLoading(false);
      return;
    }

    try {
      await requestPasswordReset(email);
      setSubmitted(true);
    } catch {
      // Show generic message — never reveal whether the email exists
      setSubmitted(true);
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
            {t("forgot-password-title")}
          </Box>

          {submitted ? (
            <Alert role="success">
              <strong>{t("forgot-password-sent-title")}</strong>
              <Box component="p" sx={{ m: 0, mt: 0.5, fontSize: "0.875rem" }}>
                {t("forgot-password-sent-hint")}
              </Box>
            </Alert>
          ) : (
            <>
              <Box sx={{ fontSize: "0.9rem", color: "text.secondary" }}>
                {t("forgot-password-description")}
              </Box>

              {error && (
                <Alert role="error" onDismiss={() => setError(null)}>
                  {error}
                </Alert>
              )}

              <Box component="form" onSubmit={handleSubmit as unknown as React.FormEventHandler}>
                <Stack spacing={2}>
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                    <label htmlFor="email">{t("email")}</label>
                    <TextField
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
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
                    {isLoading ? t("sending") : t("forgot-password-submit")}
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
