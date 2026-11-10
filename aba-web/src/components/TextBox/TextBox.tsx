import React from 'react';
import { TextField as MuiTextField, InputAdornment } from '@mui/material';
import { ITextBoxProps } from './types';

const TextBox: React.FC<ITextBoxProps> = ({
    name,
    type = 'text',
    labelText,
    placeholder,
    value,
    defaultValue,
    required,
    disabled,
    readOnly,
    autoComplete,
    icon,
    addon,
    className,
    errorMessage,
    onChange,
    onBlur,
}) => {
    // For now, ignore icon and addon, as they require icon library
    const inputProps: any = {};
    if (addon) {
        inputProps.startAdornment = <InputAdornment position="start">{addon}</InputAdornment>;
    }

    return (
        <MuiTextField
            name={name}
            type={type}
            label={labelText}
            placeholder={placeholder}
            value={value}
            defaultValue={defaultValue}
            required={required}
            disabled={disabled}
            InputProps={{
                readOnly,
                ...inputProps,
            }}
            inputProps={{
                autoComplete,
            }}
            className={className}
            error={!!errorMessage}
            helperText={errorMessage}
            onChange={onChange}
            onBlur={onBlur}
            fullWidth
            variant="outlined"
        />
    );
};

export default TextBox;