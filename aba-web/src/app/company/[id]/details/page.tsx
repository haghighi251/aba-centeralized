"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useParams } from "next/navigation";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Paper from "@mui/material/Paper";
import Grid from "@mui/material/Grid";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import CircularProgress from "@mui/material/CircularProgress";
import Chip from "@mui/material/Chip";
import {
  getCompanyDetails,
  updateCompanyDetails,
  CompanyDetail,
  UpdateCompanyPayload,
} from "@/contexts/company/services/companyDashboardService";

/**
 * Roles that are allowed to save changes to the company profile.
 * BUSINESS_MEMBER is intentionally excluded — they can view but not edit.
 */
const EDITABLE_ROLES = ["BUSINESS_OWNER", "BUSINESS_ADMIN"];

/**
 * Business Details page — /company/[id]/details
 *
 * Shows all editable fields for the company (email, website, address, etc.).
 * BUSINESS_OWNER and BUSINESS_ADMIN can modify these fields;
 * BUSINESS_MEMBER sees the same form in read-only mode.
 *
 * The company username (slug) is intentionally read-only here because
 * changing it would break existing links — it can only be changed by a
 * platform admin.
 */
export default function BusinessDetailsPage() {
  const { data: session } = useSession();
  const params            = useParams();
  const id                = params.id as string;

  // Pull auth context from the next-auth session
  const user     = session?.user as any;
  const token    = (user?.tokens?.accessToken ?? "") as string;
  const role     = (user?.role ?? "") as string;
  const canEdit  = EDITABLE_ROLES.includes(role);

  const [company, setCompany] = useState<CompanyDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  /**
   * Controlled form state — mirrors the editable fields of the company.
   * Populated once the company data loads; kept in sync with user input.
   */
  const [form, setForm] = useState<UpdateCompanyPayload>({});

  /** Load the company profile when the component mounts or the token changes */
  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    getCompanyDetails(id, token)
      .then((c) => {
        setCompany(c);
        // Pre-populate the form with current values so the user sees existing data
        setForm({
          email:      c.email,
          website:    c.website      ?? "",
          address:    c.address      ?? "",
          city:       c.city         ?? "",
          state:      c.state        ?? "",
          country:    c.country      ?? "",
          postalCode: c.postalCode   ?? "",
        });
      })
      .catch(() => setError("Failed to load company details."))
      .finally(() => setLoading(false));
  }, [id, token]);

  /**
   * Returns an onChange handler for the given form field.
   * Uses a curried function to avoid repeating the pattern for every field.
   */
  const handleChange =
    (field: keyof UpdateCompanyPayload) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }));

  /**
   * Submit the edited company fields to the backend.
   * Only called when canEdit is true (guarded by the Save button's visibility).
   */
  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      const updated = await updateCompanyDetails(id, form, token);
      setCompany(updated);
      setSuccess(true);
    } catch {
      setError("Failed to save changes. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", pt: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {/* Page header — includes the current status chip as a quick reference */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3 }}>
        <Typography variant="h5" fontWeight={700}>
          Business Details
        </Typography>
        {company && (
          <Chip
            label={company.status}
            color={company.status === "ACTIVE" ? "success" : "default"}
            size="small"
          />
        )}
        {!canEdit && (
          <Chip label="View only" size="small" variant="outlined" color="info" />
        )}
      </Box>

      {/* Feedback banners */}
      {error   && (
        <Alert severity="error"   sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(false)}>
          Changes saved successfully.
        </Alert>
      )}

      <Paper sx={{ p: 3 }}>
        <Grid container spacing={2}>
          {/* Username is read-only — changing it would break existing references */}
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              label="Company Username"
              value={company?.username ?? ""}
              fullWidth
              size="small"
              InputProps={{ readOnly: true }}
              helperText="Contact a platform admin to change the company username."
            />
          </Grid>

          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              label="Email"
              value={form.email ?? ""}
              onChange={handleChange("email")}
              fullWidth
              size="small"
              disabled={!canEdit}
              type="email"
            />
          </Grid>

          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              label="Website"
              value={form.website ?? ""}
              onChange={handleChange("website")}
              fullWidth
              size="small"
              disabled={!canEdit}
            />
          </Grid>

          <Grid size={{ xs: 12 }}>
            <TextField
              label="Address"
              value={form.address ?? ""}
              onChange={handleChange("address")}
              fullWidth
              size="small"
              disabled={!canEdit}
            />
          </Grid>

          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField
              label="City"
              value={form.city ?? ""}
              onChange={handleChange("city")}
              fullWidth
              size="small"
              disabled={!canEdit}
            />
          </Grid>

          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField
              label="State / Province"
              value={form.state ?? ""}
              onChange={handleChange("state")}
              fullWidth
              size="small"
              disabled={!canEdit}
            />
          </Grid>

          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField
              label="Postal Code"
              value={form.postalCode ?? ""}
              onChange={handleChange("postalCode")}
              fullWidth
              size="small"
              disabled={!canEdit}
            />
          </Grid>

          <Grid size={{ xs: 12 }}>
            <TextField
              label="Country"
              value={form.country ?? ""}
              onChange={handleChange("country")}
              fullWidth
              size="small"
              disabled={!canEdit}
            />
          </Grid>

          {/* Save button is only rendered for roles that can edit */}
          {canEdit && (
            <Grid size={{ xs: 12 }}>
              <Button
                variant="contained"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? "Saving…" : "Save Changes"}
              </Button>
            </Grid>
          )}
        </Grid>
      </Paper>
    </Box>
  );
}
