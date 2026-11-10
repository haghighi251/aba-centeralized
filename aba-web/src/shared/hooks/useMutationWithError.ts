import { useEffect } from "react";

import { useTranslation } from "react-i18next";
import {
  MutationFunction,
  useMutation,
  UseMutationOptions,
} from "@tanstack/react-query";
import {
  ToastType,
  useToastContext,
} from "@/modules/shared/components/ToastContextProvider/ToastContextProvider";

export const useMutationWithError = <
  TData = unknown,
  TError = unknown,
  TVariables = void,
  TContext = unknown,
>(
  mutationFn: MutationFunction<TData, TVariables>,
  options?: Omit<
    UseMutationOptions<TData, TError, TVariables, TContext>,
    "mutationFn"
  >,
) => {
  const { t } = useTranslation();
  const mutationOptions: UseMutationOptions<
    TData,
    TError,
    TVariables,
    TContext
  > = {
    ...options,
    mutationFn: mutationFn,
  };
  const mutation = useMutation(mutationOptions);
  const { createToast } = useToastContext();

  useEffect(() => {
    if (mutation.error) {
      createToast({
        message: t("generic_mutation_error"),
        type: ToastType.Danger,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mutation.error]);

  return mutation;
};
