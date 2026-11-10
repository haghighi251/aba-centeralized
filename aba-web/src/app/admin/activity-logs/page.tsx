"use client";
import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
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
import TablePagination from "@mui/material/TablePagination";
import Paper from "@mui/material/Paper";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Alert from "@mui/material/Alert";
import {
  getActivityLogs,
  ActivityEventType,
  ActivityLogFilter,
  ActivityLogRow,
} from "@/contexts/admin/services/adminService";

const EVENT_TYPE_OPTIONS: Array<ActivityEventType | ""> = [
  "",
  "NOTIFICATION_SENT",
  "NOTIFICATION_SKIPPED",
  "PACKAGE_VULN_VIEWED",
  "PACKAGE_UPDATED",
  "PACKAGE_MUTED",
  "PACKAGE_UNMUTED",
  "PACKAGE_SNOOZED",
  "PACKAGE_REMOVED",
];

const EVENT_TYPE_COLOR: Record<ActivityEventType, "success" | "default" | "error" | "warning" | "info"> = {
  NOTIFICATION_SENT: "success",
  NOTIFICATION_SKIPPED: "warning",
  PACKAGE_VULN_VIEWED: "info",
  PACKAGE_UPDATED: "default",
  PACKAGE_MUTED: "warning",
  PACKAGE_UNMUTED: "success",
  PACKAGE_SNOOZED: "warning",
  PACKAGE_REMOVED: "error",
};

function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AdminActivityLogsPage() {
  const { data: session } = useSession();
  const accessToken = (session?.user as any)?.tokens?.accessToken ?? "";

  const [rows, setRows] = useState<ActivityLogRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [companyId, setCompanyId] = useState("");
  const [environmentId, setEnvironmentId] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [eventType, setEventType] = useState<ActivityEventType | "">("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);

  const fetchData = useCallback(async (filter: ActivityLogFilter) => {
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    try {
      const result = await getActivityLogs(filter, accessToken);
      setRows(result.data);
      setTotal(result.total);
    } catch {
      setError("Failed to load activity logs. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    fetchData({
      page: page + 1,
      limit: rowsPerPage,
      companyId: companyId ? Number(companyId) : undefined,
      environmentId: environmentId ? Number(environmentId) : undefined,
      serviceId: serviceId ? Number(serviceId) : undefined,
      eventType: eventType || undefined,
      from: from ? new Date(from).toISOString() : undefined,
      to: to ? new Date(to).toISOString() : undefined,
    });
  }, [fetchData, page, rowsPerPage, companyId, environmentId, serviceId, eventType, from, to]);

  const resetPage = () => setPage(0);

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} mb={3}>
        Activity Log
      </Typography>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 2, display: "flex", gap: 2, flexWrap: "wrap" }}>
        <TextField
          label="Company ID"
          size="small"
          value={companyId}
          onChange={(e) => { setCompanyId(e.target.value); resetPage(); }}
          sx={{ width: 130 }}
        />
        <TextField
          label="Environment ID"
          size="small"
          value={environmentId}
          onChange={(e) => { setEnvironmentId(e.target.value); resetPage(); }}
          sx={{ width: 140 }}
        />
        <TextField
          label="Service ID"
          size="small"
          value={serviceId}
          onChange={(e) => { setServiceId(e.target.value); resetPage(); }}
          sx={{ width: 130 }}
        />
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel>Event Type</InputLabel>
          <Select
            label="Event Type"
            value={eventType}
            onChange={(e) => { setEventType(e.target.value as ActivityEventType | ""); resetPage(); }}
          >
            {EVENT_TYPE_OPTIONS.map((t) => (
              <MenuItem key={t} value={t}>{t || "All"}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <TextField
          label="From"
          type="datetime-local"
          size="small"
          value={from}
          onChange={(e) => { setFrom(e.target.value); resetPage(); }}
          InputLabelProps={{ shrink: true }}
        />
        <TextField
          label="To"
          type="datetime-local"
          size="small"
          value={to}
          onChange={(e) => { setTo(e.target.value); resetPage(); }}
          InputLabelProps={{ shrink: true }}
        />
      </Paper>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* Table */}
      <Paper>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Time</TableCell>
                <TableCell>Event</TableCell>
                <TableCell>Company</TableCell>
                <TableCell>Environment</TableCell>
                <TableCell>Service</TableCell>
                <TableCell>Actor</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                    <CircularProgress size={28} />
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4, color: "text.secondary" }}>
                    No activity found for the current filters.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => (
                  <TableRow key={row.id} hover>
                    <TableCell>{formatTimestamp(row.timestamp)}</TableCell>
                    <TableCell>
                      <Chip label={row.eventType} size="small" color={EVENT_TYPE_COLOR[row.eventType] ?? "default"} />
                    </TableCell>
                    <TableCell>{row.companyId}</TableCell>
                    <TableCell>{row.environmentId ?? "—"}</TableCell>
                    <TableCell>{row.serviceId ?? "—"}</TableCell>
                    <TableCell>{row.actorUserId ?? "system"}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          component="div"
          count={total}
          page={page}
          rowsPerPage={rowsPerPage}
          onPageChange={(_, p) => setPage(p)}
          onRowsPerPageChange={(e) => { setRowsPerPage(Number(e.target.value)); setPage(0); }}
          rowsPerPageOptions={[10, 20, 50]}
        />
      </Paper>
    </Box>
  );
}
