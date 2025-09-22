import { Router, Request, Response } from 'express';
import { AutopostService } from '../services/autopost.service'; // Adjust path as needed
import { getOrgFromRequest } from '../middleware/org.from.request'; // Adjust path as needed
import { AutopostDto } from '../dtos/autopost/autopost.dto'; // Adjust path as needed
// import { checkPolicies } from '../middleware/check.policies'; // Implement if needed

const router = Router();
const autopostsService = new AutopostService();

// GET /autopost
router.get('/', getOrgFromRequest, async (req: Request, res: Response) => {
  const org = (req as any).org;
  try {
    const autoposts = await autopostsService.getAutoposts(org.id);
    res.json(autoposts);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /autopost
router.post('/', getOrgFromRequest, /* checkPolicies([AuthorizationActions.Create, Sections.WEBHOOKS]), */ async (req: Request, res: Response) => {
  const org = (req as any).org;
  const body: AutopostDto = req.body;
  try {
    const result = await autopostsService.createAutopost(org.id, body);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /autopost/:id
router.put('/:id', getOrgFromRequest, async (req: Request, res: Response) => {
  const org = (req as any).org;
  const body: AutopostDto = req.body;
  const { id } = req.params;
  try {
    const result = await autopostsService.createAutopost(org.id, body, id);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /autopost/:id
router.delete('/:id', getOrgFromRequest, async (req: Request, res: Response) => {
  const org = (req as any).org;
  const { id } = req.params;
  try {
    const result = await autopostsService.deleteAutopost(org.id, id);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /autopost/:id/active
router.post('/:id/active', getOrgFromRequest, async (req: Request, res: Response) => {
  const org = (req as any).org;
  const { id } = req.params;
  const { active } = req.body;
  try {
    const result = await autopostsService.changeActive(org.id, id, active);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /autopost/send
router.post('/send', async (req: Request, res: Response) => {
  const { url } = req.query;
  try {
    const result = await autopostsService.loadXML(url as string);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
