import { Resend } from 'resend';
import { ApiError } from './helpers';
let client: Resend | null = null;
export const configured = () => !!process.env.RESEND_API_KEY;
/** Sends mail through Resend. Throws a clear 503 when email is not set up, so screens can say so plainly. */
export async function sendMail({ to, subject, text, attachments }: { to: string; subject: string; text: string; attachments?: { filename: string; content: Buffer }[] }) {
  if (!configured()) throw new ApiError(503, 'Email is not set up on this server yet. Add RESEND_API_KEY (and EMAIL_FROM) to the server settings, or download the PDF and send it yourself.');
  client ??= new Resend(process.env.RESEND_API_KEY);
  const { error } = await client.emails.send({ from: process.env.EMAIL_FROM || 'Nexus Ledger <onboarding@resend.dev>', to, subject, text, attachments });
  if (error) throw new ApiError(502, `The email could not be sent: ${error.message}`);
}
