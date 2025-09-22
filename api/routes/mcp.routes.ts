import { Router, Request, Response } from 'express';
import { McpService } from '../services/mcp.service'; // Adjust path as needed
import { OrganizationService } from '../services/organization.service'; // Adjust path as needed

const router = Router();
const mcpService = new McpService();
const organizationService = new OrganizationService();

// SSE endpoint (GET /mcp/:api/sse)
router.get('/:api/sse', async (req: Request, res: Response) => {
  const { api } = req.params;
  const apiModel = await organizationService.getOrgByApiKey(api);
  if (!apiModel) {
    return res.status(400).json({ error: 'Invalid url' });
  }
  // You may need to set headers for SSE
  res.setHeader('Content-Type', 'text/event-stream');
  await mcpService.runServer(api, apiModel.id, res); // Pass res for streaming
});

// POST /mcp/:api/messages
router.post('/:api/messages', async (req: Request, res: Response) => {
  const { api } = req.params;
  const body = req.body;
  const apiModel = await organizationService.getOrgByApiKey(api);
  if (!apiModel) {
    return res.status(400).json({ error: 'Invalid url' });
  }
  const result = await mcpService.processPostBody(apiModel.id, body);
  res.json(result);
});

export default router;
