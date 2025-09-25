import { Resend } from 'resend';
import { EmailInterface } from './email.interface';

// The `Resend` client is a plain Node.js object and does not require conversion.
// We can define it at the top-level of the file.
const resend = new Resend(process.env.RESEND_API_KEY || 're_132');

export class ResendProvider implements EmailInterface {
  name = 'resend';
  validateEnvKeys = ['RESEND_API_KEY'];
  async sendEmail(
    to: string,
    subject: string,
    html: string,
    emailFromName: string,
    emailFromAddress: string,
    replyTo?: string
  ) {
    try {
      const sends = await resend.emails.send({
        from: `${emailFromName} <${emailFromAddress}>`,
        to,
        subject,
        html,
        ...(replyTo && { reply_to: replyTo }),
      });

      return sends;
    } catch (err) {
      console.log(err);
    }

    return { sent: false };
  }
}