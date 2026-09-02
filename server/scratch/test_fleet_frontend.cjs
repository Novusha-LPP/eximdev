const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    console.log("Navigating to login page...");
    await page.goto('http://localhost:3002/login');
    
    console.log("Logging in...");
    await page.fill('input[name="username"], input[type="text"]', 'dev_master', { force: true });
    await page.fill('input[name="password"], input[type="password"]', '1qazxsw2', { force: true });
    
    // Find and click the login button
    await page.click('button[type="submit"], button:has-text("Login"), button:has-text("Sign In")', { force: true });
    
    // Wait for navigation after login
    await page.waitForTimeout(3000);
    
    console.log("Navigating to Procurement Insurance SOPs...");
    await page.goto('http://localhost:3002/procurement-insurance-sops');
    await page.waitForTimeout(3000);
    
    // Click 'Fleet Insurance' tab if it exists
    const tabs = await page.$$('button:has-text("Fleet Insurance"), div:has-text("Fleet Insurance")');
    for (const tab of tabs) {
      if (await tab.isVisible()) {
        await tab.click();
        await page.waitForTimeout(1000);
        break;
      }
    }
    
    console.log("Clicking Add Vehicle Record for May...");
    await page.click('button:has-text("Add Vehicle Record")');
    await page.waitForTimeout(2000);
    
    console.log("Filling out May record...");
    // Using a more robust approach to find specific fields
    const inputs = await page.$$('input[type="number"], input[type="text"]');
    await page.evaluate(() => {
      const getField = (label) => {
        const labels = Array.from(document.querySelectorAll('label'));
        const l = labels.find(el => el.textContent.includes(label));
        return l ? l.nextElementSibling?.querySelector('input') || l.parentElement?.querySelector('input') : null;
      };
      
      const regNo = getField("Registration No. *");
      if (regNo) regNo.value = 'TEST01MAY';
      
      const prevPrem = getField("Prev Premium (₹)");
      if (prevPrem) prevPrem.value = '10000';
      
      const odPrem = getField("OD Premium (₹)");
      if (odPrem) odPrem.value = '10000';
      
      const liabPrem = getField("Liability Premium (₹)");
      if (liabPrem) liabPrem.value = '5000';
      
      const renewDate = getField("Renewal Date");
      if (renewDate) renewDate.value = '2026-05-15';
    });
    
    // Dispatch events so React picks them up
    await page.evaluate(() => {
      const inputs = document.querySelectorAll('input');
      for (const input of inputs) {
        if (['TEST01MAY', '10000', '5000', '2026-05-15'].includes(input.value)) {
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.dispatchEvent(new Event('change', { bubbles: true }));
          input.dispatchEvent(new Event('blur', { bubbles: true }));
        }
      }
    });
    
    console.log("Saving May record...");
    await page.click('button:has-text("Save Record")');
    await page.waitForTimeout(3000);
    
    console.log("Clicking Add Vehicle Record for June...");
    await page.click('button:has-text("Add Vehicle Record")');
    await page.waitForTimeout(2000);
    
    console.log("Entering Registration No and triggering blur...");
    await page.evaluate(() => {
      const getField = (label) => {
        const labels = Array.from(document.querySelectorAll('label'));
        const l = labels.find(el => el.textContent.includes(label));
        return l ? l.nextElementSibling?.querySelector('input') || l.parentElement?.querySelector('input') : null;
      };
      
      const regNo = getField("Registration No. *");
      if (regNo) {
        regNo.value = 'TEST01MAY';
        regNo.dispatchEvent(new Event('input', { bubbles: true }));
        regNo.dispatchEvent(new Event('change', { bubbles: true }));
        regNo.focus();
        regNo.blur();
      }
    });
    
    await page.waitForTimeout(3000);
    
    console.log("Checking Prev Premium value...");
    const prevPremiumValue = await page.evaluate(() => {
      const getField = (label) => {
        const labels = Array.from(document.querySelectorAll('label'));
        const l = labels.find(el => el.textContent.includes(label));
        return l ? l.nextElementSibling?.querySelector('input') || l.parentElement?.querySelector('input') : null;
      };
      return getField("Prev Premium (₹)")?.value;
    });
    
    console.log(`Prev Premium value fetched: ${prevPremiumValue}`);
    
    const screenshotPath = path.resolve('/home/aiserver/.gemini/antigravity-ide/brain/78b9d2e3-5ed1-40c5-a73d-032fe98b5d71/artifacts/fleet_frontend_test.png');
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`Screenshot saved to ${screenshotPath}`);

  } catch (error) {
    console.error("Test failed:", error);
  } finally {
    await browser.close();
  }
})();
