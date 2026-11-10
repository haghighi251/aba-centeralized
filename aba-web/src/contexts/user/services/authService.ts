// src/lib/auth/authService.ts
import axios, { AxiosError } from "axios";
import {
  LoginData,
  LoginResponseSchema,
} from "@/contexts/user/types/login.schema";
import { BFFUrlRouteMapping } from "@/shared/types/BFFUrlRouteMapping";
import { API_REQUEST_TIMEOUT_MAPPING } from "@/shared/types/apiRequestTimeOutMapping";
import { logger } from "@/contexts/shared/utils/logger";
import { ITokens } from "@/contexts/user/types/tokens";

// Server-side only (NextAuth authorize): inside Docker, reach the API by service name.
const BASE_URL =
  process.env.API_INTERNAL_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? "";
const LOGIN_API_URL = `${BASE_URL}${BFFUrlRouteMapping.USER_LOGIN}`;
const CSRF_TOKEN_URL = `${BASE_URL}/auth/csrf-token`;

export interface ILoginResult {
  user: { id: string; name: string; email: string; role: string; companyId: string };
  tokens: ITokens;
}

/**
 * Fetches a fresh CSRF token and its associated signed cookie from the backend.
 * Used server-side (e.g. inside NextAuth authorize) where the browser cookie jar
 * is not available to forward automatically.
 */
async function fetchServerSideCsrf(): Promise<{ token: string; cookieHeader: string }> {
  try {
    const csrfResponse = await axios.get<{ data: string }>(CSRF_TOKEN_URL, {
      timeout: API_REQUEST_TIMEOUT_MAPPING.TEN_SECONDS,
    });
    const token = csrfResponse.data.data;
    const setCookies: string[] = csrfResponse.headers["set-cookie"] ?? [];
    const csrfCookieEntry = setCookies.find((c) => c.startsWith("_csrf=")) ?? "";
    // Keep only the name=value part (strip Set-Cookie attributes)
    const cookieHeader = csrfCookieEntry.split(";")[0];
    return { token, cookieHeader };
  } catch {
    throw new Error("service-unreachable");
  }
}

/**
 * Authenticate against the backend.
 * Throws descriptive errors on failure; logs safely.
 */
export async function loginWithCredentials(
  email: string,
  password: string,
): Promise<ILoginResult> {
  try {
    // This function runs server-side (inside NextAuth authorize). The browser's
    // _csrf cookie is not forwarded in server-to-server requests, so we obtain a
    // fresh CSRF token/cookie pair directly from the backend before logging in.
    const { token: csrfToken, cookieHeader } = await fetchServerSideCsrf();

    const { data: rawData } = await axios.post(
      LOGIN_API_URL,
      { email, password },
      {
        headers: {
          "Content-Type": "application/json",
          "x-csrf-token": csrfToken,
          ...(cookieHeader ? { Cookie: cookieHeader } : {}),
        },
        timeout: API_REQUEST_TIMEOUT_MAPPING.TEN_SECONDS,
      },
    );

    // Validate the response shape at runtime
    const parsed = LoginResponseSchema.safeParse(rawData);

    if (!parsed.success) {
      logger.error({
        message: "Login response validation failed",
        issues: parsed.error.issues,
      });
      throw new Error("Invalid server response");
    }

    const response = parsed.data;

    if (!response.success || !response.data) {
      // Backend returned a controlled error (wrong password, etc.)
      throw new Error(response.error ?? "Invalid credentials");
    }

    return {
      user: response.data.user,
      tokens: response.data.tokens,
    };
  } catch (error) {
    if (error instanceof AxiosError) {
      logger.error({
        message: "Network or backend error: " + error.message,
        status: error.response?.status,
        url: error.config?.url,
      });

      const status = error.response?.status;

      if (status === 401) throw new Error("invalid-credentials");
      if (status === 400) throw new Error("validation-error");
      if (status === 0 || error.code === "ECONNREFUSED") throw new Error("service-unreachable");

      throw new Error("service-unavailable");
    }

    // Re-throw our own already structured errors
    if (error instanceof Error) {
      throw error;
    }

    throw new Error("unexpected-error");
  }
}
