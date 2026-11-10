'use client';
import { useTranslation } from 'react-i18next';
import { useMutation } from '@tanstack/react-query';
import { queryClient } from "@/components/ReactQueryProvider/ReactQueryProvider";
import { addNewCompany } from '@/modules/company/services/addNewCompany';
import { TRegisterCompany } from '@/shared/types/company/addNewCompany';
import { QueryKey } from '@/modules/shared/types/QueryKey';

// ToDo: Update the unit tests

export const useAddNewCompany = () => {
    const { t } = useTranslation();

    const mutation = useMutation({
        mutationFn: ({ company, csrfToken }: { company: TRegisterCompany; csrfToken: string }) =>
            addNewCompany(company, csrfToken),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QueryKey.AddNewCompany] });
        },
    });

    // The backend returns HTTP 200 for all outcomes (success and business errors alike).
    // Derive error/success synchronously from the response body so there is no
    // intermediate render where both states are true at the same time.
    const backendError = mutation.data?.success === false
        ? (mutation.data.error ?? t('add-new-company-failed'))
        : undefined;

    const networkError = mutation.isError
        ? (mutation.error instanceof Error ? mutation.error.message : t('add-new-company-failed'))
        : undefined;

    const error = backendError ?? networkError;

    // Only a true success: HTTP 200 AND the body says success:true
    const isAddCompanySuccess = mutation.isSuccess && mutation.data?.success === true;
    const isAddCompanyError = !!error;

    const addCompanyMutation = (company: TRegisterCompany, csrfToken: string) => {
        mutation.mutate({ company, csrfToken });
    };

    return {
        isAddCompanyLoading: mutation.isPending,
        isAddCompanyError,
        isAddCompanySuccess,
        error,
        addCompanyMutation,
    };
};
