# Finance Vault

Your finances fit in a Markdown file. Literally.

Finance Vault is a personal finance plugin for Obsidian that keeps everything inside your own vault: every transaction becomes a line in a `.md` file you can read, version in git, or open in any editor. No account, no cloud, no third-party server knowing how much you spent on delivery this month.

If you already use Obsidian to organize your life, now your money lives there too.

## Why use this?

Because spreadsheets are a chore and banking apps show you ads.

- **Your data is yours alone.** Zero network calls, zero telemetry, zero ads. If this plugin vanished from the face of the earth tomorrow, your records are still there, in plain text.
- **Logging a transaction takes seconds.** Account, category, amount, date, description. Done.
- **Your credit card is no longer a mystery.** Installment purchase? The plugin creates every month's installment for you, cents included.
- **Those same fixed expenses every month?** Set them up once (salary, rent, Netflix) and log them with one click from the monthly checklist.
- **Investments kept apart from everyday spending.** A contribution is a contribution, an expense is an expense — in the reports, they never mix.
- **Works on your phone.** Responsive interface, light and dark themes, fully offline.

## What it does

**Accounts that match how you actually use money:** cash, bank accounts, and credit cards. Expenses group by card and by category, so you can see exactly what is eating your budget.

**Fixed templates:** salary, subscriptions, recurring bills — set them up once and forget about them. Every month the checklist shows what's left to log. Important: creating a template doesn't touch your totals. The amount only counts once you click **Post** (and you can edit before confirming, because the electricity bill is never the same twice).

**Installment purchases:** bought something in 10x on your card? Enter the total, the number of installments, and the first due date. The plugin creates one expense per month, splits the cents without changing the total, and shows active installments in the dashboard — with options to edit the next installment or cancel the remaining ones.

**Contributions:** track investments by type (fixed income, stocks, REITs, ETFs, crypto...) or by asset, with value and percentage charts. These are the totals you contributed in the period — the plugin doesn't try to guess returns or market prices.

**Three views of the same money:**
- **Month** — the classic, day 1 to the last day.
- **Cycle** — a configurable window that can span two months (by default, from the 10th of one month to the 9th of the next). If your paycheck lands on the 10th, the cycle is the view that finally makes sense to you.
- **Year** — the big picture.

Transactions always live in the file of the month they actually happened in. Cycles are just views — the plugin never moves your records around.

## Up and running in 2 minutes

1. Open **Settings → Finance Vault**.
2. Add your accounts (wallet, bank, cards).
3. Tweak the categories to your liking.
4. Click the wallet icon in the sidebar (or run the **Open dashboard** command).
5. Log your first transaction. Done — you're now tracking your finances.

Fixed templates and other refinements you can set up as you feel the need.

## Where your data lives

```text
Financas/
├── Transacoes/
│   └── YYYY-MM.md
└── Investimentos/
    └── YYYY-MM.md
```

Markdown files, one per month. The plugin's tables sit between `finance-vault:table:v1` markers — anything you write outside them (notes, links, whatever) is preserved. If a line turns out invalid or has a duplicated ID, the dashboard warns you instead of silently deleting it.

> [!IMPORTANT]
> Back up your vault. Finance Vault keeps your personal records organized, but it's no substitute for bank statements or advice from a professional.

## Installation

### From the Obsidian community directory

1. **Settings → Community plugins → Browse**.
2. Search for **Finance Vault**.
3. Install and enable.

### Manual (or before it hits the directory)

1. Download `main.js`, `manifest.json`, and `styles.css` from the [latest release](https://github.com/matheusz-nied/finance-vault-obsidian/releases/latest).
2. Create the folder `<your-vault>/.obsidian/plugins/finance-vault/`.
3. Copy the three files into it.
4. Restart Obsidian and enable the plugin.

You can also test it via [BRAT](https://github.com/TfTHacker/obsidian42-brat) using this repository's URL.

## What it doesn't do (yet)

Being honest, because money is serious business:

- Only works in Brazilian reais (BRL).
- No bank statement import or reconciliation.
- Doesn't calculate each account's balance.
- No market quotes, average price, or investment returns.
- No budgets, goals, notifications, or detailed credit card statements.
- No built-in sync — use whatever you already use for your vault (Syncthing, Obsidian Sync, git, your pick).

If something on that list is a dealbreaker, [open an issue](https://github.com/matheusz-nied/finance-vault-obsidian/issues) — suggestions are welcome. Just don't include personal financial data in your report.

## Development

Requires Node.js 20+ and npm.

```bash
git clone https://github.com/matheusz-nied/finance-vault-obsidian.git
cd finance-vault-obsidian
npm install
npm run dev
```

The test vault lives in `test-vault/` — open it in Obsidian with **Open folder as vault**.

Before any delivery:

```bash
npm test
npm run lint
npm run build
```

## License

[0BSD](LICENSE). Make good use of it.
