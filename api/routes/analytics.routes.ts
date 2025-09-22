import { Router, Request, Response } from 'express';
import dayjs from 'dayjs';
import { StarsService } from '../services/stars.service'; // Adjust path as needed
import { IntegrationService } from '../services/integration.service'; // Adjust path as needed
import { getOrgFromRequest } from '../middleware/org.from.request'; // Adjust path as needed
import { StarsListDto } from '../dtos/analytics/stars.list.dto'; // Adjust path as needed

const router = Router();
const starsService = new StarsService();
const integrationService = new IntegrationService();

// GET /analytics
router.get('/', getOrgFromRequest, async (req: Request, res: Response) => {
  const org = (req as any).org;
  try {
    const stars = await starsService.getStars(org.id);
    res.json(stars);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /analytics/trending
router.get('/trending', async (_req: Request, res: Response) => {
  const todayTrending = dayjs(dayjs().format('YYYY-MM-DDT12:00:00'));
  const last = todayTrending.isAfter(dayjs())
    ? todayTrending.subtract(1, 'day')
    : todayTrending;
  const nextTrending = last.add(1, 'day');

  res.json({
    last: last.format('YYYY-MM-DD HH:mm:ss'),
    predictions: nextTrending.format('YYYY-MM-DD HH:mm:ss'),
  });
});

// POST /analytics/stars
router.post('/stars', getOrgFromRequest, async (req: Request, res: Response) => {
  const org = (req as any).org;
  const starsFilter: StarsListDto = req.body;
  try {
    const stars = await starsService.getStarsFilter(org.id, starsFilter);
    res.json({ stars });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /analytics/:integration
router.get('/:integration', getOrgFromRequest, async (req: Request, res: Response) => {
  const org = (req as any).org;
  const { integration } = req.params;
  const { date } = req.query;
  try {
    const result = await integrationService.checkAnalytics(org, integration, date as string);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
