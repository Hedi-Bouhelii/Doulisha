/**
 * Arabic for share images. Satori (next/og) sizes Arabic letters by their
 * unjoined forms but draws them joined, and it lays text out left to right. So
 * each word is pre-shaped into Arabic presentation forms (what is measured is
 * then what is drawn) and reversed into visual order. Words themselves are put
 * right to left by a row-reverse flexbox in the route.
 */

/** [letter, first presentation form, number of forms]: 4 = joins both sides, 2 = joins right only. */
const SPEC: readonly (readonly [number, number, 1 | 2 | 4])[] = [
  [0x0621, 0xfe80, 1],
  [0x0622, 0xfe81, 2],
  [0x0623, 0xfe83, 2],
  [0x0624, 0xfe85, 2],
  [0x0625, 0xfe87, 2],
  [0x0626, 0xfe89, 4],
  [0x0627, 0xfe8d, 2],
  [0x0628, 0xfe8f, 4],
  [0x0629, 0xfe93, 2],
  [0x062a, 0xfe95, 4],
  [0x062b, 0xfe99, 4],
  [0x062c, 0xfe9d, 4],
  [0x062d, 0xfea1, 4],
  [0x062e, 0xfea5, 4],
  [0x062f, 0xfea9, 2],
  [0x0630, 0xfeab, 2],
  [0x0631, 0xfead, 2],
  [0x0632, 0xfeaf, 2],
  [0x0633, 0xfeb1, 4],
  [0x0634, 0xfeb5, 4],
  [0x0635, 0xfeb9, 4],
  [0x0636, 0xfebd, 4],
  [0x0637, 0xfec1, 4],
  [0x0638, 0xfec5, 4],
  [0x0639, 0xfec9, 4],
  [0x063a, 0xfecd, 4],
  [0x0641, 0xfed1, 4],
  [0x0642, 0xfed5, 4],
  [0x0643, 0xfed9, 4],
  [0x0644, 0xfedd, 4],
  [0x0645, 0xfee1, 4],
  [0x0646, 0xfee5, 4],
  [0x0647, 0xfee9, 4],
  [0x0648, 0xfeed, 2],
  [0x0649, 0xfeef, 2],
  [0x064a, 0xfef1, 4],
  // Letters used in Tunisian and loanwords (ڤ, پ, چ, ک, گ, ی).
  [0x067e, 0xfb56, 4],
  [0x0686, 0xfb7a, 4],
  [0x06a4, 0xfb6a, 4],
  [0x06a9, 0xfb8e, 4],
  [0x06af, 0xfb92, 4],
  [0x06cc, 0xfbfc, 4],
];
const FORMS = new Map(SPEC.map(([letter, first, count]) => [letter, { first, count }]));
const TATWEEL = 0x0640;
const LAM = 0x0644;
/** Lam followed by an alef becomes one ligature: [isolated, final]. */
const LAM_ALEF = new Map<number, readonly [number, number]>([
  [0x0622, [0xfef5, 0xfef6]],
  [0x0623, [0xfef7, 0xfef8]],
  [0x0625, [0xfef9, 0xfefa]],
  [0x0627, [0xfefb, 0xfefc]],
]);
const MIRROR = new Map([
  ['(', ')'],
  [')', '('],
  ['[', ']'],
  [']', '['],
  ['{', '}'],
  ['}', '{'],
  ['«', '»'],
  ['»', '«'],
]);

const MARK = /\p{Mn}/u;
const LTR = /[\p{Script=Latin}\p{Nd}]/u;

type Joining = 'dual' | 'right' | 'none';

function joining(cp: number | undefined): Joining {
  if (cp === undefined) return 'none';
  if (cp === TATWEEL) return 'dual';
  const forms = FORMS.get(cp);
  if (!forms) return 'none';
  return forms.count === 4 ? 'dual' : forms.count === 2 ? 'right' : 'none';
}

const isMark = (cp: number) => MARK.test(String.fromCodePoint(cp));

/** The nearest letter before (step -1) or after (step 1), skipping vowel marks. */
function neighbour(cps: number[], index: number, step: 1 | -1): number | undefined {
  let at = index + step;
  while (at >= 0 && at < cps.length && isMark(cps[at]!)) at += step;
  return cps[at];
}

/** Arabic letters → their contextual presentation forms, still in logical order. */
export function shapeArabic(text: string): string {
  const cps = Array.from(text, (char) => char.codePointAt(0)!);
  const out: number[] = [];
  for (let i = 0; i < cps.length; i++) {
    const cp = cps[i]!;
    if (isMark(cp)) {
      out.push(cp);
      continue;
    }
    const joinsPrevious = joining(cp) !== 'none' && joining(neighbour(cps, i, -1)) === 'dual';
    const ligature = cp === LAM ? LAM_ALEF.get(cps[i + 1] ?? -1) : undefined;
    if (ligature) {
      out.push(joinsPrevious ? ligature[1] : ligature[0]);
      i++;
      continue;
    }
    const forms = FORMS.get(cp);
    if (!forms) {
      out.push(cp);
      continue;
    }
    const joinsNext = forms.count === 4 && joining(neighbour(cps, i, 1)) !== 'none';
    const form = joinsPrevious && joinsNext ? 3 : joinsPrevious ? 1 : joinsNext ? 2 : 0;
    out.push(forms.first + Math.min(form, forms.count - 1));
  }
  return String.fromCodePoint(...out);
}

/**
 * One Arabic word in visual (left-to-right drawing) order: shaped, then
 * reversed, keeping numbers and Latin runs readable and marks on their letter.
 */
export function visualArabic(word: string): string {
  const chars = Array.from(shapeArabic(word));
  const units: string[] = [];
  for (let i = 0; i < chars.length; i++) {
    const char = chars[i]!;
    const previous = units.length - 1;
    const numberSeparator =
      /[.,:]/.test(char) && LTR.test(chars[i - 1] ?? '') && /\p{Nd}/u.test(chars[i + 1] ?? '');
    if (
      previous >= 0 &&
      (MARK.test(char) ||
        ((LTR.test(char) || numberSeparator) && LTR.test(units[previous]!.charAt(0))))
    ) {
      units[previous] += char;
    } else {
      units.push(MIRROR.get(char) ?? char);
    }
  }
  return units.reverse().join('');
}
