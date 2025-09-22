import { Router, Request, Response } from 'express';
import { SetsService } from '../services/sets.service'; // Adjust path as needed
import { getOrgFromRequest } from '../middleware/org.from.request'; // Adjust path as needed
import { SetsDto, UpdateSetsDto } from '../dtos/sets/sets.dto'; // Adjust path as needed

const router = Router();
const setsService = new SetsService();

// GET /sets
router.get('/', getOrgFromRequest, async (req: Request, res: Response) => {
  const org = (req as any).org;
  const result = await setsService.getSets(org.id);
  res.json(result);
});

// POST /sets
router.post('/', getOrgFromRequest, async (req: Request, res: Response) => {
  const org = (req as any).org;
  const body: SetsDto = req.body;
  const result = await setsService.createSet(org.id, body);
  res.json(result);
});

// PUT /sets
router.put('/', getOrgFromRequest, async (req: Request, res: Response) => {
  const org = (req as any).org;
  const body: UpdateSetsDto = req.body;
  const result = await setsService.createSet(org.id, body);
  res.json(result);
});

// DELETE /sets/:id
router.delete('/:id', getOrgFromRequest, async (req: Request, res: Response) => {
  const org = (req as any).org;
  const { id } = req.params;
  const result = await setsService.deleteSet(org.id, id);
  res.json(result);
});

export default router;
