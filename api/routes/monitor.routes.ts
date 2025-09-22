import { Router, Request, Response } from 'express';
import { BullMqClient } from '../services/bullmq.client'; // Adjust path as needed

const router = Router();
const workerServiceProducer = new BullMqClient();

// GET /monitor/queue/:name
router.get('/queue/:name', async (req: Request, res: Response) => {
  const { name } = req.params;
  const { valid } = await workerServiceProducer.checkForStuckWaitingJobs(name);
  if (valid) {
    return res.json({
      status: 'success',
      message: `Queue ${name} is healthy.`,
    });
  }
  res.status(503).json({
    status: 'error',
    message: `Queue ${name} has stuck waiting jobs.`,
  });
});

export default router;
