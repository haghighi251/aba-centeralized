import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { useServicePackageHistory } from "./useServicePackageHistory";
import * as servicePackageService from "@/modules/service-package/services/servicePackageService";

jest.mock("@/modules/service-package/services/servicePackageService");
const mockedGetHistory = servicePackageService.getServicePackageHistory as jest.Mock;

const TOKEN = "test-token";
const COMPANY_ID = "1";
const ENVIRONMENT_ID = 2;
const SERVICE_ID = 3;

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return React.createElement(QueryClientProvider, { client: qc }, children);
}

describe("useServicePackageHistory", () => {
  beforeEach(() => jest.clearAllMocks());

  it("fetches history when enabled=true and token is present", async () => {
    const mockData = { data: [], total: 0 };
    mockedGetHistory.mockResolvedValue(mockData);

    const { result } = renderHook(
      () =>
        useServicePackageHistory(COMPANY_ID, ENVIRONMENT_ID, SERVICE_ID, {}, TOKEN, true),
      { wrapper },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockData);
    expect(mockedGetHistory).toHaveBeenCalledWith(
      COMPANY_ID,
      ENVIRONMENT_ID,
      SERVICE_ID,
      {},
      TOKEN,
    );
  });

  it("is disabled when enabled=false", () => {
    const { result } = renderHook(
      () =>
        useServicePackageHistory(COMPANY_ID, ENVIRONMENT_ID, SERVICE_ID, {}, TOKEN, false),
      { wrapper },
    );

    expect(result.current.fetchStatus).toBe("idle");
    expect(mockedGetHistory).not.toHaveBeenCalled();
  });

  it("is disabled when accessToken is empty", () => {
    const { result } = renderHook(
      () =>
        useServicePackageHistory(COMPANY_ID, ENVIRONMENT_ID, SERVICE_ID, {}, "", true),
      { wrapper },
    );

    expect(result.current.fetchStatus).toBe("idle");
    expect(mockedGetHistory).not.toHaveBeenCalled();
  });

  it("exposes error when the API call fails", async () => {
    mockedGetHistory.mockRejectedValue(new Error("Server error"));

    const { result } = renderHook(
      () =>
        useServicePackageHistory(COMPANY_ID, ENVIRONMENT_ID, SERVICE_ID, {}, TOKEN, true),
      { wrapper },
    );

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("Server error");
  });
});
