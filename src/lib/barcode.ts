export type BarcodeSymbology = "ean13" | "code128";

export function ean13Checksum(digits12: string): number {
  if (!/^\d{12}$/.test(digits12)) return -1;
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(digits12[i], 10) * (i % 2 === 0 ? 1 : 3);
  }
  return (10 - (sum % 10)) % 10;
}

export function isValidEan13(raw: string): boolean {
  if (!/^\d{13}$/.test(raw)) return false;
  return ean13Checksum(raw.slice(0, 12)) === parseInt(raw[12], 10);
}

const EAN_L = ["0001101", "0011001", "0010011", "0111101", "0100011", "0110001", "0101111", "0111011", "0110111", "0001011"];
const EAN_G = ["0100111", "0110001", "0010011", "0111011", "0001101", "0001001", "0010111", "0111011", "0100011", "0001001"];
const EAN_R = ["1110010", "1100110", "1101100", "1000010", "1011100", "1001110", "1010000", "1000100", "1001000", "1110100"];
const EAN_PARITY: string[][] = [
  ["L", "L", "L", "L", "L", "L"],
  ["L", "L", "G", "L", "G", "G"],
  ["L", "L", "G", "G", "L", "G"],
  ["L", "L", "G", "G", "G", "L"],
  ["L", "G", "L", "L", "G", "G"],
  ["L", "G", "G", "L", "L", "G"],
  ["L", "G", "G", "G", "L", "L"],
  ["L", "G", "L", "G", "G", "L"],
  ["L", "G", "G", "L", "G", "L"],
  ["L", "G", "G", "G", "G", "L"],
];

export function ean13Pattern(raw: string): string {
  if (!/^\d{13}$/.test(raw)) return "";
  if (!isValidEan13(raw)) return "";
  const first = parseInt(raw[0], 10);
  const parity = EAN_PARITY[first];
  let out = "101";
  for (let i = 0; i < 6; i++) {
    const d = parseInt(raw[1 + i], 10);
    out += (parity[i] === "L" ? EAN_L[d] : EAN_G[d]);
  }
  out += "01010";
  for (let i = 0; i < 6; i++) {
    out += EAN_R[parseInt(raw[7 + i], 10)];
  }
  out += "101";
  return out;
}

export const EAN13_MODULES = 95;

const CODE128_WIDTHS = [
  "212222",
  "222122",
  "222221",
  "121223",
  "121322",
  "131222",
  "122213",
  "122312",
  "132212",
  "221213",
  "221312",
  "231212",
  "112232",
  "122132",
  "122231",
  "113222",
  "123122",
  "123221",
  "223211",
  "221132",
  "221231",
  "213212",
  "223112",
  "312131",
  "311222",
  "321122",
  "321221",
  "312212",
  "322112",
  "322211",
  "212123",
  "212321",
  "232121",
  "111323",
  "131123",
  "131321",
  "112313",
  "132113",
  "132311",
  "211313",
  "231113",
  "231311",
  "112133",
  "112331",
  "132131",
  "113123",
  "113321",
  "133121",
  "313121",
  "211331",
  "231131",
  "213113",
  "213311",
  "213131",
  "311123",
  "311321",
  "331121",
  "312113",
  "312311",
  "332111",
  "314111",
  "221411",
  "431111",
  "111224",
  "111422",
  "121124",
  "121421",
  "141122",
  "141221",
  "112214",
  "112412",
  "122114",
  "122411",
  "142112",
  "142211",
  "241211",
  "221114",
  "413111",
  "241112",
  "134111",
  "111242",
  "121142",
  "121241",
  "114212",
  "124112",
  "124211",
  "411212",
  "421112",
  "421211",
  "212141",
  "214121",
  "412121",
  "111143",
  "111341",
  "131141",
  "114113",
  "114311",
  "411113",
  "411311",
  "113141",
  "114131",
  "311141",
  "411131",
  "211412",
  "211214",
  "211232",
  "233111",
];

export const CODE128_START_B = 104;
export const CODE128_START_C = 105;
export const CODE128_STOP = 106;
export const CODE128_CODE_B_SWITCH = 100;
export const CODE128_REVERSE_STOP_WIDTHS = "211133";
export const CODE128_STOP_FULL_WIDTHS = "2331112";

export interface Code128EncodeResult {
  values: number[];
  widths: string;
  checksumValue: number;
  mode: "B" | "C";
}

export function code128Encode(input: string): Code128EncodeResult | null {
  if (!/^[ -~]+$/.test(input) || input.length === 0) return null;
  const values: number[] = [];
  let mode: "B" | "C";
  if (/^\d+$/.test(input)) {
    mode = "C";
    values.push(CODE128_START_C);
    if (input.length % 2 === 1) {
      for (let i = 0; i < input.length - 1; i += 2) {
        values.push(parseInt(input.slice(i, i + 2), 10));
      }
      values.push(CODE128_CODE_B_SWITCH);
      values.push(parseInt(input[input.length - 1], 10) + 16);
    } else {
      for (let i = 0; i < input.length; i += 2) {
        values.push(parseInt(input.slice(i, i + 2), 10));
      }
    }
  } else {
    mode = "B";
    values.push(CODE128_START_B);
    for (let i = 0; i < input.length; i++) {
      values.push(input.charCodeAt(i) - 32);
    }
  }
  let checksum = values[0];
  for (let i = 1; i < values.length; i++) {
    checksum = (checksum + values[i] * i) % 103;
  }
  values.push(checksum);
  values.push(CODE128_STOP);
  const widths = values.map((v) => CODE128_WIDTHS[v]).join("") + "2";
  return { values, widths, checksumValue: checksum, mode };
}

export function widthsToBits(widths: string): string {
  let out = "";
  let bar = true;
  for (const ch of widths) {
    const w = parseInt(ch, 10);
    out += (bar ? "1" : "0").repeat(w);
    bar = !bar;
  }
  return out;
}

export function totalModules(widths: string): number {
  let sum = 0;
  for (const ch of widths) sum += parseInt(ch, 10);
  return sum;
}

export function sanitizeBarcodeInput(raw: string): string {
  return raw.replace(/[^\x20-\x7E]/g, "");
}
