'use client';
import React, { forwardRef, useEffect, useState } from 'react';
import MuiAlert, { AlertProps } from '@mui/material/Alert';
import Collapse from '@mui/material/Collapse';
import AlertTitle from '@mui/material/AlertTitle';

export interface IAlertProps extends AlertProps {
  id?: string;
  icon?: React.ReactNode;
  role?: "warning" | "success" | "error" | "info";
  transitionDurations?: number;
  testId?: string;
  onDismiss?: () => void;
  dismissAfter?: number;
  title?: string;
  text?: string | string[];
  isList?: boolean;
  children?: React.ReactNode;
}

// eslint-disable-next-line react/display-name
const Alert = forwardRef<unknown, IAlertProps>(
  (
    {
      id,
      role = 'info',
      icon,
      transitionDurations = 300,
      className,
      title,
      text = "",
      testId,
      onDismiss,
      dismissAfter,
      isList = false,
      children= null,
      ...rest
    }: IAlertProps,
    ref: React.Ref<any> | null,
  ) => {
    const [open, setOpen] = useState(true);

    useEffect(() => {
      let timeoutId: number | undefined;
      if (dismissAfter && open) {
        timeoutId = window.setTimeout(() => {
          handleDismiss();
        }, dismissAfter);
      }
      return () => {
        if (timeoutId) window.clearTimeout(timeoutId);
      };
    }, [dismissAfter, open]);

    const handleDismiss = () => {
      setOpen(false);
      if (onDismiss) {
        onDismiss();
      }
    };

    return (
      <Collapse in={open} timeout={transitionDurations} unmountOnExit>
        <MuiAlert
          id={id}
          className={className}
          severity={role}
          icon={icon || undefined}
          onClose={handleDismiss}
          data-testid={testId}
          ref={ref}
          {...rest}
        >
          {title && <AlertTitle>{title}</AlertTitle>}
          {isList && (
            <ul>
              {Array.isArray(text) ? (
                text.map((t, i) => <li key={i}>{t}</li>)
              ) : (
                <li>{text}</li>
              )}
            </ul>
          )}
          {!isList && text}
          {children}
        </MuiAlert>
      </Collapse>
    );
  },
);

export default Alert;