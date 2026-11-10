"use client";
import React, { useState } from "react";
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
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import { useServicePackageHistory } from "@/modules/service-package/hooks/useServicePackageHistory";
import type { PackageHistoryFilter } from "@/modules/service-package/types/types";

interface PackageHistoryDialogProps {
  open: boolean;
  companyId: string;
  environmentId: number;
  serviceId: number;
  accessToken: string;
  onClose: () => void;
}

type HistoryStatus = "ALL" | "STALE" | "REMOVED";

const STATUS_CHIP: Record<
  string,
  { label: string; color: "default" | "warning" | "error" }
> = {
  STALE: { label: "Stale", color: "warning" },
  REMOVED: { label: "Removed", color: "error" },
};

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function PackageHistoryDialog({
  open,
  companyId,
  environmentId,
  serviceId,
  accessToken,
  onClose,
}: PackageHistoryDialogProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<HistoryStatus>("ALL");

  const filter: PackageHistoryFilter = {
    search: search || undefined,
    status: statusFilter,
    sortBy: "deactivatedAt",
    sortOrder: "desc",
  };

  const { data, isLoading, error } = useServicePackageHistory(
    companyId,
    environmentId,
    serviceId,
    filter,
    accessToken,
    open,
  );

  const items = data?.data ?? [];

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Package History</DialogTitle>
      <DialogContent>
        <Box sx={{ display: "flex", gap: 2, mb: 2, mt: 1, flexWrap: "wrap" }}>
          <TextField
            label="Search"
            size="small"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ minWidth: 200 }}
          />
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel>Status</InputLabel>
            <Select
              label="Status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as HistoryStatus)}
            >
              <MenuItem value="ALL">All</MenuItem>
              <MenuItem value="STALE">Stale</MenuItem>
              <MenuItem value="REMOVED">Removed</MenuItem>
            </Select>
          </FormControl>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            Failed to load package history.
          </Alert>
        )}

        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Package Name</TableCell>
                <TableCell>Version</TableCell>
                <TableCell>Ecosystem</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Deactivated At</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                    <CircularProgress size={24} />
                  </TableCell>
                </TableRow>
              ) : items.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    align="center"
                    sx={{ py: 4, color: "text.secondary" }}
                  >
                    No history found.
                  </TableCell>
                </TableRow>
              ) : (
                items.map((sp) => {
                  const chip = STATUS_CHIP[sp.status] ?? { label: sp.status, color: "default" };
                  return (
                    <TableRow key={sp.id} hover>
                      <TableCell sx={{ fontWeight: 500 }}>{sp.package.name}</TableCell>
                      <TableCell>{sp.package.version}</TableCell>
                      <TableCell>
                        <Chip label={sp.package.ecosystem} size="small" />
                      </TableCell>
                      <TableCell>
                        <Chip label={chip.label} color={chip.color} size="small" />
                      </TableCell>
                      <TableCell>{formatDate(sp.deactivatedAt)}</TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
