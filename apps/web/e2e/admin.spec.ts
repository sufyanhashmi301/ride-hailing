import { expect, type Page, test } from "@playwright/test";

const SEED_PASSWORD = "Passw0rd!";

async function login(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(SEED_PASSWORD);
  await page.getByRole("button", { name: "Log in" }).click();
}

test("admin adds a driver, sees it listed, then disables it", async ({ page }) => {
  await login(page, "admin@ride.local");
  await expect(page).toHaveURL(/\/admin/);

  // Next.js keeps the previous route (the login form) mounted off-screen (display:none) for
  // instant back-navigation, so scope queries to the visible <main> to avoid matching its hidden
  // "Email" field by the same accessible name.
  const main = page.locator("main");

  const uniqueSuffix = Date.now();
  const driverName = `E2E Driver ${uniqueSuffix}`;
  const driverEmail = `e2e-driver-${uniqueSuffix}@test.local`;
  const vehiclePlate = `E2E-${uniqueSuffix}`;

  await main.getByLabel("Name").fill(driverName);
  await main.getByLabel("Email").fill(driverEmail);
  await main.getByLabel("Vehicle plate").fill(vehiclePlate);
  await main.getByLabel("City").click();
  await page.getByRole("option", { name: "Lahore" }).click();
  await main.getByLabel("Vehicle category").click();
  await page.getByRole("option", { name: "Economy" }).click();
  await main.getByRole("button", { name: "Add driver" }).click();

  await expect(main.getByText(`Driver ${driverName} created.`)).toBeVisible();
  await expect(main.getByText("Temporary password")).toBeVisible();

  const driverRow = main.locator('[data-slot="card"]').filter({ hasText: driverName });
  await expect(driverRow.getByText("Active")).toBeVisible();

  await driverRow.getByRole("button", { name: "Disable" }).click();
  await expect(driverRow.getByText("Disabled")).toBeVisible();
});
