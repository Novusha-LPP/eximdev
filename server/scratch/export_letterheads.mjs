import fs from 'fs';
import { COMPANY_PROFILES } from '../../client/src/components/accounts/tyreProcurementSop/companyProfiles.js';

const suravio = COMPANY_PROFILES.SURAVIO;
if (suravio && suravio.letterheadBase64) {
  const base64Data = suravio.letterheadBase64.replace(/^data:image\/\w+;base64,/, '');
  fs.writeFileSync('C:/Users/india/.gemini/antigravity-ide/brain/ab0df72a-b8dd-47ec-a43b-eb6a6534dc9c/scratch/suravio_letterhead.png', Buffer.from(base64Data, 'base64'));
  console.log('Saved suravio_letterhead.png');
} else {
  console.log('No letterhead for suravio');
}

const suraj = COMPANY_PROFILES.SURAJ;
if (suraj && suraj.letterheadBase64) {
  const base64Data = suraj.letterheadBase64.replace(/^data:image\/\w+;base64,/, '');
  fs.writeFileSync('C:/Users/india/.gemini/antigravity-ide/brain/ab0df72a-b8dd-47ec-a43b-eb6a6534dc9c/scratch/suraj_letterhead.png', Buffer.from(base64Data, 'base64'));
  console.log('Saved suraj_letterhead.png');
}
