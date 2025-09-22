import { Router, Request, Response } from 'express';
import { AgenciesService } from '../services/agencies.service'; // Adjust path as needed
import { PostsService } from '../services/posts.service'; // Adjust path as needed
import { TrackService } from '../services/track.service'; // Adjust path as needed
import { AgentGraphInsertService } from '../services/agent.graph.insert.service'; // Adjust path as needed
import { Nowpayments } from '../services/nowpayments'; // Adjust path as needed
import { makeId } from '../services/make.is'; // Adjust path as needed
import { getCookieUrlFromDomain } from '../helpers/subdomain.management'; // Adjust path as needed
import { Readable, pipeline } from 'stream';
import { promisify } from 'util';

const router = Router();
const agenciesService = new AgenciesService();
const trackService = new TrackService();
const agentGraphInsertService = new AgentGraphInsertService();
const postsService = new PostsService();
const nowpayments = new Nowpayments();
const pump = promisify(pipeline);

// POST /public/agent
router.post('/agent', async (req: Request, res: Response) => {
  const { text, apiKey } = req.body;
  if (!apiKey || !process.env.AGENT_API_KEY || apiKey !== process.env.AGENT_API_KEY) {
    return res.json({});
  }
  const result = await agentGraphInsertService.newPost(text);
  res.json(result);
});

// GET /public/agencies-list
router.get('/agencies-list', async (_req: Request, res: Response) => {
  const result = await agenciesService.getAllAgencies();
  res.json(result);
});

// GET /public/agencies-list-slug
router.get('/agencies-list-slug', async (_req: Request, res: Response) => {
  const result = await agenciesService.getAllAgenciesSlug();
  res.json(result);
});

// GET /public/agencies-information/:agency
router.get('/agencies-information/:agency', async (req: Request, res: Response) => {
  const { agency } = req.params;
  const result = await agenciesService.getAgencyInformation(agency);
  res.json(result);
});

// GET /public/agencies-list-count
router.get('/agencies-list-count', async (_req: Request, res: Response) => {
  const result = await agenciesService.getCount();
  res.json(result);
});

// GET /public/posts/:id
router.get('/posts/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const posts = await postsService.getPostsRecursively(id, true);
  const mapped = posts.map(({ childrenPost, ...p }: any) => ({
    ...p,
    ...(p.integration ? {
      integration: {
        id: p.integration.id,
        name: p.integration.name,
        picture: p.integration.picture,
        providerIdentifier: p.integration.providerIdentifier,
        profile: p.integration.profile,
      },
    } : {}),
  }));
  res.json(mapped);
});

// GET /public/posts/:id/comments
router.get('/posts/:id/comments', async (req: Request, res: Response) => {
  const { id } = req.params;
  const comments = await postsService.getComments(id);
  res.json({ comments });
});

// POST /public/t
router.post('/t', async (req: Request, res: Response) => {
  const ip = req.ip;
  const userAgent = req.headers['user-agent'] || '';
  const body = req.body;
  const uniqueId = req.cookies?.track || makeId(10);
  const fbclid = req.cookies?.fbclid || body.fbclid;
  await trackService.track(uniqueId, ip, userAgent, body.tt, body.additional, fbclid);
  if (!req.cookies?.track) {
    res.cookie('track', uniqueId, {
      domain: getCookieUrlFromDomain(process.env.FRONTEND_URL!),
      ...(!process.env.NOT_SECURED ? { secure: true, httpOnly: true } : {}),
      sameSite: 'none',
      expires: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365),
    });
  }
  if (body.fbclid && !req.cookies?.fbclid) {
    res.cookie('fbclid', body.fbclid, {
      domain: getCookieUrlFromDomain(process.env.FRONTEND_URL!),
      ...(!process.env.NOT_SECURED ? { secure: true, httpOnly: true } : {}),
      sameSite: 'none',
      expires: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365),
    });
  }
  res.status(200).json({ track: uniqueId });
});

// POST /public/crypto/:path
router.post('/crypto/:path', async (req: Request, res: Response) => {
  const { path } = req.params;
  const body = req.body;
  const result = await nowpayments.processPayment(path, body);
  res.json(result);
});

// GET /public/stream
router.get('/stream', async (req: Request, res: Response) => {
  const { url } = req.query;
  if (typeof url !== 'string' || !url.endsWith('mp4')) {
    return res.status(400).send('Invalid video URL');
  }
  const ac = new AbortController();
  const onClose = () => ac.abort();
  req.on('aborted', onClose);
  res.on('close', onClose);
  const r = await fetch(url, { signal: ac.signal });
  if (!r.ok && r.status !== 206) {
    res.status(r.status);
    throw new Error(`Upstream error: ${r.statusText}`);
  }
  const type = r.headers.get('content-type') ?? 'application/octet-stream';
  res.setHeader('Content-Type', type);
  const contentRange = r.headers.get('content-range');
  if (contentRange) res.setHeader('Content-Range', contentRange);
  const len = r.headers.get('content-length');
  if (len) res.setHeader('Content-Length', len);
  const acceptRanges = r.headers.get('accept-ranges') ?? 'bytes';
  res.setHeader('Accept-Ranges', acceptRanges);
  if (r.status === 206) res.status(206);
  try {
    await pump(Readable.fromWeb(r.body as any), res);
  } catch (err) {}
});

export default router;
