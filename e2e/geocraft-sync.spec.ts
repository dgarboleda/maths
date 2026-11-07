import { expect, test } from '@playwright/test';
import { crearHijo, entrarAlEspacio, entrarComoFamilia, registrarPadre } from './utilidades';

test('el progreso de GeoCraft se sincroniza entre dos sesiones', async ({ page, browser }) => {
  const correo = await registrarPadre(page);
  const profile = await crearHijo(page, { nombre: 'Alex', nacimiento: '2012-06-12' });
  const childId = await entrarAlEspacio(page, profile.nombre, profile.pin);
  await page.goto(`/jugar/${childId}/practicar/geocraft`);
  await page.getByRole('button', { name: /Misión 1,/ }).click();
  for (let row = 1; row <= 2; row++) for (let col = 1; col <= 3; col++) await page.getByRole('gridcell', { name: `Fila ${row}, columna ${col}, libre` }).click();
  await page.getByRole('button', { name: 'Comprobar construcción' }).click();
  await expect(page.getByText(/Ganaste 3 de 3 estrellas/)).toBeVisible();
  await expect(page.getByText(/Progreso sincronizado con tu perfil/)).toBeVisible({ timeout: 30000 });
  const second = await browser.newContext();
  try {
    const other = await second.newPage();
    await entrarComoFamilia(other, correo);
    expect(await entrarAlEspacio(other, profile.nombre, profile.pin)).toBe(childId);
    await other.goto(`/jugar/${childId}/practicar/geocraft`);
    await expect(other.getByRole('button', { name: /Misión 2,.*0 de 3 estrellas/ })).toBeEnabled({ timeout: 30000 });
    await expect(other.getByRole('button', { name: /Misión 1,.*3 de 3 estrellas/ })).toBeEnabled();
  } finally { await second.close(); }
});
