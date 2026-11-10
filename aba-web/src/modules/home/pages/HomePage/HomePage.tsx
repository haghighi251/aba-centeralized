"use client";
import HeroSection from "@/modules/home/components/HeroSection/HeroSection";
import FeaturesSection from "@/modules/home/components/FeaturesSection/FeaturesSection";
import HowItWorksSection from "@/modules/home/components/HowItWorksSection/HowItWorksSection";
import CtaSection from "@/modules/home/components/CtaSection/CtaSection";

const HomePage = () => {
  return (
    <>
      <HeroSection />
      <FeaturesSection />
      <HowItWorksSection />
      <CtaSection />
    </>
  );
};

export default HomePage;
