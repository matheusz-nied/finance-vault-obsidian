# Finance Vault — Vault de testes

Esta vault é dedicada ao desenvolvimento e aos testes locais do plugin `finance-vault`. Todos os valores persistidos nas fixtures usam centavos inteiros, e cada registro fica no arquivo correspondente ao seu mês de calendário.

## Dados de demonstração

### Transações

- [[Financas/Transacoes/2026-08|Agosto de 2026]]
- [[Financas/Transacoes/2026-09|Setembro de 2026]]

### Investimentos

- [[Financas/Investimentos/2026-08|Aportes de agosto de 2026]]
- [[Financas/Investimentos/2026-09|Aportes de setembro de 2026]]

## Totais esperados

Os totais abaixo estão em centavos.

| Período | Recebido | Gasto | Aportado |
| --- | ---: | ---: | ---: |
| Agosto de 2026 | 500000 | 19345 | 50000 |
| Setembro de 2026 | 120000 | 80000 | 40000 |
| Ciclo 2026-08-10 a 2026-09-09 | 500000 | 96845 | 80000 |
| Ano de 2026 | 620000 | 99345 | 90000 |

## Casos cobertos

- `2026-08-09`: dia anterior ao início do ciclo.
- `2026-08-10`: primeiro dia do ciclo.
- `2026-09-09`: último dia do ciclo.
- `2026-09-10`: primeiro dia do ciclo seguinte.
- Uma compra de `12345` no cartão é contabilizada como despesa.
- A transferência de `12345` da conta bancária para o cartão representa o pagamento dessa compra e não entra novamente no total gasto.
- Os aportes permanecem separados das despesas de consumo.

## Carregar o plugin

A pasta `.obsidian/plugins/finance-vault` aponta para a raiz deste repositório. O projeto já contém `manifest.json` e gera `main.js` pelo build:

1. Abra esta pasta no Obsidian usando **Open folder as vault**.
2. Ative os plugins da comunidade nas configurações.
3. Habilite **Finance Vault** na lista de plugins instalados.

O ID do plugin já está incluído na configuração local desta vault. Recarregue o Obsidian depois de executar `npm run build`.
