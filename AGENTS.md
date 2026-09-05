# Finance Vault

## Vault permitida

- Use exclusivamente a vault `test-vault/` deste repositório para desenvolver, executar, testar e capturar screenshots do plugin. Resolva o caminho a partir da raiz do checkout atual.
- Nunca use a vault pessoal do usuário nem qualquer outra vault: não leia notas, configurações ou logs, não copie dados, não instale nem atualize o plugin nelas e não capture sua interface.
- Antes de interagir com o Obsidian, confirme a vault pelo caminho absoluto registrado ou pela abertura explícita de `test-vault/`. Use apenas metadados de janelas para selecionar a vault; uma janela chamada `test-vault` sozinha não comprova o caminho. Não tire screenshots nem leia a árvore de conteúdo de uma janela cuja vault ainda não foi confirmada.
- Se a vault pessoal estiver aberta, deixe-a intacta e selecione ou abra a vault de teste em uma janela separada. Se não for possível confirmar o destino, continue com verificações automatizadas e informe que a validação visual ficou pendente; não use outra vault como alternativa.
- Confira o destino real de links simbólicos antes de acessar arquivos de teste. O link `test-vault/.obsidian/plugins/finance-vault` pode apontar para a raiz deste checkout, para carregar o build local. Links para vaults externas não são permitidos.
- Use dados fictícios criados para o teste. Registros já existentes em `test-vault/` não são descartáveis: preserve-os e mantenha alterações de testes manuais fora dos commits, salvo pedido explícito do usuário.

## Implementação

- Este projeto é um plugin comunitário do Obsidian em TypeScript, empacotado por esbuild em `main.js`.
- Use npm e mantenha `src/main.ts` focado no ciclo de vida e nos registros do plugin.
- Não use APIs de Node.js ou Electron em runtime; `isDesktopOnly` deve permanecer `false`.
- Transações e aportes pertencem ao arquivo do mês de sua data real. Ciclos são apenas visões calculadas.
- Valores monetários são centavos inteiros. Datas financeiras são strings civis `YYYY-MM-DD`, sem UTC.
- Preserve conteúdo desconhecido nos arquivos Markdown e use a API `Vault` para toda escrita.
- Antes de entregar mudanças, execute `npm test`, `npm run lint` e `npm run build`.

## Skills do projeto

- Para testes manuais, execução no Obsidian ou screenshots, leia [finance-vault-test](.agents/skills/finance-vault-test/SKILL.md).
- Para preparar ou publicar uma versão, leia [finance-vault-release](.agents/skills/finance-vault-release/SKILL.md).
- Para escrever o changelog e a experiência de notas exibida após uma atualização, leia [finance-vault-release-notes](.agents/skills/finance-vault-release-notes/SKILL.md).
