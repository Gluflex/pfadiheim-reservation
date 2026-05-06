export const GROUPS = [
  // Wölfli (grün)
  "Marabu",
  "Kobra",
  "Flamingo",
  // Pfadi (rot)
  "Specht",
  "Tiger",
  "Sperber",
  // Pio (blau)
  "Moskito",
  "Flädermuus",
  "Kondor",
  // Rover / AF (violett)
  "Widder",
  "Grizzly",
  "AF",
] as const;

export type Group = (typeof GROUPS)[number];

export const ADMIN_GROUPS: readonly Group[] = ["AF"];

export function isAdmin(group: Group): boolean {
  return ADMIN_GROUPS.includes(group);
}

export type Stufe = "wolf" | "pfadi" | "pio" | "rover" | "af";

export const STUFEN: Record<Group, Stufe> = {
  Marabu: "wolf",
  Kobra: "wolf",
  Flamingo: "wolf",
  Specht: "pfadi",
  Tiger: "pfadi",
  Sperber: "pfadi",
  Moskito: "pio",
  Flädermuus: "pio",
  Kondor: "pio",
  Widder: "rover",
  Grizzly: "rover",
  AF: "af",
};

export const STUFE_TINT: Record<Stufe, { bg: string; bgHover: string }> = {
  wolf:  { bg: "bg-green-50 dark:bg-green-950/40",   bgHover: "hover:bg-green-100 dark:hover:bg-green-900/40" },
  pfadi: { bg: "bg-red-50 dark:bg-red-950/40",       bgHover: "hover:bg-red-100 dark:hover:bg-red-900/40" },
  pio:   { bg: "bg-blue-50 dark:bg-blue-950/40",     bgHover: "hover:bg-blue-100 dark:hover:bg-blue-900/40" },
  rover: { bg: "bg-violet-50 dark:bg-violet-950/40", bgHover: "hover:bg-violet-100 dark:hover:bg-violet-900/40" },
  af:    { bg: "bg-yellow-50 dark:bg-yellow-950/40", bgHover: "hover:bg-yellow-100 dark:hover:bg-yellow-900/40" },
};

export const ROOMS = [
  "Actionraum",
  "Chillerraum",
  "Grosser Saal",
  "Küche",
  "Wiese",
] as const;

export type Room = (typeof ROOMS)[number];

export const HOUR_START = 8;
export const HOUR_END = 21;

export const GROUP_COLORS: Record<Group, { bg: string; text: string; ring: string }> = {
  Grizzly:    { bg: "bg-amber-500",   text: "text-white", ring: "ring-amber-400" },
  Widder:     { bg: "bg-red-500",     text: "text-white", ring: "ring-red-400" },
  Sperber:    { bg: "bg-sky-500",     text: "text-white", ring: "ring-sky-400" },
  Specht:     { bg: "bg-orange-500",  text: "text-white", ring: "ring-orange-400" },
  Tiger:      { bg: "bg-yellow-500",  text: "text-black", ring: "ring-yellow-400" },
  Flamingo:   { bg: "bg-pink-500",    text: "text-white", ring: "ring-pink-400" },
  Kobra:      { bg: "bg-emerald-600", text: "text-white", ring: "ring-emerald-400" },
  Kondor:     { bg: "bg-stone-600",   text: "text-white", ring: "ring-stone-400" },
  Moskito:    { bg: "bg-lime-500",    text: "text-black", ring: "ring-lime-400" },
  Flädermuus: { bg: "bg-violet-500",  text: "text-white", ring: "ring-violet-400" },
  Marabu:     { bg: "bg-slate-600",   text: "text-white", ring: "ring-slate-400" },
  AF:         { bg: "bg-indigo-700",  text: "text-white", ring: "ring-indigo-400" },
};

export function isGroup(x: unknown): x is Group {
  return typeof x === "string" && (GROUPS as readonly string[]).includes(x);
}

export function isRoom(x: unknown): x is Room {
  return typeof x === "string" && (ROOMS as readonly string[]).includes(x);
}
