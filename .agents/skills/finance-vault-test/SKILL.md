---
name: finance-vault-test
description: Validar o Finance Vault no Obsidian e capturar screenshots usando exclusivamente a vault de teste deste projeto. Use para testes manuais, execução do build local e conferência visual.
---

# Testar o Finance Vault

Leia a seção “Vault permitida” do [AGENTS.md](../../../AGENTS.md) antes de acessar o Obsidian. Ela é a fonte das restrições de acesso a vaults.

1. Resolva a raiz do checkout e o caminho real de `test-vault/`. Confira o destino do link do plugin em `.obsidian/plugins/finance-vault`: deve ser este checkout ou uma instalação dentro da própria vault de teste. Se apontar para fora desses locais, pare antes de acessar o destino.
2. Consulte `git status --short` para identificar registros e configurações modificados antes do teste. Não restaure esses arquivos nem trate lançamentos anteriores como dados descartáveis.
3. Execute as verificações exigidas pelo `AGENTS.md`. Carregue o build na instalação confirmada da vault de teste. Recarregue somente essa janela do Obsidian, depois de confirmar que não há edição não salva do usuário nela.
4. Exercite o fluxo alterado com dados fictícios identificáveis. Para navegação, ajuda e textos, prefira inspeção sem salvar lançamentos. Para testar gravações, acompanhe exatamente os IDs criados; limpe apenas esses registros quando necessário, pela interface do plugin ou API Vault.
5. Escolha verificações de acordo com a mudança: manutenção de foco na busca, filtros combinados, data ao trocar períodos, categoria compatível com receita/despesa, parcelas no cartão, erros de validação ou comportamento dos aportes. Não repita todos os fluxos sem necessidade.
6. Para screenshots destinados ao README, confirme que a janela é da vault de teste e que os dados exibidos são fictícios. Guarde a captura em `docs/assets/` com nome descritivo, sem data de captura. Use texto alternativo em inglês e caminho relativo no README.

Conclua com os fluxos efetivamente verificados, as limitações e eventuais registros criados que permaneceram na vault de teste. Uma compilação bem-sucedida não substitui a validação visual; testar no desktop não comprova o funcionamento em um celular real.
