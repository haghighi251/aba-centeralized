"use client";
import React, { useEffect, useState } from "react";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import type {
  ServicePackage,
  DependencyEcosystem,
  CreatePackagePayload,
  UpdatePackagePayload,
} from "@/modules/service-package/types/types";

const ECOSYSTEMS: DependencyEcosystem[] = [
  "NPM", "PYPI", "MAVEN", "RUBYGEMS", "NUGET", "GO", "OTHER",
];

interface PackageFormDialogProps {
  open: boolean;
  editing: ServicePackage | null;
  saving: boolean;
  error: string | null;
  onClose: () => void;
  onSave: (payload: CreatePackagePayload | UpdatePackagePayload) => void;
}

interface FormState {
  name: string;
  version: string;
  versionRange: string;
  ecosystem: DependencyEcosystem;
}

const EMPTY_FORM: FormState = {
  name: "",
  version: "",
  versionRange: "",
  ecosystem: "NPM",
};

export default function PackageFormDialog({
  open,
  editing,
  saving,
  error,
  onClose,
  onSave,
}: PackageFormDialogProps) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  useEffect(() => {
    if (open) {
      if (editing) {
        setForm({
          name: editing.package.name,
          version: editing.package.version,
          versionRange: editing.versionRange ?? "",
          ecosystem: editing.package.ecosystem,
        });
      } else {
        setForm(EMPTY_FORM);
      }
    }
  }, [open, editing]);

  const isEditing = editing !== null;
  const versionChanged = isEditing && form.version !== editing.package.version;

  const canSave =
    form.name.trim() !== "" &&
    form.version.trim() !== "" &&
    !saving;

  const handleSave = () => {
    if (!canSave) return;
    if (isEditing) {
      const payload: UpdatePackagePayload = {};
      if (form.version !== editing.package.version) payload.version = form.version;
      if (form.ecosystem !== editing.package.ecosystem) payload.ecosystem = form.ecosystem;
      payload.versionRange = form.versionRange.trim() || null;
      onSave(payload);
    } else {
      const payload: CreatePackagePayload = {
        name: form.name.trim(),
        version: form.version.trim(),
        ecosystem: form.ecosystem,
        versionRange: form.versionRange.trim() || null,
      };
      onSave(payload);
    }
  };

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{isEditing ? "Edit Package" : "Add Package"}</DialogTitle>
      <DialogContent>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
          {error && (
            <Alert severity="error" onClose={() => {}}>
              {error}
            </Alert>
          )}
          <TextField
            label="Package Name"
            size="small"
            required
            disabled={isEditing || saving}
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            inputProps={{ "aria-label": "Package Name" }}
          />
          <TextField
            label="Version"
            size="small"
            required
            disabled={saving}
            value={form.version}
            onChange={(e) => setForm((p) => ({ ...p, version: e.target.value }))}
            helperText={
              versionChanged
                ? "Changing the version will mark the current version as stale."
                : undefined
            }
            inputProps={{ "aria-label": "Version" }}
          />
          <TextField
            label="Version Range (optional)"
            size="small"
            disabled={saving}
            value={form.versionRange}
            onChange={(e) => setForm((p) => ({ ...p, versionRange: e.target.value }))}
            placeholder="e.g. ^4.18.0"
            inputProps={{ "aria-label": "Version Range" }}
          />
          <FormControl size="small">
            <InputLabel>Ecosystem</InputLabel>
            <Select
              label="Ecosystem"
              disabled={isEditing || saving}
              value={form.ecosystem}
              onChange={(e) =>
                setForm((p) => ({ ...p, ecosystem: e.target.value as DependencyEcosystem }))
              }
            >
              {ECOSYSTEMS.map((eco) => (
                <MenuItem key={eco} value={eco}>
                  {eco}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={!canSave}
        >
          {saving ? "Saving…" : "Save"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
