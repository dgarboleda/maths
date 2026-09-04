/** Edad en años a partir de `ChildProfile.birthDate` ("AAAA-MM-DD"). */
export function ageFromBirthDate(birthDate: string): number | null {
  const birth = new Date(birthDate);
  if (Number.isNaN(birth.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const monthDiff = now.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) age--;
  return age;
}
