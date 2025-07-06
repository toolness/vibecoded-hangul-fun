export const HangulCharClass = {
  CompatibilityJamo: "CompatibilityJamo",
  JamoExtendedA: "JamoExtendedA",
  JamoExtendedB: "JamoExtendedB",
  Jamo: "Jamo",
  Syllables: "Syllables",
  None: "None",
} as const;

export type HangulCharClass =
  (typeof HangulCharClass)[keyof typeof HangulCharClass];

export const HangulCharClassStatic = {
  from(value: string): HangulCharClass {
    if (value.length === 0) return HangulCharClass.None;

    const codePoint = value.charCodeAt(0);

    if (codePoint >= 0xac00 && codePoint <= 0xd7af) {
      return HangulCharClass.Syllables;
    } else if (codePoint >= 0x1100 && codePoint <= 0x11ff) {
      return HangulCharClass.Jamo;
    } else if (codePoint >= 0x3130 && codePoint <= 0x318f) {
      return HangulCharClass.CompatibilityJamo;
    } else if (codePoint >= 0xa960 && codePoint <= 0xa97f) {
      return HangulCharClass.JamoExtendedA;
    } else if (codePoint >= 0xd7b0 && codePoint <= 0xd7ff) {
      return HangulCharClass.JamoExtendedB;
    }

    return HangulCharClass.None;
  },

  split(value: string): Array<[HangulCharClass, string]> {
    const result: Array<[HangulCharClass, string]> = [];
    let pos: { startIdx: number; class: HangulCharClass } | null = null;

    let currIdx = 0;
    for (const char of value) {
      const charClass = HangulCharClassStatic.from(char);

      if (pos) {
        if (charClass !== pos.class) {
          result.push([pos.class, value.substring(pos.startIdx, currIdx)]);
          pos = { startIdx: currIdx, class: charClass };
        }
      } else {
        pos = { startIdx: currIdx, class: charClass };
      }

      currIdx += char.length;
    }

    if (pos) {
      result.push([pos.class, value.substring(pos.startIdx)]);
    }

    return result;
  },
};

export function decompose_hangul_syllable_to_jamos(
  ch: string,
): [string, string, string?] | null {
  if (ch.length === 0) return null;

  const charClass = HangulCharClassStatic.from(ch);
  const codepoint = ch.charCodeAt(0);

  if (charClass !== HangulCharClass.Syllables) {
    return null;
  }

  const baseCodepoint = codepoint - 0xac00;
  const initialCodepointIdx = Math.floor(baseCodepoint / 588);
  const medialCodepointIdx = Math.floor(
    (baseCodepoint - initialCodepointIdx * 588) / 28,
  );
  const finalCodepointIdx =
    baseCodepoint - initialCodepointIdx * 588 - medialCodepointIdx * 28;

  const initialCodepoint = 0x1100 + initialCodepointIdx;
  const medialCodepoint = 0x1161 + medialCodepointIdx;
  const finalCodepoint = 0x11a7 + finalCodepointIdx;

  const initialCh = String.fromCharCode(initialCodepoint);
  const medialCh = String.fromCharCode(medialCodepoint);
  const maybeFinalCh =
    finalCodepointIdx === 0 ? undefined : String.fromCharCode(finalCodepoint);

  return [initialCh, medialCh, maybeFinalCh];
}

export function hangul_jamo_to_compat(ch: string): string | null {
  const jamoToCompatMap: { [key: string]: string } = {
    // Consonants
    ᄀ: "ㄱ",
    ᆨ: "ㄱ",
    ᄁ: "ㄲ",
    ᆩ: "ㄲ",
    ᆪ: "ㄳ",
    ᄂ: "ㄴ",
    ᆫ: "ㄴ",
    ᆬ: "ㄵ",
    ᆭ: "ㄶ",
    ᄃ: "ㄷ",
    ᆮ: "ㄷ",
    ᄄ: "ㄸ",
    ᄅ: "ㄹ",
    ᆯ: "ㄹ",
    ᆰ: "ㄺ",
    ᆱ: "ㄻ",
    ᆲ: "ㄼ",
    ᆳ: "ㄽ",
    ᆴ: "ㄾ",
    ᆵ: "ㄿ",
    ᆶ: "ㅀ",
    ᄆ: "ㅁ",
    ᆷ: "ㅁ",
    ᄇ: "ㅂ",
    ᆸ: "ㅂ",
    ᄈ: "ㅃ",
    ᆹ: "ㅄ",
    ᄉ: "ㅅ",
    ᆺ: "ㅅ",
    ᄊ: "ㅆ",
    ᆻ: "ㅆ",
    ᄋ: "ㅇ",
    ᆼ: "ㅇ",
    ᄌ: "ㅈ",
    ᆽ: "ㅈ",
    ᄍ: "ㅉ",
    ᄎ: "ㅊ",
    ᆾ: "ㅊ",
    ᄏ: "ㅋ",
    ᆿ: "ㅋ",
    ᄐ: "ㅌ",
    ᇀ: "ㅌ",
    ᄑ: "ㅍ",
    ᇁ: "ㅍ",
    ᄒ: "ㅎ",
    ᇂ: "ㅎ",

    // Vowels
    ᅡ: "ㅏ",
    ᅢ: "ㅐ",
    ᅣ: "ㅑ",
    ᅤ: "ㅒ",
    ᅥ: "ㅓ",
    ᅦ: "ㅔ",
    ᅧ: "ㅕ",
    ᅨ: "ㅖ",
    ᅩ: "ㅗ",
    ᅪ: "ㅘ",
    ᅫ: "ㅙ",
    ᅬ: "ㅚ",
    ᅭ: "ㅛ",
    ᅮ: "ㅜ",
    ᅯ: "ㅝ",
    ᅰ: "ㅞ",
    ᅱ: "ㅟ",
    ᅲ: "ㅠ",
    ᅳ: "ㅡ",
    ᅴ: "ㅢ",
    ᅵ: "ㅣ",
  };

  return jamoToCompatMap[ch] || null;
}

export function hangul_jamo_to_compat_with_fallback(ch: string): string {
  return hangul_jamo_to_compat(ch) || ch;
}

function hangul_syllable_to_jamos(ch: string): string | null {
  const decomposed = decompose_hangul_syllable_to_jamos(ch);
  if (!decomposed) return null;

  const [initial, medial, maybeFinal] = decomposed;
  return maybeFinal
    ? `${initial}${medial}${maybeFinal}`
    : `${initial}${medial}`;
}

export function decompose_all_hangul_syllables(value: string): string {
  let result = "";

  for (const ch of value) {
    const jamos = hangul_syllable_to_jamos(ch);
    if (jamos) {
      result += jamos;
    } else {
      result += ch;
    }
  }

  return result;
}
