// logger.ts
export type LogLevel = 'log' | 'info' | 'warn' | 'error' | 'debug';

export interface LogEntry {
  emoji: string
  /** e.g., "router.service.ts" */
  file: string;
  /** e.g., "createHomePageUrl(baseUrl: string, homePage: string)" */
  method: string;
  /** Named params passed to the method */
  params?: Record<string, unknown>;
  /** Any derived/computed values you want to show */
  data?: Record<string, unknown>;
  /** Optional label for categorization */
  tag?: string;
  /** Defaults to ISO string; override if you want custom format */
  timestamp?: string;
  /** Console method to use; default 'log' */
  level?: LogLevel;
  /** Optional CSS for the heading (shown as a field, not styled text) */
  headingStyle?: string;
}

/**
 * Single-log structured output with a heading and payload.
 * Uses exactly ONE console call.
 */
export function logOnce(entry: LogEntry): void {
  const {
    emoji,
    file,
    method,
    params = {},
    data = {},
    tag,
    // level = 'log',
    // headingStyle = 'color:#0b74de;font-weight:600;',
  } = entry;

  const timestamp = entry.timestamp ?? new Date().toTimeString().slice(0, 8);
  const heading = `${emoji} ${file} :: ${method} @ ${timestamp}`;
  // const temp = `${level} ${headingStyle}`;

  // ONE and only ONE console call:
  console.log(heading, {
    params,
    ...(Object.keys(data).length ? { data } : {}),
    ...(tag ? { tag } : {}),
  });
}
