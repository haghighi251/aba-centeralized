import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TextBox from './TextBox';

describe('TextBox Component', () => {
    it('renders with label and placeholder', () => {
        render(
            <TextBox
                name="test"
                labelText="Test Label"
                placeholder="Test Placeholder"
            />
        );
        expect(screen.getByLabelText('Test Label')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Test Placeholder')).toBeInTheDocument();
    });

    it('displays error message', () => {
        render(
            <TextBox
                name="test"
                labelText="Test Label"
                errorMessage="Error occurred"
            />
        );
        expect(screen.getByText('Error occurred')).toBeInTheDocument();
    });

    it('handles onChange', async () => {
        const handleChange = jest.fn();
        render(
            <TextBox
                name="test"
                labelText="Test Label"
                onChange={handleChange}
            />
        );
        const input = screen.getByLabelText('Test Label');
        await userEvent.type(input, 'test');
        expect(handleChange).toHaveBeenCalled();
    });
});