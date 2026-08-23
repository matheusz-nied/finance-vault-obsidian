# Finance Vault — Vault de testes

Esta vault é dedicada ao desenvolvimento e aos testes locais do plugin `finance-vault`. Ela começa sem receitas, despesas, modelos fixos ou aportes cadastrados.

## Estado inicial

- As tabelas de transações e investimentos estão vazias.
- As contas e categorias padrão são carregadas pelo plugin.
- Nenhum modelo fixo está cadastrado.
- Todo novo registro fica no arquivo correspondente ao mês de sua data real.

## Carregar o plugin

A pasta `.obsidian/plugins/finance-vault` aponta para a raiz deste repositório. O projeto já contém `manifest.json` e gera `main.js` pelo build:

1. Abra esta pasta no Obsidian usando **Open folder as vault**.
2. Ative os plugins da comunidade nas configurações.
3. Habilite **Finance Vault** na lista de plugins instalados.
4. Recarregue o Obsidian depois de executar `npm run build`.

O ID do plugin já está incluído na configuração local desta vault.
