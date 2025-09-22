import { Router, Request, Response } from 'express';
import { MessagesService } from '../services/messages.service'; // Adjust path as needed
import { getUserFromRequest } from '../middleware/user.from.request'; // Adjust path as needed
import { getOrgFromRequest } from '../middleware/org.from.request'; // Adjust path as needed
import { AddMessageDto } from '../dtos/messages/add.message'; // Adjust path as needed

const router = Router();
const messagesService = new MessagesService();

// GET /messages
router.get('/', getUserFromRequest, getOrgFromRequest, async (req: Request, res: Response) => {
  const user = (req as any).user;
  const org = (req as any).org;
  const result = await messagesService.getMessagesGroup(user.id, org.id);
  res.json(result);
});

// GET /messages/:groupId/:page
router.get('/:groupId/:page', getUserFromRequest, getOrgFromRequest, async (req: Request, res: Response) => {
  const user = (req as any).user;
  const org = (req as any).org;
  const { groupId, page } = req.params;
  const result = await messagesService.getMessages(user.id, org.id, groupId, +page);
  res.json(result);
});

// POST /messages/:groupId
router.post('/:groupId', getUserFromRequest, getOrgFromRequest, async (req: Request, res: Response) => {
  const user = (req as any).user;
  const org = (req as any).org;
  const { groupId } = req.params;
  const message: AddMessageDto = req.body;
  const result = await messagesService.createMessage(user.id, org.id, groupId, message);
  res.json(result);
});

export default router;
