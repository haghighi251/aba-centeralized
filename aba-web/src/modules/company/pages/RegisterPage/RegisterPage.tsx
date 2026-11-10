"use client";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import React, {
  FormEventHandler,
  useCallback,
  useEffect,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import { UrlMapper } from "@/shared/types/URLMapper";
import Link from "next/link";
import Box from "@/components/Box/Box";
import Stack from "@/components/Stack/Stack";
import Alert from "@/components/Alert/Alert";
import RegisterForm from "../../components/RegisterForm/RegisterForm";
import {
  hasMinLengthOf8,
  isValidEmailAddress,
  isValidWebsiteUrl,
} from "@/modules/shared/forms/FormsValidation";
import {
  RegisterCompanyFields,
  RegisterCompanyFieldValues,
} from "../../types/types";
import { useAddNewCompany } from "@/modules/company/hooks/useAddNewCompany";
import { useCsrfToken } from "@/shared/hooks/useCsrfToken";
import {
  ToastType,
  useToastContext,
} from "@/modules/shared/components/ToastContextProvider/ToastContextProvider";
import { getFormValues } from "@/modules/shared/forms/FormUtil";
import {
  IRegisterCompanySchema,
  TRegisterCompany,
} from "@/shared/types/company/addNewCompany";
import { ZodError } from "zod";
import Paper from "@/components/Paper/Paper";

const RegisterPage = () => {
  // Specific states for form validation errors and submission status
  const [formErrors, setFormErrors] = useState<Array<string>>([]);
  const [isFormSubmitted, setIsFormSubmitted] = useState(false);

  // Custom hooks and contexts
  const { t } = useTranslation();
  const { data: session } = useSession();
  const {
    token: csrfToken,
    loading: tokenIsLoading,
    error: csrfTokenError,
  } = useCsrfToken();
  const { createToast, deleteAllToasts } = useToastContext();
  const {
    isAddCompanyLoading,
    isAddCompanySuccess,
    isAddCompanyError,
    error: addNewCompanyError,
    addCompanyMutation,
  } = useAddNewCompany();

  // Redirect to home if user is already authenticated
  useEffect(() => {
    if (session) redirect(UrlMapper.HOME);
  }, [session]);

  // Handle CSRF token loading and errors
  useEffect(() => {
    if (tokenIsLoading) return;
    if (csrfToken === null && csrfTokenError === null) return;

    const isValidToken = typeof csrfToken === "string" && csrfToken.length > 0;
    const isValidCsrfTokenError = csrfTokenError instanceof Error && csrfTokenError !== null;

    if (isValidCsrfTokenError || !isValidToken) {
      createToast({
        message: t("error-in-fetching-csrf-token"),
        type: ToastType.Danger,
      });
      return;
    }
  }, [csrfToken, tokenIsLoading, csrfTokenError]);

  // Clear toasts when form is submitted to avoid confusion with previous messages(CSRF token error)
  // If in the future, we are going to show validation errors as toasts, we have to update this useEffect
  useEffect(() => {
    if (isFormSubmitted) {
      deleteAllToasts();
    }
  }, [isFormSubmitted]);

  // Sync form submission state with loading state of the mutation
  useEffect(() => {
    setIsFormSubmitted(isAddCompanyLoading);
  }, [isAddCompanyLoading]);

  // Handle errors from the add company mutation
  useEffect(() => {
    if (addNewCompanyError) {
      setIsFormSubmitted(false);
    }
  }, [addNewCompanyError]);

  const onHandleFormSubmit: FormEventHandler<HTMLFormElement> = useCallback(
    (event) => {
      event.preventDefault();
      setIsFormSubmitted(true);
      setFormErrors([]);
      deleteAllToasts();

      const values = getFormValues(
        event,
      ) as Partial<RegisterCompanyFieldValues>;

      if (
        values[RegisterCompanyFields.Password] !==
        values[RegisterCompanyFields.RePassword]
      ) {
        setFormErrors((prev) => [...prev, t("passwords-do-not-match")]);
        return;
      }

      // Derive company username from email (not shown to user)
      const email = values[RegisterCompanyFields.Email] ?? "";
      const derivedUsername = email
        .split("@")[0]
        .toLowerCase()
        .replace(/[^a-z0-9_]/g, "_")
        .slice(0, 20)
        .padEnd(3, "_");
      const valuesToSubmit = { ...values, username: derivedUsername };

      try {
        IRegisterCompanySchema.parse(valuesToSubmit);
      } catch (error) {
        if (error instanceof ZodError) {
          error.errors.forEach((err) => {
            setFormErrors((prev) => [...prev, err.message]);
          });
        }
        console.error("Validation error:", error);
        return;
      }

      addCompanyMutation({ ...valuesToSubmit } as TRegisterCompany, csrfToken!);
    },
    [addCompanyMutation, csrfToken, t],
  );

  return (
    // Outer Box – centers content, limits width, adds background and spacing
    <Paper
      sx={{
        maxWidth: "384px",
        margin: "0 auto",
        marginTop: "2.5rem",
        padding: { xs: "0.5rem", md: "1.25rem" },
      }}
      elevation={2} // optional: adds a subtle shadow
    >
      {/* Stack groups the alerts and the form with consistent gap */}
      <Stack spacing={3}>
        {isAddCompanyError && (
          <Alert role="warning" title="Notice" text={addNewCompanyError} />
        )}

        {formErrors.length > 0 && (
          <Alert role="error" title="Error" text={formErrors} />
        )}

        {isAddCompanySuccess && (
          <Alert
            role="success"
            title={t("user-has-been-registered-successfully")}
          >
            <Box>
              <p className="font-medium"></p>
              <p className="font-medium">{t("please-go-to-the-login-page")}</p>
              <Link href={UrlMapper.LOGIN}>{t("login")}</Link>
            </Box>
          </Alert>
        )}

        {!isAddCompanySuccess && (
          <RegisterForm
            onHandleSubmit={onHandleFormSubmit}
            addCompanyIsLoading={isAddCompanyLoading}
            tokenIsLoading={tokenIsLoading}
          />
        )}
      </Stack>
    </Paper>
  );
};

RegisterPage.isValid = (
  values: Partial<RegisterCompanyFieldValues>,
): values is RegisterCompanyFieldValues => {
  return (
    isValidEmailAddress(values[RegisterCompanyFields.Email]) &&
    isValidWebsiteUrl(values[RegisterCompanyFields.Website]) &&
    hasMinLengthOf8(values[RegisterCompanyFields.Password]) &&
    hasMinLengthOf8(values[RegisterCompanyFields.RePassword])
  );
};

export default RegisterPage;
