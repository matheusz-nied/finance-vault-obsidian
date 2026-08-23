# Finance Vault

Finance Vault é um plugin local-first de finanças pessoais para o Obsidian. Ele registra receitas, despesas, compras no cartão e aportes em arquivos Markdown legíveis dentro da própria vault.

## Recursos do MVP

- Relatórios por mês de calendário, ciclo financeiro e ano.
- Ciclo padrão do dia 10 ao dia 9 seguinte, com regras futuras configuráveis.
- Compras no cartão contabilizadas como despesa na data real.
- Compras no cartão contabilizadas uma única vez, na data real da compra.
- Modelos fixos de receita e despesa com lançamento manual e valor editável.
- Checklist mensal dos modelos já lançados, sem estados financeiros adicionais.
- Gastos agrupados por cartão de crédito no dashboard.
- Gráfico de gastos por categoria no período selecionado.
- Gráfico de aportes com alternância entre tipo de investimento e ativo.
- Compras parceladas com prévia, distribuição exata dos centavos e compromissos futuros.
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

Um lançamento criado a partir de um modelo guarda apenas o `fixedTemplateId`. O registro continua sendo uma receita ou despesa normal; editar seu valor ou sua data não cria uma segunda transação. Modelos são configurados em **Configurações → Finance Vault → Modelos fixos**.

O botão **Lançar** sugere a data âncora do painel, mantendo o novo registro dentro do período visível. Se a data for alterada para fora de um ciclo exibido, o checklist mensal sinaliza isso e os totais continuam respeitando estritamente o período selecionado.

## Compras parceladas

Ao criar uma despesa em uma conta do tipo **Cartão de crédito**, selecione **Pagamento → Parcelada**. Informe o valor total, a quantidade e a data da primeira parcela. O plugin mostra uma prévia e, após a confirmação, cria uma transação por mês ligada pelo mesmo `installmentPlanId`.

Parcelas usam o dia da primeira parcela como âncora. Em meses curtos, a data é ajustada ao último dia disponível sem alterar a âncora dos meses seguintes. O dashboard mostra o total ainda comprometido e permite editar a próxima parcela ou cancelar todas as restantes com confirmação.

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

O build gera `main.js` na raiz. A vault de desenvolvimento em `test-vault/` começa com tabelas financeiras vazias e contém um link para a raiz do projeto.

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

Os gráficos de investimentos representam o valor aportado no período selecionado. Eles não representam o valor de mercado atual da carteira, pois o MVP ainda não registra quantidade, preço de compra, cotação ou rendimento.

## Limitações do MVP

- Sem cotação, rentabilidade, quantidade ou preço médio de investimentos.
- Sem importação bancária, sincronização própria ou integrações com corretoras.
- Sem orçamento, metas ou notificações.
- O cartão não possui fechamento detalhado de fatura nem cálculo de dívida acumulada.
- BRL é a única moeda suportada.

## Licença

0BSD. Consulte [LICENSE](LICENSE).
