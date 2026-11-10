import axios, { AxiosError } from "axios";

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

export async function requestPasswordReset(email: string): Promise<void> {
  try {
    await axios.post(`${BASE_URL}/auth/forgot-password`, { email });
  } catch (err) {
    if (err instanceof AxiosError && err.response?.status === 400) {
      throw new Error("invalid-email");
    }
    throw new Error("service-unavailable");
  }
}

export async function confirmPasswordReset(
  token: string,
  password: string,
): Promise<void> {
  try {
    await axios.post(`${BASE_URL}/auth/reset-password`, { token, password });
  } catch (err) {
    if (err instanceof AxiosError) {
      const status = err.response?.status;
      if (status === 400) throw new Error("invalid-token");
    }
    throw new Error("service-unavailable");
  }
}
