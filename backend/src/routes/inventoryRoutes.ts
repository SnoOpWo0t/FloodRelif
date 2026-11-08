import { Router, Request, Response } from 'express';
import { pool } from '../db.js';
import { authenticateUser, requireAdmin } from '../middleware/auth.js';

const router = Router();

// GET /api/inventory - View all available relief stock (authenticated users)
router.get('/', authenticateUser, async (req: Request, res: Response) => {
  try {
    const result = await pool.query('SELECT * FROM inventory ORDER BY category, item_name ASC');
    return res.json({ inventory: result.rows });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to fetch inventory' });
  }
});

// POST /api/inventory - Admin adds new inventory item
router.post('/', authenticateUser, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { item_name, category, quantity, unit, location } = req.body;

    if (!item_name) {
      return res.status(400).json({ error: 'Item name is required' });
    }

    const qty = parseInt(quantity, 10) || 0;

    const result = await pool.query(
      `INSERT INTO inventory (item_name, category, quantity, unit, location, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       RETURNING *`,
      [
        item_name.trim(),
        category?.trim() || 'General',
        qty,
        unit?.trim() || 'units',
        location?.trim() || 'Main Hub',
      ]
    );

    return res.status(201).json({ item: result.rows[0] });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to create inventory item' });
  }
});

// PATCH /api/inventory/:id - Admin updates item quantity or location
router.patch('/:id', authenticateUser, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { quantity, item_name, category, unit, location } = req.body;

    // Check item exists
    const existing = await pool.query('SELECT * FROM inventory WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }

    const current = existing.rows[0];
    const newQty = quantity !== undefined ? parseInt(quantity, 10) : current.quantity;
    const newName = item_name?.trim() || current.item_name;
    const newCat = category?.trim() || current.category;
    const newUnit = unit?.trim() || current.unit;
    const newLoc = location?.trim() || current.location;

    const result = await pool.query(
      `UPDATE inventory
       SET item_name = $1, category = $2, quantity = $3, unit = $4, location = $5, updated_at = NOW()
       WHERE id = $6
       RETURNING *`,
      [newName, newCat, newQty, newUnit, newLoc, id]
    );

    return res.json({ item: result.rows[0] });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to update inventory' });
  }
});

// DELETE /api/inventory/:id - Admin deletes an item
router.delete('/:id', authenticateUser, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM inventory WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }
    return res.json({ message: 'Item deleted successfully' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to delete inventory item' });
  }
});

export default router;

