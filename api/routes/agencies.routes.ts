import { Router, Request, Response } from 'express';
import { AgenciesService } from '../services/agencies.service'; // Adjust path as needed
import { getUserFromRequest } from '../middleware/user.from.request'; // Adjust path as needed

const router = Router();
const agenciesService = new AgenciesService();

// GET /agencies
router.get('/', getUserFromRequest, async (req: Request, res: Response) => {
  const user = (req as any).user;
  try {
    const agency = await agenciesService.getAgencyByUser(user);
    res.json(agency || {});
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /agencies
router.post('/', getUserFromRequest, async (req: Request, res: Response) => {
  const user = (req as any).user;
  const body = req.body;
  try {
    const result = await agenciesService.createAgency(user, body);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /agencies/action/:action/:id
router.post('/action/:action/:id', getUserFromRequest, async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { action, id } = req.params;
  if (!user.isSuperAdmin) {
    return res.status(400).json({ error: 'Not authorized' });
  }
  try {
    const result = await agenciesService.approveOrDecline(user.email, action, id);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
