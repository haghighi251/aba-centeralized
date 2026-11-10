// addNewCompany.test.ts
import axios from "axios";
import { addNewCompany } from "./addNewCompany"; // adjust import path
import {
  IRegisterCompanySchema,
  TRegisterCompany,
} from "@/shared/types/company/addNewCompany";
import { BFFUrlRouteMapping } from "@/shared/types/BFFUrlRouteMapping";
import { ApiError } from "@/shared/errors/apiError";

// Mock dependencies
jest.mock("axios");
jest.mock("@/shared/types/company/addNewCompany", () => ({
  IRegisterCompanySchema: {
    parse: jest.fn(),
  },
  // Keep the actual type for import, but we only care about the mock
}));
jest.mock("@/shared/types/BFFUrlRouteMapping", () => ({
  BFFUrlRouteMapping: {
    ADD_NEW_COMPANY: "/companies",
  },
}));

const mockedAxios = axios as jest.Mocked<typeof axios>;
const mockedParse = IRegisterCompanySchema.parse as jest.Mock;

describe("addNewCompany", () => {
  const baseUrl = "http://localhost:8080/api";
  const csrfToken = "valid-csrf-token";
  const validCompany: TRegisterCompany = {
    username: "testuser",
    email: "test@example.com",
    website: "https://test.com",
    password: "strongPassword123",
    isAdmin: false,
    phone: "+1234567890",
    address: "123 Main St",
    city: "Springfield",
    state: "IL",
    country: "USA",
    postalCode: "62701",
    firstName: "John",
    lastName: "Doe",
  };
  const apiResponse = { success: true, data: { id: 1 } };

  beforeEach(() => {
    jest.resetAllMocks();
    process.env.NEXT_PUBLIC_API_BASE_URL = baseUrl;
    // Default: zod passes validation
    mockedParse.mockImplementation(() => {});
    // Default axios success
    mockedAxios.create.mockReturnValue({
      post: jest.fn().mockResolvedValue({ data: apiResponse }),
    } as any);
  });

  afterEach(() => {
    delete process.env.NEXT_PUBLIC_API_BASE_URL;
  });

  describe("Success path", () => {
    it("should return API response when validation and request succeed", async () => {
      const result = await addNewCompany(validCompany, csrfToken);
      expect(result).toEqual(apiResponse);
      expect(mockedParse).toHaveBeenCalledWith(validCompany);
      expect(mockedAxios.create).toHaveBeenCalledWith({
        baseURL: baseUrl,
        timeout: 10000,
        withCredentials: true,
        headers: {
          "Content-Type": "application/json",
          "x-csrf-token": csrfToken,
        },
        signal: undefined,
      });
      const axiosInstance = mockedAxios.create.mock.results[0].value;
      expect(axiosInstance.post).toHaveBeenCalledWith(
        BFFUrlRouteMapping.ADD_NEW_COMPANY,
        validCompany,
      );
    });
  });

  describe("Zod validation errors", () => {
    it("should throw a validation error when company is invalid", async () => {
      const zodError = new Error("Invalid company data");
      mockedParse.mockImplementation(() => {
        throw zodError;
      });

      await expect(addNewCompany(validCompany, csrfToken)).rejects.toThrow(
        "Invalid company data",
      );
      expect(mockedAxios.create).not.toHaveBeenCalled();
    });
  });

  describe("CSRF token validation", () => {
    it.each([
      ["undefined", undefined],
      ["empty string", ""],
      ["whitespace only", "   "],
    ])("should throw when CSRF token is %s", async (_, token) => {
      await expect(addNewCompany(validCompany, token as string)).rejects.toThrow(
        "CSRF token is required for addNewCompany operation.",
      );
      expect(mockedAxios.create).not.toHaveBeenCalled();
    });
  });

  describe("Environment variable missing", () => {
    it("should throw when NEXT_PUBLIC_API_BASE_URL is not defined", async () => {
      delete process.env.NEXT_PUBLIC_API_BASE_URL;
      await expect(addNewCompany(validCompany, csrfToken)).rejects.toThrow(
        "NEXT_PUBLIC_API_BASE_URL is not defined",
      );
      expect(mockedAxios.create).not.toHaveBeenCalled();
    });
  });

  describe("Axios errors", () => {
    it("should throw ApiError with status and message when request fails with 4xx", async () => {
      const errorResponse = { message: "Bad request" };
      // Create an actual Error with Axios-like properties
      const axiosError = new Error("Request failed with status code 400");
      (axiosError as any).isAxiosError = true;
      (axiosError as any).response = {
        status: 400,
        data: errorResponse,
      };

      const axiosInstance = {
        post: jest.fn().mockRejectedValue(axiosError),
      };
      mockedAxios.create.mockReturnValue(axiosInstance as any);

      // Ensure axios.isAxiosError is mocked to return true for this error
      (axios.isAxiosError as unknown as jest.Mock).mockReturnValue(true);

      await expect(
        addNewCompany(validCompany, csrfToken),
      ).rejects.toMatchObject({
        name: "ApiError",
        message: "Bad request",
        status: 400,
        data: errorResponse,
      });
    });

    it("should throw ApiError with status and fallback message when no response data", async () => {
      const axiosError = {
        isAxiosError: true,
        response: {
          status: 500,
        },
        message: "Network error",
      };
      const axiosInstance = {
        post: jest.fn().mockRejectedValue(axiosError),
      };
      mockedAxios.create.mockReturnValue(axiosInstance as any);

      // Ensure axios.isAxiosError is mocked to return true for this error
      (axios.isAxiosError as unknown as jest.Mock).mockImplementation(
        (error) => error?.isAxiosError === true,
      );

      await expect(
        addNewCompany(validCompany, csrfToken),
      ).rejects.toMatchObject({
        name: "ApiError",
        message: "Network error",
        status: 500,
      });
    });

    it("should throw generic error for non-axios errors", async () => {
      const unknownError = new Error("Something went wrong");
      const axiosInstance = {
        post: jest.fn().mockRejectedValue(unknownError),
      };
      mockedAxios.create.mockReturnValue(axiosInstance as any);

      await expect(addNewCompany(validCompany, csrfToken)).rejects.toThrow(
        "Failed to register company. Please try again later.",
      );
    });
  });

  describe("Status code handling", () => {
    it("should return data when response status is 200 (success)", async () => {
      const successResponse = { success: true, data: { id: 123 } };
      const axiosInstance = {
        post: jest.fn().mockResolvedValue({ data: successResponse }),
      };
      mockedAxios.create.mockReturnValue(axiosInstance as any);

      const result = await addNewCompany(validCompany, csrfToken);
      expect(result).toEqual(successResponse);
    });

    it("should return data when response status is 201 (created)", async () => {
      const createdResponse = { success: true, data: { id: 123 } };
      const axiosInstance = {
        post: jest.fn().mockResolvedValue({ data: createdResponse }),
      };
      mockedAxios.create.mockReturnValue(axiosInstance as any);

      const result = await addNewCompany(validCompany, csrfToken);
      expect(result).toEqual(createdResponse);
    });

    it("should throw ApiError for 3xx redirects (treated as error by Axios)", async () => {
      const errorResponse = { message: "Redirect" };
      const axiosError = new Error("Request failed with status code 302");
      Object.assign(axiosError, {
        isAxiosError: true,
        response: {
          status: 302,
          data: errorResponse,
        },
      });
      const axiosInstance = {
        post: jest.fn().mockRejectedValue(axiosError),
      };
      mockedAxios.create.mockReturnValue(axiosInstance as any);
      // Ensure axios.isAxiosError is mocked to return true for this error
      (axios.isAxiosError as unknown as jest.Mock).mockReturnValue(true);

      await expect(
        addNewCompany(validCompany, csrfToken),
      ).rejects.toMatchObject({
        name: "ApiError",
        message: "Redirect",
        status: 302,
        data: errorResponse,
      });
    });

    it("should throw ApiError for 5xx server errors", async () => {
      const errorResponse = { message: "Internal Server Error" };
      const axiosError = new Error("Request failed with status code 500");
      Object.assign(axiosError, {
        isAxiosError: true,
        response: {
          status: 500,
          data: errorResponse,
        },
      });
      const axiosInstance = {
        post: jest.fn().mockRejectedValue(axiosError),
      };
      mockedAxios.create.mockReturnValue(axiosInstance as any);
      // Ensure axios.isAxiosError is mocked to return true for this error
      (axios.isAxiosError as unknown as jest.Mock).mockReturnValue(true);

      await expect(
        addNewCompany(validCompany, csrfToken),
      ).rejects.toMatchObject({
        name: "ApiError",
        message: "Internal Server Error",
        status: 500,
        data: errorResponse,
      });
    });
  });

  describe("Timeout handling", () => {
    it("should throw a meaningful error when request times out", async () => {
      const timeoutError = new Error("timeout of 10000ms exceeded");
      Object.assign(timeoutError, {
        isAxiosError: true,
        code: "ECONNABORTED",
        message: "timeout of 10000ms exceeded",
      });
      const axiosInstance = {
        post: jest.fn().mockRejectedValue(timeoutError),
      };
      mockedAxios.create.mockReturnValue(axiosInstance as any);
      (axios.isAxiosError as unknown as jest.Mock).mockImplementation(
        (error) => error?.isAxiosError === true,
      );

      await expect(addNewCompany(validCompany, csrfToken)).rejects.toThrow(
        "timeout of 10000ms exceeded",
      );
    });

    it("should throw generic error when request fails due to network issues (no response)", async () => {
      const networkError = new Error("Network Error");
      Object.assign(networkError, {
        isAxiosError: true,
        request: {}, // indicates no response was received
      });
      const axiosInstance = {
        post: jest.fn().mockRejectedValue(networkError),
      };
      mockedAxios.create.mockReturnValue(axiosInstance as any);
      // Ensure axios.isAxiosError is mocked to return true for this error
      (axios.isAxiosError as unknown as jest.Mock).mockReturnValue(true);

      await expect(addNewCompany(validCompany, csrfToken)).rejects.toThrow(
        "Network Error",
      );
    });
  });

  describe("AbortSignal handling", () => {
    it("should throw cancellation error when request is aborted", async () => {
      const abortError = new DOMException("Aborted", "AbortError");
      const axiosInstance = {
        post: jest.fn().mockRejectedValue(abortError),
      };
      mockedAxios.create.mockReturnValue(axiosInstance as any);
      const controller = new AbortController();
      controller.abort();

      await expect(
        addNewCompany(validCompany, csrfToken, controller.signal),
      ).rejects.toThrow("Request was cancelled.");
      expect(mockedAxios.create).toHaveBeenCalledWith(
        expect.objectContaining({ signal: controller.signal }),
      );
    });
  });
});
