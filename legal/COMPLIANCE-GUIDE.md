# What Nexus Ledger is allowed to use: compliance guide

Researched 30 October 2026 for Nexus Ledger, South African accounting software (SaaS).
This is a plain-language summary, not legal advice. Laws and service terms change: check the linked sources before
relying on a point, and have a South African attorney review the Privacy Policy and Terms of Service before launch.

## At a glance

| Area | Status | What to do |
|---|---|---|
| Code libraries (329 packages) | ✅ Allowed | Nothing. All permit commercial use. Keep `package-lock.json` so licences stay as audited |
| Fonts, icons | ✅ Allowed | Nothing |
| Kokoro voice-overs | ✅ Allowed | Nothing |
| Music and sound effects | ✅ Yours | Generated from scratch |
| ElevenLabs voice clips (5-min promo) | ❌ Not for commercial use | Re-voice before using in ads, or pay for an ElevenLabs plan and regenerate |
| Remotion (video tool) | ✅ Allowed while 3 employees or fewer | Buy a company licence when you grow past 3 |
| Vercel free (Hobby) plan | ❌ Not for a paid product | Use Vercel Pro once you charge, or host elsewhere |
| Neon free database | ⚠️ Allowed, small limits | Check limits, set up backups before real customers |
| Paystack | ⚠️ Needs a registered business for full use | Register with CIPC; each client needs their own Paystack account for customer payments |
| WhatsApp reminders | ⚠️ Conditions | Customers must opt in; templates must be approved; keep reminders free of offers |
| Anthropic (receipt reading) | ✅ Allowed | Disclose in the Privacy Policy (done) |
| POPIA (data protection) | ⚠️ Required | Privacy Policy (done), operator terms (done, Schedule A of the Terms), register your Information Officer, breach plan |
| ECTA website information | ⚠️ Required | Business details page (done): fill in `src/legal/business.ts` |
| Consumer Protection Act | ✅ Covered | Month-to-month, cancel any time (in the Terms) |
| SARS: tax invoices | ✅ Covered | Invoices now say "Tax invoice" when the company has a VAT number |
| SARS: 5-year records | ✅ Covered | Export any time; 90 days to download after cancelling (in the Terms) |
| Competitor names in marketing | ⚠️ Conditions | Only accurate, current claims; no logos |
| Real brands in sample data | ⚠️ Low risk | Swap for made-up names to avoid any suggestion of endorsement |

---

## 1. Code inside the software

Nexus uses 329 open-source packages (counted from the production dependencies in `package.json`):

| Licence | Packages | Commercial use |
|---|---|---|
| MIT | 206 | ✅ Yes; keep the copyright notice in the code (it is, in `node_modules`) |
| Apache-2.0 | 38 | ✅ Yes; keep notices |
| ISC, BSD, 0BSD, MIT-0, Unlicense | 49 | ✅ Yes |
| `@fontsource-variable/manrope` (SIL Open Font Licence 1.1) | 1 | ✅ Yes; you may use the font in the app, videos and posters. You may not sell the font by itself |
| `jszip` (MIT or GPL-3.0) | 1 | ✅ Yes, under the MIT option |
| `pako` (MIT and Zlib) | 1 | ✅ Yes |
| `caniuse-lite` (CC-BY-4.0) | 1 | ✅ Yes; a build-time data file, attribution is in the package |
| `@img/sharp-libvips` (LGPL-3.0) | 2 | ✅ Yes; used unmodified as a separate library by Next.js for images. LGPL only adds duties if you change the library itself |
| `png-js` | 1 | ✅ MIT (licence file in the package) |
| `buffers` (no licence field) | 1 | ⚠️ Tiny old helper pulled in by `exceljs` → `unzipper`. By an author who publishes under MIT; very low risk, and it runs only on your server |

Because Nexus is offered as an online service, the code is not "distributed" to customers, which removes most licence
duties anyway. The Windows installer and Android app do distribute code; the permissive licences above allow that.

**Lucide icons** (ISC) and the **Next.js / React** stack (MIT) are fine for commercial use.

## 2. Marketing assets (videos, posters, demo)

- **Kokoro TTS voices** (all videos except parts of the 5-minute promo): released under Apache-2.0, usable commercially.
  Sources: [Together AI model page](https://together.ai/models/kokoro-82m), [Vast.ai model page](https://vast.ai/model/kokoro).
  The authoritative source is the hexgrad/Kokoro-82M model card on Hugging Face.
- **ElevenLabs** (5 clips in `samples/output/promo/`): the free plan does **not** include a commercial licence and needs
  attribution. Content made on a paid plan can be used commercially, and that right survives cancelling the plan.
  Sources: [ElevenLabs help: can I publish what I generate?](https://help.elevenlabs.io/hc/en-us/articles/13313564601361),
  [ElevenLabs docs](https://elevenlabs.io/docs/help-center/legal/can-i-publish-the-content-i-generate-on-the-platform).
  → **Re-voice those clips with Kokoro, or regenerate them on a paid plan, before running the promo as an advert.**
- **Remotion** (the video tool): free, even commercially, for individuals and for-profit organisations with **up to 3
  employees**; larger companies need a Company Licence. You may not resell Remotion itself. Source: `video/node_modules/remotion/LICENSE.md`
  and [remotion.pro/license](https://www.remotion.pro/license).
- **Music and sound effects**: generated from scratch by `video/tools/build.py`. They are yours.
- **Screenshots of Nexus**: your own product, fine.
- **Your logo**: make sure you own it (made it yourself, or bought it with full rights from the designer or AI tool's terms).
- **Competitor names (Xero, Sage)** in the investor pitch and the first promo: comparative advertising is allowed in
  South Africa only if it is accurate, current and not misleading, and must not use their logos or suggest a connection.
  Xero may have raised its prices on 1 November 2026: update or remove those figures before sharing.
- **Real brands in sample data** (Sasol, Telkom, Eskom, FNB, Meta): they appear only as suppliers on sample receipts and
  bank lines. Low risk, but made-up names remove any suggestion that those companies endorse you.
- **"Law of attraction" videos and posters**: they ask people to *imagine* results and every scene matches a real feature.
  Keep it that way: never promise guaranteed savings, income or tax results.

## 3. Services Nexus connects to

| Service | Free plan for a paid product? | Notes and sources |
|---|---|---|
| **Vercel** (hosting) | ❌ No | Hobby is for non-commercial personal use only; any commercial use needs Pro or Enterprise. [Fair use guidelines](https://vercel.com/docs/limits/fair-use-guidelines), [Hobby plan](https://vercel.com/docs/plans/hobby-plan) |
| **Neon** (database) | ⚠️ Probably, small | A permanent free tier for low-traffic apps (0.5 GB per project); no commercial-use ban was found, but confirm in Neon's terms. Free tiers keep little backup history. [Neon pricing](https://neon.com/pricing) |
| **Paystack** (payments) | ✅ Yes | A *Starter* business (individual) has a lifetime collections limit; a *Registered* business (CIPC) has none. Needs FICA documents. Each client must use their own Paystack account for their customers' payments: do not collect money for clients through yours. [Business types](https://support.paystack.com/hc/en-us/articles/360009972759-What-are-the-requirements-f-) |
| **Anthropic** (receipt reading) | ✅ Yes (paid API) | Under the Commercial Terms, Anthropic may not train models on your content; inputs are kept for a short period. [Commercial terms](https://www.anthropic.com/legal/commercial-terms) |
| **Meta WhatsApp** (reminders) | ✅ Yes (paid per message) | Customers must opt in before you message them; templates must be approved; payment reminders are "utility" templates, but adding any offer turns them into marketing. [Template categories](https://developers.facebook.com/documentation/business-messaging/whatsapp/templates/template-categorization) |
| **Resend** (email) | ✅ Free tier allows sending | Verify your sending domain. |
| **GitHub Pages** (browser demo) | ✅ For a public repo | Private repos need a paid plan for Pages. |

## 4. South African law

### POPIA: Protection of Personal Information Act, 2013

- **Two roles.** For people who sign up, Nexus is the *responsible party*. For the customers, suppliers and staff that
  your clients put into their books, Nexus is the client's *operator* (sections 20–21).
- **Operator contract.** Section 21 requires a **written contract** between the responsible party (your client) and the
  operator (you) covering security safeguards. The Information Regulator treated a missing contract as a violation in its
  [Dis-Chem enforcement notice](https://inforegulator.org.za/wp-content/uploads/2020/07/DIS-CHEM-ENFORCEMENT-NOTICE.pdf).
  → Done as **Schedule A of the Terms of Service**. Background: [Fasken](https://fasken.com/en/knowledge/2023/09/beware-of-the-operator-contract-a-necessity-for-popia-compliance), [Michalsons](https://www.michalsons.com/focus-areas/privacy-and-data-protection/does-someone-else-process-your-personal-information).
- **Operator must report breaches to the client immediately** (s21(2)). → In Schedule A.
- **Offshore hosting is allowed** under section 72 if the recipient is bound by law or contract giving similar protection
  (or the person consents). → Disclosed in the Privacy Policy. [Michalsons on cross-border transfers](https://www.michalsons.com/focus-areas/privacy-and-data-protection/transfers-of-personal-information-outside-south-africa), [CMS](https://cms.law/en/zaf/legal-updates/Managing-cross-border-data-transfers).
- **Information Officer.** Register yours (usually the owner) on the Information Regulator's
  [eServices Portal](https://eservices.inforegulator.org.za/about/default.aspx). Failing to register was treated as a breach
  in a May 2026 [enforcement notice](https://inforegulator.org.za/wp-content/uploads/2026/05/CJC-ENFORCEMENT-NOTICE-220526-redact_Redacted.pdf).
- **Data breaches** must be reported to the Regulator and the people affected (s22), now through the eServices Portal.
  [Regulator fact sheet](https://inforegulator.org.za/wp-content/uploads/2025/08/Fact-Sheet-on-security-compromises-2.pdf).
- **Direct marketing** by email needs consent or an existing customer relationship, with an opt-out in every message (s69).
- **PAIA manual.** Private bodies must have a Promotion of Access to Information Act manual; the Information Regulator has
  exempted many small businesses. Check whether the exemption covers you.

### ECTA: Electronic Communications and Transactions Act, 2002

- **Section 43** requires a website that sells online to show: full name and legal status, physical address, contact
  details, registration number, office bearers, a description of the service, full price including taxes, payment
  terms, cancellation and return policy, security procedures and privacy policy. If you don't, a consumer may cancel
  within 14 days. [Section 43 text](https://www.acts.co.za/electronic-communications-and-transactions-act-2002/43__information_to_be_provided),
  [Michalsons: info that must be on your website](https://www.michalsons.com/blog/info-that-must-be-on-your-website/366).
  → Done as the **Business details page** (`/legal`). Fill in `src/legal/business.ts`.
- **Section 44** gives consumers (individuals) a 7-day cooling-off right for online purchases. → In the Terms.

### Consumer Protection Act, 2008

- **Section 14** (fixed-term agreements, 20 business days' notice to cancel, 24-month maximum) applies to individual
  consumers, not to transactions between companies. Nexus is month-to-month and can be cancelled any time, which
  satisfies it. [Acts Online s14](https://www.acts.co.za/consumer-protection/14_expiry_and_renewal_of_fixed_term_agreements).
- Liability limits cannot exclude rights the CPA gives consumers. → The Terms say so.

### SARS

- **Tax invoices (VAT Act s20).** Over R5,000: a full tax invoice with the words "Tax Invoice", "VAT Invoice" or "Invoice",
  supplier and buyer details and VAT numbers, a unique number, date, description and VAT amount. R5,000 or less: an
  abridged tax invoice may leave out the buyer's details. Issue within 21 days of the supply.
  [SARS tax invoices](https://www.sars.gov.za/businesses-and-employers/tax-invoices/), [Tax Faculty](https://taxfaculty.ac.za/news/read/vat-invoice-requirements).
  → Nexus invoice PDFs show the supplier's and customer's VAT numbers when set, and are now titled **"Tax invoice"**
  when the company has a VAT number.
- **Record keeping (Tax Administration Act s29–30).** Records must be kept for 5 years from the date the return was
  submitted, longer during an audit; electronic records must stay accessible.
  [SARS record keeping](https://www.sars.gov.za/businesses-and-employers/record-keeping/), [Acts Online s29](https://www.acts.co.za/tax/29__duty_to_keep_records).
  → The Terms tell clients this is their duty, and Nexus lets them export everything at any time.
- **Nexus is not a tax practitioner.** It prepares VAT201 figures; the client reviews and files. Never market it as
  "SARS approved" or as giving tax advice. → The Terms say so; the app's VAT201 page already says "review before filing".

### Your own business

- Register with **CIPC** (needed for a Paystack Registered Business and to look trustworthy).
- Register with **SARS** for income tax; register for **VAT** once taxable turnover exceeds R1 million in 12 months.
- Fill in `src/legal/business.ts`, then have an attorney review the three legal pages.

---

## 5. Launch checklist

- [ ] Fill in `src/legal/business.ts` (registered name, status, registration number, address, email, Information Officer).
- [ ] Register your Information Officer on the Information Regulator's eServices Portal.
- [ ] Have a South African attorney review `/privacy`, `/terms` and `/legal`.
- [ ] Move hosting to a plan that allows commercial use (e.g. Vercel Pro) before charging.
- [ ] Set up database backups.
- [ ] Re-voice or license the ElevenLabs clips in the 5-minute promo.
- [ ] Update or remove Xero prices in the pitch video.
- [ ] Optional: replace real brand names in sample data with made-up ones.
- [ ] Before turning on WhatsApp reminders for a client: confirm their customers opted in.
- [ ] Write a short breach-response plan: who checks, who notifies the Regulator and clients, within what time.
