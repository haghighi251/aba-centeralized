import { Session } from 'next-auth';
import * as nextAuthReact from 'next-auth/react';
import { redirect } from 'next/navigation';

import { fireEvent, render, screen } from '@testing-library/react';

import RegisterPage from './RegisterPage';
import { useAddNewCompany } from '@/modules/company/hooks/useAddNewCompany';
import { useCsrfToken } from '@/shared/hooks/useCsrfToken';
import { useToastContext } from '@/modules/shared/components/ToastContextProvider/ToastContextProvider';
import { UrlMapper } from '@/shared/types/URLMapper';

jest.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock('next-auth/react', () => ({
    useSession: jest.fn(),
}));

jest.mock('@/shared/hooks/useCsrfToken', () => ({
    useCsrfToken: jest.fn(),
}));

jest.mock('@/modules/company/hooks/useAddNewCompany', () => ({
    useAddNewCompany: jest.fn(),
}));

jest.mock('@/modules/shared/components/ToastContextProvider/ToastContextProvider', () => ({
    useToastContext: jest.fn(),
    ToastType: { Success: 'success', Info: 'info', Warning: 'warning', Danger: 'error' },
}));

const useSessionMock = nextAuthReact.useSession as jest.MockedFunction<typeof nextAuthReact.useSession>;
const useCsrfTokenMock = useCsrfToken as jest.MockedFunction<typeof useCsrfToken>;
const useAddNewCompanyMock = useAddNewCompany as jest.MockedFunction<typeof useAddNewCompany>;
const useToastContextMock = useToastContext as jest.MockedFunction<typeof useToastContext>;
const redirectMock = redirect as jest.MockedFunction<typeof redirect>;

const addCompanyMutationMock = jest.fn();

const defaultAddNewCompany = {
    isAddCompanyLoading: false,
    isAddCompanySuccess: false,
    isAddCompanyError: false,
    error: undefined,
    addCompanyMutation: addCompanyMutationMock,
};

describe('RegisterPage', () => {
    beforeEach(() => {
        jest.clearAllMocks();

        useSessionMock.mockReturnValue({
            data: null,
            status: 'unauthenticated',
            update: jest.fn(),
        } as unknown as ReturnType<typeof nextAuthReact.useSession>);

        useCsrfTokenMock.mockReturnValue({
            token: 'csrf-token',
            loading: false,
            error: null,
        });

        useAddNewCompanyMock.mockReturnValue(defaultAddNewCompany as unknown as ReturnType<typeof useAddNewCompany>);

        useToastContextMock.mockReturnValue({
            createToast: jest.fn(),
            deleteToast: jest.fn(),
            deleteAllToasts: jest.fn(),
        });
    });

    const fillField = (placeholder: string, value: string) => {
        fireEvent.change(screen.getByPlaceholderText(placeholder), { target: { value } });
    };

    it('should render the registration form by default', () => {
        render(<RegisterPage />);

        expect(screen.getByRole('button', { name: 'register-button-label' })).toBeInTheDocument();
        expect(screen.queryByText('user-has-been-registered-successfully')).not.toBeInTheDocument();
    });

    it('should redirect to the home page when the user is already authenticated', () => {
        useSessionMock.mockReturnValue({
            data: { user: { name: 'John Doe' }, expires: '' } as Session,
            status: 'authenticated',
            update: jest.fn(),
        });

        render(<RegisterPage />);

        expect(redirectMock).toHaveBeenCalledWith(UrlMapper.HOME);
    });

    it('should show a success alert and hide the form when the company has been registered', () => {
        useAddNewCompanyMock.mockReturnValue({
            ...defaultAddNewCompany,
            isAddCompanySuccess: true,
        } as unknown as ReturnType<typeof useAddNewCompany>);

        render(<RegisterPage />);

        expect(screen.getByText('user-has-been-registered-successfully')).toBeInTheDocument();
        expect(screen.getByText('please-go-to-the-login-page')).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'login' })).toHaveAttribute('href', UrlMapper.LOGIN);
        expect(screen.queryByRole('button', { name: 'register-button-label' })).not.toBeInTheDocument();
    });

    it('should show a warning alert with the backend error message when registration fails', () => {
        useAddNewCompanyMock.mockReturnValue({
            ...defaultAddNewCompany,
            isAddCompanyError: true,
            error: 'add-new-company-failed',
        } as unknown as ReturnType<typeof useAddNewCompany>);

        render(<RegisterPage />);

        expect(screen.getByText('Notice')).toBeInTheDocument();
        expect(screen.getByText('add-new-company-failed')).toBeInTheDocument();
    });

    it('should show a validation error and not submit when passwords do not match', () => {
        render(<RegisterPage />);

        fillField('enter-your-email', 'test@example.com');
        fillField('enter-your-website', 'https://example.com');
        fillField('enter-your-password', 'Password123');
        fillField('repeat-your-password-placeholder', 'Password456');

        fireEvent.submit(screen.getByRole('button', { name: 'register-button-label' }).closest('form')!);

        expect(screen.getByText('passwords-do-not-match')).toBeInTheDocument();
        expect(addCompanyMutationMock).not.toHaveBeenCalled();
    });

    it('should submit the form with valid values', () => {
        render(<RegisterPage />);

        fillField('enter-your-email', 'test@example.com');
        fillField('enter-your-website', 'https://example.com');
        fillField('enter-your-password', 'Password123');
        fillField('repeat-your-password-placeholder', 'Password123');

        fireEvent.submit(screen.getByRole('button', { name: 'register-button-label' }).closest('form')!);

        expect(addCompanyMutationMock).toHaveBeenCalledTimes(1);
        expect(addCompanyMutationMock).toHaveBeenCalledWith(
            expect.objectContaining({
                email: 'test@example.com',
                website: 'https://example.com',
                password: 'Password123',
                username: 'test',
            }),
            'csrf-token',
        );
    });
});
