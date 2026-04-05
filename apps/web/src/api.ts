import type {
  ActivityLog,
  AddDirectoryInput,
  AvailabilityMode,
  CreateRootLinkInput,
  CreateSkillLinkInput,
  DirectoryRecord,
  NormalizedSkill,
  UpdateSkillAvailabilityBatchInput,
  UpdateSkillMetadataInput
} from '@skill-manager/shared';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:3001';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers =
    init?.body === undefined
      ? init?.headers
      : {
          'Content-Type': 'application/json',
          ...(init?.headers ?? {})
        };

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    ...(headers ? { headers } : {})
  });

  if (!response.ok) {
    const rawText = await response.text();
    if (!rawText) {
      throw new Error(`Request failed with status ${response.status}`);
    }

    try {
      const parsed = JSON.parse(rawText) as { message?: unknown };
      if (typeof parsed.message === 'string' && parsed.message.length > 0) {
        throw new Error(parsed.message);
      }
    } catch (error) {
      if (error instanceof Error && error.message !== rawText) {
        throw error;
      }
    }

    throw new Error(rawText);
  }

  return response.json() as Promise<T>;
}

export function fetchDirectories() {
  return request<{ directories: DirectoryRecord[] }>('/api/directories');
}

export function addDirectory(input: AddDirectoryInput) {
  return request<{ directory: DirectoryRecord }>('/api/directories', {
    method: 'POST',
    body: JSON.stringify(input)
  });
}

export function deleteDirectory(id: string) {
  return request<{ ok: true }>(`/api/directories/${id}`, {
    method: 'DELETE'
  });
}

export function fetchSkills() {
  return request<{ skills: NormalizedSkill[] }>('/api/skills');
}

export function rescanSkills() {
  return request<{ skills: NormalizedSkill[] }>('/api/scan', {
    method: 'POST'
  });
}

export function updateAvailability(id: string, mode: AvailabilityMode) {
  return request<{ skills: NormalizedSkill[] }>(`/api/skills/${id}/availability`, {
    method: 'PATCH',
    body: JSON.stringify({ mode })
  });
}

export function updateAvailabilityBatch(skillIds: string[], mode: UpdateSkillAvailabilityBatchInput['mode']) {
  return request<{ skills: NormalizedSkill[] }>('/api/skills/batch-availability', {
    method: 'PATCH',
    body: JSON.stringify({ skillIds, mode })
  });
}

export function updateMetadata(id: string, input: UpdateSkillMetadataInput) {
  return request<{ skills: NormalizedSkill[] }>(`/api/skills/${id}/metadata`, {
    method: 'PATCH',
    body: JSON.stringify(input)
  });
}

export function deleteSkill(id: string) {
  return request<{ skills: NormalizedSkill[] }>(`/api/skills/${id}`, {
    method: 'DELETE'
  });
}

export function createSkillLink(input: CreateSkillLinkInput) {
  return request<{ skills: NormalizedSkill[] }>('/api/links/skill', {
    method: 'POST',
    body: JSON.stringify(input)
  });
}

export function createRootLink(input: CreateRootLinkInput) {
  return request<{ skills: NormalizedSkill[] }>('/api/links/root', {
    method: 'POST',
    body: JSON.stringify(input)
  });
}

export function fetchLogs() {
  return request<{ logs: ActivityLog[] }>('/api/logs');
}

export function clearLogs() {
  return request<{ ok: true }>('/api/logs', {
    method: 'DELETE'
  });
}

export function pickDirectory() {
  return request<{ path: string | null }>('/api/dialogs/select-directory', {
    method: 'POST'
  });
}
