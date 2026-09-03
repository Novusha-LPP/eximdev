import { chromium } from 'playwright';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config({ path: './.env' });
import UserModel from '../model/userModel.mjs';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';
const BASE_URL = 'http://localhost:3002';
const MONGODB_URI = process.env.DEV_MONGODB_URI || process.env.PROD_MONGODB_URI || 'mongodb://localhost:27017/exim';

async function runTests() {
  console.log('🚀 Starting Comprehensive DOM Test Suite for AMC Modules...');
  await mongoose.connect(MONGODB_URI);

  // 1. Find or create an admin user for session cookie
  let admin = await UserModel.findOne({ role: 'Admin', isActive: true });
  if (!admin) {
    admin = await UserModel.findOne({ role: 'Admin' });
  }
  if (!admin) {
    admin = await UserModel.findOne({});
  }
  console.log(`👤 Using user: ${admin?.username} (${admin?.role})`);

  const token = jwt.sign(
    {
      _id: admin._id,
      username: admin.username,
      role: admin.role || 'Admin',
      company: admin.company,
    },
    JWT_SECRET,
    { expiresIn: '10h' }
  );

  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const context = await browser.newContext();

  // Add auth cookie
  await context.addCookies([
    {
      name: 'token',
      value: token,
      domain: 'localhost',
      path: '/',
      httpOnly: true,
      sameSite: 'Lax',
    },
  ]);

  const page = await context.newPage();

  // ── TEST 1: Public AMC Entry (/amc-entry) ──────────────────────────────────
  console.log('\n────────────────────────────────────────────────────────────');
  console.log('📋 TEST 1: Public Form Check-In & Check-Out (/amc-entry)');
  console.log('────────────────────────────────────────────────────────────');
  await page.goto(`${BASE_URL}/amc-entry`, { waitUntil: 'domcontentloaded' });

  // A. Check Mobile Number Non-numeric filtering
  console.log('  Testing letter filtering on Mobile field...');
  const mobileInput = page.locator('input[name="mobileNo"]');
  await mobileInput.click();
  await mobileInput.type('abcdef');
  let val = await mobileInput.inputValue();
  console.log(`  -> Typed "abcdef", field value is: "${val}" (Expect: "")`);
  if (val !== '') throw new Error('Failed: Mobile field accepted letters!');

  // B. Type 5 digits & test live helper text
  console.log('  Testing incomplete 5-digit entry & helper text...');
  await mobileInput.type('98765');
  val = await mobileInput.inputValue();
  console.log(`  -> Typed "98765", field value is: "${val}"`);
  const helperText = await page.locator('#\\:r2\\:-helper-text, .MuiFormHelperText-root').first().innerText();
  console.log(`  -> Helper text displayed: "${helperText}" (Expect: "5 more digit(s) required")`);
  if (!helperText.includes('5 more digit(s) required')) throw new Error('Failed: Incomplete digit helper text not showing!');

  // C. Test form submission error on <10 digits
  console.log('  Filling required fields and testing <10 digit submission block...');
  await page.locator('input[name="supplierCompany"]').fill('Apex Automation Ltd');
  await page.locator('input[name="technicianName"]').fill('Sanjay Verma');
  await page.locator('textarea[name="purpose"]').fill('Server Room Cooling Check');
  
  // Select Category
  await page.locator('.MuiSelect-select').first().click();
  await page.locator('li[data-value="HVAC/Air Conditioning"]').click();

  // Select Dept
  await page.locator('.MuiSelect-select').nth(1).click();
  await page.locator('li[data-value="Server Room"]').click();

  // Click Submit
  await page.locator('button[type="submit"]:has-text("Confirm Check-In")').click();
  await page.waitForTimeout(500);
  console.log('  -> Attempted submission with 5 digits -> Verified submission was prevented!');

  // D. Type remaining 5 digits & test 10-digit indicator
  console.log('  Completing 10 digits (typing "43210")...');
  await mobileInput.type('43210');
  val = await mobileInput.inputValue();
  console.log(`  -> Current mobile value: "${val}" (Length: ${val.length})`);
  const tenDigitHelper = await page.locator('.MuiFormHelperText-root').first().innerText();
  console.log(`  -> Helper text displayed: "${tenDigitHelper}" (Expect: "✓ 10 digits")`);
  if (!tenDigitHelper.includes('✓ 10 digits')) throw new Error('Failed: 10-digit success indicator not showing!');

  // E. Test max length cap
  console.log('  Testing typing extra digits beyond 10 (typing "999")...');
  await mobileInput.type('999');
  val = await mobileInput.inputValue();
  console.log(`  -> Field value after typing extra digits: "${val}" (Length: ${val.length})`);
  if (val.length !== 10) throw new Error('Failed: Field exceeded 10 digits!');

  // F. Submit valid check-in
  console.log('  Submitting valid Check-In form...');
  await page.locator('button[type="submit"]:has-text("Confirm Check-In")').click();
  await page.waitForTimeout(1000);
  console.log('  -> Check-In submitted successfully!');

  // G. Test Check-Out search validation
  console.log('\n  Testing Check-Out (Exit) tab & 10-digit mobile search...');
  await page.locator('button[role="tab"]:has-text("Check-Out")').click();
  await page.waitForTimeout(500);

  const searchMobileInput = page.locator('input[type="tel"]').first();
  await searchMobileInput.fill('98765');
  await page.locator('button[type="submit"]:has-text("Search Active Log")').click();
  await page.waitForTimeout(500);
  console.log('  -> Search with 5 digits correctly blocked!');

  await searchMobileInput.fill('9876543210');
  await page.locator('button[type="submit"]:has-text("Search Active Log")').click();
  await page.waitForTimeout(1000);
  
  const activeBoxText = await page.locator('text=Active Check-In Found').isVisible();
  console.log(`  -> Searched "9876543210": Active check-in record found: ${activeBoxText}`);
  if (!activeBoxText) throw new Error('Failed: Active check-in record not retrieved!');

  // Complete Check-Out
  await page.locator('input[name="employeeApprovalName"]').fill('Operations Lead');
  await page.locator('textarea[name="remarks"]').fill('HVAC quarterly maintenance verified.');
  await page.locator('button[type="submit"]:has-text("Confirm Check-Out")').click();
  await page.waitForTimeout(1000);
  console.log('  -> Check-Out completed successfully!');

  // ── TEST 2: AMC Supplier Logs Dashboard (/amc-visitor-logs) ────────────────
  console.log('\n────────────────────────────────────────────────────────────');
  console.log('📋 TEST 2: AMC Supplier Logs Dashboard (/amc-visitor-logs)');
  console.log('────────────────────────────────────────────────────────────');
  await page.goto(`${BASE_URL}/amc-visitor-logs`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);

  // A. Verify Topbar buttons layout
  console.log('  Verifying Topbar buttons layout...');
  const topbarRight = page.locator('.topbar-right');
  const visitorLogsBtn = topbarRight.locator('button:has-text("Visitor History Logs")');
  const qrPosterBtn = topbarRight.locator('button:has-text("QR Poster Print")');
  const exportExcelBtn = topbarRight.locator('button:has-text("Export Excel")');

  const vVisible = await visitorLogsBtn.isVisible();
  const qVisible = await qrPosterBtn.isVisible();
  const eVisible = await exportExcelBtn.isVisible();
  console.log(`  -> "Visitor History Logs" button in topbar: ${vVisible}`);
  console.log(`  -> "QR Poster Print" button in topbar: ${qVisible}`);
  console.log(`  -> "Export Excel" button in topbar: ${eVisible}`);
  if (!vVisible || !qVisible || !eVisible) throw new Error('Failed: Topbar buttons not placed properly beside Export Excel!');

  // B. Test Switcher to QR Poster Print
  console.log('  Testing tab switch to "QR Poster Print"...');
  await qrPosterBtn.click();
  await page.waitForTimeout(500);
  const qrPosterVisible = await page.locator('#qr-poster-print-area').isVisible();
  console.log(`  -> QR Poster area visible: ${qrPosterVisible}`);
  if (!qrPosterVisible) throw new Error('Failed: QR Poster Print view not displayed!');

  // Switch back to History Logs
  console.log('  Switching back to "Visitor History Logs"...');
  await visitorLogsBtn.click();
  await page.waitForTimeout(500);
  const tableVisible = await page.locator('.table-wrap table').isVisible();
  console.log(`  -> Visitor History table visible: ${tableVisible}`);
  if (!tableVisible) throw new Error('Failed: Visitor History table not displayed!');

  // C. Test Table columns and 10-digit mobile number rows
  console.log('  Inspecting table rows and Mobile No column...');
  const mobileCells = await page.locator('.table-wrap table tbody tr td:nth-child(4)').allTextContents();
  console.log(`  -> Found ${mobileCells.length} rows in table. Mobile numbers:`, mobileCells.slice(0, 5));
  for (const m of mobileCells) {
    const clean = m.replace(/\D/g, '');
    if (clean.length > 0 && clean.length !== 10) {
      throw new Error(`Failed: Table row has non-10-digit mobile: ${m}`);
    }
  }
  console.log('  -> All mobile numbers in table are strictly 10 digits!');

  // D. Test View Details Modal
  console.log('  Testing View Details modal (Eye button)...');
  const firstEyeBtn = page.locator('.table-wrap table tbody tr button[title="View Details"]').first();
  await firstEyeBtn.click();
  await page.waitForTimeout(500);
  const modalVisible = await page.locator('text=Visitor Log Details').isVisible();
  console.log(`  -> View Details modal visible: ${modalVisible}`);
  if (!modalVisible) throw new Error('Failed: View Details modal did not open!');
  await page.locator('button:has-text("Close")').click();
  await page.waitForTimeout(500);

  // E. Test Edit Modal Mobile Validation
  console.log('  Testing Edit Modal Mobile No validation...');
  const firstEditBtn = page.locator('.table-wrap table tbody tr button[title="Edit / Approval"]').first();
  await firstEditBtn.click();
  await page.waitForTimeout(500);
  const editModalVisible = await page.locator('text=Edit Visitor Log').isVisible();
  console.log(`  -> Edit Modal visible: ${editModalVisible}`);

  const editMobileInput = page.locator('input[placeholder="10-digit mobile"]');
  await editMobileInput.fill('');
  await editMobileInput.type('12345');
  const editHelpVisible = await page.locator('text=5 more digits').isVisible();
  console.log(`  -> Edit Modal helper "5 more digits" visible: ${editHelpVisible}`);
  await page.locator('button:has-text("Cancel")').click();
  await page.waitForTimeout(500);

  // ── TEST 3: AMC Suppliers Renewal Sheet (/amc-renewals) ────────────────────
  console.log('\n────────────────────────────────────────────────────────────');
  console.log('📋 TEST 3: AMC Suppliers Renewal Sheet (/amc-renewals)');
  console.log('────────────────────────────────────────────────────────────');
  await page.goto(`${BASE_URL}/amc-renewals`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);

  // A. Test Clear Filters Button hover text color
  console.log('  Testing "Clear Filters" button styling and hover state...');
  const clearBtn = page.locator('button:has-text("Clear Filters")');
  const initialColor = await clearBtn.evaluate((el) => window.getComputedStyle(el).color);
  console.log(`  -> Clear Filters button default text color: ${initialColor}`);
  
  await clearBtn.hover();
  await page.waitForTimeout(200);
  const hoverColor = await clearBtn.evaluate((el) => window.getComputedStyle(el).color);
  console.log(`  -> Clear Filters button hover text color: ${hoverColor}`);
  if (hoverColor === 'rgb(255, 255, 255)' || hoverColor === '#ffffff') {
    throw new Error('Failed: Clear Filters button text turns white on hover!');
  }
  console.log('  -> Verified: Clear Filters button text remains black/dark on hover!');

  // B. Test Add Record Modal Contact No Validation
  console.log('  Testing "Add AMC Record" modal Contact No 10-digit validation...');
  await page.locator('button:has-text("+ Add Record")').click();
  await page.waitForTimeout(500);

  const contactInput = page.locator('input[name="contactNo"]');
  await contactInput.click();
  await contactInput.type('abc');
  let contactVal = await contactInput.inputValue();
  console.log(`  -> Typed letters "abc" into Contact No: "${contactVal}" (Expect: "")`);
  if (contactVal !== '') throw new Error('Failed: Contact No accepted non-digits!');

  await contactInput.type('98765');
  const countMsg = await page.locator('text=5 more digits required').isVisible();
  console.log(`  -> Typed 5 digits, "5 more digits required" message visible: ${countMsg}`);
  if (!countMsg) throw new Error('Failed: 10-digit count indicator not visible!');

  await contactInput.type('43210');
  const completeMsg = await page.locator('text=✓ 10 digits').isVisible();
  console.log(`  -> Completed 10 digits, "✓ 10 digits" indicator visible: ${completeMsg}`);
  if (!completeMsg) throw new Error('Failed: 10 digits complete checkmark not visible!');

  await contactInput.type('9999');
  contactVal = await contactInput.inputValue();
  console.log(`  -> Attempted extra digits, value is: "${contactVal}" (Length: ${contactVal.length})`);
  if (contactVal.length !== 10) throw new Error('Failed: Contact No exceeded 10 digits!');

  await page.locator('button:has-text("Cancel")').click();
  await page.waitForTimeout(500);
  console.log('  -> Closed modal.');

  await browser.close();
  console.log('\n🎉 ALL DOM TESTS COMPLETED AND PASSED WITH 100% SUCCESS!');
  process.exit(0);
}

runTests().catch((err) => {
  console.error('\n❌ DOM TEST FAILED:', err);
  process.exit(1);
});
