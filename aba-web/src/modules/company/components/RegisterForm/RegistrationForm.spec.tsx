import { fireEvent, render, screen } from '@testing-library/react';

import RegisterForm from './RegisterForm';
import { IRegisterFormProps } from '../../types/types';

jest.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (key: string) => key }),
}));

const defaultProps: IRegisterFormProps = {
    onHandleSubmit: jest.fn((event) => event.preventDefault()),
    addCompanyIsLoading: false,
    tokenIsLoading: false,
};

describe('RegisterForm', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should render all the company registration fields', () => {
        render(<RegisterForm {...defaultProps} />);

        expect(screen.getByPlaceholderText('enter-your-first-name')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('enter-your-last-name')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('enter-your-email')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('enter-your-website')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('enter-your-password')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('repeat-your-password-placeholder')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('enter-your-phone-number')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('enter-your-address')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('enter-your-postal-code')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('enter-your-city')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('enter-your-state')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('enter-your-country')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'register-button-label' })).toBeInTheDocument();
    });

    it('should call onHandleSubmit when the form is submitted', () => {
        render(<RegisterForm {...defaultProps} />);

        fireEvent.submit(screen.getByRole('button', { name: 'register-button-label' }).closest('form')!);

        expect(defaultProps.onHandleSubmit).toHaveBeenCalledTimes(1);
    });

    it('should disable the submit button while the CSRF token is loading', () => {
        render(<RegisterForm {...defaultProps} tokenIsLoading />);

        expect(screen.getByRole('button', { name: 'register-button-label' })).toBeDisabled();
    });

    it('should show a loading label and disable the submit button while registering', () => {
        render(<RegisterForm {...defaultProps} addCompanyIsLoading />);

        const submitButton = screen.getByRole('button', { name: 'registering' });
        expect(submitButton).toBeInTheDocument();
        expect(submitButton).toBeDisabled();
    });
});
