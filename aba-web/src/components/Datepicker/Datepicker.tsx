import React from 'react';
import { TextField as MuiTextField } from '@mui/material';
import { IDatepickerProps } from './types';

const Datepicker: React.FC<IDatepickerProps> = ({
    name,
    labelText,
    title,
    value,
    defaultValue,
    required,
    disabled,
    errorMessage,
    onChange,
}) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const date = e.target.value ? new Date(e.target.value) : null;
        onChange?.(date);
    };

    return (
        <MuiTextField
            name={name}
            type="date"
            label={labelText}
            title={title}
            value={value ? value.toISOString().split('T')[0] : ''}
            defaultValue={defaultValue ? defaultValue.toISOString().split('T')[0] : ''}
            required={required}
            disabled={disabled}
            error={!!errorMessage}
            helperText={errorMessage}
            onChange={handleChange}
            fullWidth
            variant="outlined"
            InputLabelProps={{
                shrink: true,
            }}
        />
    );
};

export default Datepicker;