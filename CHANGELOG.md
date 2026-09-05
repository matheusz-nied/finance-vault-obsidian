# Changelog

## 0.2.1

### New

- Delete a scheduled financial cycle rule from Settings → Finance Vault before it takes effect. Active and past rules remain available to preserve cycle history.
- Read release notes after updates, reopen them with Open release notes, or turn off Show release notes after updates in settings.

### Improved

- Financial cycle settings now separate the effective date from the monthly start day, with labels and a concrete example.

### Fixed

- The suggested effective date now follows the last scheduled rule, avoiding an invalid default when a future rule already exists.

## 0.2.0

### Easier navigation

- Open the dashboard in calendar month mode, with a recognizable month title, exact date range and a shortcut back to the current period.
- Separate overview, transactions, recurring items and installments, and investments into focused sections.
- Add direct actions for expenses, income and investment contributions, plus a getting-started guide.
- Explain the remaining amount as income minus expenses minus contributions. Clarify that period totals include future-dated entries and are not account balances or credit card statements.
- Start settings with account setup guidance; move storage settings below everyday configuration.

### Faster entry and search

- Search descriptions, account names and category names while typing, without losing keyboard focus. Search ignores case and accents.
- Combine account and type filters, see the number of matching entries, and clear filters in one click. Empty searches and empty periods have distinct guidance.
- Default new dashboard entries to a date in the selected period. Existing records retain their dates; command-palette entry still defaults to today.
- Hide the recurring-template selector when there are no templates and explain how to enable credit card installments.
- Show transaction and contribution validation errors inside their forms and disable saving while a submission is in progress.
- Create recurring templates directly from the dashboard and distinguish the checklist month from upcoming installments.
- Adapt chart and summary layouts to narrow Obsidian panes as well as small windows.

### Compatibility

- No financial data migration or changes to the Markdown format.
- Minimum Obsidian version remains 1.13.7; desktop and mobile remain supported.
