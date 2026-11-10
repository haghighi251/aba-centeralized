"use client";
import { useQuery } from "@tanstack/react-query";
import { QueryKey } from "@/modules/shared/types/QueryKey";
import {
  getAiStatus,
  getTestDefinitions,
  getTestRun,
  getTestRuns,
  getTestPages,
} from "@/modules/service-test/services/testService";
import type {
  AiAssistStatus,
  ListResult,
  TestDefinition,
  TestRun,
  TestRunWithResults,
  TestPage,
} from "@/modules/service-test/types/types";

export function useTestPages(
  companyId: string,
  environmentId: number,
  serviceId: number,
  accessToken: string,
) {
  return useQuery<ListResult<TestPage>, Error>({
    queryKey: [QueryKey.TestPages, companyId, environmentId, serviceId],
    queryFn: () =>
      getTestPages(companyId, environmentId, serviceId, accessToken),
    enabled: !!accessToken && !!companyId && !!environmentId && !!serviceId,
  });
}

export function useTestDefinitions(
  companyId: string,
  environmentId: number,
  serviceId: number,
  targetId: number | null,
  accessToken: string,
) {
  return useQuery<ListResult<TestDefinition>, Error>({
    queryKey: [QueryKey.TestDefinitions, companyId, environmentId, serviceId, targetId],
    queryFn: () =>
      getTestDefinitions(
        companyId,
        environmentId,
        serviceId,
        targetId as number,
        accessToken,
      ),
    enabled:
      !!accessToken && !!companyId && !!environmentId && !!serviceId && !!targetId,
  });
}

export function useTestRuns(
  companyId: string,
  environmentId: number,
  serviceId: number,
  accessToken: string,
) {
  return useQuery<ListResult<TestRun>, Error>({
    queryKey: [QueryKey.TestRuns, companyId, environmentId, serviceId],
    queryFn: () =>
      getTestRuns(companyId, environmentId, serviceId, accessToken),
    enabled: !!accessToken && !!companyId && !!environmentId && !!serviceId,
    // A run moves QUEUED → PASSED/FAILED asynchronously (worker + Kafka). Only
    // poll while something is actually in flight, so an idle page stays quiet
    // instead of hitting the API every few seconds forever.
    refetchInterval: (query) => {
      const runs = query.state.data?.data ?? [];
      const active = runs.some(
        (r) => r.status === "QUEUED" || r.status === "RUNNING",
      );
      return active ? 4000 : false;
    },
  });
}

export function useAiStatus(
  companyId: string,
  environmentId: number,
  serviceId: number,
  accessToken: string,
) {
  return useQuery<AiAssistStatus, Error>({
    queryKey: [QueryKey.AiStatus, companyId, environmentId, serviceId],
    queryFn: () => getAiStatus(companyId, environmentId, serviceId, accessToken),
    enabled: !!accessToken && !!companyId && !!environmentId && !!serviceId,
    staleTime: 60_000,
  });
}

export function useTestRun(
  companyId: string,
  environmentId: number,
  serviceId: number,
  runId: number | null,
  accessToken: string,
) {
  return useQuery<TestRunWithResults, Error>({
    queryKey: [QueryKey.TestRun, companyId, environmentId, serviceId, runId],
    queryFn: () =>
      getTestRun(companyId, environmentId, serviceId, runId as number, accessToken),
    enabled:
      !!accessToken && !!companyId && !!environmentId && !!serviceId && !!runId,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === "QUEUED" || status === "RUNNING" ? 4000 : false;
    },
  });
}
