import { Router, Request, Response } from 'express';
import { pool } from '../db.js';
import { authenticateUser, requireAdmin } from '../middleware/auth.js';

const router = Router();

router.use(authenticateUser);

// GET /api/tasks - List all volunteer tasks
router.get('/', async (req: Request, res: Response) => {
  try {
    const { status, my_tasks } = req.query;

    const conditions: string[] = [];
    const params: any[] = [];

    if (my_tasks === 'true') {
      params.push(req.user!.id);
      conditions.push(`t.assigned_user_id = $${params.length}`);
    }

    if (status && typeof status === 'string' && status !== 'all') {
      params.push(status);
      conditions.push(`t.status = $${params.length}`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const query = `
      SELECT
        t.*,
        u.name as volunteer_name,
        u.email as volunteer_email,
        r.title as request_title
      FROM volunteer_tasks t
      LEFT JOIN users u ON t.assigned_user_id = u.id
      LEFT JOIN assistance_requests r ON t.request_id = r.id
      ${whereClause}
      ORDER BY
        CASE t.status
          WHEN 'open' THEN 1
          WHEN 'claimed' THEN 2
          WHEN 'completed' THEN 3
        END,
        t.created_at DESC
    `;

    const result = await pool.query(query, params);
    return res.json({ tasks: result.rows });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to fetch tasks' });
  }
});

// POST /api/tasks - Admin or system creates a field task
router.post('/', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { request_id, title, description, location, urgency } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Task title is required' });
    }

    const result = await pool.query(
      `INSERT INTO volunteer_tasks (request_id, title, description, location, urgency, status)
       VALUES ($1, $2, $3, $4, $5, 'open')
       RETURNING *`,
      [request_id || null, title.trim(), description?.trim() || null, location?.trim() || null, urgency || 'medium']
    );

    return res.status(201).json({ task: result.rows[0] });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to create task' });
  }
});

// PATCH /api/tasks/:id/claim - User claims a field task
router.patch('/:id/claim', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const taskCheck = await pool.query('SELECT status FROM volunteer_tasks WHERE id = $1', [id]);
    if (taskCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    if (taskCheck.rows[0].status !== 'open') {
      return res.status(400).json({ error: 'Task is already claimed or completed' });
    }

    const result = await pool.query(
      `UPDATE volunteer_tasks
       SET status = 'claimed', assigned_user_id = $1
       WHERE id = $2
       RETURNING *`,
      [req.user!.id, id]
    );

    return res.json({ task: result.rows[0] });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to claim task' });
  }
});

// PATCH /api/tasks/:id/complete - Volunteer or Admin marks task finished
router.patch('/:id/complete', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const taskCheck = await pool.query('SELECT * FROM volunteer_tasks WHERE id = $1', [id]);
    if (taskCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const task = taskCheck.rows[0];
    const isAssignee = task.assigned_user_id === req.user!.id;
    const isAdmin = req.user!.role === 'admin';

    if (!isAssignee && !isAdmin) {
      return res.status(403).json({ error: 'Only the assigned volunteer or an admin can complete this task' });
    }

    const result = await pool.query(
      `UPDATE volunteer_tasks
       SET status = 'completed', completed_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id]
    );

    return res.json({ task: result.rows[0] });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to complete task' });
  }
});

export default router;

