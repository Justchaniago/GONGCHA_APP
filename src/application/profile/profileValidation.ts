export const PROFILE_NAME_MAX_LENGTH = 160;

export function isValidProfileName(value: string): boolean {
  const length = value.trim().length;
  return length > 0 && length <= PROFILE_NAME_MAX_LENGTH;
}

export function toIsoDateOfBirth(
  value: string,
  today: Date = new Date(),
): string {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
  if (!match) {
    throw new Error('date_of_birth_invalid');
  }
  const [, dayText, monthText, yearText] = match;
  const day = Number(dayText);
  const month = Number(monthText);
  const year = Number(yearText);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new Error('date_of_birth_invalid');
  }
  const todayKey =
    today.getFullYear() * 10_000 +
    (today.getMonth() + 1) * 100 +
    today.getDate();
  const dateKey = year * 10_000 + month * 100 + day;
  if (dateKey > todayKey) {
    throw new Error('date_of_birth_in_future');
  }
  return `${yearText}-${monthText}-${dayText}`;
}

export function isValidDateOfBirth(
  value: string,
  today: Date = new Date(),
): boolean {
  try {
    toIsoDateOfBirth(value, today);
    return true;
  } catch {
    return false;
  }
}
