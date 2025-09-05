// Hiragana dataset — unified source of truth
// Export: Array<{ kana: string, romaji_canon: string, romaji_alt: string[], set: string }>
// Coverage: gojūon, dakuten/handakuten, yōon, small vowels, っ, ん

export const HIRAGANA = [
  // --- Gojūon ---
  { kana: 'あ', romaji_canon: 'a',  romaji_alt: [], set: 'gojuon' },
  { kana: 'い', romaji_canon: 'i',  romaji_alt: [], set: 'gojuon' },
  { kana: 'う', romaji_canon: 'u',  romaji_alt: [], set: 'gojuon' },
  { kana: 'え', romaji_canon: 'e',  romaji_alt: [], set: 'gojuon' },
  { kana: 'お', romaji_canon: 'o',  romaji_alt: [], set: 'gojuon' },

  { kana: 'か', romaji_canon: 'ka', romaji_alt: [], set: 'gojuon' },
  { kana: 'き', romaji_canon: 'ki', romaji_alt: [], set: 'gojuon' },
  { kana: 'く', romaji_canon: 'ku', romaji_alt: [], set: 'gojuon' },
  { kana: 'け', romaji_canon: 'ke', romaji_alt: [], set: 'gojuon' },
  { kana: 'こ', romaji_canon: 'ko', romaji_alt: [], set: 'gojuon' },

  { kana: 'さ', romaji_canon: 'sa', romaji_alt: [], set: 'gojuon' },
  { kana: 'し', romaji_canon: 'shi', romaji_alt: ['si'], set: 'gojuon' },
  { kana: 'す', romaji_canon: 'su', romaji_alt: [], set: 'gojuon' },
  { kana: 'せ', romaji_canon: 'se', romaji_alt: [], set: 'gojuon' },
  { kana: 'そ', romaji_canon: 'so', romaji_alt: [], set: 'gojuon' },

  { kana: 'た', romaji_canon: 'ta', romaji_alt: [], set: 'gojuon' },
  { kana: 'ち', romaji_canon: 'chi', romaji_alt: ['ti','ci'], set: 'gojuon' },
  { kana: 'つ', romaji_canon: 'tsu', romaji_alt: ['tu'], set: 'gojuon' },
  { kana: 'て', romaji_canon: 'te', romaji_alt: [], set: 'gojuon' },
  { kana: 'と', romaji_canon: 'to', romaji_alt: [], set: 'gojuon' },

  { kana: 'な', romaji_canon: 'na', romaji_alt: [], set: 'gojuon' },
  { kana: 'に', romaji_canon: 'ni', romaji_alt: [], set: 'gojuon' },
  { kana: 'ぬ', romaji_canon: 'nu', romaji_alt: [], set: 'gojuon' },
  { kana: 'ね', romaji_canon: 'ne', romaji_alt: [], set: 'gojuon' },
  { kana: 'の', romaji_canon: 'no', romaji_alt: [], set: 'gojuon' },

  { kana: 'は', romaji_canon: 'ha', romaji_alt: [], set: 'gojuon' },
  { kana: 'ひ', romaji_canon: 'hi', romaji_alt: [], set: 'gojuon' },
  { kana: 'ふ', romaji_canon: 'fu', romaji_alt: ['hu'], set: 'gojuon' },
  { kana: 'へ', romaji_canon: 'he', romaji_alt: [], set: 'gojuon' },
  { kana: 'ほ', romaji_canon: 'ho', romaji_alt: [], set: 'gojuon' },

  { kana: 'ま', romaji_canon: 'ma', romaji_alt: [], set: 'gojuon' },
  { kana: 'み', romaji_canon: 'mi', romaji_alt: [], set: 'gojuon' },
  { kana: 'む', romaji_canon: 'mu', romaji_alt: [], set: 'gojuon' },
  { kana: 'め', romaji_canon: 'me', romaji_alt: [], set: 'gojuon' },
  { kana: 'も', romaji_canon: 'mo', romaji_alt: [], set: 'gojuon' },

  { kana: 'や', romaji_canon: 'ya', romaji_alt: [], set: 'gojuon' },
  { kana: 'ゆ', romaji_canon: 'yu', romaji_alt: [], set: 'gojuon' },
  { kana: 'よ', romaji_canon: 'yo', romaji_alt: [], set: 'gojuon' },

  { kana: 'ら', romaji_canon: 'ra', romaji_alt: [], set: 'gojuon' },
  { kana: 'り', romaji_canon: 'ri', romaji_alt: [], set: 'gojuon' },
  { kana: 'る', romaji_canon: 'ru', romaji_alt: [], set: 'gojuon' },
  { kana: 'れ', romaji_canon: 're', romaji_alt: [], set: 'gojuon' },
  { kana: 'ろ', romaji_canon: 'ro', romaji_alt: [], set: 'gojuon' },

  { kana: 'わ', romaji_canon: 'wa', romaji_alt: [], set: 'gojuon' },
  { kana: 'を', romaji_canon: 'wo', romaji_alt: ['o'], set: 'gojuon' },

  // --- Dakuten ---
  { kana: 'が', romaji_canon: 'ga', romaji_alt: [], set: 'dakuten' },
  { kana: 'ぎ', romaji_canon: 'gi', romaji_alt: [], set: 'dakuten' },
  { kana: 'ぐ', romaji_canon: 'gu', romaji_alt: [], set: 'dakuten' },
  { kana: 'げ', romaji_canon: 'ge', romaji_alt: [], set: 'dakuten' },
  { kana: 'ご', romaji_canon: 'go', romaji_alt: [], set: 'dakuten' },

  { kana: 'ざ', romaji_canon: 'za', romaji_alt: [], set: 'dakuten' },
  { kana: 'じ', romaji_canon: 'ji', romaji_alt: ['zi'], set: 'dakuten' },
  { kana: 'ず', romaji_canon: 'zu', romaji_alt: [], set: 'dakuten' },
  { kana: 'ぜ', romaji_canon: 'ze', romaji_alt: [], set: 'dakuten' },
  { kana: 'ぞ', romaji_canon: 'zo', romaji_alt: [], set: 'dakuten' },

  { kana: 'だ', romaji_canon: 'da', romaji_alt: [], set: 'dakuten' },
  { kana: 'ぢ', romaji_canon: 'ji', romaji_alt: ['di'], set: 'dakuten' },
  { kana: 'づ', romaji_canon: 'zu', romaji_alt: ['du','dzu'], set: 'dakuten' },
  { kana: 'で', romaji_canon: 'de', romaji_alt: [], set: 'dakuten' },
  { kana: 'ど', romaji_canon: 'do', romaji_alt: [], set: 'dakuten' },

  { kana: 'ば', romaji_canon: 'ba', romaji_alt: [], set: 'dakuten' },
  { kana: 'び', romaji_canon: 'bi', romaji_alt: [], set: 'dakuten' },
  { kana: 'ぶ', romaji_canon: 'bu', romaji_alt: [], set: 'dakuten' },
  { kana: 'べ', romaji_canon: 'be', romaji_alt: [], set: 'dakuten' },
  { kana: 'ぼ', romaji_canon: 'bo', romaji_alt: [], set: 'dakuten' },

  // --- Handakuten ---
  { kana: 'ぱ', romaji_canon: 'pa', romaji_alt: [], set: 'handakuten' },
  { kana: 'ぴ', romaji_canon: 'pi', romaji_alt: [], set: 'handakuten' },
  { kana: 'ぷ', romaji_canon: 'pu', romaji_alt: [], set: 'handakuten' },
  { kana: 'ぺ', romaji_canon: 'pe', romaji_alt: [], set: 'handakuten' },
  { kana: 'ぽ', romaji_canon: 'po', romaji_alt: [], set: 'handakuten' },

  // --- Yōon (palatalized syllables) ---
  { kana: 'きゃ', romaji_canon: 'kya', romaji_alt: [], set: 'youon' },
  { kana: 'きゅ', romaji_canon: 'kyu', romaji_alt: [], set: 'youon' },
  { kana: 'きょ', romaji_canon: 'kyo', romaji_alt: [], set: 'youon' },

  { kana: 'しゃ', romaji_canon: 'sha', romaji_alt: ['sya'], set: 'youon' },
  { kana: 'しゅ', romaji_canon: 'shu', romaji_alt: ['syu'], set: 'youon' },
  { kana: 'しょ', romaji_canon: 'sho', romaji_alt: ['syo'], set: 'youon' },

  { kana: 'ちゃ', romaji_canon: 'cha', romaji_alt: ['cya','tya'], set: 'youon' },
  { kana: 'ちゅ', romaji_canon: 'chu', romaji_alt: ['cyu','tyu'], set: 'youon' },
  { kana: 'ちょ', romaji_canon: 'cho', romaji_alt: ['cyo','tyo'], set: 'youon' },

  { kana: 'にゃ', romaji_canon: 'nya', romaji_alt: [], set: 'youon' },
  { kana: 'にゅ', romaji_canon: 'nyu', romaji_alt: [], set: 'youon' },
  { kana: 'にょ', romaji_canon: 'nyo', romaji_alt: [], set: 'youon' },

  { kana: 'ひゃ', romaji_canon: 'hya', romaji_alt: [], set: 'youon' },
  { kana: 'ひゅ', romaji_canon: 'hyu', romaji_alt: [], set: 'youon' },
  { kana: 'ひょ', romaji_canon: 'hyo', romaji_alt: [], set: 'youon' },

  { kana: 'みゃ', romaji_canon: 'mya', romaji_alt: [], set: 'youon' },
  { kana: 'みゅ', romaji_canon: 'myu', romaji_alt: [], set: 'youon' },
  { kana: 'みょ', romaji_canon: 'myo', romaji_alt: [], set: 'youon' },

  { kana: 'りゃ', romaji_canon: 'rya', romaji_alt: [], set: 'youon' },
  { kana: 'りゅ', romaji_canon: 'ryu', romaji_alt: [], set: 'youon' },
  { kana: 'りょ', romaji_canon: 'ryo', romaji_alt: [], set: 'youon' },

  { kana: 'ぎゃ', romaji_canon: 'gya', romaji_alt: [], set: 'youon' },
  { kana: 'ぎゅ', romaji_canon: 'gyu', romaji_alt: [], set: 'youon' },
  { kana: 'ぎょ', romaji_canon: 'gyo', romaji_alt: [], set: 'youon' },

  { kana: 'じゃ', romaji_canon: 'ja', romaji_alt: ['jya','zya'], set: 'youon' },
  { kana: 'じゅ', romaji_canon: 'ju', romaji_alt: ['jyu','zyu'], set: 'youon' },
  { kana: 'じょ', romaji_canon: 'jo', romaji_alt: ['jyo','zyo'], set: 'youon' },

  { kana: 'びゃ', romaji_canon: 'bya', romaji_alt: [], set: 'youon' },
  { kana: 'びゅ', romaji_canon: 'byu', romaji_alt: [], set: 'youon' },
  { kana: 'びょ', romaji_canon: 'byo', romaji_alt: [], set: 'youon' },

  { kana: 'ぴゃ', romaji_canon: 'pya', romaji_alt: [], set: 'youon' },
  { kana: 'ぴゅ', romaji_canon: 'pyu', romaji_alt: [], set: 'youon' },
  { kana: 'ぴょ', romaji_canon: 'pyo', romaji_alt: [], set: 'youon' },

  // Rare but legitimate yōon with ぢ (kept for completeness)
  { kana: 'ぢゃ', romaji_canon: 'ja', romaji_alt: ['dya'], set: 'youon' },
  { kana: 'ぢゅ', romaji_canon: 'ju', romaji_alt: ['dyu'], set: 'youon' },
  { kana: 'ぢょ', romaji_canon: 'jo', romaji_alt: ['dyo'], set: 'youon' },

  // --- Small vowels ---
  { kana: 'ぁ', romaji_canon: 'xa', romaji_alt: ['la'], set: 'small' },
  { kana: 'ぃ', romaji_canon: 'xi', romaji_alt: ['li'], set: 'small' },
  { kana: 'ぅ', romaji_canon: 'xu', romaji_alt: ['lu'], set: 'small' },
  { kana: 'ぇ', romaji_canon: 'xe', romaji_alt: ['le'], set: 'small' },
  { kana: 'ぉ', romaji_canon: 'xo', romaji_alt: ['lo'], set: 'small' },

  // --- Sokuon (small っ) ---
  { kana: 'っ', romaji_canon: 'xtsu', romaji_alt: ['ltsu'], set: 'sokuon' },

  // --- ん ---
  { kana: 'ん', romaji_canon: 'n', romaji_alt: ["nn","n'"], set: 'n' },
];

export default HIRAGANA;

