// Imports
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// Constants
export const LOCAL_USER_TOKEN_KEY = "do-user-token";

// Helpers
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
