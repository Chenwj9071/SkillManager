import { z } from 'zod';
export const toolTypeSchema = z.enum(['claude', 'codex', 'cursor', 'generic']);
export const scopeSchema = z.enum(['project', 'user', 'custom']);
export const availabilityModeSchema = z.enum([
    'automatic',
    'manual_only',
    'hidden',
    'disabled',
    'unknown'
]);
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
export const activityLogSchema = z.object({
    id: z.string(),
    action: z.string(),
    targetType: z.string(),
    targetPath: z.string(),
    detail: z.record(z.string(), z.unknown()),
    createdAt: z.string()
});
