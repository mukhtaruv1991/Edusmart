import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function normalizePersonName(value: string): string {
  return value.trim().replace(/\s+/g, ' ')
}

export function getPersonNameParts(value: string): string[] {
  return normalizePersonName(value).split(' ').filter(Boolean)
}

export function isFourPartName(value: string): boolean {
  return getPersonNameParts(value).length === 4
}

export function createStableKey(...values: string[]): string {
  const source = values.map(value => normalizePersonName(value).toLocaleLowerCase()).join('|')
  let hash = 2166136261
  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0).toString(36)
}
