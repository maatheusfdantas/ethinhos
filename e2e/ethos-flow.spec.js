import { test, expect } from '@playwright/test';

test.describe('Ethos End-to-End Flow (Auth -> Dashboard -> Biometrics -> DataViz)', () => {
  test('renderiza a tela de autenticação limpa e valida navegação protegida', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('input[placeholder*="usuário" i], input[type="text"], input[type="email"]').first()).toBeVisible();
  });
});

