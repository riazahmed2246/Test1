import { Router, Request, Response } from 'express';
import { SignatureService } from '../services/signature.service'; // Adjust path as needed
import { getOrgFromRequest } from '../middleware/org.from.request'; // Adjust path as needed
import { SignatureDto } from '../dtos/signature/signature.dto'; // Adjust path as needed

const router = Router();
const signatureService = new SignatureService();

// GET /signatures
router.get('/', getOrgFromRequest, async (req: Request, res: Response) => {
  const org = (req as any).org;
  const result = await signatureService.getSignaturesByOrgId(org.id);
  res.json(result);
});

// GET /signatures/default
router.get('/default', getOrgFromRequest, async (req: Request, res: Response) => {
  const org = (req as any).org;
  const result = await signatureService.getDefaultSignature(org.id);
  res.json(result || {});
});

// POST /signatures
router.post('/', getOrgFromRequest, async (req: Request, res: Response) => {
  const org = (req as any).org;
  const body: SignatureDto = req.body;
  const result = await signatureService.createOrUpdateSignature(org.id, body);
  res.json(result);
});

// DELETE /signatures/:id
router.delete('/:id', getOrgFromRequest, async (req: Request, res: Response) => {
  const org = (req as any).org;
  const { id } = req.params;
  const result = await signatureService.deleteSignature(org.id, id);
  res.json(result);
});

// PUT /signatures/:id
router.put('/:id', getOrgFromRequest, async (req: Request, res: Response) => {
  const org = (req as any).org;
  const { id } = req.params;
  const body: SignatureDto = req.body;
  const result = await signatureService.createOrUpdateSignature(org.id, body, id);
  res.json(result);
});

export default router;
