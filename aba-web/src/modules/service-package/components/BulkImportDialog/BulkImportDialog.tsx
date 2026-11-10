"use client";
import React, { useRef, useState } from "react";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";
import CircularProgress from "@mui/material/CircularProgress";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import type { DependencyEcosystem, BulkPackageItem, BulkImportResult } from "@/modules/service-package/types/types";

const ECOSYSTEMS: DependencyEcosystem[] = [
  "NPM", "PYPI", "MAVEN", "RUBYGEMS", "NUGET", "GO", "OTHER",
];

interface BulkImportDialogProps {
  open: boolean;
  importing: boolean;
  error: string | null;
  result: BulkImportResult | null;
  onClose: () => void;
  onImport: (packages: BulkPackageItem[], ecosystem: DependencyEcosystem) => void;
}

function parsePackageJson(content: string): BulkPackageItem[] {
  const json = JSON.parse(content);
  const merged: Record<string, string> = {
    ...json.dependencies,
    ...json.devDependencies,
    ...json.optionalDependencies,
  };
  return Object.entries(merged)
    .filter(([, version]) => typeof version === "string")
    .map(([name, version]) => ({
      name,
      version: (version as string).replace(/^[\^~>=<]/, "").trim(),
      versionRange: (version as string).trim(),
    }));
}

export default function BulkImportDialog({
  open,
  importing,
  error,
  result,
  onClose,
  onImport,
}: BulkImportDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [ecosystem, setEcosystem] = useState<DependencyEcosystem>("NPM");
  const [preview, setPreview] = useState<BulkPackageItem[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setParseError(null);
    setPreview([]);

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const items = parsePackageJson(ev.target?.result as string);
        if (items.length === 0) {
          setParseError("No packages found in the uploaded file.");
          return;
        }
        setPreview(items);
      } catch {
        setParseError("Failed to parse file. Please upload a valid package.json.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleClose = () => {
    if (importing) return;
    setPreview([]);
    setParseError(null);
    onClose();
  };

  const handleImport = () => {
    if (preview.length === 0 || importing) return;
    onImport(preview, ecosystem);
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Upload package.json</DialogTitle>
      <DialogContent>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
          {result && (
            <Alert severity="success">
              Import complete — Added: {result.added}, Updated: {result.updated},
              Unchanged: {result.unchanged}, Staled: {result.staled}
            </Alert>
          )}
          {(error || parseError) && (
            <Alert severity="error">{error ?? parseError}</Alert>
          )}

          <FormControl size="small">
            <InputLabel>Ecosystem</InputLabel>
            <Select
              label="Ecosystem"
              value={ecosystem}
              disabled={importing}
              onChange={(e) => setEcosystem(e.target.value as DependencyEcosystem)}
            >
              {ECOSYSTEMS.map((eco) => (
                <MenuItem key={eco} value={eco}>
                  {eco}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Box>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              style={{ display: "none" }}
              onChange={handleFileChange}
              aria-label="Choose package.json file"
            />
            <Button
              variant="outlined"
              startIcon={<UploadFileIcon />}
              disabled={importing}
              onClick={() => fileInputRef.current?.click()}
            >
              Choose package.json
            </Button>
          </Box>

          {preview.length > 0 && (
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                Found {preview.length} package{preview.length !== 1 ? "s" : ""} to import:
              </Typography>
              <Box
                sx={{
                  border: 1,
                  borderColor: "divider",
                  borderRadius: 1,
                  maxHeight: 200,
                  overflow: "auto",
                }}
              >
                <List dense disablePadding>
                  {preview.slice(0, 100).map((pkg) => (
                    <ListItem key={pkg.name} divider>
                      <ListItemText
                        primary={pkg.name}
                        secondary={pkg.version}
                        primaryTypographyProps={{ variant: "body2", fontWeight: 500 }}
                        secondaryTypographyProps={{ variant: "caption" }}
                      />
                    </ListItem>
                  ))}
                  {preview.length > 100 && (
                    <ListItem>
                      <ListItemText
                        primary={`… and ${preview.length - 100} more`}
                        primaryTypographyProps={{ variant: "caption", color: "text.secondary" }}
                      />
                    </ListItem>
                  )}
                </List>
              </Box>
            </Box>
          )}

          {importing && (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <CircularProgress size={16} />
              <Typography variant="body2" color="text.secondary">
                Importing…
              </Typography>
            </Box>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={importing}>
          {result ? "Close" : "Cancel"}
        </Button>
        {preview.length > 0 && !result && (
          <Button
            variant="contained"
            onClick={handleImport}
            disabled={importing}
          >
            Import ({preview.length})
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
