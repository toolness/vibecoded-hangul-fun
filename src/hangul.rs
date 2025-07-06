#[derive(Debug, PartialEq, Copy, Clone)]
pub enum HangulCharClass {
    CompatibilityJamo,
    JamoExtendedA,
    JamoExtendedB,
    Jamo,
    Syllables,
    None,
}

impl From<char> for HangulCharClass {
    fn from(value: char) -> Self {
        match value {
            '\u{ac00}'..='\u{d7af}' => HangulCharClass::Syllables,
            '\u{1100}'..='\u{11ff}' => HangulCharClass::Jamo,
            '\u{3130}'..='\u{318f}' => HangulCharClass::CompatibilityJamo,
            '\u{a960}'..='\u{a97f}' => HangulCharClass::JamoExtendedA,
            '\u{d7b0}'..='\u{d7ff}' => HangulCharClass::JamoExtendedB,
            _ => HangulCharClass::None,
        }
    }
}

impl HangulCharClass {
    pub fn split(value: &str) -> Vec<(HangulCharClass, &str)> {
        let mut result = vec![];
        let mut pos: Option<(usize, HangulCharClass)> = None;
        for (curr_idx, char) in value.char_indices() {
            if let Some((start_idx, class)) = pos {
                if HangulCharClass::from(char) != class {
                    result.push((class, &value[start_idx..curr_idx]));
                    pos = Some((curr_idx, HangulCharClass::from(char)));
                }
            } else {
                pos = Some((curr_idx, HangulCharClass::from(char)));
            }
        }
        if let Some((start_idx, class)) = pos {
            result.push((class, &value[start_idx..]));
        }
        result
    }
}

/// Decomposes the given Hangul syllable into its
/// composite Hangul jamos.
///
/// If the character is not a Hangul syllable, returns
/// None.
pub fn decompose_hangul_syllable_to_jamos(ch: char) -> Option<(char, char, Option<char>)> {
    let class = HangulCharClass::from(ch);
    let codepoint = ch as u32;
    if class != HangulCharClass::Syllables {
        return None;
    }
    let base_codepoint = codepoint - 0xac00;
    let initial_codepoint_idx = base_codepoint / 588;
    let medial_codepoint_idx = (base_codepoint - (initial_codepoint_idx * 588)) / 28;
    let final_codepoint_idx =
        base_codepoint - (initial_codepoint_idx * 588) - (medial_codepoint_idx * 28);
    let initial_codepoint = 0x1100 + initial_codepoint_idx;
    let medial_codepoint = 0x1161 + medial_codepoint_idx;
    let final_codepoint = 0x11a7 + final_codepoint_idx;
    let initial_ch = char::from_u32(initial_codepoint).unwrap();
    let medial_ch = char::from_u32(medial_codepoint).unwrap();
    let maybe_final_ch = if final_codepoint_idx == 0 {
        None
    } else {
        char::from_u32(final_codepoint)
    };
    assert_eq!(HangulCharClass::from(initial_ch), HangulCharClass::Jamo);
    assert_eq!(HangulCharClass::from(medial_ch), HangulCharClass::Jamo);
    Some((initial_ch, medial_ch, maybe_final_ch))
}

/// Converts a Hangul Jamo to its equivalent
/// Hangul Compatibility Jamo.
///
/// This can be used when you want to display the
/// Jamo by itself, and ensure that it's displayed
/// without weird spacing on either side (which it seems
/// like terminals often do in inconsistent ways).
pub fn hangul_jamo_to_compat(ch: char) -> Option<char> {
    match ch {
        // Consonants
        'ᄀ' | 'ᆨ' => Some('ㄱ'),
        'ᄁ' | 'ᆩ' => Some('ㄲ'),
        'ᆪ' => Some('ㄳ'),
        'ᄂ' | 'ᆫ' => Some('ㄴ'),
        'ᆬ' => Some('ㄵ'),
        'ᆭ' => Some('ㄶ'),
        'ᄃ' | 'ᆮ' => Some('ㄷ'),
        'ᄄ' => Some('ㄸ'),
        'ᄅ' | 'ᆯ' => Some('ㄹ'),
        'ᆰ' => Some('ㄺ'),
        'ᆱ' => Some('ㄻ'),
        'ᆲ' => Some('ㄼ'),
        'ᆳ' => Some('ㄽ'),
        'ᆴ' => Some('ㄾ'),
        'ᆵ' => Some('ㄿ'),
        'ᆶ' => Some('ㅀ'),
        'ᄆ' | 'ᆷ' => Some('ㅁ'),
        'ᄇ' | 'ᆸ' => Some('ㅂ'),
        'ᄈ' => Some('ㅃ'),
        'ᆹ' => Some('ㅄ'),
        'ᄉ' | 'ᆺ' => Some('ㅅ'),
        'ᄊ' | 'ᆻ' => Some('ㅆ'),
        'ᄋ' | 'ᆼ' => Some('ㅇ'),
        'ᄌ' | 'ᆽ' => Some('ㅈ'),
        'ᄍ' => Some('ㅉ'),
        'ᄎ' | 'ᆾ' => Some('ㅊ'),
        'ᄏ' | 'ᆿ' => Some('ㅋ'),
        'ᄐ' | 'ᇀ' => Some('ㅌ'),
        'ᄑ' | 'ᇁ' => Some('ㅍ'),
        'ᄒ' | 'ᇂ' => Some('ㅎ'),

        // Vowels
        'ᅡ' => Some('ㅏ'),
        'ᅢ' => Some('ㅐ'),
        'ᅣ' => Some('ㅑ'),
        'ᅤ' => Some('ㅒ'),
        'ᅥ' => Some('ㅓ'),
        'ᅦ' => Some('ㅔ'),
        'ᅧ' => Some('ㅕ'),
        'ᅨ' => Some('ㅖ'),
        'ᅩ' => Some('ㅗ'),
        'ᅪ' => Some('ㅘ'),
        'ᅫ' => Some('ㅙ'),
        'ᅬ' => Some('ㅚ'),
        'ᅭ' => Some('ㅛ'),
        'ᅮ' => Some('ㅜ'),
        'ᅯ' => Some('ㅝ'),
        'ᅰ' => Some('ㅞ'),
        'ᅱ' => Some('ㅟ'),
        'ᅲ' => Some('ㅠ'),
        'ᅳ' => Some('ㅡ'),
        'ᅴ' => Some('ㅢ'),
        'ᅵ' => Some('ㅣ'),

        _ => None,
    }
}

/// Converts a Hangul Jamo to its equivalent
/// Hangul Compatibility Jamo.
///
/// If there isn't a corresponding one, it just returns
/// the original character unchanged.
pub fn hangul_jamo_to_compat_with_fallback(ch: char) -> char {
    hangul_jamo_to_compat(ch).unwrap_or(ch)
}

fn hangul_syllable_to_jamos(ch: char) -> Option<String> {
    if let Some((initial_ch, medial_ch, maybe_final_ch)) = decompose_hangul_syllable_to_jamos(ch) {
        if let Some(final_ch) = maybe_final_ch {
            Some(format!("{initial_ch}{medial_ch}{final_ch}"))
        } else {
            Some(format!("{initial_ch}{medial_ch}"))
        }
    } else {
        None
    }
}

/// Converts any Hangul syllables in the given string into
/// Hangul jamos.
pub fn decompose_all_hangul_syllables<T: AsRef<str>>(value: T) -> String {
    let str = value.as_ref();
    let mut result = String::with_capacity(str.len());

    for ch in str.chars() {
        if let Some(jamos) = hangul_syllable_to_jamos(ch) {
            result.push_str(&jamos);
        } else {
            result.push(ch);
        }
    }

    result
}

#[cfg(test)]
mod test {
    use crate::hangul::{
        decompose_all_hangul_syllables, decompose_hangul_syllable_to_jamos, HangulCharClass,
    };

    #[test]
    fn test_char_class_works() {
        assert_eq!(HangulCharClass::from('이'), HangulCharClass::Syllables);
        assert_eq!(HangulCharClass::from('ᆸ'), HangulCharClass::Jamo);
        assert_eq!(
            HangulCharClass::from('ㄱ'),
            HangulCharClass::CompatibilityJamo
        );
    }

    #[test]
    fn test_decompose_works() {
        assert_eq!(decompose_hangul_syllable_to_jamos('h'), None);
        assert_eq!(
            decompose_hangul_syllable_to_jamos('이'),
            Some(('ᄋ', 'ᅵ', None))
        );
        assert_eq!(
            decompose_hangul_syllable_to_jamos('는'),
            Some(('ᄂ', 'ᅳ', Some('ᆫ')))
        );
    }

    #[test]
    fn test_decompose_all_works() {
        let orig = "이";
        assert_eq!(orig.chars().count(), 1);
        let decomposed = "이";
        assert_eq!(decomposed.chars().count(), 2);
        assert_eq!(decompose_all_hangul_syllables(&orig), decomposed.to_owned());
    }

    #[test]
    fn test_split_works() {
        assert_eq!(HangulCharClass::split(""), vec![]);
        assert_eq!(
            HangulCharClass::split("이"),
            vec![(HangulCharClass::Syllables, "이")]
        );

        assert_eq!(
            HangulCharClass::split("hi 이 there"),
            vec![
                (HangulCharClass::None, "hi "),
                (HangulCharClass::Syllables, "이"),
                (HangulCharClass::None, " there")
            ]
        );
    }
}
