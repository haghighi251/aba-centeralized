import Visibility from '@mui/icons-material/Visibility';

import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import Alert from './Alert';

const mockOnDismiss = jest.fn();
const mockOnClick = jest.fn();
const mockOnMouseEnter = jest.fn();
const mockOnMouseLeave = jest.fn();

const mockProps = {
    className: 'alert-class',
    color: 'warning',
    icon: <Visibility />,
    testId: 'my-alert',
    onDismiss: mockOnDismiss,
    onClick: mockOnClick,
    onMouseEnter: mockOnMouseEnter,
    onMouseLeave: mockOnMouseLeave,
};

describe('Alert component unit tests', () => {
    beforeEach(() => {
        mockOnDismiss.mockClear();
        mockOnClick.mockClear();
        mockOnMouseEnter.mockClear();
        mockOnMouseLeave.mockClear();
    });

    it('should render the alert with default props and message', () => {
        render(<Alert {...mockProps}>This is an alert message.</Alert>);
        const alertComponent = screen.getByTestId('my-alert');
        expect(alertComponent).toHaveTextContent('This is an alert message.');
    });

    it('should render the alert with custom children content', () => {
        const AdditionalContent = () => <div>Additional Content</div>;
        render(
            <Alert {...mockProps}>
                <AdditionalContent />
            </Alert>,
        );
        expect(screen.getByText('Additional Content')).toBeInTheDocument();
    });

    it('should render the close button and close the alert when clicked', async () => {
        render(<Alert {...mockProps}>This is an alert message.</Alert>);
        const alertComponent = screen.getByTestId('my-alert');
        const closeButton = alertComponent.querySelector(
            'button[aria-label="Close"]',
        );

        expect(alertComponent).toBeInTheDocument();
        expect(closeButton).toBeInTheDocument();

        fireEvent.click(closeButton);

        await waitFor(() => {
            expect(alertComponent).not.toBeInTheDocument();
        });
    });

    it('calls onDismiss function when dismiss button is clicked', async () => {
        render(<Alert {...mockProps}>Hello</Alert>);
        const closeButton = screen.getByLabelText('Close');
        fireEvent.click(closeButton);
        expect(mockOnDismiss).toHaveBeenCalledTimes(1);
    });

    it('should call onClick when clicked', () => {
        render(<Alert {...mockProps}>Clickable Alert</Alert>);
        const alertComponent = screen.getByTestId('my-alert');
        fireEvent.click(alertComponent);
        expect(mockProps.onClick).toHaveBeenCalled();
    });

    it('should call onMouseEnter when mouse enters', () => {
        render(<Alert {...mockProps}>Hoverable Alert</Alert>);
        const alertComponent = screen.getByTestId('my-alert');
        fireEvent.mouseEnter(alertComponent);
        expect(mockProps.onMouseEnter).toHaveBeenCalled();
    });

    it('should call onMouseLeave when mouse leaves', () => {
        render(<Alert {...mockProps}>Hoverable Alert</Alert>);
        const alertComponent = screen.getByTestId('my-alert');
        fireEvent.mouseLeave(alertComponent);
        expect(mockProps.onMouseLeave).toHaveBeenCalled();
    });
});
