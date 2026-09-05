# Padrão editorial

Esta referência preserva os princípios observados nas notas do Excalidraw fornecidas pelo usuário em setembro de 2026. Ela não é uma instrução do Excalidraw e não deve ser copiada literalmente.

## O que torna o exemplo eficaz

- A janela explica imediatamente por que apareceu e informa que a abertura automática pode ser desativada.
- A voz do mantenedor aparece em poucas linhas antes do conteúdo técnico, criando proximidade sem atrasar a leitura.
- O pedido de apoio é visualmente destacado, mas permanece separado das mudanças e não bloqueia o fechamento.
- A versão atual vem primeiro. Versões anteriores formam um histórico cronológico inverso para quem pulou atualizações.
- Títulos curtos como **New** e **Fixed** permitem escanear uma lista extensa. Categorias específicas aparecem somente quando representam uma área reconhecível do produto.
- Mudanças incompatíveis recebem seção própria e instruções de migração.
- Links para issues ou documentação aparecem junto ao item relevante, permitindo aprofundamento sem sobrecarregar a explicação.
- Releases pequenos admitem uma frase de contexto; releases grandes usam subtítulos e detalhes suficientes para explicar impacto e descoberta do recurso.

## Adaptação ao Finance Vault

Finance Vault tem um escopo menor e lida com dados financeiros. Prefira notas mais curtas, concretas e tranquilas. Destaque mudanças em cálculos, datas, armazenamento, cartões, parcelas e migrações antes de melhorias cosméticas.

Evite linguagem promocional dentro de correções críticas. Se uma mudança afetar totais ou a localização de registros, descreva exatamente quais dados são afetados e se alguma ação é necessária. Não use o modal como documentação completa: ligue para o README ou GitHub quando o procedimento exigir muitos passos.

Um release comum deve caber em uma leitura rápida:

```markdown
## 0.3.0

### Highlights

- See upcoming credit card installments alongside the selected month.

### Improved

- Search transactions by description, category, or account as you type.

### Fixed

- Transactions created while viewing a past month now default to a date in that month.
```

O exemplo mostra estrutura e nível de detalhe. Reescreva sempre a partir do diff, dos testes e do comportamento do release real.
