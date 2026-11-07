import { expect, test } from '@playwright/test';
import { crearHijo, entrarAlEspacio, entrarComoFamilia, registrarPadre } from './utilidades';

test('conserva la victoria y las estrellas al entrar desde otro dispositivo', async ({ page, browser }) => {
  const correo = await registrarPadre(page);
  const profile = await crearHijo(page, { nombre: 'Ariel', nacimiento: '2012-06-12' });
  const childId = await entrarAlEspacio(page, profile.nombre, profile.pin);
  await page.goto(`/jugar/${childId}/practicar/fraction-fighters`);
  await page.getByRole('button', { name: /El primer claro/ }).click();
  await page.getByRole('button', { name: /Rayo lunar/ }).click();
  await page.getByRole('button', { name: /Usar poder/ }).click();
  await page.getByRole('button', { name: /Rayo lunar/ }).click();
  await page.getByRole('button', { name: /Usar poder/ }).click();
  await page.getByLabel(/Escribe una fracción/).fill('1/4');
  await page.getByRole('button', { name: 'Comprobar' }).click();
  await page.getByRole('button', { name: /Chispa/ }).click();
  await page.getByRole('button', { name: /Usar poder/ }).click();
  await expect(page.getByText('¡Encuentro completado!', { exact: false })).toBeVisible();
  await expect(page.getByText('Progreso sincronizado con tu perfil.', { exact: false })).toBeVisible({ timeout: 30000 });

  const second = await browser.newContext();
  try {
    const other = await second.newPage();
    await entrarComoFamilia(other, correo);
    const otherChildId = await entrarAlEspacio(other, profile.nombre, profile.pin);
    expect(otherChildId).toBe(childId);
    await other.goto(`/jugar/${childId}/practicar/fraction-fighters`);
    await expect(other.getByRole('button', { name: /La senda del escudo/ })).toBeEnabled({ timeout: 30000 });
    await expect(other.getByRole('button', { name: /El primer claro/ })).toContainText('★★★');
    await expect(other.getByText('Progreso sincronizado con tu perfil.', { exact: false })).toBeVisible({ timeout: 30000 });
  } finally { await second.close(); }
});

test('respeta movimiento reducido en los personajes durante el combate', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/jugar/perfil-de-prueba/practicar/fraction-fighters');
  await page.getByRole('button', { name: /El primer claro/ }).click();
  await page.getByRole('button', { name: /Escudo ·/ }).click();
  await page.getByRole('button', { name: /Usar poder/ }).click();
  const hero = page.getByTestId('guardiana-animada');
  const creature = page.getByTestId('criatura-animada');
  await expect(hero).toHaveAttribute('data-motion', 'defensa');
  await expect(creature).toHaveAttribute('data-motion', 'ataque');
  await expect(hero).toHaveCSS('animation-name', 'none');
  await expect(creature).toHaveCSS('animation-name', 'none');
  await expect(page.getByTestId('efectos-combate')).toHaveCSS('display', 'none');
});
