"use client";
import { useTranslation } from "react-i18next";
import Box from "@/components/Box/Box";
import Card from "@/components/Card/Card";
import Grid from "@/components/Grid/Grid";

interface Feature {
  icon: string;
  titleKey: string;
  descKey: string;
}

const FEATURES: Feature[] = [
  { icon: "🔍", titleKey: "home-feature-scan-title", descKey: "home-feature-scan-desc" },
  { icon: "🛡️", titleKey: "home-feature-e2e-title", descKey: "home-feature-e2e-desc" },
  { icon: "📊", titleKey: "home-feature-reports-title", descKey: "home-feature-reports-desc" },
  { icon: "🔔", titleKey: "home-feature-alerts-title", descKey: "home-feature-alerts-desc" },
  { icon: "🔗", titleKey: "home-feature-webhook-title", descKey: "home-feature-webhook-desc" },
  { icon: "📦", titleKey: "home-feature-packages-title", descKey: "home-feature-packages-desc" },
];

const FeaturesSection = () => {
  const { t } = useTranslation();

  return (
    <Box sx={{ py: { xs: 8, md: 12 }, px: 2, bgcolor: "background.default" }}>
      <Box sx={{ maxWidth: 1100, mx: "auto" }}>
        <Box component="h2" sx={{ m: 0, mb: 2, textAlign: "center", fontSize: { xs: "1.5rem", md: "2rem" }, fontWeight: 700 }}>
          {t("home-features-title")}
        </Box>
        <Box component="p" sx={{ m: 0, mb: 6, textAlign: "center", color: "text.secondary", fontSize: "1rem", maxWidth: 560, mx: "auto" }}>
          {t("home-features-subtitle")}
        </Box>

        <Grid container spacing={3}>
          {FEATURES.map((f) => (
            <Grid item xs={12} sm={6} md={4} key={f.titleKey}>
              <Card
                sx={{
                  height: "100%",
                  p: 3,
                  display: "flex",
                  flexDirection: "column",
                  gap: 1.5,
                  borderRadius: 3,
                  boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
                  transition: "transform 0.2s, box-shadow 0.2s",
                  "&:hover": { transform: "translateY(-4px)", boxShadow: "0 6px 24px rgba(0,0,0,0.14)" },
                }}
              >
                <Box sx={{ fontSize: "2rem" }}>{f.icon}</Box>
                <Box component="h3" sx={{ m: 0, fontSize: "1.1rem", fontWeight: 600 }}>
                  {t(f.titleKey)}
                </Box>
                <Box component="p" sx={{ m: 0, color: "text.secondary", fontSize: "0.9rem", lineHeight: 1.6 }}>
                  {t(f.descKey)}
                </Box>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>
    </Box>
  );
};

export default FeaturesSection;
