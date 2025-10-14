/**
 * Breakpoint definitions in pixels based on our design system and tailwindcss defaults.
 *
 * @see {@link /libs/components/src/stories/responsive-design.mdx} for details on design system.
 * @see {@link https://tailwindcss.com/docs/responsive-design} for tailwindcss breakpoints.
 */
export const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  "2xl": 1536,
};

/**
 * Checks if the current viewport matches the specified breakpoint.
 * @param size The breakpoint to check.
 * @returns True if the viewport matches the breakpoint, false otherwise.
 */
export const isBreakpoint = (size: keyof typeof BREAKPOINTS): boolean => {
  if (typeof window === "undefined" || !window.matchMedia) {
    return false;
  }
  const query = `(max-width: ${BREAKPOINTS[size]}px)`;
  return window.matchMedia(query).matches;
};
