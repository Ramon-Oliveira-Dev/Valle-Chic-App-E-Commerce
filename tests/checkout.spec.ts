import { test, expect } from '@playwright/test';

test.describe('Checkout Flow', () => {
  test('should add a product and complete checkout', async ({ page }) => {
    // 1. Go to Home
    await page.goto('/home');
    
    // Wait for products to load
    await page.waitForSelector('text=Selecionados para você');
    
    // 2. Add first product to cart
    // Using the shopping cart button inside the product card
    const addToCartButton = page.locator('section:has-text("Selecionados para você") button').first();
    await addToCartButton.click();
    
    // Verify cart badge updates
    const cartBadge = page.locator('header a[href="/checkout"] span.absolute');
    await expect(cartBadge).toHaveText('1');
    
    // 3. Go to Checkout
    await page.click('header a[href="/checkout"]');
    await expect(page).toHaveURL(/\/checkout/);
    
    // 4. Fill customer name
    await page.fill('input[placeholder="Nome Completo"]', 'Test User');
    
    // 5. Select Delivery Option (Motoboy)
    await page.click('text=MOTOBOY');
    
    // 6. Select Payment Option (Pix)
    await page.click('button:has-text("Pix")');
    
    // 7. Click Finish (Mocking window.open to avoid actual redirect)
    await page.evaluate(() => {
      window.open = () => null as any;
    });
    
    const finishButton = page.locator('button:has-text("Concluir Pedido")');
    await expect(finishButton).toBeEnabled();
    await finishButton.click();
    
    // In a real scenario, we might check if a success message appears or if the cart is cleared
    // For this test, we verify the interaction was successful
  });
});
