import { pool } from './db.js';

async function seed() {
  try {
    const existing = await pool.query('SELECT COUNT(*) FROM inventory');
    if (parseInt(existing.rows[0].count, 10) === 0) {
      await pool.query(`
        INSERT INTO inventory (item_name, category, quantity, unit, location)
        VALUES
          ('Clean Drinking Water', 'Water', 1500, 'liters', 'Sylhet Warehouse'),
          ('Emergency Dry Food Ration', 'Food', 450, 'packs', 'Sylhet Warehouse'),
          ('Medical First Aid Kits', 'Medical', 120, 'kits', 'Central Hospital Hub'),
          ('Life Jackets', 'Rescue', 80, 'units', 'Boat Station 1'),
          ('Tarpaulin Sheets / Tents', 'Shelter', 200, 'units', 'Sylhet Warehouse')
      `);
      console.log('Seeded sample relief inventory.');
    } else {
      console.log('Inventory already has data.');
    }

    const taskCount = await pool.query('SELECT COUNT(*) FROM volunteer_tasks');
    if (parseInt(taskCount.rows[0].count, 10) === 0) {
      await pool.query(`
        INSERT INTO volunteer_tasks (title, description, location, urgency, status)
        VALUES
          ('Deliver 20L Water packs to Highway Shelter', 'Use boat #1 to drop off supplies at flood junction', 'Sylhet Sadar Bypass', 'high', 'open'),
          ('Medical Checkup for 3 Elderly Residents', 'Provide oral rehydration salts and check vitals', 'Sunamganj Road Camp', 'critical', 'open')
      `);
      console.log('Seeded sample volunteer tasks.');
    }
  } catch (err) {
    console.error('Seeding error:', err);
  } finally {
    await pool.end();
  }
}

seed();

