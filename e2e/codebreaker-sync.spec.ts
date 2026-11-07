import { expect, test } from '@playwright/test';
import { crearHijo, entrarAlEspacio, entrarComoFamilia, registrarPadre } from './utilidades';

test('el progreso de CodeBreaker se sincroniza entre dos sesiones', async ({ page, browser }) => {
  const correo = await registrarPadre(page);
  const profile = await crearHijo(page, { nombre: 'Alex', nacimiento: '2012-06-12' });
  const childId = await entrarAlEspacio(page, profile.nombre, profile.pin);
  await page.goto(`/jugar/${childId}/practicar/codebreaker`);
  await page.getByRole('button', { name: /Misión 1,/ }).click();
  await page.getByRole('button', { name: '11', exact: true }).click();
  await page.getByRole('button', { name: 'Descifrar' }).click();
  await expect(page.getByText(/Sistema desbloqueado/)).toBeVisible();
  await expect(page.getByText(/Progreso sincronizado con tu perfil/)).toBeVisible({ timeout: 30000 });
  const second = await browser.newContext();
  try {
    const other = await second.newPage();
    await entrarComoFamilia(other, correo);
    expect(await entrarAlEspacio(other, profile.nombre, profile.pin)).toBe(childId);
    await other.goto(`/jugar/${childId}/practicar/codebreaker`);
    await expect(other.getByRole('button', { name: /Misión 2, 0 de 3 estrellas/ })).toBeEnabled({ timeout: 30000 });
    await expect(other.getByRole('button', { name: /Misión 1, 3 de 3 estrellas/ })).toBeEnabled();
  } finally { await second.close(); }
});
