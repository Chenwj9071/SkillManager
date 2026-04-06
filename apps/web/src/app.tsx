import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  ActivityLog,
  AvailabilityMode,
  DirectoryRecord,
  NormalizedSkill,
  ToolType,
  UpdateSkillMetadataInput
} from '@skill-manager/shared';
import {
  addDirectory,
  clearLogs,
  createRootLink,
  createSkillLink,
  deleteDirectory,
  deleteSkill,
  exportLogsCsv,
  fetchDirectories,
  fetchLogDetail,
  fetchLogs,
  fetchSkills,
  pickDirectory,
  rescanSkills,
  undoLog,
  updateAvailability,
  updateAvailabilityBatch,
  updateMetadata
} from './api';
import { SelectField, type SelectOption } from './components/select-field';

const TEXT = {
  appSubtitle: '\u672c\u5730Skills\u53ef\u89c6\u5316\u7ba1\u7406\u5e73\u53f0',
  automatic: '\u81ea\u52a8\u89e6\u53d1',
  manualOnly: '\u4ec5\u624b\u52a8\u89e6\u53d1',
  hidden: '\u9690\u85cf',
  disabled: '\u5df2\u7981\u7528',
  unknown: '\u672a\u77e5',
  claude: 'Claude',
  codex: 'Codex',
  cursor: 'Cursor',
  generic: '\u5176\u4ed6',
  genericHelp:
    '\u5176\u4ed6 \u8868\u793a\u517c\u5bb9\u6807\u51c6 SKILL.md \u76ee\u5f55\uff0c\u4f46\u4e0d\u89e3\u6790 Claude\u3001Codex\u3001Cursor \u7684\u4e13\u5c5e\u5143\u6570\u636e\u3002',
  rescan: '\u91cd\u65b0\u626b\u63cf',
  rescanned: '\u5df2\u91cd\u65b0\u626b\u63cf skills \u76ee\u5f55',
  messageNoDirectory: '\u672a\u9009\u62e9\u76ee\u5f55',
  messagePickDirectoryFailed: '\u76ee\u5f55\u9009\u62e9\u5931\u8d25',
  messageDirectoryAdded: '\u76ee\u5f55\u5df2\u6dfb\u52a0',
  messageDirectoryRemoved: '\u76ee\u5f55\u5df2\u79fb\u9664',
  messageMetadataUpdated: '\u6280\u80fd\u5143\u6570\u636e\u5df2\u66f4\u65b0',
  messageAvailabilityUpdated: '\u6280\u80fd\u72b6\u6001\u5df2\u66f4\u65b0',
  messageAvailabilityBatchUpdated: '\u5df2\u6279\u91cf\u66f4\u65b0\u6280\u80fd\u72b6\u6001',
  messageSkillDeleted: '\u6280\u80fd\u5df2\u5220\u9664',
  messageSkillLinkCreated: '\u6280\u80fd\u8f6f\u94fe\u63a5\u5df2\u521b\u5efa',
  messageRootLinkCreated: '\u6574\u76ee\u5f55\u8f6f\u94fe\u63a5\u5df2\u521b\u5efa',
  messageActionFailed: '\u64cd\u4f5c\u5931\u8d25',
  messageDirectoryPickerOpening:
    '\u6b63\u5728\u6253\u5f00\u7cfb\u7edf\u76ee\u5f55\u9009\u62e9\u5668\uff0c\u8bf7\u5728\u5f39\u7a97\u4e2d\u9009\u62e9\u76ee\u5f55',
  pathDirectories: '\u8def\u5f84\u76ee\u5f55',
  allDirectories: '\u5168\u90e8\u76ee\u5f55',
  skillCountSuffix: '\u4e2a\u6280\u80fd',
  directoryCountSuffix: '\u4e2a\u76ee\u5f55',
  exists: '\u5df2\u53d1\u73b0',
  notExists: '\u4e0d\u5b58\u5728',
  removeDirectory: '\u5220\u9664\u76ee\u5f55',
  addDirectory: '\u6dfb\u52a0\u81ea\u5b9a\u4e49\u76ee\u5f55',
  directoryPath: '\u76ee\u5f55\u8def\u5f84',
  directoryType: '\u76ee\u5f55\u7c7b\u578b',
  pickDirectory: '\u9009\u62e9\u76ee\u5f55',
  pickDirectoryBusy: '\u6253\u5f00\u4e2d...',
  addDirectoryButton: '\u6dfb\u52a0\u76ee\u5f55',
  rootReuse: '\u6574\u76ee\u5f55\u590d\u7528',
  sourceDirectory: '\u6e90\u76ee\u5f55',
  targetLinkPath: '\u76ee\u6807\u94fe\u63a5\u8def\u5f84',
  createRootLink: '\u521b\u5efa\u6574\u76ee\u5f55\u94fe\u63a5',
  search: '\u641c\u7d22',
  searchPlaceholder: '\u6309\u540d\u79f0\u3001\u63cf\u8ff0\u6216\u8def\u5f84\u8fc7\u6ee4',
  pathFilter: '\u8def\u5f84\u7b5b\u9009',
  allPaths: '\u5168\u90e8\u8def\u5f84',
  stats: '\u7edf\u8ba1',
  selectCurrentPath: '\u5168\u9009\u5f53\u524d\u8def\u5f84\u4e0b\u6240\u6709\u6280\u80fd',
  clearSelected: '\u6e05\u7a7a\u5df2\u9009',
  batchAvailability: '\u6279\u91cf\u53ef\u7528\u6027',
  batchUpdateAvailability: '\u6279\u91cf\u66f4\u65b0\u72b6\u6001',
  batchSelectionSummaryPrefix: '\u5df2\u9009 ',
  batchSelectionSummaryMiddle: '\u4e2a\u6280\u80fd\uff0c\u5f53\u524d\u8def\u5f84 ',
  batchSelectionSummarySuffix: '\u4e2a',
  batchSelect: '\u6279\u91cf\u9009\u62e9',
  noDescription: '\u6682\u65e0\u63cf\u8ff0',
  noMatchedSkills: '\u6ca1\u6709\u5339\u914d\u7684\u6280\u80fd\u3002',
  editMetadata: '\u7f16\u8f91\u5143\u6570\u636e',
  metadataBase: '\u57fa\u7840\u4fe1\u606f',
  metadataClaude: 'Claude \u5b57\u6bb5',
  metadataCodex: 'Codex \u5b57\u6bb5',
  skillName: '\u540d\u79f0',
  skillDescription: '\u63cf\u8ff0',
  saveMetadata: '\u4fdd\u5b58\u5143\u6570\u636e',
  availability: '\u53ef\u7528\u6027',
  status: '\u72b6\u6001',
  updateStatus: '\u66f4\u65b0\u72b6\u6001',
  skillReuse: '\u6280\u80fd\u590d\u7528',
  targetSkillsDirectory: '\u76ee\u6807 skills \u76ee\u5f55',
  createSkillLink: '\u521b\u5efa\u5355\u6280\u80fd\u94fe\u63a5',
  rawData: '\u539f\u59cb\u6570\u636e',
  dangerZone: '\u5371\u9669\u64cd\u4f5c',
  deleteSkill: '\u5220\u9664\u6280\u80fd',
  linkedSkill: '\u94fe\u63a5\u6280\u80fd',
  viewSkillDetail: '\u9009\u62e9\u4e00\u4e2a\u6280\u80fd\u67e5\u770b\u8be6\u60c5\u3002',
  recentActions: '\u6700\u8fd1\u64cd\u4f5c',
  clearRecentActions: '\u6e05\u7a7a\u6700\u8fd1\u64cd\u4f5c',
  messageLogsCleared: '\u6700\u8fd1\u64cd\u4f5c\u5df2\u6e05\u7a7a',
  messageSkillPathCopied: '\u6280\u80fd\u8def\u5f84\u5df2\u590d\u5236',
  messageClipboardUnavailable: '\u5f53\u524d\u73af\u5883\u4e0d\u652f\u6301\u526a\u8d34\u677f\u590d\u5236',
  copiedPathHint: '\u53cc\u51fb\u590d\u5236\u8be5\u8def\u5f84',
  exportCsv: '\u5bfc\u51fa CSV',
  messageLogsExported: '\u65e5\u5fd7\u5df2\u5bfc\u51fa',
  messageOperationUndone: '\u64cd\u4f5c\u5df2\u64a4\u9500',
  operationDetail: '\u64cd\u4f5c\u8be6\u60c5',
  closeDialog: '\u5173\u95ed',
  undoThisOperation: '\u64a4\u9500\u6b64\u64cd\u4f5c',
  undoAvailable: '\u53ef\u64a4\u9500',
  undoUnavailable: '\u4e0d\u53ef\u64a4\u9500',
  undoReason: '\u4e0d\u53ef\u64a4\u9500\u539f\u56e0',
  rawDetail: '\u65e5\u5fd7\u8be6\u60c5',
  claudeUserInvocable: 'user-invocable',
  claudeDisableModelInvocation: 'disable-model-invocation',
  claudeAllowedTools: 'allowed-tools',
  claudeContext: 'context',
  claudeAgent: 'agent',
  claudePaths: 'paths',
  codexAllowImplicitInvocation: 'policy.allow_implicit_invocation',
  codexInterface: 'interface',
  codexDependencies: 'dependencies'
} as const;

const EMPTY_DIRECTORIES: DirectoryRecord[] = [];
const EMPTY_SKILLS: NormalizedSkill[] = [];
const EMPTY_LOGS: ActivityLog[] = [];

interface MetadataFormState {
  name: string;
  description: string;
  claude: {
    userInvocable: boolean;
    disableModelInvocation: boolean;
    allowedTools: string;
    context: string;
    agent: string;
    paths: string;
  };
  codex: {
    allowImplicitInvocation: boolean;
    interface: string;
    dependencies: string;
  };
}

interface ToastState {
  id: number;
  tone: 'success' | 'error' | 'info';
  text: string;
}

const availabilityLabels: Record<AvailabilityMode, string> = {
  automatic: TEXT.automatic,
  manual_only: TEXT.manualOnly,
  hidden: TEXT.hidden,
  disabled: TEXT.disabled,
  unknown: TEXT.unknown
};

const toolLabels: Record<ToolType, string> = {
  claude: TEXT.claude,
  codex: TEXT.codex,
  cursor: TEXT.cursor,
  generic: TEXT.generic
};

const availabilityOptions: SelectOption[] = [
  { value: 'automatic', label: TEXT.automatic },
  { value: 'manual_only', label: TEXT.manualOnly },
  { value: 'hidden', label: TEXT.hidden },
  { value: 'disabled', label: TEXT.disabled }
];

const directoryToolOptions: SelectOption[] = [
  { value: 'claude', label: TEXT.claude },
  { value: 'codex', label: TEXT.codex },
  { value: 'cursor', label: TEXT.cursor },
  { value: 'generic', label: TEXT.generic }
];

const toolTypeOrder: ToolType[] = ['claude', 'codex', 'cursor', 'generic'];

function getUndoState(log: Pick<ActivityLog, 'undoState'> | Omit<ActivityLog, 'undoState'>) {
  const undoState = (log as ActivityLog).undoState;
  return {
    supported: undoState?.supported === true,
    available: undoState?.available === true,
    reason: typeof undoState?.reason === 'string' ? undoState.reason : null
  };
}

function AvailabilityBadge({ mode }: { mode: AvailabilityMode }) {
  return <span className={`pill ${mode}`}>{availabilityLabels[mode]}</span>;
}

function formatDirectoryMeta(exists: boolean, scope: string, isSymlink: boolean) {
  const parts = [exists ? TEXT.exists : TEXT.notExists, scope];
  if (isSymlink) {
    parts.push('symlink');
  }

  return parts.join(' \u00b7 ');
}

function getPathBasename(value: string) {
  const trimmed = value.replace(/[\\/]+$/, '');
  if (!trimmed) {
    return '';
  }

  const segments = trimmed.split(/[\\/]/).filter((item) => item.length > 0);
  return segments.at(-1) ?? '';
}

function appendPathSegment(basePath: string, segment: string) {
  if (!basePath) {
    return segment;
  }

  const separator = basePath.includes('\\') ? '\\' : '/';
  const trimmedBase = basePath.replace(/[\\/]+$/, '');
  return `${trimmedBase}${separator}${segment}`;
}

function buildPickedLinkPath(pickedDirectoryPath: string, sourcePath: string) {
  const basename = getPathBasename(sourcePath);
  return basename ? appendPathSegment(pickedDirectoryPath, basename) : pickedDirectoryPath;
}

function normalizeStringArray(value: string) {
  return value
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function formatStringArray(value: unknown) {
  return Array.isArray(value) ? value.map((item) => String(item)).join('\n') : '';
}

function getCodexAllowImplicitInvocation(codexConfig: NormalizedSkill['codexConfig']) {
  const policy = (codexConfig?.policy ?? {}) as Record<string, unknown>;
  return policy.allow_implicit_invocation !== false;
}

function buildMetadataFormState(skill: NormalizedSkill): MetadataFormState {
  return {
    name: skill.name,
    description: skill.description,
    claude: {
      userInvocable: skill.frontmatter['user-invocable'] !== false,
      disableModelInvocation: skill.frontmatter['disable-model-invocation'] === true,
      allowedTools: formatStringArray(skill.frontmatter['allowed-tools']),
      context: String(skill.frontmatter.context ?? ''),
      agent: String(skill.frontmatter.agent ?? ''),
      paths: formatStringArray(skill.frontmatter.paths)
    },
    codex: {
      allowImplicitInvocation: getCodexAllowImplicitInvocation(skill.codexConfig),
      interface: String(skill.codexConfig?.interface ?? ''),
      dependencies: formatStringArray(skill.codexConfig?.dependencies)
    }
  };
}

function buildMetadataPayload(
  skill: NormalizedSkill,
  metadataForm: MetadataFormState
): UpdateSkillMetadataInput {
  const payload: UpdateSkillMetadataInput = {
    name: metadataForm.name,
    description: metadataForm.description
  };

  if (skill.toolType === 'claude') {
    payload.claude = {
      userInvocable: metadataForm.claude.userInvocable,
      disableModelInvocation: metadataForm.claude.disableModelInvocation,
      allowedTools: normalizeStringArray(metadataForm.claude.allowedTools),
      context: metadataForm.claude.context.trim(),
      agent: metadataForm.claude.agent.trim(),
      paths: normalizeStringArray(metadataForm.claude.paths)
    };
  }

  if (skill.toolType === 'codex') {
    payload.codex = {
      allowImplicitInvocation: metadataForm.codex.allowImplicitInvocation,
      interface: metadataForm.codex.interface.trim(),
      dependencies: normalizeStringArray(metadataForm.codex.dependencies)
    };
  }

  return payload;
}

export function App() {
  const queryClient = useQueryClient();
  const [selectedSkillId, setSelectedSkillId] = useState('');
  const [search, setSearch] = useState('');
  const [pathFilter, setPathFilter] = useState('all');
  const [selectedSkillIds, setSelectedSkillIds] = useState<string[]>([]);
  const [message, setMessage] = useState('');
  const [toasts, setToasts] = useState<ToastState[]>([]);
  const toastTimeoutIdsRef = useRef<number[]>([]);
  const [selectedLogId, setSelectedLogId] = useState('');
  const [directoryForm, setDirectoryForm] = useState<{
    path: string;
    toolType: ToolType;
  }>({ path: '', toolType: 'generic' });
  const [rootLinkForm, setRootLinkForm] = useState({
    sourceRootPath: '',
    targetRootPath: ''
  });
  const [metadataForm, setMetadataForm] = useState<MetadataFormState>({
    name: '',
    description: '',
    claude: {
      userInvocable: true,
      disableModelInvocation: false,
      allowedTools: '',
      context: '',
      agent: '',
      paths: ''
    },
    codex: {
      allowImplicitInvocation: true,
      interface: '',
      dependencies: ''
    }
  });
  const [availabilityForm, setAvailabilityForm] = useState<AvailabilityMode>('automatic');
  const [batchAvailabilityMode, setBatchAvailabilityMode] =
    useState<AvailabilityMode>('manual_only');
  const [linkTargetRootPath, setLinkTargetRootPath] = useState('');
  const [isPickingDirectory, setIsPickingDirectory] = useState(false);

  const directoriesQuery = useQuery({ queryKey: ['directories'], queryFn: fetchDirectories });
  const skillsQuery = useQuery({ queryKey: ['skills'], queryFn: fetchSkills });
  const logsQuery = useQuery({ queryKey: ['logs'], queryFn: fetchLogs });
  const logDetailQuery = useQuery({
    queryKey: ['logs', selectedLogId],
    queryFn: () => fetchLogDetail(selectedLogId),
    enabled: selectedLogId.length > 0
  });

  const directories = directoriesQuery.data?.directories ?? EMPTY_DIRECTORIES;
  const skills = skillsQuery.data?.skills ?? EMPTY_SKILLS;
  const logs = logsQuery.data?.logs ?? EMPTY_LOGS;

  const directoriesWithCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const skill of skills) {
      counts.set(skill.rootPath, (counts.get(skill.rootPath) ?? 0) + 1);
    }

    return directories.map((directory) => ({
      ...directory,
      skillCount: counts.get(directory.path) ?? 0
    }));
  }, [directories, skills]);

  const pathFilterOptions = useMemo<SelectOption[]>(
    () => [
      { value: 'all', label: TEXT.allPaths },
      ...directoriesWithCounts.map((directory) => ({
        value: directory.path,
        label: directory.path
      }))
    ],
    [directoriesWithCounts]
  );

  const sourceRootOptions = useMemo<SelectOption[]>(
    () =>
      directoriesWithCounts.map((directory) => ({
        value: directory.path,
        label: `${toolLabels[directory.toolType]} \u00b7 ${directory.path}`
      })),
    [directoriesWithCounts]
  );

  const directoryGroups = useMemo(
    () =>
      toolTypeOrder
        .map((toolType) => ({
          toolType,
          directories: directoriesWithCounts.filter((directory) => directory.toolType === toolType)
        }))
        .filter((group) => group.directories.length > 0),
    [directoriesWithCounts]
  );

  const filteredSkills = useMemo(() => {
    const normalizedQuery = search.trim().toLowerCase();

    return skills.filter((skill) => {
      const matchesPath = pathFilter === 'all' || skill.rootPath === pathFilter;
      const keywords = [
        skill.name,
        skill.description,
        skill.rootPath,
        skill.skillPath,
        toolLabels[skill.toolType]
      ]
        .join(' ')
        .toLowerCase();
      const matchesSearch =
        normalizedQuery.length === 0 || keywords.includes(normalizedQuery);

      return matchesPath && matchesSearch;
    });
  }, [pathFilter, search, skills]);

  const selectedSkill = useMemo(
    () => filteredSkills.find((skill) => skill.id === selectedSkillId) ?? null,
    [filteredSkills, selectedSkillId]
  );

  const currentPathSkills = useMemo(() => {
    if (pathFilter === 'all') {
      return skills;
    }

    return skills.filter((skill) => skill.rootPath === pathFilter);
  }, [pathFilter, skills]);

  const selectedInCurrentPathCount = useMemo(() => {
    const currentPathIds = new Set(currentPathSkills.map((skill) => skill.id));
    return selectedSkillIds.filter((skillId) => currentPathIds.has(skillId)).length;
  }, [currentPathSkills, selectedSkillIds]);

  useEffect(() => {
    if (!rootLinkForm.sourceRootPath && directoriesWithCounts.length > 0) {
      setRootLinkForm((current) => ({
        ...current,
        sourceRootPath: directoriesWithCounts[0].path
      }));
    }
  }, [directoriesWithCounts, rootLinkForm.sourceRootPath]);

  useEffect(() => {
    if (filteredSkills.length === 0) {
      setSelectedSkillId('');
      return;
    }

    if (!filteredSkills.some((skill) => skill.id === selectedSkillId)) {
      setSelectedSkillId(filteredSkills[0].id);
    }
  }, [filteredSkills, selectedSkillId]);

  useEffect(() => {
    if (!selectedSkill) {
      return;
    }

    setMetadataForm(buildMetadataFormState(selectedSkill));
    setAvailabilityForm(selectedSkill.availabilityMode);
  }, [selectedSkill]);

  useEffect(() => {
    const availableIds = new Set(skills.map((skill) => skill.id));
    setSelectedSkillIds((current) => {
      const next = current.filter((id) => availableIds.has(id));
      const unchanged =
        next.length === current.length && next.every((id, index) => id === current[index]);

      return unchanged ? current : next;
    });
  }, [skills]);

  useEffect(() => {
    return () => {
      for (const timeoutId of toastTimeoutIdsRef.current) {
        window.clearTimeout(timeoutId);
      }
      toastTimeoutIdsRef.current = [];
    };
  }, []);

  function showToast(text: string, tone: ToastState['tone'] = 'success') {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setToasts((current) => [...current, { id, tone, text }]);
    const timeoutId = window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
      toastTimeoutIdsRef.current = toastTimeoutIdsRef.current.filter((item) => item !== timeoutId);
    }, 3200);
    toastTimeoutIdsRef.current.push(timeoutId);
  }

  function setErrorMessage(error: unknown) {
    setMessage('');
    showToast(error instanceof Error ? error.message : TEXT.messageActionFailed, 'error');
  }

  async function invalidateAll() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['directories'] }),
      queryClient.invalidateQueries({ queryKey: ['skills'] }),
      queryClient.invalidateQueries({ queryKey: ['logs'] })
    ]);
  }

  async function handlePickDirectory(
    onPicked: (path: string) => void,
    emptyMessage = TEXT.messageNoDirectory
  ) {
    setIsPickingDirectory(true);
    setMessage(TEXT.messageDirectoryPickerOpening);
    try {
      const result = await pickDirectory();
      if (result.path) {
        onPicked(result.path);
        return;
      }

      setMessage(emptyMessage);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : TEXT.messagePickDirectoryFailed);
    } finally {
      setIsPickingDirectory(false);
    }
  }

  const rescanMutation = useMutation({
    mutationFn: rescanSkills,
    onSuccess: async () => {
      setMessage('');
      showToast(TEXT.rescanned);
      await invalidateAll();
    },
    onError: setErrorMessage
  });

  const addDirectoryMutation = useMutation({
    mutationFn: async (input: {
      path: string;
      toolType: ToolType;
      scope: 'custom';
    }) => {
      await addDirectory(input);
      return rescanSkills();
    },
    onSuccess: async () => {
      setDirectoryForm({ path: '', toolType: 'generic' });
      setMessage('');
      showToast(TEXT.messageDirectoryAdded);
      await invalidateAll();
    },
    onError: setErrorMessage
  });

  const deleteDirectoryMutation = useMutation({
    mutationFn: async (id: string) => {
      await deleteDirectory(id);
      return rescanSkills();
    },
    onSuccess: async () => {
      setMessage('');
      showToast(TEXT.messageDirectoryRemoved);
      await invalidateAll();
    },
    onError: setErrorMessage
  });

  const updateMetadataMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateSkillMetadataInput }) =>
      updateMetadata(id, input),
    onSuccess: async () => {
      setMessage('');
      showToast(TEXT.messageMetadataUpdated);
      await invalidateAll();
    },
    onError: setErrorMessage
  });

  const updateAvailabilityMutation = useMutation({
    mutationFn: ({ id, mode }: { id: string; mode: AvailabilityMode }) =>
      updateAvailability(id, mode),
    onSuccess: async () => {
      setMessage('');
      showToast(TEXT.messageAvailabilityUpdated);
      await invalidateAll();
    },
    onError: setErrorMessage
  });

  const batchAvailabilityMutation = useMutation({
    mutationFn: ({ skillIds, mode }: { skillIds: string[]; mode: AvailabilityMode }) =>
      updateAvailabilityBatch(skillIds, mode),
    onSuccess: async () => {
      setMessage('');
      showToast(TEXT.messageAvailabilityBatchUpdated);
      await invalidateAll();
    },
    onError: setErrorMessage
  });

  const deleteSkillMutation = useMutation({
    mutationFn: deleteSkill,
    onSuccess: async () => {
      setMessage('');
      showToast(TEXT.messageSkillDeleted);
      setSelectedSkillId('');
      await invalidateAll();
    },
    onError: setErrorMessage
  });

  const createSkillLinkMutation = useMutation({
    mutationFn: createSkillLink,
    onSuccess: async () => {
      setMessage('');
      showToast(TEXT.messageSkillLinkCreated);
      setLinkTargetRootPath('');
      await invalidateAll();
    },
    onError: setErrorMessage
  });

  const createRootLinkMutation = useMutation({
    mutationFn: createRootLink,
    onSuccess: async () => {
      setMessage('');
      showToast(TEXT.messageRootLinkCreated);
      setRootLinkForm((current) => ({ ...current, targetRootPath: '' }));
      await invalidateAll();
    },
    onError: setErrorMessage
  });

  const clearLogsMutation = useMutation({
    mutationFn: clearLogs,
    onSuccess: async () => {
      setMessage('');
      showToast(TEXT.messageLogsCleared);
      await queryClient.invalidateQueries({ queryKey: ['logs'] });
    },
    onError: setErrorMessage
  });

  const undoLogMutation = useMutation({
    mutationFn: undoLog,
    onSuccess: async () => {
      setSelectedLogId('');
      setMessage('');
      showToast(TEXT.messageOperationUndone);
      await invalidateAll();
    },
    onError: setErrorMessage
  });

  const exportLogsMutation = useMutation({
    mutationFn: exportLogsCsv,
    onSuccess: (csvText) => {
      const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8' });
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = objectUrl;
      anchor.download = `skills-manager-logs-${new Date().toISOString().slice(0, 10)}.csv`;
      anchor.click();
      URL.revokeObjectURL(objectUrl);
      setMessage('');
      showToast(TEXT.messageLogsExported);
    },
    onError: setErrorMessage
  });

  function toggleSkillSelection(skillId: string) {
    setSelectedSkillIds((current) =>
      current.includes(skillId) ? current.filter((id) => id !== skillId) : [...current, skillId]
    );
  }

  function selectCurrentPathSkills() {
    setSelectedSkillIds((current) => {
      const nextIds = new Set(current);
      for (const skill of currentPathSkills) {
        nextIds.add(skill.id);
      }

      return Array.from(nextIds);
    });
  }

  function clearSelectedSkills() {
    setSelectedSkillIds([]);
  }

  async function copySelectedSkillPath(path: string) {
    if (!navigator.clipboard?.writeText) {
      showToast(TEXT.messageClipboardUnavailable, 'error');
      return;
    }

    try {
      await navigator.clipboard.writeText(path);
      showToast(TEXT.messageSkillPathCopied);
    } catch (error) {
      setErrorMessage(error);
    }
  }

  function renderUndoBadge(log: ActivityLog) {
    const undoState = getUndoState(log);
    if (!undoState.supported || !undoState.available) {
      return null;
    }

    return <span className="pill automatic">{TEXT.undoAvailable}</span>;
  }

  return (
    <>
      <div className="toast-stack" aria-live="polite" aria-atomic="false">
        {toasts.map((toast) => (
          <div key={toast.id} role="status" className={`toast ${toast.tone}`}>
            {toast.text}
          </div>
        ))}
      </div>
      <div className="app-shell">
      <aside className="panel left-panel">
        <div className="hero">
          <h1>Skills Manager</h1>
          <p>{TEXT.appSubtitle}</p>
        </div>

        <div className="button-row">
          <button id="rescan-button" className="button" onClick={() => rescanMutation.mutate()}>
            {TEXT.rescan}
          </button>
        </div>
        {message ? <p className="subtle">{message}</p> : null}

        <h2 className="section-title">{TEXT.pathDirectories}</h2>
        <div className="list">
          <button
            type="button"
            className={`directory-row ${pathFilter === 'all' ? 'active' : ''}`}
            onClick={() => setPathFilter('all')}
          >
            <strong>{TEXT.allDirectories}</strong>
            <div className="subtle">
              {skills.length} {TEXT.skillCountSuffix}
            </div>
          </button>

          {directoryGroups.map((group) => (
            <section
              key={group.toolType}
              id={`directory-group-${group.toolType}`}
              className="card directory-group"
            >
              <div className="directory-group-header">
                <strong>{toolLabels[group.toolType]}</strong>
                <span className="subtle">
                  {group.directories.length} {TEXT.directoryCountSuffix}
                </span>
              </div>
              <div className="list directory-group-list">
                {group.directories.map((directory) => (
                  <div
                    key={directory.id}
                    className={`card directory-card ${pathFilter === directory.path ? 'active' : ''}`}
                  >
                    <button
                      type="button"
                      className="directory-row"
                      onClick={() => setPathFilter(directory.path)}
                    >
                      <div className="button-row">
                        <span className="pill hidden">
                          {directory.skillCount} {TEXT.skillCountSuffix}
                        </span>
                      </div>
                      <div className="path-scroll">{directory.path}</div>
                      <div className="subtle">
                        {formatDirectoryMeta(directory.exists, directory.scope, directory.isSymlink)}
                      </div>
                    </button>
                    {!directory.isDefault ? (
                      <button
                        className="button secondary"
                        onClick={() => deleteDirectoryMutation.mutate(directory.id)}
                      >
                        {TEXT.removeDirectory}
                      </button>
                    ) : null}
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>

        <h2 className="section-title">{TEXT.addDirectory}</h2>
        <div className="form-grid">
          <div className="field">
            <label htmlFor="directory-path">{TEXT.directoryPath}</label>
            <div className="input-with-action">
              <input
                id="directory-path"
                value={directoryForm.path}
                onChange={(event) =>
                  setDirectoryForm((current) => ({ ...current, path: event.target.value }))
                }
              />
              <button
                id="pick-directory-path-button"
                type="button"
                className="button secondary"
                disabled={isPickingDirectory}
                onClick={() =>
                  handlePickDirectory((path) =>
                    setDirectoryForm((current) => ({ ...current, path }))
                  )
                }
              >
                {isPickingDirectory ? TEXT.pickDirectoryBusy : TEXT.pickDirectory}
              </button>
            </div>
          </div>
          <div className="field">
            <label htmlFor="directory-tool">{TEXT.directoryType}</label>
            <SelectField
              id="directory-tool"
              value={directoryForm.toolType}
              options={directoryToolOptions}
              onChange={(value) =>
                setDirectoryForm((current) => ({ ...current, toolType: value as ToolType }))
              }
            />
            <div className="subtle">{TEXT.genericHelp}</div>
          </div>
          <button
            id="add-directory-button"
            className="button"
            onClick={() =>
              addDirectoryMutation.mutate({
                path: directoryForm.path,
                toolType: directoryForm.toolType,
                scope: 'custom'
              })
            }
          >
            {TEXT.addDirectoryButton}
          </button>
        </div>

        <h2 className="section-title">{TEXT.rootReuse}</h2>
        <div className="detail-form">
          <div className="field">
            <label htmlFor="source-root">{TEXT.sourceDirectory}</label>
            <SelectField
              id="source-root"
              value={rootLinkForm.sourceRootPath}
              options={sourceRootOptions}
              onChange={(value) =>
                setRootLinkForm((current) => ({ ...current, sourceRootPath: value }))
              }
              disabled={sourceRootOptions.length === 0}
            />
          </div>
          <div className="field">
            <label htmlFor="target-root">{TEXT.targetLinkPath}</label>
            <div className="input-with-action">
              <input
                id="target-root"
                value={rootLinkForm.targetRootPath}
                onChange={(event) =>
                  setRootLinkForm((current) => ({ ...current, targetRootPath: event.target.value }))
                }
              />
              <button
                id="pick-root-target-directory-button"
                type="button"
                className="button secondary"
                disabled={isPickingDirectory}
                onClick={() =>
                  handlePickDirectory((path) =>
                    setRootLinkForm((current) => ({
                      ...current,
                      targetRootPath: buildPickedLinkPath(path, current.sourceRootPath)
                    }))
                  )
                }
              >
                {isPickingDirectory ? TEXT.pickDirectoryBusy : TEXT.pickDirectory}
              </button>
            </div>
          </div>
          <button
            className="button secondary"
            onClick={() => createRootLinkMutation.mutate(rootLinkForm)}
          >
            {TEXT.createRootLink}
          </button>
        </div>
      </aside>

      <main className="panel main-panel">
        <div className="toolbar">
          <div className="field">
            <label htmlFor="search">{TEXT.search}</label>
            <input
              id="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={TEXT.searchPlaceholder}
            />
          </div>
          <div className="field">
            <label htmlFor="path-filter">{TEXT.pathFilter}</label>
            <SelectField
              id="path-filter"
              value={pathFilter}
              options={pathFilterOptions}
              onChange={setPathFilter}
            />
          </div>
          <div className="field">
            <label>{TEXT.stats}</label>
            <div className="card compact-card">
              {filteredSkills.length} {TEXT.skillCountSuffix}
            </div>
          </div>
        </div>

        <div className="card batch-toolbar">
          <div className="button-row">
            <button
              id="select-current-path-skills-button"
              className="button secondary"
              type="button"
              onClick={selectCurrentPathSkills}
            >
              {TEXT.selectCurrentPath}
            </button>
            <button
              id="clear-selected-skills-button"
              className="button secondary"
              type="button"
              onClick={clearSelectedSkills}
            >
              {TEXT.clearSelected}
            </button>
          </div>
          <div className="batch-actions">
            <div className="field">
              <label htmlFor="batch-availability-mode">{TEXT.batchAvailability}</label>
              <SelectField
                id="batch-availability-mode"
                value={batchAvailabilityMode}
                options={availabilityOptions}
                onChange={(value) => setBatchAvailabilityMode(value as AvailabilityMode)}
              />
            </div>
            <button
              id="batch-update-availability-button"
              className="button"
              type="button"
              disabled={selectedSkillIds.length === 0}
              onClick={() =>
                batchAvailabilityMutation.mutate({
                  skillIds: selectedSkillIds,
                  mode: batchAvailabilityMode
                })
              }
            >
              {TEXT.batchUpdateAvailability}
            </button>
          </div>
          <div className="subtle">
            {TEXT.batchSelectionSummaryPrefix}
            {selectedSkillIds.length}
            {TEXT.batchSelectionSummaryMiddle}
            {selectedInCurrentPathCount}
            {TEXT.batchSelectionSummarySuffix}
          </div>
        </div>

        <div className="list">
          {filteredSkills.map((skill) => (
            <div key={skill.id} className={`skill-row ${selectedSkillId === skill.id ? 'active' : ''}`}>
              <div className="skill-row-head">
                <label className="checkbox-row">
                  <input
                    type="checkbox"
                    checked={selectedSkillIds.includes(skill.id)}
                    onChange={() => toggleSkillSelection(skill.id)}
                  />
                  <span>{TEXT.batchSelect}</span>
                </label>
                <div className="button-row">
                  <AvailabilityBadge mode={skill.availabilityMode} />
                  <span className="pill">{toolLabels[skill.toolType]}</span>
                  {skill.isSymlink ? <span className="pill hidden">symlink</span> : null}
                </div>
              </div>
              <button
                type="button"
                className="skill-detail-button"
                onClick={() => setSelectedSkillId(skill.id)}
              >
                <strong>{skill.name}</strong>
                <div>{skill.description || TEXT.noDescription}</div>
                <div className="path-scroll subtle">{skill.skillPath}</div>
              </button>
            </div>
          ))}
          {filteredSkills.length === 0 ? <div className="empty-state">{TEXT.noMatchedSkills}</div> : null}
        </div>
      </main>

      <section className="panel detail-panel">
        {selectedSkill ? (
          <>
            <div className="hero">
              <h2>{selectedSkill.name}</h2>
              <button
                id="selected-skill-path"
                type="button"
                className="path-copy-button path-scroll"
                title={TEXT.copiedPathHint}
                onDoubleClick={() => copySelectedSkillPath(selectedSkill.skillPath)}
              >
                {selectedSkill.skillPath}
              </button>
            </div>

            <div className="button-row">
              <AvailabilityBadge mode={selectedSkill.availabilityMode} />
              <span className="pill">{toolLabels[selectedSkill.toolType]}</span>
              <span className="pill hidden">{selectedSkill.rootPath}</span>
              {selectedSkill.isSymlink ? <span className="pill hidden">{TEXT.linkedSkill}</span> : null}
            </div>

            <h3 className="section-title">{TEXT.editMetadata}</h3>
            <div className="metadata-grid">
              <div className="metadata-block">
                <h4 className="metadata-block-title">{TEXT.metadataBase}</h4>
                <div className="field">
                  <label htmlFor="skill-name">{TEXT.skillName}</label>
                  <input
                    id="skill-name"
                    value={metadataForm.name}
                    onChange={(event) =>
                      setMetadataForm((current) => ({ ...current, name: event.target.value }))
                    }
                  />
                </div>
                <div className="field">
                  <label htmlFor="skill-description">{TEXT.skillDescription}</label>
                  <textarea
                    id="skill-description"
                    value={metadataForm.description}
                    onChange={(event) =>
                      setMetadataForm((current) => ({
                        ...current,
                        description: event.target.value
                      }))
                    }
                  />
                </div>
              </div>

              {selectedSkill.toolType === 'claude' ? (
                <div className="metadata-block">
                  <h4 className="metadata-block-title">{TEXT.metadataClaude}</h4>
                  <label className="checkbox-row">
                    <input
                      id="claude-user-invocable"
                      type="checkbox"
                      checked={metadataForm.claude.userInvocable}
                      onChange={(event) =>
                        setMetadataForm((current) => ({
                          ...current,
                          claude: {
                            ...current.claude,
                            userInvocable: event.target.checked
                          }
                        }))
                      }
                    />
                    <span>{TEXT.claudeUserInvocable}</span>
                  </label>
                  <label className="checkbox-row">
                    <input
                      id="claude-disable-model-invocation"
                      type="checkbox"
                      checked={metadataForm.claude.disableModelInvocation}
                      onChange={(event) =>
                        setMetadataForm((current) => ({
                          ...current,
                          claude: {
                            ...current.claude,
                            disableModelInvocation: event.target.checked
                          }
                        }))
                      }
                    />
                    <span>{TEXT.claudeDisableModelInvocation}</span>
                  </label>
                  <div className="field">
                    <label htmlFor="claude-allowed-tools">{TEXT.claudeAllowedTools}</label>
                    <textarea
                      id="claude-allowed-tools"
                      value={metadataForm.claude.allowedTools}
                      onChange={(event) =>
                        setMetadataForm((current) => ({
                          ...current,
                          claude: {
                            ...current.claude,
                            allowedTools: event.target.value
                          }
                        }))
                      }
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="claude-context">{TEXT.claudeContext}</label>
                    <input
                      id="claude-context"
                      value={metadataForm.claude.context}
                      onChange={(event) =>
                        setMetadataForm((current) => ({
                          ...current,
                          claude: {
                            ...current.claude,
                            context: event.target.value
                          }
                        }))
                      }
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="claude-agent">{TEXT.claudeAgent}</label>
                    <input
                      id="claude-agent"
                      value={metadataForm.claude.agent}
                      onChange={(event) =>
                        setMetadataForm((current) => ({
                          ...current,
                          claude: {
                            ...current.claude,
                            agent: event.target.value
                          }
                        }))
                      }
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="claude-paths">{TEXT.claudePaths}</label>
                    <textarea
                      id="claude-paths"
                      value={metadataForm.claude.paths}
                      onChange={(event) =>
                        setMetadataForm((current) => ({
                          ...current,
                          claude: {
                            ...current.claude,
                            paths: event.target.value
                          }
                        }))
                      }
                    />
                  </div>
                </div>
              ) : null}

              {selectedSkill.toolType === 'codex' ? (
                <div className="metadata-block">
                  <h4 className="metadata-block-title">{TEXT.metadataCodex}</h4>
                  <label className="checkbox-row">
                    <input
                      id="codex-allow-implicit-invocation"
                      type="checkbox"
                      checked={metadataForm.codex.allowImplicitInvocation}
                      onChange={(event) =>
                        setMetadataForm((current) => ({
                          ...current,
                          codex: {
                            ...current.codex,
                            allowImplicitInvocation: event.target.checked
                          }
                        }))
                      }
                    />
                    <span>{TEXT.codexAllowImplicitInvocation}</span>
                  </label>
                  <div className="field">
                    <label htmlFor="codex-interface">{TEXT.codexInterface}</label>
                    <input
                      id="codex-interface"
                      value={metadataForm.codex.interface}
                      onChange={(event) =>
                        setMetadataForm((current) => ({
                          ...current,
                          codex: {
                            ...current.codex,
                            interface: event.target.value
                          }
                        }))
                      }
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="codex-dependencies">{TEXT.codexDependencies}</label>
                    <textarea
                      id="codex-dependencies"
                      value={metadataForm.codex.dependencies}
                      onChange={(event) =>
                        setMetadataForm((current) => ({
                          ...current,
                          codex: {
                            ...current.codex,
                            dependencies: event.target.value
                          }
                        }))
                      }
                    />
                  </div>
                </div>
              ) : null}

              <button
                id="save-metadata-button"
                type="button"
                className="button"
                onClick={() =>
                  updateMetadataMutation.mutate({
                    id: selectedSkill.id,
                    input: buildMetadataPayload(selectedSkill, metadataForm)
                  })
                }
              >
                {TEXT.saveMetadata}
              </button>
            </div>

            <h3 className="section-title">{TEXT.availability}</h3>
            <div className="detail-form">
              <div className="field">
                <label htmlFor="availability-mode">{TEXT.status}</label>
                <SelectField
                  id="availability-mode"
                  value={availabilityForm}
                  options={availabilityOptions}
                  onChange={(value) => setAvailabilityForm(value as AvailabilityMode)}
                />
              </div>
              <button
                id="update-availability-button"
                type="button"
                className="button secondary"
                onClick={() =>
                  updateAvailabilityMutation.mutate({
                    id: selectedSkill.id,
                    mode: availabilityForm
                  })
                }
              >
                {TEXT.updateStatus}
              </button>
            </div>

            <h3 className="section-title">{TEXT.skillReuse}</h3>
            <div className="detail-form">
              <div className="field">
                <label htmlFor="link-root">{TEXT.targetSkillsDirectory}</label>
                <div className="input-with-action">
                  <input
                    id="link-root"
                    value={linkTargetRootPath}
                    onChange={(event) => setLinkTargetRootPath(event.target.value)}
                  />
                  <button
                    id="pick-skill-link-target-directory-button"
                    type="button"
                    className="button secondary"
                    disabled={isPickingDirectory}
                    onClick={() => handlePickDirectory(setLinkTargetRootPath)}
                  >
                    {isPickingDirectory ? TEXT.pickDirectoryBusy : TEXT.pickDirectory}
                  </button>
                </div>
              </div>
              <button
                id="create-skill-link-button"
                type="button"
                className="button secondary"
                onClick={() =>
                  createSkillLinkMutation.mutate({
                    skillId: selectedSkill.id,
                    targetRootPath: linkTargetRootPath
                  })
                }
              >
                {TEXT.createSkillLink}
              </button>
            </div>

            <h3 className="section-title">{TEXT.rawData}</h3>
            <div className="card">
              <pre>{JSON.stringify(selectedSkill.frontmatter, null, 2)}</pre>
            </div>
            {selectedSkill.codexConfig ? (
              <div className="card">
                <pre>{JSON.stringify(selectedSkill.codexConfig, null, 2)}</pre>
              </div>
            ) : null}

            <h3 className="section-title">{TEXT.dangerZone}</h3>
            <div className="button-row">
              <button
                type="button"
                className="button danger"
                onClick={() => {
                  if (window.confirm(`\u786e\u8ba4\u5220\u9664\u6280\u80fd ${selectedSkill.name} \u5417\uff1f`)) {
                    deleteSkillMutation.mutate(selectedSkill.id);
                  }
                }}
              >
                {TEXT.deleteSkill}
              </button>
            </div>
          </>
        ) : (
          <div className="empty-state">{TEXT.viewSkillDetail}</div>
        )}

        <div className="section-header">
          <h3 className="section-title">{TEXT.recentActions}</h3>
          <div className="button-row">
            <button
              id="export-logs-button"
              type="button"
              className="button secondary"
              disabled={logs.length === 0}
              onClick={() => exportLogsMutation.mutate()}
            >
              {TEXT.exportCsv}
            </button>
            <button
              id="clear-logs-button"
              type="button"
              className="button secondary"
              disabled={logs.length === 0}
              onClick={() => clearLogsMutation.mutate()}
            >
              {TEXT.clearRecentActions}
            </button>
          </div>
        </div>
        <div className="list">
          {logs.map((log) => (
            <button
              type="button"
              className="log-row log-row-button"
              key={log.id}
              onClick={() => setSelectedLogId(log.id)}
            >
              <div className="button-row">
                <strong>{log.action}</strong>
                {renderUndoBadge(log)}
              </div>
              <div className="path-scroll">{log.targetPath}</div>
              <div className="subtle">{new Date(log.createdAt).toLocaleString()}</div>
            </button>
          ))}
        </div>
      </section>
      {selectedLogId ? (
        <div className="modal-backdrop" role="presentation" onClick={() => setSelectedLogId('')}>
          <div
            className="modal-card"
            role="dialog"
            aria-modal="true"
            aria-label={TEXT.operationDetail}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="section-header">
              <h3 className="section-title">{TEXT.operationDetail}</h3>
              <button
                type="button"
                className="button secondary"
                onClick={() => setSelectedLogId('')}
              >
                {TEXT.closeDialog}
              </button>
            </div>
            {logDetailQuery.data?.log ? (
              (() => {
                const undoState = getUndoState(logDetailQuery.data.log);

                return (
                  <div className="stack">
                <div className="card">
                  <strong>{logDetailQuery.data.log.action}</strong>
                  <div className="path-scroll">{logDetailQuery.data.log.targetPath}</div>
                  <div className="subtle">
                    {new Date(logDetailQuery.data.log.createdAt).toLocaleString()}
                  </div>
                </div>
                {undoState.supported && undoState.available ? (
                  <div className="button-row">
                    {renderUndoBadge(logDetailQuery.data.log)}
                  </div>
                ) : null}
                <div className="card">
                  <strong>{TEXT.rawDetail}</strong>
                  <pre>{JSON.stringify(logDetailQuery.data.log.detail, null, 2)}</pre>
                </div>
                {undoState.supported && undoState.available ? (
                  <div className="button-row">
                    <button
                      id="undo-log-button"
                      type="button"
                      className="button"
                      onClick={() => undoLogMutation.mutate(logDetailQuery.data!.log.id)}
                    >
                      {TEXT.undoThisOperation}
                    </button>
                  </div>
                ) : null}
                  </div>
                );
              })()
            ) : (
              <div className="empty-state">{TEXT.operationDetail}</div>
            )}
          </div>
        </div>
      ) : null}
      </div>
    </>
  );
}
