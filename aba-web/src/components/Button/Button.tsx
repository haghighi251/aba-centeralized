import React from 'react';
import { Button as MuiButton, ButtonProps } from '@mui/material';

interface IButtonProps extends ButtonProps {
    children: React.ReactNode;
    variant?: 'text' | 'outlined' | 'contained';
    sx?: ButtonProps['sx'];
    disabled?: boolean;
    startIcon?: React.ReactNode;
    endIcon?: React.ReactNode;
    isProcessing?: boolean;
    loadingPosition?: 'start' | 'end' | 'center';
}

const Button: React.FC<IButtonProps> = ({ children, variant, sx, disabled, startIcon, endIcon, isProcessing, loadingPosition, ...props }) => {
    return (
        <MuiButton
            variant={variant || "contained"}
            sx={sx ? { ...sx } : undefined}
            disabled={disabled}
            startIcon={startIcon}  
            endIcon={endIcon}
            loading={isProcessing}
            loadingPosition={loadingPosition || "start"}
            {...props}
        >
            {children}
        </MuiButton>
    );
};

export default Button;