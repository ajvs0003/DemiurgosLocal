import { expect, test } from "@playwright/test";

test("R10, R19, R25: home carga en baseURL y expone contenido principal accesible", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveURL("/");
  await expect(page.getByRole("heading", { name: "opencode-sdd-harness" })).toBeVisible();
  await expect(page.getByRole("main")).toBeVisible();
});
