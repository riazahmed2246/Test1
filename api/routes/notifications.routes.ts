import { Router, Request, Response } from 'express';
import { NotificationService } from '../services/notification.service'; // Adjust path as needed
import { getUserFromRequest } from '../middleware/user.from.request'; // Adjust path as needed
import { getOrgFromRequest } from '../middleware/org.from.request'; // Adjust path as needed

const router = Router();
const notificationsService = new NotificationService();

// GET /notifications
router.get('/', getUserFromRequest, getOrgFromRequest, async (req: Request, res: Response) => {
  const user = (req as any).user;
  const org = (req as any).org;
  const result = await notificationsService.getMainPageCount(org.id, user.id);
  res.json(result);
});

// GET /notifications/list
router.get('/list', getUserFromRequest, getOrgFromRequest, async (req: Request, res: Response) => {
  const user = (req as any).user;
  const org = (req as any).org;
  const result = await notificationsService.getNotifications(org.id, user.id);
  res.json(result);
});

export default router;
