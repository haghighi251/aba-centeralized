import axios from "axios";

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

export interface SubscriptionPlan {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  maxServices: number | null;
  maxEnvironments: number | null;
  maxMonitoredBranches: number | null;
  monthlyPrice: number;
  yearlyPrice: number;
  isActive: boolean;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export async function getSubscriptionPlans(): Promise<SubscriptionPlan[]> {
  const { data } = await axios.get(`${BASE_URL}/subscription-plans`);
  return data.data;
}

export async function getSubscriptionPlanById(id: number): Promise<SubscriptionPlan> {
  const { data } = await axios.get(`${BASE_URL}/subscription-plans/${id}`);
  return data.data;
}
