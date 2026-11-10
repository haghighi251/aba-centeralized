import React from 'react';
import { render, screen } from '@testing-library/react';
import Datepicker from './Datepicker';

describe('Datepicker Component', () => {
    it('renders with label', () => {
        render(
            <Datepicker
                name="test"
                labelText="Test Date"
            />
        );
        expect(screen.getByLabelText('Test Date')).toBeInTheDocument();
    });

    it('displays error message', () => {
        render(
            <Datepicker
                name="test"
                labelText="Test Date"
                errorMessage="Invalid date"
            />
        );
        expect(screen.getByText('Invalid date')).toBeInTheDocument();
    });
});