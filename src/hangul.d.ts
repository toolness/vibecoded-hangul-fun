export declare const HangulCharClass: {
  readonly CompatibilityJamo: "CompatibilityJamo";
  readonly JamoExtendedA: "JamoExtendedA";
  readonly JamoExtendedB: "JamoExtendedB";
  readonly Jamo: "Jamo";
  readonly Syllables: "Syllables";
  readonly None: "None";
};

export type HangulCharClass = typeof HangulCharClass[keyof typeof HangulCharClass];

export interface HangulCharClassStatic {
  /**
   * Converts a character to its HangulCharClass
   */
  from(value: string): HangulCharClass;
  
  /**
   * Splits a string into segments based on HangulCharClass boundaries
   * Returns an array of tuples containing the class and the substring
   */
  split(value: string): Array<[HangulCharClass, string]>;
}

/**
 * Decomposes the given Hangul syllable into its
 * composite Hangul jamos.
 * 
 * If the character is not a Hangul syllable, returns
 * null.
 * 
 * @returns A tuple of [initial, medial, final?] where final is optional
 */
export function decompose_hangul_syllable_to_jamos(
  ch: string
): [string, string, string?] | null;

/**
 * Converts a Hangul Jamo to its equivalent
 * Hangul Compatibility Jamo.
 * 
 * This can be used when you want to display the
 * Jamo by itself, and ensure that it's displayed
 * without weird spacing on either side (which it seems
 * like terminals often do in inconsistent ways).
 */
export function hangul_jamo_to_compat(ch: string): string | null;

/**
 * Converts a Hangul Jamo to its equivalent
 * Hangul Compatibility Jamo.
 * 
 * If there isn't a corresponding one, it just returns
 * the original character unchanged.
 */
export function hangul_jamo_to_compat_with_fallback(ch: string): string;

/**
 * Converts any Hangul syllables in the given string into
 * Hangul jamos.
 */
export function decompose_all_hangul_syllables(value: string): string;