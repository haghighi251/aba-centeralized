"use client";
import { useQuery } from "@tanstack/react-query";
import { QueryKey } from "@/modules/shared/types/QueryKey";
import { getServicePackages } from "@/modules/service-package/services/servicePackageService";
import type { PackageFilter, GetServicePackagesResult } from "@/modules/service-package/types/types";

export function useServicePackages(
  companyId: string,
  environmentId: number,
  serviceId: number,
  filter: PackageFilter,
  accessToken: string,
) {
  return useQuery<GetServicePackagesResult, Error>({
    queryKey: [QueryKey.ServicePackages, companyId, environmentId, serviceId, filter],
    queryFn: () =>
      getServicePackages(companyId, environmentId, serviceId, filter, accessToken),
    enabled: !!accessToken && !!companyId && !!environmentId && !!serviceId,
  });
}
