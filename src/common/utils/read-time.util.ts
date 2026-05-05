const WORDS_PER_MINUTE = 200;

export const calculateReadTimeMinutes = (content: string): number => {
  const normalized = content
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!normalized) {
    return 1;
  }

  const words = normalized.match(/\p{L}[\p{L}\p{N}'’-]*/gu) ?? [];
  return Math.max(1, Math.ceil(words.length / WORDS_PER_MINUTE));
};
