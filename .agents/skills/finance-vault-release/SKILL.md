---
name: finance-vault-release
description: Preparar ou publicar versões do Finance Vault com metadados consistentes, arquivos de instalação e notas de release. Use para empacotar uma versão ou lançar uma atualização do plugin.
---

# Preparar e publicar uma versão

Leia o [AGENTS.md](../../../AGENTS.md) e inspecione `package.json`, `manifest.json`, `versions.json` e `.github/workflows/release.yml` do checkout atual. Consulte a configuração existente em vez de presumir o número da versão ou o comportamento do workflow.

## Preparação local

- Confira o diff e preserve alterações do usuário. Separe registros e configurações de testes manuais dos arquivos que compõem a versão.
- Mantenha a mesma versão em `package.json`, na entrada raiz de `package-lock.json` e em `manifest.json`; registre a compatibilidade em `versions.json`. Não altere `minAppVersion` sem uma necessidade de compatibilidade verificada.
- Escreva o changelog e as notas exibidas dentro do plugin seguindo [finance-vault-release-notes](../finance-vault-release-notes/SKILL.md). Confira se a descrição e as imagens do README correspondem ao comportamento entregue.
- Execute as verificações exigidas pelo `AGENTS.md`. Se houver teste visual, siga [finance-vault-test](../finance-vault-test/SKILL.md).
- O release precisa de `main.js`, `manifest.json` e `styles.css` como anexos individuais. Um ZIP para instalação manual é opcional; se entregue ou atualizado, confira que contém exatamente esses três arquivos dentro de `finance-vault/` e que correspondem ao build final. Não inclua `data.json`, notas da vault, configurações locais ou dependências.

## Publicação

- “Como publicar?” pede orientação. Preparar um pacote local não autoriza push, tag remota ou publicação. Execute essas ações quando fizerem parte do pedido do usuário; mantenha qualquer autorização já dada na conversa.
- Antes de enviar, confira o remoto, o commit que será publicado e se a tag ou o release da versão já existem. A tag deve coincidir exatamente com a versão do manifest, sem prefixo `v`. Não sobrescreva uma versão existente nem use force push para resolver conflitos.
- Siga o workflow do repositório, acompanhe sua execução e confira os anexos do release antes de publicá-lo. Se o pedido for apenas criar um draft, mantenha-o como draft. Se a publicação estiver autorizada, conclua-a e verifique a URL e os anexos públicos.
- Alterar a descrição no manifest pode não atualizar o texto usado na busca do catálogo: confira a entrada em `community-plugins.json` de `obsidianmd/obsidian-releases` quando o pedido incluir esse texto. Uma atualização do catálogo é uma ação distinta da publicação do binário.

Informe a versão, as verificações executadas e o estado real: pacote local, draft ou release público. Não descreva um draft como atualização já disponível no Obsidian.
