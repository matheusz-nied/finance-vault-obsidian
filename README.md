# Finance Vault

Finance Vault é um plugin local-first de finanças pessoais para o Obsidian. Registre receitas, despesas, cartões, gastos fixos, compras parceladas e aportes sem tirar seus dados da própria vault.

O plugin foi pensado para um acompanhamento financeiro simples: você lança o que realmente recebeu, gastou ou aportou e consulta os resultados por mês, ciclo financeiro ou ano.

## Principais recursos

- Receitas e despesas com conta, categoria, data e descrição.
- Contas em dinheiro, bancárias e cartões de crédito.
- Gastos agrupados por cartão e por categoria.
- Modelos fixos para lançar rapidamente salários, assinaturas e contas recorrentes.
- Compras parceladas com geração automática das parcelas futuras.
- Aportes separados das despesas de consumo.
- Gráficos de gastos e aportes com valores e porcentagens.
- Visões por mês, ciclo financeiro e ano.
- Armazenamento em arquivos Markdown legíveis.
- Funcionamento offline, sem conta, anúncios ou telemetria.
- Interface em português e valores em real brasileiro (BRL).

## Primeiros passos

1. Abra **Configurações → Finance Vault**.
2. Cadastre as contas que você usa, como dinheiro, banco e cartões de crédito.
3. Revise ou crie as categorias de receitas e despesas.
4. Se desejar, cadastre modelos fixos para lançamentos recorrentes.
5. Abra o Finance Vault pelo ícone de carteira na barra lateral ou pelo comando **Abrir dashboard**.
6. Use **Nova transação** para receitas e despesas e **Novo aporte** para investimentos.
7. Alterne entre **Mês**, **Ciclo** e **Ano** para consultar períodos diferentes.

## Como os lançamentos funcionam

### Contas

O tipo da conta classifica a origem do lançamento:

- **Dinheiro:** pagamentos ou recebimentos em espécie.
- **Conta bancária:** movimentações realizadas em conta corrente, poupança ou conta digital.
- **Cartão de crédito:** compras feitas no cartão. Esse tipo habilita compras parceladas e o agrupamento de gastos por cartão.

As contas ajudam a organizar e filtrar os registros. O plugin ainda não faz conciliação bancária nem calcula automaticamente o saldo disponível de cada conta.

### Modelos fixos

Um modelo fixo é um atalho para preencher uma transação recorrente, como salário, aluguel, energia ou assinatura.

Cadastrar o modelo não altera seus totais. O valor somente entra no relatório depois que você seleciona **Lançar** no checklist mensal. A transação criada pode ser editada normalmente e, se o valor padrão mudou, também pode atualizar o modelo.

### Compras parceladas

Ao criar uma despesa em uma conta do tipo **Cartão de crédito**, selecione **Pagamento → Parcelada**. Informe:

- O valor total da compra.
- A quantidade de parcelas.
- A data da compra.
- A data da primeira parcela.

O plugin mostra uma prévia e cria uma despesa em cada mês. Os centavos são distribuídos sem alterar o valor total. Em meses curtos, a parcela usa o último dia disponível e mantém o dia original nos meses seguintes.

O dashboard mostra os parcelamentos ativos e permite editar a próxima parcela ou cancelar as parcelas restantes.

### Investimentos

Os investimentos são registrados como aportes e ficam separados das despesas de consumo. O dashboard permite agrupar os aportes:

- Por tipo, como renda fixa, ação, FII, ETF ou cripto.
- Por ativo, usando o nome informado no lançamento.

Os valores representam o total aportado no período selecionado. Eles não representam o valor atual, a rentabilidade ou a cotação da carteira.

## Períodos e ciclo financeiro

O dashboard possui três visões:

- **Mês:** primeiro ao último dia do mês-calendário.
- **Ciclo:** intervalo configurável que pode atravessar dois meses.
- **Ano:** primeiro ao último dia do ano.

O ciclo inicial começa no dia 10 e termina no dia 9 do mês seguinte. Por exemplo:

- 09/08 pertence ao ciclo 10/07–09/08.
- 10/08 inicia o ciclo 10/08–09/09.
- 09/09 é o último dia desse ciclo.
- 10/09 inicia o ciclo seguinte.

Novas regras de ciclo podem ter vigência futura. Dias 29, 30 e 31 são ajustados ao último dia existente em meses mais curtos.

## Armazenamento local

Por padrão, os registros ficam em:

```text
Financas/
├── Transacoes/
│   └── YYYY-MM.md
└── Investimentos/
    └── YYYY-MM.md
```

Cada registro pertence ao arquivo do mês de sua data real. Ciclos são apenas visões calculadas e nunca movem registros entre arquivos.

As tabelas gerenciadas são delimitadas por comentários `finance-vault:table:v1`. Conteúdo fora desses marcadores e colunas adicionais são preservados. Linhas inválidas ou IDs duplicados aparecem como avisos no dashboard para evitar perda silenciosa de dados.

As configurações ficam no `data.json` do plugin por meio da API oficial `Plugin.loadData()` e `Plugin.saveData()`.

> [!IMPORTANT]
> Mantenha backups da sua vault. O Finance Vault ajuda a organizar registros pessoais, mas não substitui extratos bancários, documentos fiscais ou orientação financeira profissional.

## Instalação

### Plugins da comunidade

Depois da publicação no diretório oficial:

1. Abra **Configurações → Plugins da comunidade** no Obsidian.
2. Selecione **Explorar** e procure por **Finance Vault**.
3. Selecione **Instalar** e depois **Ativar**.

### Instalação manual

1. Baixe `main.js`, `manifest.json` e `styles.css` na [release mais recente](https://github.com/matheusz-nied/finance-vault-obsidian/releases/latest).
2. Crie `<sua-vault>/.obsidian/plugins/finance-vault/`.
3. Copie os três arquivos para essa pasta.
4. Reinicie o Obsidian ou atualize a lista de plugins instalados.
5. Ative **Finance Vault** em **Plugins da comunidade**.

Para testes antes da entrada no diretório oficial, o plugin também pode ser instalado pelo [BRAT](https://github.com/TfTHacker/obsidian42-brat) usando a URL deste repositório.

## Privacidade e compatibilidade

- Nenhum dado financeiro sai da vault.
- Não existem chamadas de rede, contas, anúncios ou telemetria.
- O plugin usa a API do Obsidian para leitura e escrita.
- Não utiliza APIs de Node.js ou Electron em runtime.
- `isDesktopOnly` é `false` e a interface é responsiva.
- Compatível com temas claros e escuros.

## Limitações atuais

- Somente BRL.
- Sem importação ou conciliação bancária.
- Sem cálculo automático do saldo de cada conta.
- Sem cotação, quantidade, preço médio ou rentabilidade de investimentos.
- Sem orçamento, metas ou notificações.
- Sem fechamento detalhado de fatura ou cálculo de dívida acumulada do cartão.
- Sem sincronização própria; use o método de sincronização da sua vault.

## Desenvolvimento

Requisitos: Node.js 20 ou superior e npm.

```bash
git clone https://github.com/matheusz-nied/finance-vault-obsidian.git
cd finance-vault-obsidian
npm install
npm run dev
```

A vault de desenvolvimento em `test-vault/` contém um link para a raiz do projeto. Abra essa pasta no Obsidian usando **Open folder as vault**.

Verificações obrigatórias:

```bash
npm test
npm run lint
npm run build
```

O build de produção gera `main.js` na raiz. Esse arquivo é distribuído nas releases e não é versionado no repositório.

## Problemas e sugestões

Use as [issues do GitHub](https://github.com/matheusz-nied/finance-vault-obsidian/issues) para relatar bugs ou sugerir melhorias. Não inclua dados financeiros pessoais, conteúdo da sua vault ou outras informações sensíveis nos relatos.

## Licença

Finance Vault é distribuído sob a licença [0BSD](LICENSE).
