const ACTIVITY_LOG_KEY = "ktracker_activity_log";

export interface ActivityLogEntry {
  id: string;
  timestamp: number;
  actor: string;
  action: string;
  entityType: string;
  entityId: string;
  entityName: string;
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function getCurrentActor(): string {
  try {
    const emailUser = sessionStorage.getItem("ktracker_current_user");
    if (emailUser) {
      const parsed = JSON.parse(emailUser) as {
        email: string;
        displayName: string;
      };
      return parsed.displayName || parsed.email;
    }
  } catch {
    // ignore
  }
  return "Internet Identity User";
}

export function logActivity(
  actor: string,
  action: string,
  entityType: string,
  entityId: string,
  entityName: string,
): void {
  try {
    const existing = getAllActivityLogs();
    const entry: ActivityLogEntry = {
      id: generateId(),
      timestamp: Date.now(),
      actor,
      action,
      entityType,
      entityId,
      entityName,
    };
    // Keep at most 1000 entries
    const updated = [entry, ...existing].slice(0, 1000);
    localStorage.setItem(ACTIVITY_LOG_KEY, JSON.stringify(updated));
  } catch {
    // Silently ignore storage errors
  }
}

export function getAllActivityLogs(): ActivityLogEntry[] {
  try {
    const raw = localStorage.getItem(ACTIVITY_LOG_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as ActivityLogEntry[];
  } catch {
    return [];
  }
}

export function getActivityLogs(
  page: number,
  pageSize: number,
): ActivityLogEntry[] {
  const all = getAllActivityLogs();
  const start = page * pageSize;
  return all.slice(start, start + pageSize);
}

export function getCreatorByEntityId(entityId: string): string | null {
  const logs = getAllActivityLogs();
  // Find the oldest "Created" log for this entity
  const createLogs = logs.filter(
    (l) => l.entityId === entityId && l.action === "Created",
  );
  if (createLogs.length === 0) return null;
  // Logs are newest-first, so last element is oldest
  return createLogs[createLogs.length - 1].actor;
}
