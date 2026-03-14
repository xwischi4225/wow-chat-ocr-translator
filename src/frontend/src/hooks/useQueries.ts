import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useActor } from "./useActor";

export function useGetConfigured() {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["configured"],
    queryFn: async () => {
      if (!actor) return false;
      return actor.getConfigured();
    },
    enabled: !!actor && !isFetching,
    staleTime: 30_000,
  });
}

export function useSetConfig() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      apiKey,
      gcpProject,
    }: {
      apiKey: string;
      gcpProject: string;
    }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.setConfig(apiKey, gcpProject);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["configured"] });
    },
  });
}

export function useTranslateMutation() {
  const { actor } = useActor();
  return useMutation({
    mutationFn: async ({
      text,
      targetLanguage,
    }: {
      text: string;
      targetLanguage: string;
    }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.translate(text, targetLanguage);
    },
  });
}
