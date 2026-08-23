# Finance Vault

Finance Vault é um plugin local-first de finanças pessoais para o Obsidian. Ele registra receitas, despesas, transferências, compras e pagamentos de cartão e aportes em arquivos Markdown legíveis dentro da própria vault.

## Recursos do MVP

- Relatórios por mês de calendário, ciclo financeiro e ano.
- Ciclo padrão do dia 10 ao dia 9 seguinte, com regras futuras configuráveis.
- Compras no cartão contabilizadas como despesa na data real.
- Pagamentos de cartão tratados como transferências, sem duplicar gastos.
- Aportes separados das despesas de consumo.
- Valores armazenados em centavos inteiros e exibidos em BRL.
- Interface em português, responsiva e compatível com temas claros e escuros.
- Funcionamento offline, sem telemetria ou serviços externos.

## Armazenamento

Por padrão, os registros ficam em:

```text
Financas/
├── Transacoes/
│   └── YYYY-MM.md
└── Investimentos/
    └── YYYY-MM.md
```

O arquivo é sempre escolhido pela data real do registro. O ciclo financeiro é apenas uma consulta calculada e nunca move registros entre meses.

As tabelas gerenciadas são delimitadas por comentários `finance-vault:table:v1`. Texto fora desses marcadores e colunas adicionais são preservados. Se uma linha estiver inválida ou duplicada, o dashboard mostra um diagnóstico e impede alterações que possam apagar dados.

Configurações internas ficam no `data.json` do plugin por meio de `Plugin.loadData()` e `Plugin.saveData()`.

## Ciclo financeiro

Com início no dia 10:

- 09/08 pertence ao ciclo 10/07–09/08.
- 10/08 inicia o ciclo 10/08–09/09.
- 09/09 é o último dia desse ciclo.
- 10/09 inicia o ciclo seguinte.

Novas regras podem ter vigência futura. A vigência encerra o ciclo anterior no dia anterior e começa um novo ciclo, garantindo que não existam lacunas ou datas duplicadas. Dias 29, 30 e 31 são ajustados ao último dia disponível em meses curtos.

## Desenvolvimento

Requisitos: Node.js 20 ou superior e npm.

```bash
npm install
npm run dev
```

Verificações:

```bash
npm test
npm run lint
npm run build
```

O build gera `main.js` na raiz. A vault de desenvolvimento em `test-vault/` contém fixtures de agosto e setembro de 2026 e um link para a raiz do projeto.

## Instalação manual

1. Execute `npm install` e `npm run build`.
2. Crie `<sua-vault>/.obsidian/plugins/finance-vault/`.
3. Copie `main.js`, `manifest.json` e `styles.css` para essa pasta.
4. No Obsidian, abra **Configurações → Plugins da comunidade**.
5. Atualize a lista de plugins instalados e habilite **Finance Vault**.

## Privacidade e compatibilidade

- Nenhum dado sai da vault.
- Não há chamadas de rede, contas, anúncios ou telemetria.
- O plugin usa somente a API do Obsidian; não importa Node.js, Electron, `fs` ou `path` em runtime.
- `isDesktopOnly` é `false`; o layout é adaptado para celular.

## Limitações do MVP

- Sem cotação, rentabilidade, quantidade ou preço médio de investimentos.
- Sem importação bancária, sincronização própria ou integrações com corretoras.
- Sem parcelamento avançado, orçamento, metas ou notificações.
- O cartão não possui fechamento detalhado de fatura nem cálculo de dívida acumulada.
- BRL é a única moeda suportada.

## Licença

0BSD. Consulte [LICENSE](LICENSE).
