import { Router, Request, Response } from 'express';
import { IntegrationManager } from '../services/integration.manager'; // Adjust path as needed
import { IntegrationService } from '../services/integration.service'; // Adjust path as needed
import { PostsService } from '../services/posts.service'; // Adjust path as needed
import { getOrgFromRequest } from '../middleware/org.from.request'; // Adjust path as needed
import { getUserFromRequest } from '../middleware/user.from.request'; // Adjust path as needed
import { ConnectIntegrationDto } from '../dtos/integrations/connect.integration.dto'; // Adjust path as needed
import { ApiKeyDto } from '../dtos/integrations/api.key.dto'; // Adjust path as needed
import { IntegrationFunctionDto } from '../dtos/integrations/integration.function.dto'; // Adjust path as needed
import { IntegrationTimeDto } from '../dtos/integrations/integration.time.dto'; // Adjust path as needed
import { PlugDto } from '../dtos/plugs/plug.dto'; // Adjust path as needed
import { TelegramProvider } from '../services/telegram.provider'; // Adjust path as needed
import { uniqBy } from 'lodash';

const router = Router();
const integrationManager = new IntegrationManager();
const integrationService = new IntegrationService();
const postsService = new PostsService();

// GET /integrations
router.get('/', async (_req: Request, res: Response) => {
  res.json(await integrationManager.getAllIntegrations());
});

// GET /integrations/:identifier/internal-plugs
router.get('/:identifier/internal-plugs', async (req: Request, res: Response) => {
  const { identifier } = req.params;
  res.json(await integrationManager.getInternalPlugs(identifier));
});

// GET /integrations/customers
router.get('/customers', getOrgFromRequest, async (req: Request, res: Response) => {
  const org = (req as any).org;
  res.json(await integrationService.customers(org.id));
});

// PUT /integrations/:id/group
router.put('/:id/group', getOrgFromRequest, async (req: Request, res: Response) => {
  const org = (req as any).org;
  const { id } = req.params;
  const { group } = req.body;
  res.json(await integrationService.updateIntegrationGroup(org.id, id, group));
});

// PUT /integrations/:id/customer-name
router.put('/:id/customer-name', getOrgFromRequest, async (req: Request, res: Response) => {
  const org = (req as any).org;
  const { id } = req.params;
  const { name } = req.body;
  res.json(await integrationService.updateOnCustomerName(org.id, id, name));
});

// GET /integrations/list
router.get('/list', getOrgFromRequest, async (req: Request, res: Response) => {
  const org = (req as any).org;
  const integrations = await integrationService.getIntegrationsList(org.id);
  // You may need to map and enrich as in the original controller
  res.json({ integrations });
});

// POST /integrations/:id/settings
router.post('/:id/settings', getOrgFromRequest, async (req: Request, res: Response) => {
  const org = (req as any).org;
  const { id } = req.params;
  const { additionalSettings } = req.body;
  if (typeof additionalSettings !== 'string') {
    return res.status(400).json({ error: 'Invalid body' });
  }
  await integrationService.updateProviderSettings(org.id, id, additionalSettings);
  res.json({ success: true });
});

// POST /integrations/:id/nickname
router.post('/:id/nickname', getOrgFromRequest, async (req: Request, res: Response) => {
  const org = (req as any).org;
  const { id } = req.params;
  const { name, picture } = req.body;
  // ...implement logic as in original controller
  res.json({ success: true });
});

// GET /integrations/:id
router.get('/:id', getUserFromRequest, getOrgFromRequest, async (req: Request, res: Response) => {
  const org = (req as any).org;
  const user = (req as any).user;
  const { id } = req.params;
  const { order } = req.query;
  res.json(await integrationService.getIntegrationForOrder(id, order, user.id, org.id));
});

// POST /integrations/:id/time
router.post('/:id/time', getOrgFromRequest, async (req: Request, res: Response) => {
  const org = (req as any).org;
  const { id } = req.params;
  const body: IntegrationTimeDto = req.body;
  res.json(await integrationService.setTimes(org.id, id, body));
});

// POST /integrations/mentions
router.post('/mentions', getOrgFromRequest, async (req: Request, res: Response) => {
  const org = (req as any).org;
  const body: IntegrationFunctionDto = req.body;
  // ...implement logic as in original controller
  res.json({ success: true });
});

// POST /integrations/function
router.post('/function', getOrgFromRequest, async (req: Request, res: Response) => {
  const org = (req as any).org;
  const body: IntegrationFunctionDto = req.body;
  // ...implement logic as in original controller
  res.json({ success: true });
});

// POST /integrations/disable
router.post('/disable', getOrgFromRequest, async (req: Request, res: Response) => {
  const org = (req as any).org;
  const { id } = req.body;
  res.json(await integrationService.disableChannel(org.id, id));
});

// POST /integrations/enable
router.post('/enable', getOrgFromRequest, async (req: Request, res: Response) => {
  const org = (req as any).org;
  const { id } = req.body;
  // ...implement logic for channel enable
  res.json({ success: true });
});

// DELETE /integrations
router.delete('/', getOrgFromRequest, async (req: Request, res: Response) => {
  const org = (req as any).org;
  const { id } = req.body;
  // ...implement logic for delete channel and posts
  res.json({ success: true });
});

// GET /integrations/plug/list
router.get('/plug/list', async (_req: Request, res: Response) => {
  res.json({ plugs: integrationManager.getAllPlugs() });
});

// GET /integrations/:id/plugs
router.get('/:id/plugs', getOrgFromRequest, async (req: Request, res: Response) => {
  const org = (req as any).org;
  const { id } = req.params;
  res.json(await integrationService.getPlugsByIntegrationId(org.id, id));
});

// POST /integrations/:id/plugs
router.post('/:id/plugs', getOrgFromRequest, async (req: Request, res: Response) => {
  const org = (req as any).org;
  const { id } = req.params;
  const body: PlugDto = req.body;
  res.json(await integrationService.createOrUpdatePlug(org.id, id, body));
});

// PUT /integrations/plugs/:id/activate
router.put('/plugs/:id/activate', getOrgFromRequest, async (req: Request, res: Response) => {
  const org = (req as any).org;
  const { id } = req.params;
  const { status } = req.body;
  res.json(await integrationService.changePlugActivation(org.id, id, status));
});

// GET /integrations/telegram/updates
router.get('/telegram/updates', async (req: Request, res: Response) => {
  const query = req.query;
  res.json(await new TelegramProvider().getBotId(query));
});

export default router;
