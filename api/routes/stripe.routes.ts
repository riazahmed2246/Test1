import { Router, Request, Response } from 'express';
import { StripeService } from '../services/stripe.service'; // Adjust path as needed
import { CodesService } from '../services/codes.service'; // Adjust path as needed

const router = Router();
const stripeService = new StripeService();
const codesService = new CodesService();

// POST /stripe/connect
router.post('/connect', async (req: Request, res: Response) => {
  const event = stripeService.validateRequest(
    (req as any).rawBody,
    req.headers['stripe-signature'],
    process.env.STRIPE_SIGNING_KEY_CONNECT
  );
  if (event?.data?.object?.metadata?.service !== 'gitroom') {
    return res.json({ ok: true });
  }
  switch (event.type) {
    case 'account.updated':
      return res.json(stripeService.updateAccount(event));
    default:
      return res.json({ ok: true });
  }
});

// POST /stripe
router.post('/', async (req: Request, res: Response) => {
  const event = stripeService.validateRequest(
    (req as any).rawBody,
    req.headers['stripe-signature'],
    process.env.STRIPE_SIGNING_KEY
  );
  if (
    event?.data?.object?.metadata?.service !== 'gitroom' &&
    event.type !== 'invoice.payment_succeeded'
  ) {
    return res.json({ ok: true });
  }
  try {
    switch (event.type) {
      case 'invoice.payment_succeeded':
        return res.json(stripeService.paymentSucceeded(event));
      case 'account.updated':
        return res.json(stripeService.updateAccount(event));
      case 'customer.subscription.created':
        return res.json(stripeService.createSubscription(event));
      case 'customer.subscription.updated':
        return res.json(stripeService.updateSubscription(event));
      case 'customer.subscription.deleted':
        return res.json(stripeService.deleteSubscription(event));
      default:
        return res.json({ ok: true });
    }
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

// GET /stripe/lifetime-deal-codes/:provider
router.get('/lifetime-deal-codes/:provider', async (req: Request, res: Response) => {
  const { provider } = req.params;
  res.setHeader('Content-disposition', 'attachment; filename=codes.csv');
  res.setHeader('Content-type', 'text/csv');
  const codes = await codesService.generateCodes(provider);
  res.send(codes);
});

export default router;
