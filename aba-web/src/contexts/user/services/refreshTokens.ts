import axios, { AxiosError } from "axios";
import { ITokens } from "../types/tokens";
import { RefreshResponseSchema } from "@/shared/types/refreshResponse.schema";
import { logger } from "@/contexts/shared/utils/logger";
import { BFFUrlRouteMapping } from "@/shared/types/BFFUrlRouteMapping";

export async function refreshTokens(
  currentRefreshToken: string,
): Promise<ITokens> {
  try {
    const { data: rawData } = await axios.post(
      `${process.env.API_INTERNAL_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL}${BFFUrlRouteMapping.REFRESH_TOKEN}`,
      { refreshToken: currentRefreshToken },
      {
        headers: { "Content-Type": "application/json" },
        timeout: 10_000,
      },
    );

    const parsed = RefreshResponseSchema.safeParse(rawData);
    if (!parsed.success) {
      logger.error({
        message: "Token refresh response validation failed",
        issues: parsed.error.issues,
      });
      throw new Error("Invalid server response");
    }

    const response = parsed.data;
    if (!response.success || !response.data) {
      throw new Error(response.error ?? "Token refresh failed");
    }

    return response.data;
  } catch (error) {
    if (error instanceof AxiosError) {
      logger.error({
        message:
          "Network or backend error during token refresh: " + error.message,
        status: error.response?.status,
        url: error.config?.url,
      });
      throw new Error("Token refresh failed.");
    }
    if (error instanceof Error) throw error;
    throw new Error("An unexpected error occurred during token refresh.");
  }
}
