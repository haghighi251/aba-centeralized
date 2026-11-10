import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { CheckBox, ICustomCheckBoxProps } from './CheckBox';

describe('CheckBox Component', () => {
  const defaultProps: ICustomCheckBoxProps = {};

  const renderComponent = (props = {}) => {
    return render(<CheckBox {...defaultProps} {...props} />);
  };

  test('renders a simple Checkbox when no labelText is provided', () => {
    renderComponent({ defaultChecked: true, disabled: false, required: true, color: 'primary' });

    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toBeInTheDocument();
    expect(checkbox).toBeChecked(); // defaultChecked passed as checked
    expect(checkbox).not.toBeDisabled();
    expect(checkbox).toBeRequired();
  });

  test('renders FormControlLabel with Checkbox when labelText is provided', () => {
    renderComponent({
      labelText: 'Accept terms',
      defaultChecked: false,
      disabled: true,
      required: true,
      color: 'secondary',
    });

    // Check that the label text is present
    expect(screen.getByText('Accept terms')).toBeInTheDocument();

    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toBeInTheDocument();
    expect(checkbox).not.toBeChecked(); // defaultChecked false
    expect(checkbox).toBeDisabled();    // FormControlLabel disabled passed to checkbox
    expect(checkbox).toBeRequired();    // required prop passed
  });

  test('displays error message', () => {
    renderComponent({
      labelText: 'Accept terms',
      errorMessage: 'You must accept',
    });

    expect(screen.getByText('You must accept')).toBeInTheDocument();
  });

  test('calls onChange handler when checkbox is clicked (without label)', () => {
    const handleChange = jest.fn();
    renderComponent({ onChange: handleChange });

    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);

    expect(handleChange).toHaveBeenCalledTimes(1);
    expect(handleChange.mock.calls[0][0].target).toBe(checkbox);
  });

  test('calls onChange handler when checkbox is clicked (with label)', () => {
    const handleChange = jest.fn();
    renderComponent({ label: 'Option', onChange: handleChange });

    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);

    expect(handleChange).toHaveBeenCalledTimes(1);
    expect(handleChange.mock.calls[0][0].target).toBe(checkbox);
  });

  test('forwards additional CheckboxProps (e.g., size, id) to the underlying Checkbox', () => {
    renderComponent({ id: 'my-checkbox', size: 'small' });

    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toHaveAttribute('id', 'my-checkbox');
  });

  test('when label is an empty string, it renders Checkbox without FormControlLabel', () => {
    renderComponent({ label: '' });

    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toBeInTheDocument();
  });

  test('defaultChecked is mapped to checked when no label, and to defaultChecked when label present', () => {
    // Without label -> checked prop is set
    const { rerender } = renderComponent({ defaultChecked: true });
    let checkbox = screen.getByRole('checkbox');
    expect(checkbox).toBeChecked();

    // With label -> defaultChecked prop is used (checkbox initial checked)
    rerender(<CheckBox label="Label" defaultChecked={true} />);
    checkbox = screen.getByRole('checkbox');
    expect(checkbox).toBeChecked();

    // With label but defaultChecked false
    rerender(<CheckBox label="Label" defaultChecked={false} />);
    checkbox = screen.getByRole('checkbox');
  });

  test('disabled and required props are applied correctly in both branches', () => {
    // Without label
    const { rerender } = renderComponent({ disabled: true, required: true });
    let checkbox = screen.getByRole('checkbox');
    expect(checkbox).toBeDisabled();
    expect(checkbox).toBeRequired();

    // With label
    rerender(<CheckBox label="Label" disabled={true} required={true} />);
    checkbox = screen.getByRole('checkbox');
    expect(checkbox).toBeDisabled();
    expect(checkbox).toBeRequired();
  });

  test('renders with minimal props (no optional props)', () => {
    renderComponent();
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toBeInTheDocument();
    expect(checkbox).not.toBeChecked();
    expect(checkbox).not.toBeDisabled();
    expect(checkbox).not.toBeRequired();
  });
});