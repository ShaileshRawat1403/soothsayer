// String and date formatting utilities

// Slugify a string
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Truncate text with ellipsis
export function truncate(text: string, maxLength: number, ellipsis = '...'): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - ellipsis.length).trim() + ellipsis;
}

// Capitalize first letter
export function capitalize(text: string): string {
  if (!text) return '';
  return text.charAt(0).toUpperCase() + text.slice(1);
}

// Title case
export function titleCase(text: string): string {
  return text
    .toLowerCase()
    .split(' ')
    .map((word) => capitalize(word))
    .join(' ');
}

// Camel case to title
export function camelToTitle(text: string): string {
  return text
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
}

// Snake case to title
export function snakeToTitle(text: string): string {
  return text
    .split('_')
    .map((word) => capitalize(word))
    .join(' ');
}

// Format bytes to human readable
export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

// Format number with commas
export function formatNumber(num: number): string {
  return num.toLocaleString();
}

// Format percentage
export function formatPercentage(value: number, decimals = 1): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

// Format duration in milliseconds
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  if (ms < 3600000) return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
  return `${Math.floor(ms / 3600000)}h ${Math.floor((ms % 3600000) / 60000)}m`;
}

// Format relative time
export function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return 'just now';
  if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`;

  return date.toLocaleDateString();
}

// Format date
export function formatDate(date: Date, format: 'short' | 'long' | 'iso' = 'short'): string {
  switch (format) {
    case 'short':
      return date.toLocaleDateString();
    case 'long':
      return date.toLocaleDateString(undefined, {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    case 'iso':
      return date.toISOString();
  }
}

// Format time
export function formatTime(date: Date, includeSeconds = false): string {
  return date.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: includeSeconds ? '2-digit' : undefined,
  });
}

// Parse duration string to milliseconds (e.g., "15m", "1h", "7d")
export function parseDuration(duration: string): number {
  const match = duration.match(/^(\d+)([smhd])$/);
  if (!match) throw new Error(`Invalid duration format: ${duration}`);

  const value = parseInt(match[1], 10);
  const unit = match[2];

  switch (unit) {
    case 's':
      return value * 1000;
    case 'm':
      return value * 60 * 1000;
    case 'h':
      return value * 60 * 60 * 1000;
    case 'd':
      return value * 24 * 60 * 60 * 1000;
    default:
      throw new Error(`Unknown duration unit: ${unit}`);
  }
}

// Mask sensitive data
export function maskString(text: string, visibleChars = 4, maskChar = '*'): string {
  if (text.length <= visibleChars) return maskChar.repeat(text.length);
  return maskChar.repeat(text.length - visibleChars) + text.slice(-visibleChars);
}

// Mask email
export function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return maskString(email);
  const maskedLocal = local.length > 2 
    ? local[0] + '*'.repeat(local.length - 2) + local[local.length - 1]
    : '*'.repeat(local.length);
  return `${maskedLocal}@${domain}`;
}

// Generate initials from name
export function getInitials(name: string, maxLength = 2): string {
  return name
    .split(' ')
    .map((word) => word.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, maxLength);
}

// Pluralize a word
export function pluralize(count: number, singular: string, plural?: string): string {
  if (count === 1) return singular;
  return plural || `${singular}s`;
}
