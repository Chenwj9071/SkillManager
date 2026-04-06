import { z } from 'zod';
import {
  activityLogSchema,
  availabilityModeSchema,
  directoryRecordSchema,
  normalizedSkillSchema,
  scopeSchema,
  toolTypeSchema
} from './domain';

export const addDirectoryInputSchema = z.object({
  path: z.string().min(1),
  toolType: toolTypeSchema,
  scope: scopeSchema.default('custom')
});
export type AddDirectoryInput = z.infer<typeof addDirectoryInputSchema>;

export const updateSkillAvailabilityInputSchema = z.object({
  mode: availabilityModeSchema
});
export type UpdateSkillAvailabilityInput = z.infer<typeof updateSkillAvailabilityInputSchema>;

export const updateSkillAvailabilityBatchInputSchema = z.object({
  skillIds: z.array(z.string().min(1)).min(1),
  mode: availabilityModeSchema
});
export type UpdateSkillAvailabilityBatchInput = z.infer<typeof updateSkillAvailabilityBatchInputSchema>;

export const claudeMetadataInputSchema = z.object({
  userInvocable: z.boolean(),
  disableModelInvocation: z.boolean(),
  allowedTools: z.array(z.string().min(1)),
  context: z.string(),
  agent: z.string(),
  paths: z.array(z.string().min(1))
});
export type ClaudeMetadataInput = z.infer<typeof claudeMetadataInputSchema>;

export const codexMetadataInputSchema = z.object({
  allowImplicitInvocation: z.boolean(),
  interface: z.string(),
  dependencies: z.array(z.string().min(1))
});
export type CodexMetadataInput = z.infer<typeof codexMetadataInputSchema>;

export const updateSkillMetadataInputSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  claude: claudeMetadataInputSchema.optional(),
  codex: codexMetadataInputSchema.optional()
});
export type UpdateSkillMetadataInput = z.infer<typeof updateSkillMetadataInputSchema>;

export const createSkillLinkInputSchema = z.object({
  skillId: z.string().min(1),
  targetRootPath: z.string().min(1)
});
export type CreateSkillLinkInput = z.infer<typeof createSkillLinkInputSchema>;

export const createRootLinkInputSchema = z.object({
  sourceRootPath: z.string().min(1),
  targetRootPath: z.string().min(1)
});
export type CreateRootLinkInput = z.infer<typeof createRootLinkInputSchema>;

export const directoriesResponseSchema = z.object({
  directories: z.array(directoryRecordSchema)
});

export const skillsResponseSchema = z.object({
  skills: z.array(normalizedSkillSchema)
});

export const selectDirectoryResponseSchema = z.object({
  path: z.string().nullable()
});

export const logsResponseSchema = z.object({
  logs: z.array(activityLogSchema)
});

export const logResponseSchema = z.object({
  log: activityLogSchema
});
