import { expect, type Page, test } from "@playwright/test";

const SEED_PASSWORD = "Passw0rd!";

async function login(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(SEED_PASSWORD);
  await page.getByRole("button", { name: "Log in" }).click();
}

async function pickPlace(page: Page, label: string, query: string) {
  const input = page.getByLabel(label);
  await input.fill(query);
  await page.getByRole("button", { name: query, exact: true }).click();
}

test("rider requests a ride and a driver accepts and completes it", async ({ browser }) => {
  const riderContext = await browser.newContext();
  const driverContext = await browser.newContext();
  const riderPage = await riderContext.newPage();
  const driverPage = await driverContext.newPage();

  try {
    await login(riderPage, "rider1@ride.local");
    await expect(riderPage).toHaveURL(/\/rider/);

    await pickPlace(riderPage, "Pickup", "Liberty Market");
    await pickPlace(riderPage, "Dropoff", "Packages Mall");
    await riderPage.getByRole("button", { name: "Get estimate" }).click();
    await riderPage.getByText("Economy").click();
    await riderPage.getByRole("button", { name: "Request Economy" }).click();

    await expect(riderPage.getByText("Finding a driver")).toBeVisible();

    await login(driverPage, "driver1@ride.local");
    await expect(driverPage).toHaveURL(/\/driver/);

    const goOnline = driverPage.getByRole("button", { name: "Go online" });
    if (await goOnline.isVisible()) {
      await goOnline.click();
    }

    const rideCard = driverPage.getByText("Liberty Market");
    await expect(rideCard).toBeVisible();
    await driverPage.getByRole("button", { name: "Accept" }).click();

    await expect(driverPage.getByText("Driver on the way")).toBeVisible();
    await expect(riderPage.getByText("Driver on the way")).toBeVisible();

    await driverPage.getByRole("button", { name: "Complete ride" }).click();

    await expect(driverPage.getByText("Completed")).toBeVisible();
    await expect(riderPage.getByText("Completed")).toBeVisible();
    await expect(riderPage.getByRole("button", { name: "Request another ride" })).toBeVisible();
  } finally {
    const goOffline = driverPage.getByRole("button", { name: "Go offline" });
    if (await goOffline.isVisible().catch(() => false)) {
      await goOffline.click().catch(() => {});
    }
    await riderContext.close();
    await driverContext.close();
  }
});
