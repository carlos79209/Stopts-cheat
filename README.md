# Stopots Helper

Este projeto adiciona um painel flutuante com sugestoes, preenchimento automatico
e validacao para o jogo Stopots. Funciona via bookmarklet (mobile/desktop) e
nao requer extensao.
<img width="488" height="457" alt="image" src="https://github.com/user-attachments/assets/1e1eef04-43ca-47c7-951b-17ffc6bb0dc9" />
<img width="278" height="240" alt="image" src="https://github.com/user-attachments/assets/50269c75-53b5-428a-a618-df4090aa23c2" />
<img width="304" height="543" alt="image" src="https://github.com/user-attachments/assets/da2d145b-3d85-4f8f-b899-b90dade56f23" />
<img width="312" height="254" alt="image" src="https://github.com/user-attachments/assets/00fafce9-a8c6-4f25-86c5-0f20afdb8df5" />



## Como usar (passo a passo)

1) Acesse `https://carlos79209.github.io/Stopts-cheat/` e clique em "Copiar bookmarklet".
2) No navegador, crie/edite um favorito e cole o bookmarklet no campo URL.
3) Abra `https://stopots.com` e entre em uma sala, (não funciona no aplicativo, apenas no site).
4) Toque no favorito "Stopots Helper" (o bookmarklet).
5) Use a bolinha flutuante para abrir o menu/painel.

## Tutorial: configurar o bookmarklet

1) Copie o bookmarklet no link acima.
2) Abra o gerenciador de favoritos do navegador.
3) Crie um novo favorito (ou edite um existente).
4) No campo URL/Endereço, cole o bookmarklet completo.
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

## Importar / Exportar dicionario

No jogo:
1) Abra a bolinha -> "Configurar dicionario".
2) Use "Exportar dicionario" para copiar o JSON atual.
3) Cole um JSON valido e toque em "Importar dicionario" para mesclar.

## Funcoes principais

- PREENCHER: preenche campos vazios com sugestoes do painel.
- AVALIAR E ADICIONAR: avalia e salva palavras validas no dicionario local.
- AVALIAR (usar botao do site): clica no botao do Stopots.
- Recarregar dicionario: recarrega repo + localStorage.
- API Key: salva a chave no `localStorage` do Stopots.

## Dicas

- Arraste a bolinha para reposicionar na tela.
- Toque fora do painel para fechar rapidamente.
