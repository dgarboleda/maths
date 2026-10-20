/** Catálogo incluido con la app. IDs compartidos por el cliente y la lista
 * de acceso infantil; nunca se aceptan URLs arbitrarias como retratos públicos. */
export const PROFILE_AVATARS = [
  { id: "maths-animo", label: "Ánimo", src: "/avatars/animo.jpg", portraitWidth: "120%", portraitY: "40%" },
  { id: "maths-sonrisa", label: "Sonrisa", src: "/avatars/sonrisa.jpg", portraitWidth: "120%", portraitY: "40%" },
  { id: "maths-saludo", label: "Saludo", src: "/avatars/saludo.jpg", portraitWidth: "250%", portraitY: "40%" },
] as const;

export function getProfileAvatar(id: unknown) {
  return PROFILE_AVATARS.find((avatar) => avatar.id === id);
}
