export const hashCode = (string: string): string => {
  let hash = 0;

  for (let i = 0, len = string.length; i < len; i += 1) {
    hash = (hash << 5) - hash + string.charCodeAt(i);
    hash |= 0; // Convert to 32bit integer
  }

  return hash.toString();
};
