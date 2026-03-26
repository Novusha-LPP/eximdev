import mongoose from 'mongoose';
import fs from 'fs';

const currencySchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  code: { type: String, required: true, trim: true, uppercase: true },
  country: { type: String, required: true, trim: true },
  active: { type: String, default: "Yes" },
  created_at: { type: Date, default: Date.now },
});

const CurrencyModel = mongoose.models.Currency || mongoose.model("Currency", currencySchema);

async function seed() {
  try {
    await mongoose.connect('mongodb://localhost:27017/eximNew');
    console.log('Connected to MongoDB');

    const filePath = 'd:\\eximdev\\cuurency.txt';
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');

    let count = 0;
    for (let i = 2; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const columns = line.split('\t').map(s => s.trim());
      if (columns.length < 3) continue;

      const country = columns[0];
      const name = columns[1];
      const code = columns[2];

      if (!name || !code || !country) continue;

      const existing = await CurrencyModel.findOne({ $or: [{ code }, { name: name }] });
      if (!existing) {
        await new CurrencyModel({ name, code, country }).save();
        count++;
      }
    }

    console.log(`Successfully seeded ${count} new currencies.`);
    process.exit(0);
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  }
}

seed();
