import { z } from 'zod';

export const toolTypeSchema = z.enum(['claude', 'codex', 'cursor', 'generic']);
export type ToolType = z.infer<typeof toolTypeSchema>;

export const scopeSchema = z.enum(['project', 'user', 'custom']);
export type Scope = z.infer<typeof scopeSchema>;

export const availabilityModeSchema = z.enum([
  'automatic',
  'manual_only',
  'hidden',
  'disabled',
  'unknown'
]);
export type AvailabilityMode = z.infer<typeof availabilityModeSchema>;

export const directoryRecordSchema = z.object({
  id: z.string(),
  toolType: toolTypeSchema,
  path: z.string(),
  scope: scopeSchema,
  isDefault: z.boolean(),
  exists: z.boolean(),
  isSymlink: z.boolean(),
  symlinkTarget: z.string().nullable()
});
export type DirectoryRecord = z.infer<typeof directoryRecordSchema>;

export const normalizedSkillSchema = z.object({
  id: z.string(),
  directoryId: z.string(),
  toolType: toolTypeSchema,
  rootPath: z.string(),
  skillPath: z.string(),
  slug: z.string(),
  name: z.string(),
  description: z.string(),
  summary: z.string(),
  availabilityMode: availabilityModeSchema,
  exists: z.boolean(),
  isSymlink: z.boolean(),
  symlinkTarget: z.string().nullable(),
  broken: z.boolean(),
  warnings: z.array(z.string()),
  frontmatter: z.record(z.string(), z.unknown()),
  codexConfig: z.record(z.string(), z.unknown()).nullable(),
  lastModifiedAt: z.string()
});
export type NormalizedSkill = z.infer<typeof normalizedSkillSchema>;

export const activityLogSchema = z.object({
  id: z.string(),
  action: z.string(),
  targetType: z.string(),
  targetPath: z.string(),
  detail: z.record(z.string(), z.unknown()),
  createdAt: z.string(),
  undoState: z.object({
    supported: z.boolean(),
    available: z.boolean(),
    reason: z.string().nullable()
  })
});
export type ActivityLog = z.infer<typeof activityLogSchema>;

export const batchSkillLinkStatusSchema = z.enum(['created', 'already_linked', 'conflict', 'missing_skill']);
export type BatchSkillLinkStatus = z.infer<typeof batchSkillLinkStatusSchema>;

export const batchSkillLinkResultItemSchema = z.object({
  skillId: z.string(),
  targetPath: z.string(),
  sourcePath: z.string(),
  status: batchSkillLinkStatusSchema
});
export type BatchSkillLinkResultItem = z.infer<typeof batchSkillLinkResultItemSchema>;

export const batchSkillLinkSummarySchema = z.object({
  requested: z.number().int().nonnegative(),
  created: z.number().int().nonnegative(),
  skipped: z.number().int().nonnegative(),
  failed: z.number().int().nonnegative()
});
export type BatchSkillLinkSummary = z.infer<typeof batchSkillLinkSummarySchema>;
