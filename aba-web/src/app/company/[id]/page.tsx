"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useParams, useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Paper from "@mui/material/Paper";
import Grid from "@mui/material/Grid";
import Chip from "@mui/material/Chip";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import CircularProgress from "@mui/material/CircularProgress";
import Alert from "@mui/material/Alert";
import PeopleIcon from "@mui/icons-material/People";
import BusinessIcon from "@mui/icons-material/Business";
import EditIcon from "@mui/icons-material/Edit";
import GroupsIcon from "@mui/icons-material/Groups";
import LayersIcon from "@mui/icons-material/Layers";
import PaymentIcon from "@mui/icons-material/Payment";
import LinearProgress from "@mui/material/LinearProgress";
import Tooltip from "@mui/material/Tooltip";
import {
  getCompanyDetails,
  getCompanyStats,
  CompanyDetail,
  CompanyStats,
} from "@/contexts/company/services/companyDashboardService";

/** Human-readable label for each company status value */
const STATUS_COLOR: Record<string, "success" | "warning" | "error" | "default"> = {
  ACTIVE:    "success",
  PENDING:   "warning",
  SUSPENDED: "error",
  INACTIVE:  "default",
};

/** Human-readable label for each business role */
const ROLE_LABEL: Record<string, string> = {
  BUSINESS_OWNER:  "Business Owner",
  BUSINESS_ADMIN:  "Business Admin",
  BUSINESS_MEMBER: "Member",
};

function PlanUsageBar({ label, used, max }: { label: string; used: number; max: number | null }) {
  const isUnlimited = max === null;
  const pct = isUnlimited ? 0 : Math.min((used / max) * 100, 100);
  const isAtLimit = !isUnlimited && used >= max;
  const color = isAtLimit ? "error" : pct >= 80 ? "warning" : "primary";

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
        <Typography variant="body2">{label}</Typography>
        <Typography variant="body2" color={isAtLimit ? "error.main" : "text.secondary"}>
          {isUnlimited ? `${used} / Unlimited` : `${used} / ${max}`}
        </Typography>
      </Box>
      {!isUnlimited && (
        <Tooltip title={`${Math.round(pct)}% used`}>
          <LinearProgress
            variant="determinate"
            value={pct}
            color={color}
            sx={{ height: 6, borderRadius: 3 }}
          />
        </Tooltip>
      )}
    </Box>
  );
}

/**
 * Company dashboard landing page.
 *
 * Displays a personalised welcome message, the company's current status,
 * and a summary of how many users belong to the company.  It is intentionally
 * lightweight — editing company details lives on the /details sub-page.
 */
export default function CompanyDashboardPage() {
  const { data: session } = useSession();
  const params            = useParams();
  const router            = useRouter();
  const id                = params.id as string;

  // Extract user context from the next-auth session
  const user      = session?.user as any;
  const token     = (user?.tokens?.accessToken ?? "") as string;
  const userName  = (user?.name ?? "there") as string;
  const role      = (user?.role ?? "") as string;

  const [company, setCompany] = useState<CompanyDetail | null>(null);
  const [stats, setStats] = useState<CompanyStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  /**
   * Fetch company details and dashboard stats on mount so the dashboard can
   * show the company name, status, member count, and team/environment
   * counts without extra navigation.
   */
  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    Promise.all([getCompanyDetails(id, token), getCompanyStats(id, token)])
      .then(([companyDetail, companyStats]) => {
        setCompany(companyDetail);
        setStats(companyStats);
      })
      .catch(() => setError("Could not load company information."))
      .finally(() => setLoading(false));
  }, [id, token]);

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", pt: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* ── Welcome banner ──────────────────────────────────────────────── */}
      <Paper
        elevation={0}
        sx={{
          p: 4,
          mb: 3,
          borderRadius: 2,
          background: "linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)",
          color: "#fff",
        }}
      >
        <Typography variant="h4" fontWeight={700} gutterBottom>
          Welcome back, {userName}!
        </Typography>
        <Typography variant="body1" sx={{ opacity: 0.9 }}>
          {ROLE_LABEL[role] ?? role} at{" "}
          <strong>{company?.username ?? "your company"}</strong>
        </Typography>
      </Paper>

      {/* ── Company overview cards ────────────────────────────────────── */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {/* Company identity card */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper sx={{ p: 3, height: "100%" }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
              <BusinessIcon color="primary" />
              <Typography variant="subtitle1" fontWeight={600}>
                Company
              </Typography>
            </Box>
            <Divider sx={{ mb: 1.5 }} />
            <Typography variant="h6" fontWeight={700} gutterBottom>
              {company?.username ?? "—"}
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {company?.email ?? "—"}
            </Typography>
            {company && (
              <Chip
                label={company.status}
                color={STATUS_COLOR[company.status] ?? "default"}
                size="small"
                sx={{ mt: 0.5 }}
              />
            )}
          </Paper>
        </Grid>

        {/* Member count card */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper sx={{ p: 3, height: "100%" }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
              <PeopleIcon color="primary" />
              <Typography variant="subtitle1" fontWeight={600}>
                Team Members
              </Typography>
            </Box>
            <Divider sx={{ mb: 1.5 }} />
            {/* _count.users is returned by the backend's findById include */}
            <Typography variant="h3" fontWeight={700}>
              {company?._count?.users ?? "—"}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              registered user{(company?._count?.users ?? 0) !== 1 ? "s" : ""}
            </Typography>
          </Paper>
        </Grid>

        {/* Teams count card */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper sx={{ p: 3, height: "100%" }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
              <GroupsIcon color="primary" />
              <Typography variant="subtitle1" fontWeight={600}>
                Teams
              </Typography>
            </Box>
            <Divider sx={{ mb: 1.5 }} />
            <Typography variant="h3" fontWeight={700}>
              {stats?.teamsCount ?? "—"}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              team{(stats?.teamsCount ?? 0) !== 1 ? "s" : ""}
            </Typography>
          </Paper>
        </Grid>

        {/* Environments count card */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper sx={{ p: 3, height: "100%" }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
              <LayersIcon color="primary" />
              <Typography variant="subtitle1" fontWeight={600}>
                Environments
              </Typography>
            </Box>
            <Divider sx={{ mb: 1.5 }} />
            <Typography variant="h3" fontWeight={700}>
              {stats?.environmentsCount ?? "—"}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              environment{(stats?.environmentsCount ?? 0) !== 1 ? "s" : ""}
            </Typography>
          </Paper>
        </Grid>

        {/* Plan & usage card */}
        <Grid size={{ xs: 12 }}>
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1.5 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <PaymentIcon color="primary" />
                <Typography variant="subtitle1" fontWeight={600}>
                  Current Plan
                </Typography>
              </Box>
              <Button variant="outlined" size="small" onClick={() => router.push("/pricing")}>
                View Plans
              </Button>
            </Box>
            <Divider sx={{ mb: 2 }} />
            <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2, flexWrap: "wrap" }}>
              <Typography variant="h6" fontWeight={700}>
                {company?.subscriptionPlan?.name ?? "No plan assigned"}
              </Typography>
              {company?.subscriptionPlan && (
                <Chip
                  label={company.subscriptionPlan.monthlyPrice === 0 ? "Free" : `€${company.subscriptionPlan.monthlyPrice}/mo`}
                  color={company.subscriptionPlan.monthlyPrice === 0 ? "default" : "primary"}
                  size="small"
                />
              )}
              {company?.payAsYouGo && (
                <Chip label="Pay-as-you-go enabled" color="success" size="small" variant="outlined" />
              )}
            </Box>
            {stats && company?.subscriptionPlan && (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                <PlanUsageBar
                  label="Services"
                  used={stats.servicesCount}
                  max={company.subscriptionPlan.maxServices}
                />
                <PlanUsageBar
                  label="Environments"
                  used={stats.environmentsCount}
                  max={company.subscriptionPlan.maxEnvironments}
                />
                {company.subscriptionPlan.maxMonitoredBranches !== null && (
                  <PlanUsageBar
                    label="Monitored Branches"
                    used={0}
                    max={company.subscriptionPlan.maxMonitoredBranches}
                  />
                )}
              </Box>
            )}
            {!company?.subscriptionPlan && (
              <Typography variant="body2" color="text.secondary">
                Contact your platform administrator to assign a subscription plan.
              </Typography>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* ── Quick-action buttons ──────────────────────────────────────── */}
      <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
        <Button
          variant="outlined"
          startIcon={<EditIcon />}
          onClick={() => router.push(`/company/${id}/details`)}
        >
          Edit Business Details
        </Button>
        <Button
          variant="outlined"
          startIcon={<GroupsIcon />}
          onClick={() => router.push(`/company/${id}/teams`)}
        >
          Manage Teams
        </Button>
        <Button
          variant="outlined"
          startIcon={<LayersIcon />}
          onClick={() => router.push(`/company/${id}/environments`)}
        >
          Manage Environments
        </Button>
        {/* Only owners and admins can manage users */}
        {(role === "BUSINESS_OWNER" || role === "BUSINESS_ADMIN") && (
          <Button
            variant="outlined"
            startIcon={<PeopleIcon />}
            onClick={() => router.push(`/company/${id}/users`)}
          >
            Manage Users
          </Button>
        )}
      </Box>
    </Box>
  );
}
