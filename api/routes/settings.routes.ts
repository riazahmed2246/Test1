import { Router, Request, Response } from 'express';
import { StarsService } from '../services/stars.service'; // Adjust path as needed
import { OrganizationService } from '../services/organization.service'; // Adjust path as needed
import { getOrgFromRequest } from '../middleware/org.from.request'; // Adjust path as needed
import { AddTeamMemberDto } from '../dtos/settings/add.team.member.dto'; // Adjust path as needed

const router = Router();
const starsService = new StarsService();
const organizationService = new OrganizationService();

// GET /settings/github
router.get('/github', getOrgFromRequest, async (req: Request, res: Response) => {
  const org = (req as any).org;
  const github = (await starsService.getGitHubRepositoriesByOrgId(org.id)).map((repo: any) => ({ id: repo.id, login: repo.login }));
  res.json({ github });
});

// POST /settings/github
router.post('/github', getOrgFromRequest, async (req: Request, res: Response) => {
  const org = (req as any).org;
  const { code } = req.body;
  if (!code) return res.status(400).json({ error: 'No code provided' });
  await starsService.addGitHub(org.id, code);
  res.json({ success: true });
});

// GET /settings/github/url
router.get('/github/url', (_req: Request, res: Response) => {
  const url = `https://github.com/login/oauth/authorize?client_id=${process.env.GITHUB_CLIENT_ID}&scope=${encodeURIComponent('user:email')}&redirect_uri=${encodeURIComponent(`${process.env.FRONTEND_URL}/settings`)}`;
  res.json({ url });
});

// GET /settings/organizations/:id
router.get('/organizations/:id', getOrgFromRequest, async (req: Request, res: Response) => {
  const org = (req as any).org;
  const { id } = req.params;
  const organizations = await starsService.getOrganizations(org.id, id);
  res.json({ organizations });
});

// GET /settings/organizations/:id/:github
router.get('/organizations/:id/:github', getOrgFromRequest, async (req: Request, res: Response) => {
  const org = (req as any).org;
  const { id, github } = req.params;
  const repositories = await starsService.getRepositoriesOfOrganization(org.id, id, github);
  res.json({ repositories });
});

// POST /settings/organizations/:id
router.post('/organizations/:id', getOrgFromRequest, async (req: Request, res: Response) => {
  const org = (req as any).org;
  const { id } = req.params;
  const { login } = req.body;
  const result = await starsService.updateGitHubLogin(org.id, id, login);
  res.json(result);
});

// DELETE /settings/repository/:id
router.delete('/repository/:id', getOrgFromRequest, async (req: Request, res: Response) => {
  const org = (req as any).org;
  const { id } = req.params;
  const result = await starsService.deleteRepository(org.id, id);
  res.json(result);
});

// GET /settings/team
router.get('/team', getOrgFromRequest, async (req: Request, res: Response) => {
  const org = (req as any).org;
  const team = await organizationService.getTeam(org.id);
  res.json(team);
});

// POST /settings/team
router.post('/team', getOrgFromRequest, async (req: Request, res: Response) => {
  const org = (req as any).org;
  const body: AddTeamMemberDto = req.body;
  const result = await organizationService.inviteTeamMember(org.id, body);
  res.json(result);
});

// DELETE /settings/team/:id
router.delete('/team/:id', getOrgFromRequest, async (req: Request, res: Response) => {
  const org = (req as any).org;
  const { id } = req.params;
  const result = await organizationService.deleteTeamMember(org, id);
  res.json(result);
});

export default router;
