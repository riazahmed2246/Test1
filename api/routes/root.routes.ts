import { Router, Request, Response } from 'express';

const router = Router();

// GET /
router.get('/', (_req: Request, res: Response) => {
  res.send('App is running!');
});

export default router;
