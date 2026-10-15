/** The user asked the system for less motion: skip or shorten animations. */
export const reduceMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches
