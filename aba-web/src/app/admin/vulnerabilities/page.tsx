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
import Tooltip from "@mui/material/Tooltip";
import CircularProgress from "@mui/material/CircularProgress";
import Alert from "@mui/material/Alert";
import ShieldIcon from "@mui/icons-material/Shield";
import DnsIcon from "@mui/icons-material/Dns";
import NotificationsIcon from "@mui/icons-material/Notifications";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import {
  getCompaniesWithVulnerabilities,
  CompanyFilter,
  CompanyVulnerabilitySummaryRow,
} from "@/contexts/admin/services/adminService";

interface KpiCardProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
}

function KpiCard({ label, value, icon, color }: KpiCardProps) {
  return (
    <Card>
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

export default function AdminVulnerabilitiesPage() {
  const { data: session } = useSession();
  const accessToken = (session?.user as any)?.tokens?.accessToken ?? "";

  const [rows, setRows] = useState<CompanyVulnerabilitySummaryRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);

  const fetchData = useCallback(async (filter: CompanyFilter) => {
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    try {
      const result = await getCompaniesWithVulnerabilities(filter, accessToken);
      setRows(result.data);
      setTotal(result.total);
    } catch {
      setError("Failed to load companies. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    fetchData({ page: page + 1, limit: rowsPerPage, search: search || undefined, status: status || undefined });
  }, [fetchData, page, rowsPerPage, search, status]);

  const totalVulnerablePackages = rows.reduce((sum, r) => sum + r.vulnerablePackageCount, 0);
  const totalAffectedServices = rows.reduce((sum, r) => sum + r.affectedServiceCount, 0);
  const totalNotifications = rows.reduce((sum, r) => sum + r.notificationCount, 0);
  const companiesWithoutOwner = rows.filter((r) => !r.hasPrimaryOwner).length;

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} mb={3}>
        Companies with Vulnerabilities
      </Typography>

      {/* KPI cards */}
      <Grid container spacing={2} mb={3}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <KpiCard label="Vulnerable packages (this page)" value={totalVulnerablePackages} icon={<ShieldIcon fontSize="inherit" />} color="#c62828" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <KpiCard label="Affected services (this page)" value={totalAffectedServices} icon={<DnsIcon fontSize="inherit" />} color="#e65100" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <KpiCard label="Notifications sent (this page)" value={totalNotifications} icon={<NotificationsIcon fontSize="inherit" />} color="#1976d2" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <KpiCard label="Missing a primary owner" value={companiesWithoutOwner} icon={<WarningAmberIcon fontSize="inherit" />} color="#757575" />
        </Grid>
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

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* Table */}
      <Paper>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Company</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Vulnerable Packages</TableCell>
                <TableCell align="right">Affected Services</TableCell>
                <TableCell align="right">Notifications Sent</TableCell>
                <TableCell>Primary Owner</TableCell>
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
                    No companies found.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => (
                  <TableRow key={row.id} hover>
                    <TableCell sx={{ fontWeight: 500 }}>{row.username}</TableCell>
                    <TableCell>
                      <Chip label={row.status} size="small" />
                    </TableCell>
                    <TableCell align="right">
                      {row.vulnerablePackageCount > 0 ? (
                        <Chip label={row.vulnerablePackageCount} color="error" size="small" />
                      ) : (
                        row.vulnerablePackageCount
                      )}
                    </TableCell>
                    <TableCell align="right">{row.affectedServiceCount}</TableCell>
                    <TableCell align="right">{row.notificationCount}</TableCell>
                    <TableCell>
                      {row.hasPrimaryOwner ? (
                        <Chip label="Set" color="success" size="small" variant="outlined" />
                      ) : (
                        <Tooltip title="No BUSINESS_OWNER has been designated as primary — this company can never receive the top-admin half of a vulnerability digest.">
                          <Chip label="Missing" color="warning" size="small" />
                        </Tooltip>
                      )}
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
