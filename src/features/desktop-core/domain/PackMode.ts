export const packModes = ['full', 'skeleton', 'directoryTree', 'diffOnly', 'matchedSnippets'] as const;

export type PackMode = (typeof packModes)[number];

export const isPackMode = (value: string): value is PackMode =>
  packModes.includes(value as PackMode);
