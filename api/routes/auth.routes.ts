import { Router, Request, Response } from 'express';
import { AuthService } from '../services/auth.service'; // Adjust path as needed
import { EmailService } from '../services/email.service'; // Adjust path as needed
import { CreateOrgUserDto } from '../dtos/auth/create.org.user.dto'; // Adjust path as needed
import { LoginUserDto } from '../dtos/auth/login.user.dto'; // Adjust path as needed
import { ForgotPasswordDto } from '../dtos/auth/forgot.password.dto'; // Adjust path as needed
import { ForgotReturnPasswordDto } from '../dtos/auth/forgot-return.password.dto'; // Adjust path as needed
import { getCookieUrlFromDomain } from '../helpers/subdomain.management'; // Adjust path as needed
import { Provider } from '@prisma/client'; // Adjust path as needed

const router = Router();
const authService = new AuthService();
const emailService = new EmailService();

// GET /auth/can-register
router.get('/can-register', async (_req: Request, res: Response) => {
  try {
    const register = await authService.canRegister(Provider.LOCAL as string);
    res.json({ register });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /auth/register
router.post('/register', async (req: Request, res: Response) => {
  const body: CreateOrgUserDto = req.body;
  const ip = req.ip;
  const userAgent = req.headers['user-agent'] || '';
  try {
    const getOrgFromCookie = authService.getOrgFromCookie(req.cookies?.org);
    const { jwt, addedOrg } = await authService.routeAuth(
      body.provider,
      body,
      ip,
      userAgent,
      getOrgFromCookie
    );
    const activationRequired = body.provider === 'LOCAL' && emailService.hasProvider();
    if (activationRequired) {
      res.header('activate', 'true');
      return res.status(200).json({ activate: true });
    }
    res.cookie('auth', jwt, {
      domain: getCookieUrlFromDomain(process.env.FRONTEND_URL!),
      ...(!process.env.NOT_SECURED
        ? {
            secure: true,
            httpOnly: true,
            sameSite: 'none',
          }
        : {}),
      expires: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365),
    });
    if (process.env.NOT_SECURED) {
      res.header('auth', jwt);
    }
    if (typeof addedOrg !== 'boolean' && addedOrg?.organizationId) {
      res.cookie('showorg', addedOrg.organizationId, {
        domain: getCookieUrlFromDomain(process.env.FRONTEND_URL!),
        ...(!process.env.NOT_SECURED
          ? {
              secure: true,
              httpOnly: true,
              sameSite: 'none',
            }
          : {}),
        expires: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365),
      });
      if (process.env.NOT_SECURED) {
        res.header('showorg', addedOrg.organizationId);
      }
    }
    res.header('onboarding', 'true');
    res.status(200).json({ register: true });
  } catch (e: any) {
    res.status(400).send(e.message);
  }
});

// POST /auth/login
router.post('/login', async (req: Request, res: Response) => {
  const body: LoginUserDto = req.body;
  const ip = req.ip;
  const userAgent = req.headers['user-agent'] || '';
  try {
    const getOrgFromCookie = authService.getOrgFromCookie(req.cookies?.org);
    const { jwt, addedOrg } = await authService.routeAuth(
      body.provider,
      body,
      ip,
      userAgent,
      getOrgFromCookie
    );
    res.cookie('auth', jwt, {
      domain: getCookieUrlFromDomain(process.env.FRONTEND_URL!),
      ...(!process.env.NOT_SECURED
        ? {
            secure: true,
            httpOnly: true,
            sameSite: 'none',
          }
        : {}),
      expires: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365),
    });
    if (process.env.NOT_SECURED) {
      res.header('auth', jwt);
    }
    if (typeof addedOrg !== 'boolean' && addedOrg?.organizationId) {
      res.cookie('showorg', addedOrg.organizationId, {
        domain: getCookieUrlFromDomain(process.env.FRONTEND_URL!),
        ...(!process.env.NOT_SECURED
          ? {
              secure: true,
              httpOnly: true,
              sameSite: 'none',
            }
          : {}),
        expires: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365),
      });
      if (process.env.NOT_SECURED) {
        res.header('showorg', addedOrg.organizationId);
      }
    }
    res.header('reload', 'true');
    res.status(200).json({ login: true });
  } catch (e: any) {
    res.status(400).send(e.message);
  }
});

// POST /auth/forgot
router.post('/forgot', async (req: Request, res: Response) => {
  const body: ForgotPasswordDto = req.body;
  try {
    await authService.forgot(body.email);
    res.json({ forgot: true });
  } catch (e) {
    res.json({ forgot: false });
  }
});

// POST /auth/forgot-return
router.post('/forgot-return', async (req: Request, res: Response) => {
  const body: ForgotReturnPasswordDto = req.body;
  const reset = await authService.forgotReturn(body);
  res.json({ reset: !!reset });
});

// GET /auth/oauth/:provider
router.get('/oauth/:provider', async (req: Request, res: Response) => {
  const { provider } = req.params;
  const query = req.query;
  try {
    const result = await authService.oauthLink(provider, query);
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /auth/activate
router.post('/activate', async (req: Request, res: Response) => {
  const code: string = req.body.code;
  try {
    const activate = await authService.activate(code);
    if (!activate) {
      return res.status(200).json({ can: false });
    }
    res.cookie('auth', activate, {
      domain: getCookieUrlFromDomain(process.env.FRONTEND_URL!),
      ...(!process.env.NOT_SECURED
        ? {
            secure: true,
            httpOnly: true,
            sameSite: 'none',
          }
        : {}),
      expires: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365),
    });
    if (process.env.NOT_SECURED) {
      res.header('auth', activate);
    }
    res.header('onboarding', 'true');
    res.status(200).json({ can: true });
  } catch (e: any) {
    res.status(400).send(e.message);
  }
});

// POST /auth/oauth/:provider/exists
router.post('/oauth/:provider/exists', async (req: Request, res: Response) => {
  const code: string = req.body.code;
  const { provider } = req.params;
  try {
    const { jwt, token } = await authService.checkExists(provider, code);
    if (token) {
      return res.json({ token });
    }
    res.cookie('auth', jwt, {
      domain: getCookieUrlFromDomain(process.env.FRONTEND_URL!),
      ...(!process.env.NOT_SECURED
        ? {
            secure: true,
            httpOnly: true,
            sameSite: 'none',
          }
        : {}),
      expires: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365),
    });
    if (process.env.NOT_SECURED) {
      res.header('auth', jwt);
    }
    res.header('reload', 'true');
    res.status(200).json({ login: true });
  } catch (e: any) {
    res.status(400).send(e.message);
  }
});

export default router;
