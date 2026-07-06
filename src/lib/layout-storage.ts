const PREFIX = "jollof-layout-";

export const layoutStorage = {
  getItem: (key: string): string | null => localStorage.getItem(PREFIX + key),
  setItem: (key: string, value: string): void => localStorage.setItem(PREFIX + key, value),
};
