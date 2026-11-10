import { BoxProps } from '@mui/material/Box';
import { SxProps } from '@mui/material/styles';
import React from 'react';

export interface IBoxProps extends BoxProps {
    children: React.ReactNode;
    sx?: SxProps;
}