import { expect, test } from '@playwright/test'

test.describe('SaaSintetica core navigation', () => {
  test('loads the landing page and owner login', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('link', { name: /SaaSint/i })).toBeVisible()
    await page.getByRole('link', { name: /Iniciar Sesi/i }).first().click()
    await expect(page).toHaveURL(/\/login$/)
    await expect(page.getByRole('button', { name: /Entrar/i })).toBeVisible()
  })

  test('loads super admin and customer login screens', async ({ page }) => {
    await page.goto('/admin/login')
    await expect(page.getByText(/Acceso Restringido/i)).toBeVisible()

    await page.goto('/cliente/login')
    await expect(page.getByText(/Iniciar Sesi/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /Entrar/i })).toBeVisible()
  })

  test('rejects invalid owner credentials with an application error', async ({ page }) => {
    test.fail(true, 'Known issue: invalid owner credentials do not render an error message in the login form.')
    await page.goto('/login')
    await page.getByLabel(/Correo/i).fill('invalid@example.com')
    await page.getByLabel(/Contrase/i).fill('invalid-password')
    await page.getByRole('button', { name: /^Entrar$/i }).click()
    await expect(page.getByText(/incorrectos|inv/i)).toBeVisible()
  })

  test('protects dashboard routes for anonymous users', async ({ page }) => {
    const response = await page.goto('/dashboard')
    expect(response?.status()).toBeLessThan(400)
    await expect(page).toHaveURL(/\/login$/)
  })

  test('returns not found for an unknown business slug', async ({ page }) => {
    const response = await page.goto('/negocio-inexistente-e2e')
    expect(response?.status()).toBe(404)
  })
})

test.describe('optional authenticated flows', () => {
  test('logs in an owner when test credentials are configured', async ({ page }) => {
    const email = process.env.E2E_OWNER_EMAIL
    const password = process.env.E2E_OWNER_PASSWORD
    test.skip(!email || !password, 'E2E_OWNER_EMAIL and E2E_OWNER_PASSWORD are not configured')
    if (!email || !password) return

    await page.goto('/login')
    await page.getByLabel(/Correo/i).fill(email)
    await page.getByLabel(/Contrase/i).fill(password)
    await page.getByRole('button', { name: /^Entrar$/i }).click()
    await expect(page).toHaveURL(/\/admin(\/)?$/)
  })

  test('opens a public business page when a test slug is configured', async ({ page }) => {
    const slug = process.env.E2E_BUSINESS_SLUG
    test.skip(!slug, 'E2E_BUSINESS_SLUG is not configured')
    if (!slug) return

    const response = await page.goto(`/${slug}`)
    expect(response?.status()).toBeLessThan(400)
    await expect(page.locator('body')).toContainText(/Reserv|Cancha|Sint/i)
  })
})
