import React from "react";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useRepositoryConnection } from "./useRepositoryConnection";
import { getRepositoryConnection } from "@/modules/repository-connection/services/repositoryConnectionService";

jest.mock("@/modules/repository-connection/services/repositoryConnectionService");

const mockedGet = getRepositoryConnection as jest.Mock;

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe("useRepositoryConnection", () => {
  beforeEach(() => jest.clearAllMocks());

  it("fetches the connection with the given ids and token", async () => {
    mockedGet.mockResolvedValue({ id: 1, provider: "BITBUCKET" });
    const { result } = renderHook(() => useRepositoryConnection("1", 2, 3, "tok"), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockedGet).toHaveBeenCalledWith("1", 2, 3, "tok");
    expect(result.current.data).toEqual({ id: 1, provider: "BITBUCKET" });
  });

  it("returns null data when nothing is connected", async () => {
    mockedGet.mockResolvedValue(null);
    const { result } = renderHook(() => useRepositoryConnection("1", 2, 3, "tok"), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toBeNull();
  });

  it("exposes the error when the request fails", async () => {
    mockedGet.mockRejectedValue(new Error("boom"));
    const { result } = renderHook(() => useRepositoryConnection("1", 2, 3, "tok"), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error?.message).toBe("boom");
  });

  it.each([
    ["no token", "1", 2, 3, ""],
    ["no company", "", 2, 3, "tok"],
    ["no environment", "1", 0, 3, "tok"],
    ["no service", "1", 2, 0, "tok"],
  ])("does not fetch with %s", (_label, company, env, service, token) => {
    renderHook(
      () => useRepositoryConnection(company as string, env as number, service as number, token as string),
      { wrapper },
    );
    expect(mockedGet).not.toHaveBeenCalled();
  });
});
