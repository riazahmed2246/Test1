import { Router, Request, Response } from 'express';
import { ItemUserService } from '../services/item.user.service'; // Adjust path as needed
import { StripeService } from '../services/stripe.service'; // Adjust path as needed
import { UsersService } from '../services/users.service'; // Adjust path as needed
import { MessagesService } from '../services/messages.service'; // Adjust path as needed
import { PostsService } from '../services/posts.service'; // Adjust path as needed
import { getOrgFromRequest } from '../middleware/org.from.request'; // Adjust path as needed
import { getUserFromRequest } from '../middleware/user.from.request'; // Adjust path as needed
import { ItemsDto } from '../dtos/marketplace/items.dto'; // Adjust path as needed
import { AddRemoveItemDto } from '../dtos/marketplace/add.remove.item.dto'; // Adjust path as needed
import { ChangeActiveDto } from '../dtos/marketplace/change.active.dto'; // Adjust path as needed
import { AudienceDto } from '../dtos/marketplace/audience.dto'; // Adjust path as needed
import { NewConversationDto } from '../dtos/marketplace/new.conversation.dto'; // Adjust path as needed
import { CreateOfferDto } from '../dtos/marketplace/create.offer.dto'; // Adjust path as needed

const router = Router();
const itemUserService = new ItemUserService();
const stripeService = new StripeService();
const userService = new UsersService();
const messagesService = new MessagesService();
const postsService = new PostsService();

// POST /marketplace
router.post('/', getOrgFromRequest, getUserFromRequest, async (req: Request, res: Response) => {
  const org = (req as any).org;
  const user = (req as any).user;
  const body: ItemsDto = req.body;
  const result = await userService.getMarketplacePeople(org.id, user.id, body);
  res.json(result);
});

// POST /marketplace/conversation
router.post('/conversation', getUserFromRequest, getOrgFromRequest, async (req: Request, res: Response) => {
  const user = (req as any).user;
  const org = (req as any).org;
  const body: NewConversationDto = req.body;
  const result = await messagesService.createConversation(user.id, org.id, body);
  res.json(result);
});

// GET /marketplace/bank
router.get('/bank', getUserFromRequest, async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { country } = req.query;
  const result = await stripeService.createAccountProcess(user.id, user.email, country as string);
  res.json(result);
});

// POST /marketplace/item
router.post('/item', getUserFromRequest, async (req: Request, res: Response) => {
  const user = (req as any).user;
  const body: AddRemoveItemDto = req.body;
  const result = await itemUserService.addOrRemoveItem(body.state, user.id, body.key);
  res.json(result);
});

// POST /marketplace/active
router.post('/active', getUserFromRequest, async (req: Request, res: Response) => {
  const user = (req as any).user;
  const body: ChangeActiveDto = req.body;
  await userService.changeMarketplaceActive(user.id, body.active);
  res.json({ success: true });
});

// POST /marketplace/audience
router.post('/audience', getUserFromRequest, async (req: Request, res: Response) => {
  const user = (req as any).user;
  const body: AudienceDto = req.body;
  await userService.changeAudienceSize(user.id, body.audience);
  res.json({ success: true });
});

// GET /marketplace/item
router.get('/item', getUserFromRequest, async (req: Request, res: Response) => {
  const user = (req as any).user;
  const result = await itemUserService.getItems(user.id);
  res.json(result);
});

// GET /marketplace/orders
router.get('/orders', getUserFromRequest, getOrgFromRequest, async (req: Request, res: Response) => {
  const user = (req as any).user;
  const org = (req as any).org;
  const type = req.query.type as 'seller' | 'buyer';
  const result = await messagesService.getOrders(user.id, org.id, type);
  res.json(result);
});

// GET /marketplace/account
router.get('/account', getUserFromRequest, async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { account, marketplace, connectedAccount, name, picture, audience } = await userService.getUserByEmail(user.email);
  res.json({ account, marketplace, connectedAccount, fullname: name, audience, picture });
});

// POST /marketplace/offer
router.post('/offer', getUserFromRequest, async (req: Request, res: Response) => {
  const user = (req as any).user;
  const body: CreateOfferDto = req.body;
  const result = await messagesService.createOffer(user.id, body);
  res.json(result);
});

// GET /marketplace/posts/:id
router.get('/posts/:id', getUserFromRequest, getOrgFromRequest, async (req: Request, res: Response) => {
  const user = (req as any).user;
  const org = (req as any).org;
  const { id } = req.params;
  const getPost = await messagesService.getPost(user.id, org.id, id);
  if (!getPost) return res.json({});
  const postDetails = await postsService.getPost(getPost.organizationId, id);
  res.json({ ...postDetails, providerId: getPost.integration.providerIdentifier });
});

// POST /marketplace/posts/:id/revision
router.post('/posts/:id/revision', getUserFromRequest, getOrgFromRequest, async (req: Request, res: Response) => {
  const user = (req as any).user;
  const org = (req as any).org;
  const { id } = req.params;
  const { message } = req.body;
  const result = await messagesService.requestRevision(user.id, org.id, id, message);
  res.json(result);
});

// POST /marketplace/posts/:id/approve
router.post('/posts/:id/approve', getUserFromRequest, getOrgFromRequest, async (req: Request, res: Response) => {
  const user = (req as any).user;
  const org = (req as any).org;
  const { id } = req.params;
  const { message } = req.body;
  const result = await messagesService.requestApproved(user.id, org.id, id, message);
  res.json(result);
});

// POST /marketplace/posts/:id/cancel
router.post('/posts/:id/cancel', getOrgFromRequest, async (req: Request, res: Response) => {
  const org = (req as any).org;
  const { id } = req.params;
  const result = await messagesService.requestCancel(org.id, id);
  res.json(result);
});

// POST /marketplace/offer/:id/complete
router.post('/offer/:id/complete', getOrgFromRequest, async (req: Request, res: Response) => {
  const org = (req as any).org;
  const { id } = req.params;
  const order = await messagesService.completeOrderAndPay(org.id, id);
  if (!order) return res.json({});
  try {
    await stripeService.payout(id, order.charge, order.account, order.price);
  } catch (e) {
    await messagesService.payoutProblem(id, order.sellerId, order.price);
  }
  await messagesService.completeOrder(id);
  res.json({ success: true });
});

// POST /marketplace/orders/:id/payment
router.post('/orders/:id/payment', getUserFromRequest, getOrgFromRequest, async (req: Request, res: Response) => {
  const user = (req as any).user;
  const org = (req as any).org;
  const { id } = req.params;
  const orderDetails = await messagesService.getOrderDetails(user.id, org.id, id);
  const payment = await stripeService.payAccountStepOne(
    user.id,
    org,
    orderDetails.seller,
    orderDetails.order.id,
    orderDetails.order.ordersItems.map((p: any) => ({
      quantity: p.quantity,
      integrationType: p.integration.providerIdentifier,
      price: p.price,
    })),
    orderDetails.order.messageGroupId
  );
  res.json(payment);
});

export default router;
