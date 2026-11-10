"use client";
import { useQuery } from "@tanstack/react-query";
import { QueryKey } from "@/modules/shared/types/QueryKey";
import { getRepositoryConnection } from "@/modules/repository-connection/services/repositoryConnectionService";
import type { RepositoryConnection } from "@/modules/repository-connection/types/types";

export function useRepositoryConnection(
  companyId: string,
  environmentId: number,
  serviceId: number,
  accessToken: string,
) {
  return useQuery<RepositoryConnection | null, Error>({
    queryKey: [QueryKey.RepositoryConnection, companyId, environmentId, serviceId],
    queryFn: () =>
      getRepositoryConnection(companyId, environmentId, serviceId, accessToken),
    enabled: !!accessToken && !!companyId && !!environmentId && !!serviceId,
  });
}
