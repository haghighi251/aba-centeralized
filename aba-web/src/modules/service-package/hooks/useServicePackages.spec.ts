import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { useServicePackages } from "./useServicePackages";
import * as servicePackageService from "@/modules/service-package/services/servicePackageService";

jest.mock("@/modules/service-package/services/servicePackageService");
const mockedGetServicePackages = servicePackageService.getServicePackages as jest.Mock;

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

describe("useServicePackages", () => {
  beforeEach(() => jest.clearAllMocks());

  it("fetches and returns service packages on success", async () => {
    const mockData = {
      data: [
        {
          id: 1,
          status: "ACTIVE",
          package: { id: 1, ecosystem: "NPM", name: "express", version: "4.18.2", createdAt: "" },
          versionRange: null,
          introducedAt: "2024-01-01T00:00:00.000Z",
          deactivatedAt: null,
          alarmCount: 0,
          lastAlarmAt: null,
          serviceId: SERVICE_ID,
          packageId: 1,
          createdAt: "",
          updatedAt: "",
        },
      ],
      total: 1,
    };
    mockedGetServicePackages.mockResolvedValue(mockData);

    const { result } = renderHook(
      () => useServicePackages(COMPANY_ID, ENVIRONMENT_ID, SERVICE_ID, {}, TOKEN),
      { wrapper },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockData);
    expect(mockedGetServicePackages).toHaveBeenCalledWith(
      COMPANY_ID,
      ENVIRONMENT_ID,
      SERVICE_ID,
      {},
      TOKEN,
    );
  });

  it("is disabled when accessToken is empty", () => {
    const { result } = renderHook(
      () => useServicePackages(COMPANY_ID, ENVIRONMENT_ID, SERVICE_ID, {}, ""),
      { wrapper },
    );

    expect(result.current.fetchStatus).toBe("idle");
    expect(mockedGetServicePackages).not.toHaveBeenCalled();
  });

  it("exposes error when the API call fails", async () => {
    mockedGetServicePackages.mockRejectedValue(new Error("Network error"));

    const { result } = renderHook(
      () => useServicePackages(COMPANY_ID, ENVIRONMENT_ID, SERVICE_ID, {}, TOKEN),
      { wrapper },
    );

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("Network error");
  });
});
