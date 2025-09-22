import { Router, Request, Response } from 'express';
import { SubscriptionService } from '../services/subscription.service'; // Adjust path as needed
import { StripeService } from '../services/stripe.service'; // Adjust path as needed
import { AuthService } from '../services/auth.service'; // Adjust path as needed
import { OrganizationService } from '../services/organization.service'; // Adjust path as needed
import { UsersService } from '../services/users.service'; // Adjust path as needed
import { TrackService } from '../services/track.service'; // Adjust path as needed
import { getUserFromRequest } from '../middleware/user.from.request'; // Adjust path as needed
import { getOrgFromRequest } from '../middleware/org.from.request'; // Adjust path as needed
import { UserDetailDto } from '../dtos/users/user.details.dto'; // Adjust path as needed
import { getCookieUrlFromDomain } from '../helpers/subdomain.management'; // Adjust path as needed
import { makeId } from '../services/make.is'; // Adjust path as needed

const router = Router();
const subscriptionService = new SubscriptionService();
const stripeService = new StripeService();
const authService = new AuthService();
const orgService = new OrganizationService();
const userService = new UsersService();
const trackService = new TrackService();

// GET /user/self
router.get('/self', getUserFromRequest, getOrgFromRequest, async (req: Request, res: Response) => {
  const user = (req as any).user;
  const org = (req as any).org;
  if (!org) return res.status(403).json({ error: 'Forbidden' });
  const impersonate = req.cookies?.impersonate || req.headers['impersonate'];
  res.json({
    ...user,
    orgId: org.id,
    totalChannels: !process.env.STRIPE_PUBLISHABLE_KEY ? 10000 : org?.subscription?.totalChannels || 10,
    tier: org?.subscription?.subscriptionTier || (!process.env.STRIPE_PUBLISHABLE_KEY ? 'ULTIMATE' : 'FREE'),
    role: org?.users?.[0]?.role,
    isLifetime: !!org?.subscription?.isLifetime,
    admin: !!user.isSuperAdmin,
    impersonate: !!impersonate,
    isTrailing: !process.env.STRIPE_PUBLISHABLE_KEY ? false : org?.isTrailing,
    allowTrial: org?.allowTrial,
    publicApi: org?.users?.[0]?.role === 'SUPERADMIN' || org?.users?.[0]?.role === 'ADMIN' ? org?.apiKey : '',
  });
});

// GET /user/personal
router.get('/personal', getUserFromRequest, async (req: Request, res: Response) => {
  const user = (req as any).user;
  const result = await userService.getPersonal(user.id);
  res.json(result);
});

// GET /user/impersonate
router.get('/impersonate', getUserFromRequest, async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { name } = req.query;
  if (!user.isSuperAdmin) return res.status(400).json({ error: 'Unauthorized' });
  const result = await userService.getImpersonateUser(name as string);
  res.json(result);
});

// POST /user/impersonate
router.post('/impersonate', getUserFromRequest, async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { id } = req.body;
  if (!user.isSuperAdmin) return res.status(400).json({ error: 'Unauthorized' });
  res.cookie('impersonate', id, {
    domain: getCookieUrlFromDomain(process.env.FRONTEND_URL!),
    ...(!process.env.NOT_SECURED ? { secure: true, httpOnly: true, sameSite: 'none' } : {}),
    expires: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365),
  });
  if (process.env.NOT_SECURED) res.header('impersonate', id);
  res.json({ success: true });
});

// POST /user/personal
router.post('/personal', getUserFromRequest, async (req: Request, res: Response) => {
  const user = (req as any).user;
  const body: UserDetailDto = req.body;
  const result = await userService.changePersonal(user.id, body);
  res.json(result);
});

// GET /user/subscription
router.get('/subscription', getOrgFromRequest, async (req: Request, res: Response) => {
  const org = (req as any).org;
  const subscription = await subscriptionService.getSubscriptionByOrganizationId(org.id);
  res.json({ subscription });
});

// GET /user/subscription/tiers
router.get('/subscription/tiers', async (_req: Request, res: Response) => {
  const result = await stripeService.getPackages();
  res.json(result);
});

// POST /user/join-org
router.post('/join-org', getUserFromRequest, async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { org } = req.body;
  const getOrgFromCookie = authService.getOrgFromCookie(org);
  if (!getOrgFromCookie) return res.status(200).json({ id: null });
  const addedOrg = await orgService.addUserToOrg(user.id, getOrgFromCookie.id, getOrgFromCookie.orgId, getOrgFromCookie.role);
  res.status(200).json({ id: typeof addedOrg !== 'boolean' ? addedOrg.organizationId : null });
});

// GET /user/organizations
router.get('/organizations', getUserFromRequest, async (req: Request, res: Response) => {
  const user = (req as any).user;
  const orgs = await orgService.getOrgsByUserId(user.id);
  res.json(orgs.filter((f: any) => !f.users[0].disabled));
});

// POST /user/change-org
router.post('/change-org', async (req: Request, res: Response) => {
  const { id } = req.body;
  res.cookie('showorg', id, {
    domain: getCookieUrlFromDomain(process.env.FRONTEND_URL!),
    ...(!process.env.NOT_SECURED ? { secure: true, httpOnly: true, sameSite: 'none' } : {}),
    expires: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365),
  });
  if (process.env.NOT_SECURED) res.header('showorg', id);
  res.status(200).send();
});

// POST /user/logout
router.post('/logout', async (req: Request, res: Response) => {
  res.cookie('auth', '', {
    domain: getCookieUrlFromDomain(process.env.FRONTEND_URL!),
    ...(!process.env.NOT_SECURED ? { secure: true, httpOnly: true, sameSite: 'none' } : {}),
    maxAge: -1,
    expires: new Date(0),
  });
  res.cookie('showorg', '', {
    domain: getCookieUrlFromDomain(process.env.FRONTEND_URL!),
    ...(!process.env.NOT_SECURED ? { secure: true, httpOnly: true, sameSite: 'none' } : {}),
    maxAge: -1,
    expires: new Date(0),
  });
  res.cookie('impersonate', '', {
    domain: getCookieUrlFromDomain(process.env.FRONTEND_URL!),
    ...(!process.env.NOT_SECURED ? { secure: true, httpOnly: true, sameSite: 'none' } : {}),
    maxAge: -1,
    expires: new Date(0),
  });
  res.status(200).send();
});

// POST /user/t
router.post('/t', getUserFromRequest, async (req: Request, res: Response) => {
  const ip = req.ip;
  const userAgent = req.headers['user-agent'] || '';
  const user = (req as any).user;
  const body = req.body;
  const uniqueId = req.cookies?.track || makeId(10);
  const fbclid = req.cookies?.fbclid || body.fbclid;
  await trackService.track(uniqueId, ip, userAgent, body.tt, body.additional, fbclid, user);
  if (!req.cookies?.track) {
    res.cookie('track', uniqueId, {
      domain: getCookieUrlFromDomain(process.env.FRONTEND_URL!),
      ...(!process.env.NOT_SECURED ? { secure: true, httpOnly: true, sameSite: 'none' } : {}),
      expires: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365),
    });
  }
  res.status(200).json({ track: uniqueId });
});

export default router;
