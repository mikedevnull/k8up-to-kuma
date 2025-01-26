import z from "zod";

const K8UP_BACKUP_METRICS_SCHEMA = z.object({
  backup_start_timestamp: z.number(),
  backup_end_timestamp: z.number(),
  errors: z.number(),
  new_files: z.number(),
  changed_files: z.number(),
  unmodified_files: z.number(),
  new_dirs: z.number(),
  changed_dirs: z.number(),
  unmodified_dirs: z.number(),
  data_transferred: z.number(),
  mounted_PVCs: z.array(z.string()),
  Folder: z.string(),
  id: z.string(),
});

export const K8UP_STATUS_UPDATE_SCHEMA = z
  .object({
    name: z.string(),
    bucket_name: z.string(),
    backup_metrics: z.optional(K8UP_BACKUP_METRICS_SCHEMA),
    snapshots: z.optional(z.array(z.any())),
  })
  .refine(
    (data) => data.backup_metrics || data.snapshots,
    "Either backup metrics or snapshots should be filled in"
  );

export type K8UpStatusUpdate = z.infer<typeof K8UP_STATUS_UPDATE_SCHEMA>;
