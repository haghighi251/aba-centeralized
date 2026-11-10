"use client";
import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Grid from "@mui/material/Grid";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
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
import PeopleIcon from "@mui/icons-material/People";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import PauseCircleIcon from "@mui/icons-material/PauseCircle";
import BlockIcon from "@mui/icons-material/Block";
import HourglassIcon from "@mui/icons-material/HourglassEmpty";
import {
  getCompanies,
  updateCompanyStatus,
  CompanyFilter,
  CompanyKpis,
  CompanyRow,
  CompanyStatus,
} from "@/contexts/admin/services/adminService";

const STATUS_COLORS: Record<string, "success" | "default" | "error" | "warning"> = {
  ACTIVE: "success",
  INACTIVE: "default",
  SUSPENDED: "error",
  PENDING: "warning",
};

interface KpiCardProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  active: boolean;
  onClick: () => void;
}

function KpiCard({ label, value, icon, color, active, onClick }: KpiCardProps) {
  return (
    <Card
      onClick={onClick}
      sx={{
        cursor: "pointer",
        border: active ? `2px solid ${color}` : "2px solid transparent",
        transition: "border 0.2s",
        "&:hover": { boxShadow: 4 },
      }}
    >
      <CardContent sx={{ display: "flex", alignItems: "center", gap: 2 }}>
        <Box sx={{ color, fontSize: 40, display: "flex" }}>{icon}</Box>
        <Box>
          <Typography variant="h4" fontWeight={700}>{value}</Typography>
          <Typography variant="body2" color="text.secondary">{label}</Typography>
        </Box>
      </CardContent>
    </Card>
  );
}

const STATUS_OPTIONS = ["", "ACTIVE", "INACTIVE", "SUSPENDED", "PENDING"];

export default function CustomersPage() {
  const { data: session } = useSession();
  const accessToken = (session?.user as any)?.tokens?.accessToken ?? "";

  const [rows, setRows] = useState<CompanyRow[]>([]);
  const [kpis, setKpis] = useState<CompanyKpis>({ total: 0, active: 0, inactive: 0, suspended: 0, pending: 0 });
  const [total, setTotal] = useState(0);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const [search, setSearch]       = useState("");
  const [status, setStatus]       = useState("");
  const [page, setPage]           = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);

  const fetchData = useCallback(async (filter: CompanyFilter) => {
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    try {
      const result = await getCompanies(filter, accessToken);
      setRows(result.data);
      setTotal(result.total);
      setKpis(result.kpis);
    } catch {
      setError("Failed to load customers. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    fetchData({ page: page + 1, limit: rowsPerPage, search: search || undefined, status: status || undefined });
  }, [fetchData, page, rowsPerPage, search, status]);

  const handleKpiClick = (clickedStatus: string) => {
    setStatus((prev) => prev === clickedStatus ? "" : clickedStatus);
    setPage(0);
  };

  const handleStatusChange = async (companyId: number, newStatus: CompanyStatus) => {
    setUpdatingId(companyId);
    try {
      const updated = await updateCompanyStatus(companyId, newStatus, accessToken);
      setRows((prev) => prev.map((r) => r.id === companyId ? { ...r, status: updated.status } : r));
      setKpis(await getCompanies(
        { page: page + 1, limit: rowsPerPage, search: search || undefined, status: status || undefined },
        accessToken,
      ).then((r) => r.kpis));
    } catch {
      setError("Failed to update company status.");
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} mb={3}>
        Customers
      </Typography>

      {/* KPI cards */}
      <Grid container spacing={2} mb={3}>
        {[
          { label: "Total",     value: kpis.total,     key: "",           icon: <PeopleIcon fontSize="inherit" />,       color: "#1976d2" },
          { label: "Active",    value: kpis.active,    key: "ACTIVE",     icon: <CheckCircleIcon fontSize="inherit" />,  color: "#2e7d32" },
          { label: "Inactive",  value: kpis.inactive,  key: "INACTIVE",   icon: <PauseCircleIcon fontSize="inherit" />,  color: "#757575" },
          { label: "Suspended", value: kpis.suspended, key: "SUSPENDED",  icon: <BlockIcon fontSize="inherit" />,        color: "#c62828" },
          { label: "Pending",   value: kpis.pending,   key: "PENDING",    icon: <HourglassIcon fontSize="inherit" />,    color: "#e65100" },
        ].map((kpi) => (
          <Grid size={{ xs: 12, sm: 6, md: 2.4 }} key={kpi.label}>
            <KpiCard
              label={kpi.label}
              value={kpi.value}
              icon={kpi.icon}
              color={kpi.color}
              active={status === kpi.key}
              onClick={() => handleKpiClick(kpi.key)}
            />
          </Grid>
        ))}
      </Grid>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 2, display: "flex", gap: 2, flexWrap: "wrap" }}>
        <TextField
          label="Search"
          size="small"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          sx={{ minWidth: 220 }}
        />
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>Status</InputLabel>
          <Select
            label="Status"
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(0); }}
          >
            {STATUS_OPTIONS.map((s) => (
              <MenuItem key={s} value={s}>{s || "All"}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Paper>

      {/* Error */}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* Table */}
      <Paper>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Company</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Website</TableCell>
                <TableCell>City</TableCell>
                <TableCell>Country</TableCell>
                <TableCell>Registered</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                    <CircularProgress size={28} />
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4, color: "text.secondary" }}>
                    No customers found.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => (
                  <TableRow key={row.id} hover>
                    <TableCell sx={{ fontWeight: 500 }}>{row.username}</TableCell>
                    <TableCell>{row.email}</TableCell>
                    <TableCell>
                      <Select
                        value={row.status}
                        size="small"
                        disabled={updatingId === row.id}
                        onChange={(e) => handleStatusChange(row.id, e.target.value as CompanyStatus)}
                        sx={{ minWidth: 130 }}
                        renderValue={(v) => (
                          <Chip
                            label={v}
                            color={STATUS_COLORS[v] ?? "default"}
                            size="small"
                            sx={{ pointerEvents: "none" }}
                          />
                        )}
                      >
                        {(["ACTIVE", "INACTIVE", "SUSPENDED", "PENDING"] as CompanyStatus[]).map((s) => (
                          <MenuItem key={s} value={s}>
                            <Chip label={s} color={STATUS_COLORS[s] ?? "default"} size="small" />
                          </MenuItem>
                        ))}
                      </Select>
                    </TableCell>
                    <TableCell>{row.website ?? "â€”"}</TableCell>
                    <TableCell>{row.city ?? "â€”"}</TableCell>
                    <TableCell>{row.country ?? "â€”"}</TableCell>
                    <TableCell>
                      {new Date(row.createdAt).toLocaleDateString()}
                    </TableCell>
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

