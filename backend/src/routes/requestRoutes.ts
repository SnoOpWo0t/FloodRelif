import { Router, Request, Response } from 'express';
import { pool } from '../db.js';
import { authenticateUser, requireAdmin } from '../middleware/auth.js';

const router = Router();

router.use(authenticateUser);

// GET /api/requests/stats - Admin KPIs
router.get('/stats', requireAdmin, async (req: Request, res: Response) => {
  try {
    const statsResult = await pool.query(`
      SELECT
        COUNT(*)::int as total_requests,
        COUNT(*) FILTER (WHERE status = 'pending')::int as pending_requests,
        COUNT(*) FILTER (WHERE status = 'verified')::int as verified_requests,
        COUNT(*) FILTER (WHERE status = 'fulfilled')::int as fulfilled_requests,
        COUNT(*) FILTER (WHERE status = 'rejected')::int as rejected_requests,
        COUNT(*) FILTER (WHERE urgency = 'critical' AND status != 'fulfilled')::int as critical_unresolved
      FROM assistance_requests
    `);

    const invResult = await pool.query(`
      SELECT
        COUNT(*)::int as total_items,
        COUNT(*) FILTER (WHERE quantity < 50)::int as low_stock_items
      FROM inventory
    `);

    return res.json({
      requests: statsResult.rows[0],
      inventory: invResult.rows[0],
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to fetch statistics' });
  }
});

// POST /api/requests - User submits an assistance request
router.post('/', async (req: Request, res: Response) => {
  try {
    const { title, description, location, urgency, latitude, longitude } = req.body;

    if (!title || !description) {
      return res.status(400).json({ error: 'Title and description are required' });
    }

    const validUrgencies = ['low', 'medium', 'high', 'critical'];
    const chosenUrgency = validUrgencies.includes(urgency) ? urgency : 'medium';

    const lat = latitude ? parseFloat(latitude) : null;
    const lng = longitude ? parseFloat(longitude) : null;

    const result = await pool.query(
      `INSERT INTO assistance_requests (user_id, title, description, location, urgency, latitude, longitude, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')
       RETURNING *`,
      [req.user!.id, title.trim(), description.trim(), location?.trim() || null, chosenUrgency, lat, lng]
    );

    return res.status(201).json({ request: result.rows[0] });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to create request' });
  }
});

// GET /api/requests - List requests (with filtering options)
router.get('/', async (req: Request, res: Response) => {
  try {
    const isAdmin = req.user!.role === 'admin';
    const { status, urgency } = req.query;

    const conditions: string[] = [];
    const params: any[] = [];

    if (!isAdmin) {
      params.push(req.user!.id);
      conditions.push(`r.user_id = $${params.length}`);
    }

    if (status && typeof status === 'string' && status !== 'all') {
      params.push(status);
      conditions.push(`r.status = $${params.length}`);
    }

    if (urgency && typeof urgency === 'string' && urgency !== 'all') {
      params.push(urgency);
      conditions.push(`r.urgency = $${params.length}`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const query = `
      SELECT
        r.*,
        u.name as user_name,
        u.email as user_email,
        inv.item_name as allocated_item_name,
        inv.unit as allocated_unit
      FROM assistance_requests r
      JOIN users u ON r.user_id = u.id
      LEFT JOIN inventory inv ON r.allocated_item_id = inv.id
      ${whereClause}
      ORDER BY
        CASE r.urgency
          WHEN 'critical' THEN 1
          WHEN 'high' THEN 2
          WHEN 'medium' THEN 3
          WHEN 'low' THEN 4
        END,
        r.created_at DESC
    `;

    const result = await pool.query(query, params);
    return res.json({ requests: result.rows });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to fetch requests' });
  }
});

// PATCH /api/requests/:id/status - Admin updates verification/fulfillment status and allocates inventory
router.patch('/:id/status', requireAdmin, async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { status, admin_notes, allocated_item_id, allocated_quantity } = req.body;

    const validStatuses = ['pending', 'verified', 'fulfilled', 'rejected'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }

    await client.query('BEGIN');

    // If allocating inventory upon fulfillment
    const allocQty = parseInt(allocated_quantity, 10) || 0;
    let itemId = allocated_item_id ? parseInt(allocated_item_id, 10) : null;

    if (status === 'fulfilled' && itemId && allocQty > 0) {
      const invCheck = await client.query('SELECT quantity, item_name FROM inventory WHERE id = $1 FOR UPDATE', [itemId]);
      if (invCheck.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Selected inventory item does not exist' });
      }

      const available = invCheck.rows[0].quantity;
      if (available < allocQty) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          error: `Insufficient stock for "${invCheck.rows[0].item_name}". Available: ${available}, Requested: ${allocQty}`,
        });
      }

      // Deduct stock
      await client.query('UPDATE inventory SET quantity = quantity - $1, updated_at = NOW() WHERE id = $2', [allocQty, itemId]);
    } else {
      itemId = null;
    }

    const result = await client.query(
      `UPDATE assistance_requests
       SET
         status = $1,
         admin_notes = COALESCE($2, admin_notes),
         allocated_item_id = COALESCE($3, allocated_item_id),
         allocated_quantity = CASE WHEN $4 > 0 THEN $4 ELSE allocated_quantity END
       WHERE id = $5
       RETURNING *`,
      [status, admin_notes || null, itemId, allocQty, id]
    );

    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Request not found' });
    }

    await client.query('COMMIT');
    return res.json({ request: result.rows[0] });
  } catch (error: any) {
    await client.query('ROLLBACK');
    return res.status(500).json({ error: error.message || 'Failed to update request' });
  } finally {
    client.release();
  }
});

export default router;
