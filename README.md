# Stopots Helper

Este projeto adiciona um painel flutuante com sugestoes, preenchimento automatico
e validacao para o jogo Stopots. Funciona via bookmarklet (mobile/desktop) e
nao requer extensao.

## Como usar (passo a passo)

1) Acesse `https://carlos79209.github.io/Stopts-cheat/` e clique em "Copiar bookmarklet".
2) No navegador, crie/edite um favorito e cole o bookmarklet no campo URL.
3) Abra `https://stopots.com` e entre em uma sala.
4) Toque no favorito "Stopots Helper" (o bookmarklet).
5) Use a bolinha flutuante para abrir o menu/painel.

## Tutorial: configurar o bookmarklet

1) Copie o bookmarklet no link acima.
2) Abra o gerenciador de favoritos do navegador.
3) Crie um novo favorito (ou edite um existente).
4) No campo URL/EndereÃ§o, cole o bookmarklet completo.
5) Salve. Para usar, abra o Stopots e toque no favorito.

## Configurar API Key (IA)

As sugestoes via IA usam OpenRouter. A chave precisa ficar salva no
`localStorage` do proprio site do Stopots.
Modelo atual: `mistralai/devstral-2512:free`.

No jogo:
1) Abra a bolinha -> "API Key".
2) Cole sua OpenRouter API Key e salve.

## Dicionario

- O helper usa dois dicionarios:
  - Dicionario do repositorio (carregado de `background.js`).
  - Dicionario do usuario salvo no `localStorage`.
- As palavras geradas pela IA sao salvas apenas no `localStorage`.

## Funcoes principais

- PREENCHER: preenche campos vazios com sugestoes do painel.
- AVALIAR E ADICIONAR: avalia e salva palavras validas no dicionario local.
- AVALIAR (usar botao do site): clica no botao do Stopots.
- Recarregar dicionario: recarrega repo + localStorage.
- API Key: salva a chave no `localStorage` do Stopots.

## Erros comuns e solucoes

1) "Defina sua OpenRouter API Key..."
   - A chave foi salva em outro dominio (ex: pagina config).
   - Solucao: abra o Stopots e use o botao "API Key" no menu do helper.

2) Botao PREENCHER coloca "Sem resposta"
   - Indica que nao existem sugestoes para a categoria.
   - Solucao: use "PREENCHER" para acionar IA ou adicione palavras no dicionario.

3) As palavras somem ao focar o campo
   - O helper restaura os valores automaticamente quando o input fica vazio.
   - Se ainda acontecer, clique em "PREENCHER" novamente.

4) Painel nao aparece
   - Verifique se o bookmarklet foi salvo corretamente no favorito.
   - Tente recarregar a pagina e ativar o favorito novamente.

5) Dicionario do repo nao carrega
   - O helper tenta carregar `background.js` da mesma pasta do `helper.mobile.js`.
   - Garanta que ambos estejam hospedados no mesmo local.

## Dicas

- Arraste a bolinha para reposicionar na tela.
- Toque fora do painel para fechar rapidamente.
