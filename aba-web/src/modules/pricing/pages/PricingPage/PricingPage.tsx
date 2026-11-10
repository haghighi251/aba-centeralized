"use client";
import { useEffect, useState } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CardActions from "@mui/material/CardActions";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import CircularProgress from "@mui/material/CircularProgress";
import Alert from "@mui/material/Alert";
import CheckIcon from "@mui/icons-material/Check";
import { useRouter } from "next/navigation";
import {
  getSubscriptionPlans,
  SubscriptionPlan,
} from "@/contexts/subscription-plan/services/subscriptionPlanService";

type BillingCycle = "monthly" | "yearly";

function formatLimit(val: number | null, label: string): string {
  if (val === null) return `Unlimited ${label}`;
  return `Up to ${val} ${label}`;
}

function PlanCard({
  plan,
  billing,
  isPopular,
}: {
  plan: SubscriptionPlan;
  billing: BillingCycle;
  isPopular: boolean;
}) {
  const router = useRouter();
  const price = billing === "monthly" ? plan.monthlyPrice : plan.yearlyPrice;
  const isFree = plan.monthlyPrice === 0;

  const features: string[] = [
    formatLimit(plan.maxServices, "services"),
    formatLimit(plan.maxEnvironments, "environments"),
    formatLimit(plan.maxMonitoredBranches, "monitored branches"),
    "Vulnerability scanning",
    "E2E security testing",
    "Dashboard & reports",
  ];

  return (
    <Card
      elevation={isPopular ? 8 : 2}
      sx={{
        flex: "1 1 240px",
        maxWidth: 300,
        display: "flex",
        flexDirection: "column",
        border: isPopular ? "2px solid" : "1px solid",
        borderColor: isPopular ? "primary.main" : "divider",
        position: "relative",
      }}
    >
      {isPopular && (
        <Chip
          label="Most Popular"
          color="primary"
          size="small"
          sx={{
            position: "absolute",
            top: -12,
            left: "50%",
            transform: "translateX(-50%)",
            fontWeight: 700,
          }}
        />
      )}
      <CardContent sx={{ flexGrow: 1, pt: isPopular ? 4 : 3 }}>
        <Typography variant="h6" fontWeight={700} gutterBottom>
          {plan.name}
        </Typography>
        {plan.description && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {plan.description}
          </Typography>
        )}
        <Box sx={{ mb: 2 }}>
          {isFree ? (
            <Typography variant="h4" fontWeight={800}>
              Free
            </Typography>
          ) : (
            <>
              <Typography variant="h4" fontWeight={800} component="span">
                €{price}
              </Typography>
              <Typography variant="body2" color="text.secondary" component="span">
                {" "}
                / mo{billing === "yearly" ? " (billed yearly)" : ""}
              </Typography>
            </>
          )}
        </Box>
        <Divider sx={{ mb: 2 }} />
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
          {features.map((f) => (
            <Box key={f} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <CheckIcon fontSize="small" color="success" />
              <Typography variant="body2">{f}</Typography>
            </Box>
          ))}
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 1 }}>
            <CheckIcon fontSize="small" color="success" />
            <Typography variant="body2">Pay-as-you-go when limit reached</Typography>
          </Box>
        </Box>
      </CardContent>
      <CardActions sx={{ p: 2, pt: 0 }}>
        <Button
          fullWidth
          variant={isPopular ? "contained" : "outlined"}
          onClick={() => router.push("/register")}
        >
          {isFree ? "Get Started Free" : "Get Started"}
        </Button>
      </CardActions>
    </Card>
  );
}

export default function PricingPage() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [billing, setBilling] = useState<BillingCycle>("monthly");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getSubscriptionPlans()
      .then(setPlans)
      .catch(() => setError("Failed to load pricing plans. Please try again."))
      .finally(() => setLoading(false));
  }, []);

  const popularSlug = "professional";

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default", py: 8, px: 3 }}>
      <Box sx={{ maxWidth: 1100, mx: "auto" }}>
        <Typography variant="h3" fontWeight={800} align="center" gutterBottom>
          Simple, Transparent Pricing
        </Typography>
        <Typography
          variant="body1"
          color="text.secondary"
          align="center"
          sx={{ mb: 4, maxWidth: 560, mx: "auto" }}
        >
          Choose the plan that fits your team. All plans include pay-as-you-go
          billing when you exceed your limit — no hard cutoffs.
        </Typography>

        <Box sx={{ display: "flex", justifyContent: "center", mb: 5 }}>
          <ToggleButtonGroup
            value={billing}
            exclusive
            onChange={(_, val) => val && setBilling(val)}
            size="small"
          >
            <ToggleButton value="monthly">Monthly</ToggleButton>
            <ToggleButton value="yearly">
              Yearly{" "}
              <Chip label="Save up to 10%" size="small" color="success" sx={{ ml: 1 }} />
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>

        {loading && (
          <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
            <CircularProgress />
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {!loading && !error && (
          <Box
            sx={{
              display: "flex",
              gap: 3,
              flexWrap: "wrap",
              justifyContent: "center",
              alignItems: "stretch",
            }}
          >
            {plans.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                billing={billing}
                isPopular={plan.slug === popularSlug}
              />
            ))}
          </Box>
        )}

        <Box sx={{ mt: 8, textAlign: "center" }}>
          <Typography variant="h6" fontWeight={700} gutterBottom>
            Need a custom plan?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Contact us for enterprise pricing, custom limits, and dedicated support.
          </Typography>
          <Button variant="outlined" size="large" href="mailto:contact@abasecurity.io">
            Contact Sales
          </Button>
        </Box>
      </Box>
    </Box>
  );
}
