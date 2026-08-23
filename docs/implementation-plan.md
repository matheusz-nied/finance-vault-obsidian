# Finance Vault — plano de implementação

1. Partir do template oficial do Obsidian e manter o plugin mobile, local-first e sem dependências de runtime.
2. Implementar datas civis, dinheiro em centavos, ciclos históricos e relatórios como funções puras.
3. Persistir transações e aportes em tabelas Markdown mensais, usando `Vault.process()` e preservando conteúdo externo.
4. Criar dashboard para mês, ciclo e ano, modais de CRUD e configurações de pasta, contas, categorias e ciclos.
5. Validar o ciclo padrão 10–9, cartão sem despesa duplicada, aportes separados e somas mensais/anuais.
6. Entregar lint, testes e build aprovados, documentação de instalação e vault local de demonstração.
