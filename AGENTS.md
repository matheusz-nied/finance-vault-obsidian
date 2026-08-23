# Finance Vault

- Este projeto é um plugin comunitário do Obsidian em TypeScript, empacotado por esbuild em `main.js`.
- Use npm e mantenha `src/main.ts` focado no ciclo de vida e nos registros do plugin.
- Não use APIs de Node.js ou Electron em runtime; `isDesktopOnly` deve permanecer `false`.
- Transações e aportes pertencem ao arquivo do mês de sua data real. Ciclos são apenas visões calculadas.
- Valores monetários são centavos inteiros. Datas financeiras são strings civis `YYYY-MM-DD`, sem UTC.
- Preserve conteúdo desconhecido nos arquivos Markdown e use a API `Vault` para toda escrita.
- Antes de entregar mudanças, execute `npm test`, `npm run lint` e `npm run build`.
