"use client";
import React, { useEffect, useState } from "react";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import type {
  ServicePackage,
  UpdateNotificationPreferencePayload,
} from "@/modules/service-package/types/types";

interface NotificationPreferenceDialogProps {
  open: boolean;
  pkg: ServicePackage | null;
  saving: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (payload: UpdateNotificationPreferencePayload) => void;
}

function toDateTimeLocal(iso: string | null | undefined): string {
  if (!iso) return "";
  const date = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default function NotificationPreferenceDialog({
  open,
  pkg,
  saving,
  error,
  onClose,
  onSubmit,
}: NotificationPreferenceDialogProps) {
  const [snoozeUntil, setSnoozeUntil] = useState("");

  useEffect(() => {
    if (open) {
      setSnoozeUntil(toDateTimeLocal(pkg?.notificationState?.nextNotifyAt));
    }
  }, [open, pkg]);

  if (!pkg) return null;

  const isMuted = pkg.notificationState?.muted ?? false;
  const canSnooze = snoozeUntil !== "" && new Date(snoozeUntil).getTime() > Date.now() && !saving;

  const handleMute = () => onSubmit({ action: "MUTE" });
  const handleUnmute = () => onSubmit({ action: "UNMUTE" });
  const handleSnooze = () => {
    if (!canSnooze) return;
    onSubmit({ action: "SNOOZE", until: new Date(snoozeUntil).toISOString() });
  };

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Notifications for {pkg.package.name}</DialogTitle>
      <DialogContent>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}

          {isMuted ? (
            <Typography variant="body2" color="text.secondary">
              Notifications for this package are currently muted. Unmute to resume
              receiving alerts about it in the vulnerability digest.
            </Typography>
          ) : (
            <>
              <Typography variant="body2" color="text.secondary">
                Mute to stop being reminded about this package's vulnerabilities, or
                snooze to postpone the next reminder to a specific date.
              </Typography>
              <TextField
                label="Snooze until"
                type="datetime-local"
                size="small"
                disabled={saving}
                value={snoozeUntil}
                onChange={(e) => setSnoozeUntil(e.target.value)}
                InputLabelProps={{ shrink: true }}
                inputProps={{ "aria-label": "Snooze until" }}
              />
            </>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        {isMuted ? (
          <Button variant="contained" onClick={handleUnmute} disabled={saving}>
            {saving ? "Saving…" : "Unmute"}
          </Button>
        ) : (
          <>
            <Button onClick={handleSnooze} disabled={!canSnooze}>
              Snooze
            </Button>
            <Button variant="contained" color="warning" onClick={handleMute} disabled={saving}>
              {saving ? "Saving…" : "Mute indefinitely"}
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}
