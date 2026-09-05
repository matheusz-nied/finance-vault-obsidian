---
name: finance-vault-release-notes
description: Escrever e revisar notas de atualização do Finance Vault e sua apresentação dentro do plugin. Use ao preparar changelogs, modais pós-atualização e convites de apoio ao projeto.
---

# Notas de atualização do Finance Vault

Produza as notas em inglês para quem usa o plugin. Leia [o padrão editorial](references/editorial-pattern.md) antes de escrever ou implementar a experiência pós-atualização.

## Entregáveis por versão

1. Abra com o número da versão e, quando útil, uma frase curta que explique o tema do lançamento.
2. Organize somente as seções que possuem conteúdo. Use esta ordem: **Highlights**, **New**, **Improved**, **Fixed**, **Breaking changes**, **Maintenance**.
3. Escreva cada item como resultado observável: situação anterior, comportamento atual e efeito prático quando isso não estiver óbvio. Use termos da interface e forneça instruções de migração para mudanças incompatíveis.
4. Mantenha a versão mais recente completa. Inclua versões anteriores apenas quando ajudam o usuário a entender atualizações puladas; mantenha-as recolhidas ou visualmente secundárias.
5. Use o mesmo conteúdo factual no `CHANGELOG.md`, nas notas do GitHub e na experiência dentro do plugin, adaptando a extensão ao espaço. Não anuncie trabalho que não está no build publicado.

## Experiência dentro do plugin

- Mostre as notas uma vez após cada atualização instalada. Uma nova instalação pode receber uma breve apresentação separada; não trate onboarding como histórico de atualização.
- Persista a última versão vista e uma preferência **Show release notes after updates**, habilitada por padrão. Fechar a janela marca a versão atual como vista; desabilitar a preferência impede aberturas automáticas futuras.
- Disponibilize o histórico novamente por um comando **Open release notes** e por um link nas configurações.
- O modal deve abrir rápido, ser legível em telas estreitas, permitir rolagem, manter foco e fechamento por teclado, e usar componentes e variáveis visuais do Obsidian.
- Se o plugin pular várias versões, mostre primeiro a versão instalada e permita consultar as intermediárias. Nunca reabra a mesma versão automaticamente.

## Apoio ao projeto

- Separe o convite de apoio das mudanças da versão. Use uma frase humana e curta, seguida de ações explícitas como **Star on GitHub** e **Buy me a coffee**.
- O convite não deve bloquear o conteúdo, aparecer como pop-up isolado, simular uma obrigação nem surgir durante o registro de dados financeiros.
- Exiba **Buy me a coffee** somente após o usuário fornecer e validar a URL pública do perfil. Centralize essa URL em uma constante ou configuração do projeto; não invente endereço, campanha ou benefício para apoiadores.
- Links externos devem indicar o destino, abrir fora do Obsidian e usar proteção contra acesso ao contexto da janela de origem.

## Verificação

Além das verificações do [AGENTS.md](../../../AGENTS.md), teste os estados de instalação nova, atualização ainda não vista, versão já vista e preferência desativada. Para conferir o modal no Obsidian, siga [finance-vault-test](../finance-vault-test/SKILL.md).

Ao concluir, informe qual conteúdo será exibido, em quais situações ele abre e quais links de apoio estão configurados. Se a URL do Buy Me a Coffee ainda não existir, deixe essa ação ausente e registre a dependência sem bloquear o restante da versão.
