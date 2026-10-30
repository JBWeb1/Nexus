// The words of the Privacy Policy, Terms of Service and Business details pages, in a small markdown:
// "## " heading, "### " subheading, "- " bullet, blank line between paragraphs, **bold**, [text](url).
// Have a South African attorney review these before launch. Business details come from ./business.ts.
import { BUSINESS as B } from './business';

const v = (value: string, label: string) => value || `[${label}]`;
export const missingDetails = () => (['legalName', 'legalStatus', 'physicalAddress', 'email', 'informationOfficer'] as const).filter((k) => !B[k]);
export const prices = () => ({ single: Number(process.env.PLAN_PRICE_ZAR || 250), multi: Number(process.env.PLAN_PRICE_MULTI_ZAR || 470) });
const vatLine = () => (B.vatNumber ? `Prices include VAT at 15% (VAT number ${B.vatNumber}).` : 'We are not registered for VAT, so no VAT is added to our prices.');
const who = () => `${B.tradingName}, operated by ${v(B.legalName, 'registered business name')}`;

export function privacyPolicy() {
  return `Effective ${B.effectiveDate}

This policy explains how ${who()} ("we", "us") handles personal information when you use the Nexus Ledger accounting software and website ("the Service"). We follow the Protection of Personal Information Act, 2013 (POPIA).

## 1. Two roles we play

**For your account, we are the responsible party.** We decide how we use the details of the people who sign up and use the Service (for example your name, email and billing information).

**For the books you keep in Nexus, you are the responsible party and we are your operator.** When you add your customers, suppliers and staff (names, contact details, invoices, bank lines), we process that information only on your instructions, to provide the Service. Our duties as your operator are set out in Schedule A of the [Terms of Service](/terms).

## 2. What we collect

- **Account details:** your name, email address, business name and the role you give team members.
- **Sign-in and security information:** your password, stored only as a one-way hash we cannot read; two-step sign-in settings; sign-in attempts; the date, time and IP address of activity, kept in an activity log.
- **Business and billing details:** company details you enter (such as registration and VAT numbers, address) and your subscription status. Card payments are handled by Paystack: we never see or store your card number.
- **What you put in your books:** invoices, quotes, bills, contacts, bank statement lines, stock, projects, receipts and files you upload.
- **Messages:** emails and support requests you send us.

We use only the cookies needed to keep you signed in. We do not use advertising or tracking cookies.

## 3. Why we use it

- To provide the Service: run your account, keep your books, send the invoices, statements and reminders you ask us to send, and show your reports.
- To keep the Service and your information secure, and to detect and prevent fraud and misuse.
- To bill you and keep the financial records the law requires of us.
- To answer you, and to tell you about changes to the Service, our prices or these terms.
- To send you news or offers about Nexus, **only if you agree**. Every such email has an unsubscribe link (POPIA section 69).

We rely on these grounds in POPIA section 11: performing our contract with you, complying with the law, our legitimate interest in running a secure service, and your consent where we ask for it.

## 4. Who we share it with

We do not sell personal information. We share it only with service providers that help us run Nexus, under contracts that require them to protect it:

- **Hosting and database:** Vercel (application hosting) and Neon (database).
- **Email:** Resend, to deliver invoices, statements, reminders and account emails.
- **Payments:** Paystack, to take subscription payments and, if you set it up, your customers' payments.
- **WhatsApp:** Meta, only if you turn on WhatsApp reminders.
- **Receipt reading:** Anthropic, only when you use "Snap a receipt". The image is sent to read the supplier, date, total and VAT. Under Anthropic's commercial terms it is not used to train their models.
- **File storage:** Cloudflare or Amazon Web Services, for the files you attach.
- **Your team and accountant:** people you invite see the companies you give them access to.
- **The authorities:** when the law requires it, for example a valid request from SARS or a court order.

## 5. Information stored outside South Africa

Our providers store and process information ${B.hostingLocation}. We transfer it only to providers bound by contracts and laws that protect it at least as well as POPIA does, as section 72 allows.

## 6. How we protect it

- Passwords are hashed with bcrypt, and you can turn on two-step sign-in.
- Each company's data is kept apart inside the database itself (row-level security), so one company can never read another's.
- All traffic is encrypted (HTTPS).
- Posted accounting entries cannot be quietly changed, and an activity log records who did what and when.
- Access by our own staff is limited to what is needed to support you.

If personal information is compromised, we will tell the Information Regulator and the people affected as POPIA section 22 requires. If it is information in your books, we tell you without delay so you can meet your own duty to notify.

## 7. How long we keep it

- **While you use Nexus**, we keep your account and books.
- **After you cancel**, you can download all your data for 90 days. After that we delete it from the live system; backups are overwritten within a further 30 days.
- We keep our own billing records for as long as tax law requires us to (5 years under the Tax Administration Act).
- **Your own records:** SARS expects you to keep your records for 5 years. Download your data before you leave; we do not keep it for you after the periods above.

## 8. Your rights

Under POPIA you may ask us to tell you what personal information we hold about you, to correct or delete it, or to stop using it for direct marketing. You may also object to some kinds of processing. Write to our Information Officer (below); we answer within 30 days. Most of your details you can see and change yourself in Settings.

If information in a business's books in Nexus is about you, please contact that business first: they decide how it is used, and we help them respond.

If you are unhappy with how we handled your request, you may complain to the **Information Regulator** (South Africa): [inforegulator.org.za](https://inforegulator.org.za).

## 9. Children

Nexus is for businesses. It is not meant for anyone under 18, and we do not knowingly collect children's information.

## 10. Changes to this policy

If we make an important change, we will tell you by email or in the app at least 30 days before it takes effect.

## 11. Contact us

- **Information Officer:** ${v(B.informationOfficer, 'Information Officer name')}
- **Email:** ${v(B.informationOfficerEmail || B.email, 'privacy email address')}
- **Address:** ${v(B.physicalAddress, 'physical address')}

Our full business details are on the [Business details](/legal) page.`;
}

export function termsOfService() {
  const p = prices();
  return `Effective ${B.effectiveDate}

These terms are an agreement between you and ${who()} ("we", "us") for the use of the Nexus Ledger accounting software and website ("the Service"). By creating an account or using the Service you accept them. If you accept on behalf of a business, you confirm you may bind it.

## 1. Who may use Nexus

You must be 18 or older and use Nexus for a business, a profession or your own household finances. You are responsible for everyone you invite to your companies and for keeping your password and two-step sign-in safe.

## 2. Free trial

Each new company gets **14 days free**, with every feature and no card needed. When the trial ends, the company becomes read-only until you subscribe. Nothing is charged unless you choose a plan.

## 3. Plans, prices and payment

- **One company:** R${p.single} a month. **Multiple companies:** R${p.multi} a month covers every company you own.
- ${vatLine()}
- Payment is monthly in advance by card through Paystack. Your subscription renews each month until you cancel.
- We will tell you at least 30 days before any price change. If you do not agree, you may cancel before it takes effect.
- If a payment fails, we will let you know and retry. If it is still unpaid after the grace period shown in the app, the company becomes read-only until payment is made. Your data is not deleted because of a missed payment.

## 4. Cancelling

You can cancel at any time in Settings > Billing. You keep access until the end of the month you have paid for, and we do not charge you again. We do not refund part-months, except where the law requires it.

If you are a consumer under the Electronic Communications and Transactions Act (an individual, not a business), you may cancel within 7 days of your first payment for a full refund (section 44).

## 5. Your data

**Your books belong to you.** You give us permission to store and process them only to provide the Service. You can download all your company data at any time, in a format you can open elsewhere. After you cancel, your data stays available to download for 90 days, then is deleted as described in the [Privacy Policy](/privacy).

When you add personal information about other people (your customers, suppliers or staff), you are the responsible party under POPIA. You must have a lawful reason to keep it and to contact them. For example, only turn on WhatsApp reminders for customers who agreed to receive WhatsApp messages from you. Our duties as your operator are in Schedule A below.

## 6. What Nexus does, and what it does not do

Nexus helps you keep your books, prepares figures such as your VAT201 and reports, and runs checks that flag possible mistakes. **It does not give tax, accounting or legal advice, and it does not file returns with SARS for you.** You remain responsible for the accuracy of what you enter, for reviewing figures before you file, and for your own tax compliance and record keeping. Where something matters, ask a registered accountant or tax practitioner.

Receipt reading uses artificial intelligence and can misread a slip. Always check the figures before you save a bill.

## 7. Fair use

You may not use Nexus to break the law, to send spam, to hold information you are not allowed to hold, to try to reach another company's data, to disrupt or overload the Service, or to copy or resell it. We may suspend an account that does, after warning you where it is reasonable to do so.

## 8. Other services

Some features rely on other providers (Paystack for payments, Meta for WhatsApp, Anthropic for receipt reading, email delivery services). Their own terms apply to them, and we are not responsible for their outages. To take card payments from your own customers you need your own Paystack account.

## 9. Availability and changes

We work to keep Nexus available and to back it up, but we cannot promise it will never be interrupted. We improve the Service over time and may change or retire features; we will tell you in advance of any change that takes away something important you rely on.

## 10. Our software

Nexus, its design and code belong to us and our licensors. These terms give you the right to use the Service, not to copy or own it. If you send us ideas or feedback, we may use them without owing you anything.

## 11. Liability

To the extent the law allows, the Service is provided as it is, and we are not liable for indirect or consequential losses, such as lost profits, penalties or interest from late or wrong tax returns, or loss caused by figures you did not check. Our total liability for any claim is limited to the fees you paid us in the 12 months before the claim. Nothing in these terms limits a right you have under the Consumer Protection Act or another law that cannot be excluded, or our liability for gross negligence or fraud.

## 12. Ending the agreement

You may stop using Nexus and cancel at any time. We may end these terms or suspend your account if you seriously breach them and do not fix the breach within 14 days of our notice, or immediately where the law requires it. Section 5 (your data) still applies after the agreement ends.

## 13. Changes to these terms

We will tell you at least 30 days before an important change takes effect. If you keep using Nexus after that, the new terms apply; if you do not agree, you may cancel before then.

## 14. Law and disputes

South African law governs these terms. Please contact us first so we can try to resolve a problem together. If we cannot, either of us may approach the South African courts with jurisdiction.

## 15. Contact

${v(B.legalName, 'registered business name')} · ${v(B.email, 'email address')} · ${v(B.physicalAddress, 'physical address')}. Our full business details are on the [Business details](/legal) page.

## Schedule A: How we process the information in your books (POPIA operator terms)

These terms are the written contract that POPIA section 21 requires between you (the responsible party) and us (your operator).

- **Your instructions only.** We process the personal information in your books only to provide the Service and as you instruct through it, never for our own purposes (section 20).
- **Confidentiality.** Our staff and providers who can access it are bound to keep it confidential.
- **Security.** We keep the safeguards described in the Privacy Policy and review them as risks change (section 19).
- **Our providers.** We use the sub-operators listed in the Privacy Policy, under written contracts with protections at least as strong as these. We will tell you before we add or replace one, so you can object or cancel.
- **Outside South Africa.** Information may be stored ${B.hostingLocation}, only with providers bound by contracts or laws giving protection comparable to POPIA (section 72).
- **Breaches.** If we have reasonable grounds to believe someone has accessed or acquired the information without authority, we tell you immediately so you can notify the Information Regulator and the people affected (section 21(2)).
- **Helping you.** We help you respond to requests from people about their information and to enquiries from the Information Regulator, mostly through the export and editing features in Nexus.
- **At the end.** When the agreement ends, you can download the information for 90 days; after that we delete it, unless the law requires us to keep it.`;
}

export function businessDetails() {
  const p = prices();
  return `The Electronic Communications and Transactions Act, 2002 (section 43) requires us to publish these details.

## Who we are

- **Trading name:** ${B.tradingName}
- **Registered name:** ${v(B.legalName, 'registered business name')}
- **Legal status:** ${v(B.legalStatus, 'e.g. private company or sole proprietor')}
- **Registration number:** ${v(B.registrationNumber, 'CIPC registration number')}
- **Directors / owner:** ${v(B.directors, 'names of directors or owner')}
- **VAT number:** ${B.vatNumber || 'Not registered for VAT'}
- **Physical address (for service of legal documents):** ${v(B.physicalAddress, 'physical address')}
- **Postal address:** ${v(B.postalAddress || B.physicalAddress, 'postal address')}
- **Email:** ${v(B.email, 'email address')}
- **Phone:** ${v(B.phone, 'phone number')}
- **Website:** ${v(B.website, 'website address')}
- **Information Officer (POPIA):** ${v(B.informationOfficer, 'Information Officer name')}

We do not belong to a self-regulatory or accreditation body, and we have not signed a code of conduct.

## What we offer

Nexus Ledger is online accounting software for South African businesses: invoices and quotes, bills and receipts, bank matching, stock, projects, VAT201 figures, reports and customer pay links.

- **Price:** R${p.single} a month for one company, or R${p.multi} a month for all the companies you own. ${vatLine()}
- **Free trial:** 14 days, every feature, no card needed.
- **Payment:** monthly in advance by card through Paystack. We do not see or store card numbers.
- **Delivery:** the Service is available online straight away after you create an account.
- **Cancelling:** at any time in Settings > Billing. See sections 3 and 4 of the [Terms of Service](/terms) for renewal, cancellation and refunds, including the 7-day cooling-off right for consumers.

## Security and privacy

Payments are processed by Paystack over encrypted connections. Our [Privacy Policy](/privacy) explains how we protect personal and payment information. The security features of the Service are described on the Trust & security page inside the app.

## Complaints and disputes

Email us first at ${v(B.email, 'email address')}; we aim to reply within 5 business days. Unresolved disputes are governed by South African law (see section 14 of the [Terms of Service](/terms)).`;
}
