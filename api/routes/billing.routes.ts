import { Router, Request, Response } from 'express';
import { SubscriptionService } from '../services/subscription.service'; // Adjust path as needed
import { StripeService } from '../services/stripe.service'; // Adjust path as needed
import { NotificationService } from '../services/notification.service'; // Adjust path as needed
import { Nowpayments } from '../services/nowpayments'; // Adjust path as needed
import { getOrgFromRequest } from '../middleware/org.from.request'; // Adjust path as needed
import { getUserFromRequest } from '../middleware/user.from.request'; // Adjust path as needed
import { BillingSubscribeDto } from '../dtos/billing/billing.subscribe.dto'; // Adjust path as needed

const router = Router();
const subscriptionService = new SubscriptionService();
const stripeService = new StripeService();
const notificationService = new NotificationService();
const nowpayments = new Nowpayments();

// GET /billing/check/:id
router.get('/check/:id', getOrgFromRequest, async (req: Request, res: Response) => {
  const org = (req as any).org;
  const { id } = req.params;
  try {
    const status = await stripeService.checkSubscription(org.id, id);
    res.json({ status });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /billing/finish-trial
router.post('/finish-trial', getOrgFromRequest, async (req: Request, res: Response) => {
  const org = (req as any).org;
  try {
    await stripeService.finishTrial(org.paymentId);
  } catch (err) {}
  res.json({ finish: true });
});

// GET /billing/is-trial-finished
router.get('/is-trial-finished', getOrgFromRequest, async (req: Request, res: Response) => {
  const org = (req as any).org;
  res.json({ finished: !org.isTrailing });
});

// POST /billing/subscribe
router.post('/subscribe', getOrgFromRequest, getUserFromRequest, async (req: Request, res: Response) => {
  const org = (req as any).org;
  const user = (req as any).user;
  const body: BillingSubscribeDto = req.body;
  const uniqueId = req.cookies?.track;
  try {
    const result = await stripeService.subscribe(uniqueId, org.id, user.id, body, org.allowTrial);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /billing/portal
router.get('/portal', getOrgFromRequest, async (req: Request, res: Response) => {
  const org = (req as any).org;
  try {
    const customer = await stripeService.getCustomerByOrganizationId(org.id);
    const { url } = await stripeService.createBillingPortalLink(customer);
    res.json({ portal: url });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /billing
router.get('/', getOrgFromRequest, async (req: Request, res: Response) => {
  const org = (req as any).org;
  try {
    const billing = await subscriptionService.getSubscriptionByOrganizationId(org.id);
    res.json(billing);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /billing/cancel
router.post('/cancel', getOrgFromRequest, getUserFromRequest, async (req: Request, res: Response) => {
  const org = (req as any).org;
  const user = (req as any).user;
  const { feedback } = req.body;
  try {
    await notificationService.sendEmail(
      process.env.EMAIL_FROM_ADDRESS,
      'Subscription Cancelled',
      `Organization ${org.name} has cancelled their subscription because: ${feedback}`,
      user.email
    );
    const result = await stripeService.setToCancel(org.id);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /billing/prorate
router.post('/prorate', getOrgFromRequest, async (req: Request, res: Response) => {
  const org = (req as any).org;
  const body: BillingSubscribeDto = req.body;
  try {
    const result = await stripeService.prorate(org.id, body);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /billing/lifetime
router.post('/lifetime', getOrgFromRequest, async (req: Request, res: Response) => {
  const org = (req as any).org;
  const { code } = req.body;
  try {
    const result = await stripeService.lifetimeDeal(org.id, code);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /billing/add-subscription
router.post('/add-subscription', getUserFromRequest, getOrgFromRequest, async (req: Request, res: Response) => {
  const org = (req as any).org;
  const user = (req as any).user;
  const { subscription } = req.body;
  if (!user.isSuperAdmin) {
    return res.status(403).json({ error: 'Unauthorized' });
  }
  try {
    await subscriptionService.addSubscription(org.id, user.id, subscription);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /billing/crypto
router.get('/crypto', getOrgFromRequest, async (req: Request, res: Response) => {
  const org = (req as any).org;
  try {
    const result = await nowpayments.createPaymentPage(org.id);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
