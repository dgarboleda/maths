/**
 * Apariencia del personaje. Se guarda en el doc del hijo
 * (`/parents/{parentId}/children/{childId}.avatar`), que ya es escribible por
 * el padre con las reglas actuales — no hace falta ni una colección nueva ni
 * localStorage.
 */
export interface AvatarLook {
  skin: string;
  hair: string;
  outfit: string;
  accessory: string;
}

export const SKIN_TONES = ["#f2c9a0", "#e0a878", "#c1804f", "#8d5524", "#5c3317"];
export const HAIR_COLORS = ["#2d1b12", "#7b3f00", "#d9a441", "#c0392b", "#5b4b8a", "#2e8b7a"];
export const OUTFIT_COLORS = ["#7c3aed", "#0ea5e9", "#059669", "#f59e0b", "#e11d48", "#334155"];
export const ACCESSORIES = ["ninguno", "casco", "gorra", "visor"] as const;

export const ACCESSORY_LABEL: Record<string, string> = {
  ninguno: "Sin accesorio",
  casco: "Casco de técnico",
  gorra: "Gorra",
  visor: "Visor holográfico",
};

export const DEFAULT_AVATAR: AvatarLook = {
  skin: SKIN_TONES[1],
  hair: HAIR_COLORS[0],
  outfit: OUTFIT_COLORS[0],
  accessory: "casco",
};

export function normalizeAvatar(look: Partial<AvatarLook> | undefined): AvatarLook {
  return {
    skin: look?.skin ?? DEFAULT_AVATAR.skin,
    hair: look?.hair ?? DEFAULT_AVATAR.hair,
    outfit: look?.outfit ?? DEFAULT_AVATAR.outfit,
    accessory: look?.accessory ?? DEFAULT_AVATAR.accessory,
  };
}
