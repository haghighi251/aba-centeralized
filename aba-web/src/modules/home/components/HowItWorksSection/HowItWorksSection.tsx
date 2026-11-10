"use client";
import { useTranslation } from "react-i18next";
import Box from "@/components/Box/Box";

interface Step {
  number: number;
  titleKey: string;
  descKey: string;
}

const STEPS: Step[] = [
  { number: 1, titleKey: "home-step-1-title", descKey: "home-step-1-desc" },
  { number: 2, titleKey: "home-step-2-title", descKey: "home-step-2-desc" },
  { number: 3, titleKey: "home-step-3-title", descKey: "home-step-3-desc" },
  { number: 4, titleKey: "home-step-4-title", descKey: "home-step-4-desc" },
];

const HowItWorksSection = () => {
  const { t } = useTranslation();

  return (
    <Box sx={{ py: { xs: 8, md: 12 }, px: 2, bgcolor: "action.hover" }}>
      <Box sx={{ maxWidth: 860, mx: "auto" }}>
        <Box component="h2" sx={{ m: 0, mb: 2, textAlign: "center", fontSize: { xs: "1.5rem", md: "2rem" }, fontWeight: 700 }}>
          {t("home-how-title")}
        </Box>
        <Box component="p" sx={{ m: 0, mb: 8, textAlign: "center", color: "text.secondary", fontSize: "1rem" }}>
          {t("home-how-subtitle")}
        </Box>

        <Box sx={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {STEPS.map((step) => (
            <Box
              key={step.number}
              sx={{ display: "flex", alignItems: "flex-start", gap: 3 }}
            >
              <Box
                sx={{
                  flexShrink: 0,
                  width: 48,
                  height: 48,
                  borderRadius: "50%",
                  bgcolor: "primary.main",
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 700,
                  fontSize: "1.1rem",
                }}
              >
                {step.number}
              </Box>
              <Box>
                <Box component="h3" sx={{ m: 0, mb: 0.5, fontSize: "1.05rem", fontWeight: 600 }}>
                  {t(step.titleKey)}
                </Box>
                <Box component="p" sx={{ m: 0, color: "text.secondary", fontSize: "0.9rem", lineHeight: 1.6 }}>
                  {t(step.descKey)}
                </Box>
              </Box>
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );
};

export default HowItWorksSection;
