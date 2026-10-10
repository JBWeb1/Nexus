# Changelog

Each version's section becomes its release notes, which owners see under Settings > Updates.

## [2.1.0] - 2026-10-10

### New
- Updates: the app shows its version and tells owners when a newer one is out, with these notes. Every build brings the
  database up to date before the new version goes live, and `npm run update` updates a self-hosted server with a backup,
  a health check and automatic rollback.
- Import expenses and refunds from expense books and bank exports: refunds are recognised, VAT is claimed on imported
  expenses, accounts are suggested from a Category column, saved rules or past imports, and duplicates are skipped.
- Bring over opening debtors and creditors when moving from another system.
- Bank accounts take an "as at" date for their opening balance.
- Converting a quote asks for the invoice date.

### Fixed
- Reports no longer crash when switching to the balance sheet.
- A finalized VAT201 period keeps showing its VAT figures.
- Opening balances are dated correctly, so reports before the account was added are no longer short.

### Security
- Accounts lock for 15 minutes after 10 failed sign-in or two-factor attempts.
- A password reset signs out every earlier session.
- Rate limiting can no longer be dodged with a fake X-Forwarded-For header.
- Missing secrets in production stop the app instead of falling back to a public value.

## [2.0.0]
- First version on GitHub.
