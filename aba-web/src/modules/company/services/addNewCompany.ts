import axios, { AxiosError, AxiosResponse } from 'axios';
import { APIResponse } from "@/shared/types/APIResponse";
import { BFFUrlRouteMapping } from "@/shared/types/BFFUrlRouteMapping";
import { IRegisterCompanySchema, TRegisterCompany } from "@/shared/types/company/addNewCompany";
import { ZodError } from "zod";
import { ApiError } from '@/shared/errors/apiError';

export const addNewCompany = async (
  company: TRegisterCompany,
  csrfToken: string,
  signal?: AbortSignal // for cancellation
): Promise<APIResponse> => {
  // Validate environment
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (!baseUrl) {
    throw new Error('NEXT_PUBLIC_API_BASE_URL is not defined');
  }

  // Validate input with Zod
  try {
    IRegisterCompanySchema.parse(company);
  } catch (error) {
    if (error instanceof ZodError) {
      console.log('Validation errorXX:', error.errors);
      throw new Error(error.errors[0].message);
    }
    throw error;
  }

  // Validate CSRF token
  if (typeof csrfToken !== 'string' || csrfToken.trim() === '') {
    throw new Error('CSRF token is required for addNewCompany operation.');
  }

  // Axios instance with timeout and base URL
  const axiosInstance = axios.create({
    baseURL: baseUrl,
    timeout: 10000, // 10 seconds
    withCredentials: true,
    headers: {
      'Content-Type': 'application/json',
      'x-csrf-token': csrfToken,
    },
    signal, // pass AbortSignal if provided
  });

  try {
    const response: AxiosResponse<APIResponse> = await axiosInstance.post(
      BFFUrlRouteMapping.ADD_NEW_COMPANY,
      company
    );

    // Axios automatically throws for status codes outside 2xx if validateStatus is not overridden.
    // We can still add custom validation if needed.
    return response.data;
  } catch (error) {
    // Handle Axios errors
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      const status = axiosError.response?.status;
      const data = axiosError.response?.data;

      // Log the error (replace with your logger in production)
      console.error(`API error ${status}:`, data);

      throw new ApiError(
        typeof data === 'string' ? data : (data as any)?.message || axiosError.message,
        status,
        data
      );
    }

    // Handle cancellation via AbortSignal
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('Request was cancelled.');
    }

    // Re-throw any other unexpected errors
    console.error('Unexpected error in addNewCompany:', error);
    throw new Error('Failed to register company. Please try again later.');
  }
};
