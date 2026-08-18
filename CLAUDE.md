# QT PizzApp

Calculadora de massas da QT Pizza Bar, usada pelos alunos do curso do Matheus Ramos.
App de página única, sem build: os arquivos do repositório são publicados como estão.

- Produção: https://qt-pizzapp.netlify.app
- Painel do professor: https://qt-pizzapp.netlify.app/painel-c22806d2.html
- Branch de trabalho: `claude/qt-pizzapp-finalize-yw6pip`

## Arquivos

| Arquivo | O que é |
|---|---|
| `qt_pizzapp.html` | O app inteiro: CSS, JS, a fonte Helvetica embutida em base64 e todas as telas |
| `painel-c22806d2.html` | Painel do professor. O sufixo aleatório é a única barreira de acesso |
| `sw.js` | Service worker. Rede primeiro no HTML, cache para o resto. Cache `qtpizzapp-v2` |
| `manifest.webmanifest` | Manifesto do PWA. Ícones da pasta `icons/negativa` |
| `icons/` | Jogo oficial da marca: `negativa` (tile escuro), `positiva` (claro), `marca` (símbolo solto 1024px transparente, para apostilas) |
| `_redirects` | `/* → /qt_pizzapp.html 200`. Arquivo que existe ganha do catch-all |
| `_headers` | Content-type do manifesto |

O `<body>` é praticamente vazio: a interface é gerada por JavaScript dentro de template
strings. Para mudar texto ou estrutura, edite dentro das crases nas funções de tela
(`vLib`, `vStep0` a `vStep3`, `vTools`, `vW`, `vBass`, `vOnb`), nunca procure no HTML estático.

## O modelo de fermento

Coração do app, em `calc()`. Constantes calibradas por engenharia reversa sobre o PizzApp 1.9
e corrigidas pela literatura. **Não mexer sem motivo forte.**

```
FERM_A=7.327  FERM_P=1.4534  FERM_Q=1.1365      dose direta
POOLISH_A=3.9108  POOLISH_K=0.23089             poolish a 18 °C
BIGA_PCT=1.0   BIGA_H=18                        padrão Giorilli
PRE_CREDIT=2                                    crédito do pré maduro
```

Dose direta: `fermento% = A × E^(−P)`, com `E = Σ taxa(T)·h` e `taxa(T) = Q^(T−20)`.

Duas correções que levaram pesquisa e não devem ser desfeitas por engano:

1. **Crédito do pré-fermento.** A biga madura vale mais que o fermento nominal, porque a
   população de levedura multiplica nas 18h. Daí o fator `PRE_CREDIT = 2`.
2. **Orçamento só sobre a farinha fora do pré.** A farinha que está na biga chega madura ao
   impasto finale e não precisa de dose nova:
   `refresco = max(0, direta × (1 − fração_do_pré) − PRE_CREDIT × fermento_nominal_do_pré)`

Isso reproduz a prática documentada (Zaghini/Consultapizza: biga de 20 a 40% com massa final
curta pede rinfresco zero). Antes disso o app mandava refresco em excesso.

Bassinage desconta a água que já está no pré-fermento: os três quadros mostram água no pré,
água no impasto finale e água tardia, e a soma bate com a água total da hidratação final.

## Nuvem

Supabase, projeto `helinoirdizwrluydkzp` (que também hospeda o `qt-avaliacoes`; o plano
gratuito não deixava criar projeto separado). Tabela `pizzapp_receitas`, RLS aberta para a
chave publicável, que está no fonte do app.

**O aparelho é a fonte da verdade, a nuvem é espelho.** Ao abrir, o app envia todas as
receitas locais. Consequência importante: apagar pelo banco não é definitivo, a receita volta
no próximo acesso daquele aparelho. Para sumir de vez, apagar pelo app.

Identificação: nome e sobrenome ficam separados no aparelho e sobem juntos em `aluno`.
A coluna `turma` existe mas está morta, o app grava string vazia. Se um dia quiser turma de
volta, criar coluna própria em vez de reaproveitar essa.

## Painel do professor

Mostra alunos, receitas, ativos na semana e quem não se identificou, com busca e ordenação.
Cada receita traz os parâmetros e a dose calculada.

**O painel tem uma cópia do modelo de fermento.** Se `calc()` mudar no app, atualize o espelho
no painel, senão professor e aluno olham números diferentes. Existe um teste para isso.

## Publicar

Não há build. O deploy sobe o diretório inteiro.

1. `Netlify → deploy-site` com `siteId c1ae1ecc-e776-4566-bc68-85a8bf1e1545`, que devolve um
   comando `npx @netlify/mcp@latest --site-id ... --proxy-path ...`
2. Rodar esse comando no repositório
3. Conferir por checksum, com cache-buster:
   `curl -s "https://qt-pizzapp.netlify.app/qt_pizzapp.html?cb=$RANDOM" | sha256sum`

Armadilhas conhecidas:

- O MCP da Netlify dá 502 com frequência. Esperar 60s e repetir, às vezes várias vezes.
- A borda do CDN serve conteúdo velho por alguns segundos após o deploy. Sempre usar
  cache-buster antes de concluir que algo falhou.
- Arquivo removido do repositório **continua acessível** na Netlify: esse método de deploy não
  apaga. São bytes órfãos, inofensivos enquanto nada os referenciar.
- Se um caminho do `SHELL` do `sw.js` der 404, o `addAll` falha e **o app inteiro deixa de
  instalar offline**. Ao renomear ou mover arquivo, atualizar o `SHELL` e subir a versão do cache.

## Testar

Playwright com o Chromium em `/opt/pw-browsers/chromium`. O navegador headless não alcança a
rede pelo proxy, então: interceptar as chamadas com `page.route` para testar nuvem e painel, e
usar uma origem https falsa para testar service worker e modo offline de verdade.

Testes que valem manter ao mexer no modelo ou na navegação:

- app e painel calculando o mesmo em vários perfis de receita
- os três quadros da bassinage somando a água total
- os cinco passos, os seletores segmentados e o retorno das ferramentas ao passo 05
- service worker instalando e a página abrindo sem rede

Os scripts ficaram no diretório de rascunho da sessão, não no repositório. Vale reescrever
conforme a necessidade.

## Cuidados de produto

- Alvos de toque com no mínimo 44px: o app é usado em pé, no celular, com a mão suja.
- Números em pt-BR pelas funções `n()` e `g()`, com vírgula decimal.
- Um arquivo só, funcionando offline. Nada de biblioteca, CDN ou fonte externa nova.
- Ao mover elemento, levar junto `onclick`, `oninput`, `onchange`, `aria-label` e `data-fk`,
  que é o que preserva foco e rolagem no re-render.

## Marcas

**Nunca misturar QT e Matheus Ramos no mesmo material.** O app e o painel estão na identidade
da QT (preto `#1A1E1E`, branco `#EFECEC`, cinza `#A0A5A5`, Helvetica, símbolo Q+T). O material
do Matheus tem paleta e regras próprias, incluindo proibição de travessão no texto. Existem
skills separadas para cada uma. Se a v2 carregar os vídeos dele, a conversa era fazer uma
versão do app na marca pessoal e deixar a QT para o restaurante.

## Em aberto

- v2 com vídeo colado na técnica (biga, bassinage, ponto de véu), em vez de videoteca solta.
  Reels do Instagram abrindo o app dele, para alimentar o perfil.
- Desafio semanal, aproveitando o painel para corrigir o que a turma entregou.
- Lista de técnicas sem vídeo dentro do painel, para virar pauta de gravação.
- Guardar os vídeos numa tabela do Supabase, para adicionar sem republicar o app.
- Painel sem senha, protegido só pelo endereço. Se precisar de trava real, login por e-mail e
  fechar a leitura da tabela.
