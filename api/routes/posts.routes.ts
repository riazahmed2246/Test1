import { Router, Request, Response } from 'express';
import { PostsService } from '../services/posts.service'; // Adjust path as needed
import { StarsService } from '../services/stars.service'; // Adjust path as needed
import { MessagesService } from '../services/messages.service'; // Adjust path as needed
import { AgentGraphService } from '../services/agent.graph.service'; // Adjust path as needed
import { ShortLinkService } from '../services/short.link.service'; // Adjust path as needed
import { getOrgFromRequest } from '../middleware/org.from.request'; // Adjust path as needed
import { getUserFromRequest } from '../middleware/user.from.request'; // Adjust path as needed
import { GetPostsDto } from '../dtos/posts/get.posts.dto'; // Adjust path as needed
import { CreateTagDto } from '../dtos/posts/create.tag.dto'; // Adjust path as needed
import { GeneratorDto } from '../dtos/generator/generator.dto'; // Adjust path as needed
import { CreateGeneratedPostsDto } from '../dtos/generator/create.generated.posts.dto'; // Adjust path as needed

const router = Router();
const postsService = new PostsService();
const starsService = new StarsService();
const messagesService = new MessagesService();
const agentGraphService = new AgentGraphService();
const shortLinkService = new ShortLinkService();

// GET /posts/:id/statistics
router.get('/:id/statistics', getOrgFromRequest, async (req: Request, res: Response) => {
  const org = (req as any).org;
  const { id } = req.params;
  const result = await postsService.getStatistics(org.id, id);
  res.json(result);
});

// POST /posts/should-shortlink
router.post('/should-shortlink', async (req: Request, res: Response) => {
  const { messages } = req.body;
  const ask = shortLinkService.askShortLinkedin(messages);
  res.json({ ask });
});

// GET /posts/marketplace/:id
router.get('/marketplace/:id', getOrgFromRequest, async (req: Request, res: Response) => {
  const org = (req as any).org;
  const { id } = req.params;
  const result = await messagesService.getMarketplaceAvailableOffers(org.id, id);
  res.json(result);
});

// POST /posts/:id/comments
router.post('/:id/comments', getOrgFromRequest, getUserFromRequest, async (req: Request, res: Response) => {
  const org = (req as any).org;
  const user = (req as any).user;
  const { id } = req.params;
  const { comment } = req.body;
  const result = await postsService.createComment(org.id, user.id, id, comment);
  res.json(result);
});

// GET /posts/tags
router.get('/tags', getOrgFromRequest, async (req: Request, res: Response) => {
  const org = (req as any).org;
  const tags = await postsService.getTags(org.id);
  res.json({ tags });
});

// POST /posts/tags
router.post('/tags', getOrgFromRequest, async (req: Request, res: Response) => {
  const org = (req as any).org;
  const body: CreateTagDto = req.body;
  const result = await postsService.createTag(org.id, body);
  res.json(result);
});

// PUT /posts/tags/:id
router.put('/tags/:id', getOrgFromRequest, async (req: Request, res: Response) => {
  const org = (req as any).org;
  const { id } = req.params;
  const body: CreateTagDto = req.body;
  const result = await postsService.editTag(id, org.id, body);
  res.json(result);
});

// GET /posts
router.get('/', getOrgFromRequest, async (req: Request, res: Response) => {
  const org = (req as any).org;
  const query: GetPostsDto = req.query;
  const posts = await postsService.getPosts(org.id, query);
  res.json({ posts });
});

// GET /posts/find-slot
router.get('/find-slot', getOrgFromRequest, async (req: Request, res: Response) => {
  const org = (req as any).org;
  const date = await postsService.findFreeDateTime(org.id);
  res.json({ date });
});

// GET /posts/find-slot/:id
router.get('/find-slot/:id', getOrgFromRequest, async (req: Request, res: Response) => {
  const org = (req as any).org;
  const { id } = req.params;
  const date = await postsService.findFreeDateTime(org.id, id);
  res.json({ date });
});

// GET /posts/predict-trending
router.get('/predict-trending', async (_req: Request, res: Response) => {
  const result = await starsService.predictTrending();
  res.json(result);
});

// GET /posts/old
router.get('/old', getOrgFromRequest, async (req: Request, res: Response) => {
  const org = (req as any).org;
  const { date } = req.query;
  const result = await postsService.getOldPosts(org.id, date as string);
  res.json(result);
});

// GET /posts/:id
router.get('/:id', getOrgFromRequest, async (req: Request, res: Response) => {
  const org = (req as any).org;
  const { id } = req.params;
  const result = await postsService.getPost(org.id, id);
  res.json(result);
});

// POST /posts
router.post('/', getOrgFromRequest, async (req: Request, res: Response) => {
  const org = (req as any).org;
  const rawBody = req.body;
  const body = await postsService.mapTypeToPost(rawBody, org.id);
  const result = await postsService.createPost(org.id, body);
  res.json(result);
});

// POST /posts/generator/draft
router.post('/generator/draft', getOrgFromRequest, async (req: Request, res: Response) => {
  const org = (req as any).org;
  const body: CreateGeneratedPostsDto = req.body;
  const result = await postsService.generatePostsDraft(org.id, body);
  res.json(result);
});

// POST /posts/generator
router.post('/generator', getOrgFromRequest, async (req: Request, res: Response) => {
  const org = (req as any).org;
  const body: GeneratorDto = req.body;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  for await (const event of agentGraphService.start(org.id, body)) {
    res.write(JSON.stringify(event) + '\n');
  }
  res.end();
});

// DELETE /posts/:group
router.delete('/:group', getOrgFromRequest, async (req: Request, res: Response) => {
  const org = (req as any).org;
  const { group } = req.params;
  const result = await postsService.deletePost(org.id, group);
  res.json(result);
});

// PUT /posts/:id/date
router.put('/:id/date', getOrgFromRequest, async (req: Request, res: Response) => {
  const org = (req as any).org;
  const { id } = req.params;
  const { date } = req.body;
  const result = await postsService.changeDate(org.id, id, date);
  res.json(result);
});

// POST /posts/separate-posts
router.post('/separate-posts', getOrgFromRequest, async (req: Request, res: Response) => {
  const org = (req as any).org;
  const { content, len } = req.body;
  const result = await postsService.separatePosts(content, len);
  res.json(result);
});

export default router;
