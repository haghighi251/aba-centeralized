import React from 'react';
import MuiTextField from '@mui/material/TextField';
import { ITextFieldProps } from './types';

const TextField = ({
  id,
  name,
  label,
  variant = 'outlined',
  value,
  onChange,
  type = 'text',
  helperText,
  fullWidth = false,
  disabled = false,
  required = false,
  error = false,
  placeholder
}: ITextFieldProps) => {

  return (
    <MuiTextField
      id={id}
      name={name}
      label={label}
      variant={variant}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      type={type}
      error={error}
      helperText={helperText}
      fullWidth={fullWidth}
      disabled={disabled}
      required={required}
      data-testid="text-field"
    />
  );
};

export default TextField;