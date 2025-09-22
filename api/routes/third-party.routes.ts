import { Router, Request, Response } from 'express';
import { ThirdPartyManager } from '../services/thirdparty.manager'; // Adjust path as needed
import { MediaService } from '../services/media.service'; // Adjust path as needed
import { getOrgFromRequest } from '../middleware/org.from.request'; // Adjust path as needed
import { AuthService } from '../services/auth.service'; // Adjust path as needed

const router = Router();
const thirdPartyManager = new ThirdPartyManager();
const mediaService = new MediaService();

// GET /third-party/list
router.get('/list', async (_req: Request, res: Response) => {
  const result = await thirdPartyManager.getAllThirdParties();
  res.json(result);
});

// GET /third-party
router.get('/', getOrgFromRequest, async (req: Request, res: Response) => {
  const org = (req as any).org;
  const thirdParties = await thirdPartyManager.getAllThirdPartiesByOrganization(org.id);
  const mapped = await Promise.all(thirdParties.map((thirdParty: any) => {
    const { description, fields, position, title, identifier } = thirdPartyManager.getThirdPartyByName(thirdParty.identifier);
    return { ...thirdParty, title, position, fields, description };
  }));
  res.json(mapped);
});

// DELETE /third-party/:id
router.delete('/:id', getOrgFromRequest, async (req: Request, res: Response) => {
  const org = (req as any).org;
  const { id } = req.params;
  const result = await thirdPartyManager.deleteIntegration(org.id, id);
  res.json(result);
});

// POST /third-party/:id/submit
router.post('/:id/submit', getOrgFromRequest, async (req: Request, res: Response) => {
  const org = (req as any).org;
  const { id } = req.params;
  const data = req.body;
  const thirdParty = await thirdPartyManager.getIntegrationById(org.id, id);
  if (!thirdParty) return res.status(404).json({ error: 'Integration not found' });
  const thirdPartyInstance = thirdPartyManager.getThirdPartyByName(thirdParty.identifier);
  if (!thirdPartyInstance) return res.status(400).json({ error: 'Invalid identifier' });
  const loadedData = await thirdPartyInstance?.instance?.sendData(AuthService.fixedDecryption(thirdParty.apiKey), data);
  // Implement storage.uploadSimple logic
  const file = await mediaService.storage.uploadSimple(loadedData);
  const saved = await mediaService.saveFile(org.id, file.split('/').pop(), file);
  res.json(saved);
});

// POST /third-party/function/:id/:functionName
router.post('/function/:id/:functionName', getOrgFromRequest, async (req: Request, res: Response) => {
  const org = (req as any).org;
  const { id, functionName } = req.params;
  const data = req.body;
  const thirdParty = await thirdPartyManager.getIntegrationById(org.id, id);
  if (!thirdParty) return res.status(404).json({ error: 'Integration not found' });
  const thirdPartyInstance = thirdPartyManager.getThirdPartyByName(thirdParty.identifier);
  if (!thirdPartyInstance) return res.status(400).json({ error: 'Invalid identifier' });
  const result = await thirdPartyInstance?.instance?.[functionName](AuthService.fixedDecryption(thirdParty.apiKey), data);
  res.json(result);
});

// POST /third-party/:identifier
router.post('/:identifier', getOrgFromRequest, async (req: Request, res: Response) => {
  const org = (req as any).org;
  const { identifier } = req.params;
  const api = req.body.api;
  const thirdParty = thirdPartyManager.getThirdPartyByName(identifier);
  if (!thirdParty) return res.status(400).json({ error: 'Invalid identifier' });
  const connect = await thirdParty.instance.checkConnection(api);
  if (!connect) return res.status(400).json({ error: 'Invalid API key' });
  try {
    const save = await thirdPartyManager.saveIntegration(org.id, identifier, api, {
      name: connect.name,
      username: connect.username,
      id: connect.id,
    });
    res.json({ id: save.id });
  } catch (e) {
    res.status(400).json({ error: 'Integration Already Exists' });
  }
});

export default router;
