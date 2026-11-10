"use client";
import { useQuery } from "@tanstack/react-query";
import { QueryKey } from "@/modules/shared/types/QueryKey";
import { getServicePackageHistory } from "@/modules/service-package/services/servicePackageService";
import type { PackageHistoryFilter, GetServicePackagesResult } from "@/modules/service-package/types/types";

export function useServicePackageHistory(
  companyId: string,
  environmentId: number,
  serviceId: number,
  filter: PackageHistoryFilter,
  accessToken: string,
  enabled: boolean,
) {
  return useQuery<GetServicePackagesResult, Error>({
    queryKey: [QueryKey.ServicePackageHistory, companyId, environmentId, serviceId, filter],
    queryFn: () =>
      getServicePackageHistory(companyId, environmentId, serviceId, filter, accessToken),
    enabled: !!accessToken && !!companyId && !!environmentId && !!serviceId && enabled,
  });
}
