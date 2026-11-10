import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import SelectBox from './SelectBox';

describe('SelectBox Component', () => {
    const options = [
        { value: '1', label: 'Option 1' },
        { value: '2', label: 'Option 2' },
    ];

    it('renders with label and options', async () => {
        render(
            <SelectBox
                name="test"
                labelText="Test Select"
                options={options}
            />
        );

        // Select the label element specifically
        const label = screen.getByText('Test Select', { selector: 'label' });
        expect(label).toBeInTheDocument();

        // Open the dropdown
        fireEvent.mouseDown(screen.getByRole('combobox'));

        // Options appear after opening
        expect(await screen.findByText('Option 1')).toBeInTheDocument();
        expect(screen.getByText('Option 2')).toBeInTheDocument();
    });

    it('displays error message', () => {
        render(
            <SelectBox
                name="test"
                labelText="Test Select"
                options={options}
                errorMessage="Invalid selection"
            />
        );
        expect(screen.getByText('Invalid selection')).toBeInTheDocument();
    });

    it('handles onChange', async () => {
        const handleChange = jest.fn();
        render(
            <SelectBox
                name="test"
                labelText="Test Select"
                options={options}
                onChange={handleChange}
            />
        );
        // Select the label element specifically
        const label = screen.getByText('Test Select', { selector: 'label' });
        expect(label).toBeInTheDocument();
        // Open the dropdown
        fireEvent.mouseDown(screen.getByRole('combobox'));
        // Select an option
        fireEvent.click(await screen.findByText('Option 2'));
        expect(handleChange).toHaveBeenCalled();
    });
});