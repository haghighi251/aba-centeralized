import { renderHook, act } from "@testing-library/react";
import { useAddNewCompany } from "./useAddNewCompany";
import { useTranslation } from "react-i18next";
import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/components/ReactQueryProvider/ReactQueryProvider";
import { TRegisterCompany } from "@/shared/types/company/addNewCompany";
import { QueryKey } from "@/modules/shared/types/QueryKey";

jest.mock("react-i18next", () => ({
  useTranslation: jest.fn(),
}));

jest.mock("@tanstack/react-query", () => ({
  useMutation: jest.fn(),
}));

jest.mock("@/components/ReactQueryProvider/ReactQueryProvider", () => ({
  queryClient: {
    invalidateQueries: jest.fn(),
  },
}));

jest.mock("@/modules/company/services/addNewCompany", () => ({
  addNewCompany: jest.fn(),
}));

describe("useAddNewCompany", () => {
  const mockT = jest.fn((key: string) => {
    if (key === "add-new-company-failed")
      return "Adding new company failed with error:";
    return key;
  });
  const mockMutate = jest.fn();
  const mockUseMutationReturn = {
    mutate: mockMutate,
    isPending: false,
    isError: false,
    isSuccess: false,
    data: undefined,
    error: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useTranslation as jest.Mock).mockReturnValue({ t: mockT });
    (useMutation as jest.Mock).mockReturnValue(mockUseMutationReturn);
  });

  it("should return initial state correctly", () => {
    const { result } = renderHook(() => useAddNewCompany());

    expect(result.current.isAddCompanyLoading).toBe(false);
    expect(result.current.isAddCompanyError).toBe(false);
    expect(result.current.isAddCompanySuccess).toBe(false);
    expect(result.current.error).toBeUndefined();
    expect(result.current.addCompanyMutation).toBeInstanceOf(Function);
  });

  it("should call mutation.mutate when addCompanyMutation is invoked", () => {
    const { result } = renderHook(() => useAddNewCompany());
    const company: TRegisterCompany = {
      username: "testuser",
      email: "test@example.com",
      website: "https://example.com",
      password: "password123",
      isAdmin: false,
    };
    const csrfToken = "test-token";

    act(() => {
      result.current.addCompanyMutation(company, csrfToken);
    });

    expect(mockMutate).toHaveBeenCalledTimes(1);
    expect(mockMutate).toHaveBeenCalledWith({ company, csrfToken });
  });

  it("should set isAddCompanyLoading to true when mutation is pending", () => {
    (useMutation as jest.Mock).mockReturnValue({
      ...mockUseMutationReturn,
      isPending: true,
    });

    const { result } = renderHook(() => useAddNewCompany());
    expect(result.current.isAddCompanyLoading).toBe(true);
  });

  it("should call queryClient.invalidateQueries with correct query key on mutation success", () => {
    let capturedOnSuccess: (() => void) | undefined;
    (useMutation as jest.Mock).mockImplementation(({ onSuccess }) => {
      capturedOnSuccess = onSuccess;
      return mockUseMutationReturn;
    });

    renderHook(() => useAddNewCompany());

    act(() => {
      capturedOnSuccess?.();
    });

    expect(queryClient.invalidateQueries).toHaveBeenCalledTimes(1);
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: [QueryKey.AddNewCompany],
    });
  });

  describe("error derivation", () => {
    it("should be undefined when there is no error and no data", () => {
      const { result } = renderHook(() => useAddNewCompany());
      expect(result.current.error).toBeUndefined();
      expect(result.current.isAddCompanyError).toBe(false);
    });

    it("should use mutation.error.message when mutation.isError is true with an Error instance", () => {
      (useMutation as jest.Mock).mockReturnValue({
        ...mockUseMutationReturn,
        isError: true,
        error: new Error("Network error"),
      });

      const { result } = renderHook(() => useAddNewCompany());

      expect(result.current.error).toBe("Network error");
      expect(result.current.isAddCompanyError).toBe(true);
    });

    it("should use the translated fallback when mutation.isError is true and error is not an Error instance", () => {
      (useMutation as jest.Mock).mockReturnValue({
        ...mockUseMutationReturn,
        isError: true,
        error: "some non-error value",
      });

      const { result } = renderHook(() => useAddNewCompany());

      expect(result.current.error).toBe("Adding new company failed with error:");
      expect(mockT).toHaveBeenCalledWith("add-new-company-failed");
    });

    it("should use mutation.data.error when mutation.data.success is false", () => {
      const apiError = "Company already exists";
      (useMutation as jest.Mock).mockReturnValue({
        ...mockUseMutationReturn,
        isSuccess: true,
        data: { success: false, error: apiError },
      });

      const { result } = renderHook(() => useAddNewCompany());

      expect(result.current.error).toBe(apiError);
      expect(result.current.isAddCompanyError).toBe(true);
    });

    it("should fall back to translated message when mutation.data.success is false and no error message provided", () => {
      (useMutation as jest.Mock).mockReturnValue({
        ...mockUseMutationReturn,
        isSuccess: true,
        data: { success: false, error: undefined },
      });

      const { result } = renderHook(() => useAddNewCompany());

      expect(result.current.error).toBe("Adding new company failed with error:");
    });

    it("should prioritize backend error over network error", () => {
      (useMutation as jest.Mock).mockReturnValue({
        ...mockUseMutationReturn,
        isSuccess: true,
        isError: true,
        error: new Error("Network error"),
        data: { success: false, error: "Backend error" },
      });

      const { result } = renderHook(() => useAddNewCompany());

      expect(result.current.error).toBe("Backend error");
    });

    it("should be undefined when mutation.data.success is true", () => {
      (useMutation as jest.Mock).mockReturnValue({
        ...mockUseMutationReturn,
        isSuccess: true,
        data: { success: true, error: undefined },
      });

      const { result } = renderHook(() => useAddNewCompany());

      expect(result.current.error).toBeUndefined();
      expect(result.current.isAddCompanyError).toBe(false);
    });
  });

  it("should return isAddCompanySuccess true only when mutation.isSuccess and data.success are both true", () => {
    (useMutation as jest.Mock).mockReturnValue({
      ...mockUseMutationReturn,
      isSuccess: true,
      data: { success: true },
    });
    const { result } = renderHook(() => useAddNewCompany());
    expect(result.current.isAddCompanySuccess).toBe(true);
  });

  it("should return isAddCompanySuccess false when mutation.isSuccess is true but data.success is false", () => {
    (useMutation as jest.Mock).mockReturnValue({
      ...mockUseMutationReturn,
      isSuccess: true,
      data: { success: false, error: "failed" },
    });
    const { result } = renderHook(() => useAddNewCompany());
    expect(result.current.isAddCompanySuccess).toBe(false);
  });
});
