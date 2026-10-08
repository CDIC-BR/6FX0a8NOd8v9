# Dados auxiliares

- `dioceses-meta.json`: metadados de Regional/Província para as 45 participantes atuais.
- `stage-rules.json`: listas que representam as etapas e listas explicitamente ignoradas. A etapa é definida somente pela lista atual; etiquetas não promovem etapa.
- `trello-snapshot.json`: fallback sanitizado do board, sem descrições, e-mails ou credenciais.

O snapshot não substitui a API em produção; serve para desenvolvimento e contingência visual.

### circunscricoes-base.json
Base estática das 281 circunscrições (nome, Regional e Província) utilizada apenas para calcular e detalhar as circunscrições que ainda não participam do projeto. A participação continua sendo determinada pelos cartões das listas válidas do Trello.
