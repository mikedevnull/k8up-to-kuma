import z from "zod";

export const HOOK_CONFIG_SCHEMA = z.object({
  k8up_name: z.string(),
  target: z.string(),
});

export type HookConfig = z.infer<typeof HOOK_CONFIG_SCHEMA>;

export const CONFIGURATION_SCHEMA = z.object({
  hooks: z.array(HOOK_CONFIG_SCHEMA),
});

export type Configuration = z.infer<typeof CONFIGURATION_SCHEMA>;
