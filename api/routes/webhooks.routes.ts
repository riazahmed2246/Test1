import { Router, Request, Response } from 'express';
import { WebhooksService } from '../services/webhooks.service'; // Adjust path as needed
import { getOrgFromRequest } from '../middleware/org.from.request'; // Adjust path as needed
import { WebhooksDto, UpdateDto } from '../dtos/webhooks/webhooks.dto'; // Adjust path as needed

const router = Router();
const webhooksService = new WebhooksService();

// GET /webhooks
router.get('/', getOrgFromRequest, async (req: Request, res: Response) => {
  const org = (req as any).org;
  const result = await webhooksService.getWebhooks(org.id);
  res.json(result);
});

// POST /webhooks
router.post('/', getOrgFromRequest, async (req: Request, res: Response) => {
  const org = (req as any).org;
  const body: WebhooksDto = req.body;
  const result = await webhooksService.createWebhook(org.id, body);
  res.json(result);
});

// PUT /webhooks
router.put('/', getOrgFromRequest, async (req: Request, res: Response) => {
  const org = (req as any).org;
  const body: UpdateDto = req.body;
  const result = await webhooksService.createWebhook(org.id, body);
  res.json(result);
});

// DELETE /webhooks/:id
router.delete('/:id', getOrgFromRequest, async (req: Request, res: Response) => {
  const org = (req as any).org;
  const { id } = req.params;
  const result = await webhooksService.deleteWebhook(org.id, id);
  res.json(result);
});

// POST /webhooks/send
router.post('/send', async (req: Request, res: Response) => {
  const body = req.body;
  const url = req.query.url as string;
  try {
    await fetch(url, {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    // sent
  }
  res.json({ send: true });
});

export default router;
