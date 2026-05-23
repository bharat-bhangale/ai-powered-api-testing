import { useEffect, useState } from 'react';

/**
 * Debounce hook — returns the value after the specified delay.
 * Useful for search inputs, URL bar changes, and other fast-updating fields.
 */
export function useDebounce<T>(value: T, delayMs: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delayMs);

    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debouncedValue;
}
