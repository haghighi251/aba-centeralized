import { FetchOptions } from "@/shared/types/fetchApi";

export async function fetchApi<TResponse, TBody = unknown>({
  url,
  method = "GET",
  body,
  csrfToken,
  headers = {},
  retry = 3,
  signal,
}: FetchOptions<TBody>): Promise<TResponse> {
  const init: RequestInit = {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(headers as Record<string, string>),
    },
    signal,
  };

  if (csrfToken && method === "POST") {
    (init.headers as Record<string, string>)["x-csrf-token"] = csrfToken;
  }

  if (body && method !== "GET") {
    init.body = JSON.stringify(body);
  }

  for (let attempt = 0; attempt < retry; attempt++) {
    try {
      const response = await fetch(url, init);

      if (!response.ok) {
        const errorText = await response.json();
        throw new Error(errorText?.error);
      }

      return (await response.json()) as TResponse;
    } catch (error) {
      if (attempt < retry - 1) {
        console.warn(`Retrying request (${attempt + 1}/${retry})...`);
        continue; // Retry the request
      }
      throw error; // If we've exhausted retries, rethrow the error
    }
  }

  throw new Error("Request failed after multiple retries.");
}
