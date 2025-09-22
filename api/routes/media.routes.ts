import { Router, Request, Response } from 'express';
import { MediaService } from '../services/media.service'; // Adjust path as needed
import { SubscriptionService } from '../services/subscription.service'; // Adjust path as needed
import { getOrgFromRequest } from '../middleware/org.from.request'; // Adjust path as needed
import { SaveMediaInformationDto } from '../dtos/media/save.media.information.dto'; // Adjust path as needed
import { VideoDto } from '../dtos/videos/video.dto'; // Adjust path as needed
import { VideoFunctionDto } from '../dtos/videos/video.function.dto'; // Adjust path as needed
// import multer and custom upload logic as needed

const router = Router();
const mediaService = new MediaService();
const subscriptionService = new SubscriptionService();

// DELETE /media/:id
router.delete('/:id', getOrgFromRequest, async (req: Request, res: Response) => {
  const org = (req as any).org;
  const { id } = req.params;
  const result = await mediaService.deleteMedia(org.id, id);
  res.json(result);
});

// POST /media/generate-video
router.post('/generate-video', getOrgFromRequest, async (req: Request, res: Response) => {
  const org = (req as any).org;
  const body: VideoDto = req.body;
  const result = await mediaService.generateVideo(org, body);
  res.json(result);
});

// POST /media/generate-image
router.post('/generate-image', getOrgFromRequest, async (req: Request, res: Response) => {
  const org = (req as any).org;
  const { prompt, isPicturePrompt = false } = req.body;
  const total = await subscriptionService.checkCredits(org);
  if (process.env.STRIPE_PUBLISHABLE_KEY && total.credits <= 0) {
    return res.json(false);
  }
  const output = (isPicturePrompt ? '' : 'data:image/png;base64,') + (await mediaService.generateImage(prompt, org, isPicturePrompt));
  res.json({ output });
});

// POST /media/generate-image-with-prompt
router.post('/generate-image-with-prompt', getOrgFromRequest, async (req: Request, res: Response) => {
  const org = (req as any).org;
  const { prompt } = req.body;
  const image = await mediaService.generateImage(prompt, org, true);
  if (!image) return res.json(false);
  // Implement storage.uploadSimple logic
  const file = await mediaService.storage.uploadSimple(image.output);
  const saved = await mediaService.saveFile(org.id, file.split('/').pop(), file);
  res.json(saved);
});

// POST /media/save-media
router.post('/save-media', getOrgFromRequest, async (req: Request, res: Response) => {
  const org = (req as any).org;
  const { name } = req.body;
  if (!name) return res.json(false);
  const url = process.env.CLOUDFLARE_BUCKET_URL + '/' + name;
  const result = await mediaService.saveFile(org.id, name, url);
  res.json(result);
});

// POST /media/information
router.post('/information', getOrgFromRequest, async (req: Request, res: Response) => {
  const org = (req as any).org;
  const body: SaveMediaInformationDto = req.body;
  const result = await mediaService.saveMediaInformation(org.id, body);
  res.json(result);
});

// GET /media
router.get('/', getOrgFromRequest, async (req: Request, res: Response) => {
  const org = (req as any).org;
  const page = Number(req.query.page) || 1;
  const result = await mediaService.getMedia(org.id, page);
  res.json(result);
});

// GET /media/video-options
router.get('/video-options', async (_req: Request, res: Response) => {
  const result = await mediaService.getVideoOptions();
  res.json(result);
});

// POST /media/video/function
router.post('/video/function', async (req: Request, res: Response) => {
  const body: VideoFunctionDto = req.body;
  const result = await mediaService.videoFunction(body.identifier, body.functionName, body.params);
  res.json(result);
});

// GET /media/generate-video/:type/allowed
router.get('/generate-video/:type/allowed', getOrgFromRequest, async (req: Request, res: Response) => {
  const org = (req as any).org;
  const { type } = req.params;
  const result = await mediaService.generateVideoAllowed(org, type);
  res.json(result);
});

export default router;
