import { DEFAULT_JOIN_CODE_LENGTH } from './constants.js';

const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no ambiguous 0/O, 1/I

/**
 * Generate a short, readable join code (e.g. for room entry).
 */
export function generateJoinCode(length: number = DEFAULT_JOIN_CODE_LENGTH): string {
  let code = '';
  const random = typeof crypto !== 'undefined' && crypto.getRandomValues;
  for (let i = 0; i < length; i++) {
    const idx = random
      ? crypto.getRandomValues(new Uint32Array(1))[0] % CHARS.length
      : Math.floor(Math.random() * CHARS.length);
    code += CHARS[idx];
  }
  return code;
}
