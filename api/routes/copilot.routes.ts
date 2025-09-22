import { Router, Request, Response } from 'express';
import { CopilotRuntime, OpenAIAdapter, copilotRuntimeNestEndpoint } from '@copilotkit/runtime';
import { SubscriptionService } from '../services/subscription.service'; // Adjust path as needed
import { getOrgFromRequest } from '../middleware/org.from.request'; // Adjust path as needed

const router = Router();
const subscriptionService = new SubscriptionService();

// POST /copilot/chat
router.post('/chat', async (req: Request, res: Response) => {
  if (!process.env.OPENAI_API_KEY) {
    console.warn('OpenAI API key not set, chat functionality will not work');
    return res.status(500).json({ error: 'OpenAI API key not set' });
  }

  const copilotRuntimeHandler = copilotRuntimeNestEndpoint({
    endpoint: '/copilot/chat',
    runtime: new CopilotRuntime(),
    serviceAdapter: new OpenAIAdapter({
      model:
        req?.body?.variables?.data?.metadata?.requestType === 'TextareaCompletion'
          ? 'gpt-4o-mini'
          : 'gpt-4.1',
    }),
  });

  return copilotRuntimeHandler(req, res);
});

// GET /copilot/credits
router.get('/credits', getOrgFromRequest, async (req: Request, res: Response) => {
  const org = (req as any).org;
  const type = (req.query.type as 'ai_images' | 'ai_videos') || 'ai_images';
  try {
    const credits = await subscriptionService.checkCredits(org, type);
    res.json(credits);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
