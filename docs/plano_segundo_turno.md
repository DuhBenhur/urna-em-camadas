# Plano: o 2º turno no site (26/10/2026)

Lula foi reeleito em 25/10/2026 (64.256.232 votos, 51,79% dos válidos; Flávio Bolsonaro 59.826.041, 48,21%). Este plano leva o
site do "Onde virar voto" (a ferramenta da campanha) para o resultado do 2º turno.

## 1. O pedido e as decisões do usuário (26/10)

O plano proposto em 26/10 recomendava manter a neutralidade (mapa com os dois lados, "virou" nos dois sentidos, foto fora do site).
O usuário decidiu de outro jeito:

| | Decisão | Situação |
|---|---|---|
| E1 | **O site toma lado** depois do resultado: celebra a reeleição de Lula ("Viva o governo Lula!", assinado pelo autor). Durante a campanha o site foi neutro; a ferramenta da campanha fica no ar como era | feito |
| E2 | **O mapa pinta de vermelho só onde Lula ganhou** e marca onde virou, em verde (o tom de vermelho mais forte, no tema escuro, parecia "menos votos"); onde Flávio ganhou, cinza | feito |
| E3 | **A foto é a imagem principal** da abertura (e da imagem de compartilhamento). A foto enviada primeiro não estava no Flickr do Lula Oficial (licença não confirmada); o usuário escolheu, do mesmo ato, a vista aérea da Paulista: Ricardo Stuckert / Lula Oficial, “24.10.2026 - Lula em São Paulo: O Brasil Pronto Pra Mais” (https://www.flickr.com/photos/lulaoficial/55610270110/), CC BY-SA 4.0 | feito, com o crédito |
| E4 | A inicial passa a ser o 2º turno; a ferramenta vai para `#/ferramenta`, como registro, e os links antigos continuam abrindo | feito |
| E5 | Publicar em ondas, conforme o TSE libera os dados | onda 1 feita |

O que não muda com o lado: os números são os oficiais, conferidos; os textos dizem o que os dados mostram, inclusive o que não
favorece a narrativa (a cidade que virou para Flávio, os estados onde a abstenção subiu); lugares, nunca pessoas; a contagem de
visitas continua sem enviar candidato, zona, seção ou escola.

## 2. Dados (o que existe em 26/10)

| Dado | Situação | Uso |
|---|---|---|
| Resultado oficial por município (resultados.tse.jus.br, eleição 6258) | publicado, 100% totalizado | onda 1 |
| Boletins de urna do 2º turno (bweb_2t, Portal de Dados Abertos) | não publicado em 26/10 (o do 1º turno saiu no dia seguinte, 14h) | onda 2 |
| Arquivos de urna (log e RDV) do 2º turno | não publicado (em 2022 saíram 3 dias depois) | onda 2 |
| Comparecimento por faixa etária e zona (perfil_comparecimento_abstencao) | só o 1º turno (publicado 17 dias depois da eleição) | onda 3 |

## 3. Onda 1 (feita em 26/10): o 2º turno por cidade

- `pipeline/13_segundo_turno.py`: baixa o resultado oficial de cada município (5.571 + 186 do exterior), o do Brasil e o de cada UF,
  e o do Brasil no 1º turno; confere a soma dos municípios com o total do Brasil (13 campos) e com cada UF, a totalização de 100% e o
  comparecimento e a abstenção contra o arquivo de abrangência de cada UF. Grava `data/processed/resultado_2t_municipio_2026.parquet`
  e `resultados/13_segundo_turno.json`.
- `pipeline/03_validar_controle.py`: confere os totais do 2º turno contra o resultado anunciado e que todo município do 1º turno tem o 2º.
- `pipeline/07_exportar_site.py`: `segundo_turno.json` (Brasil oficial nos dois turnos, o país sem o exterior, estados e municípios),
  com a trava "país + exterior = Brasil oficial".
- Site: a inicial `#/` (`pages/SegundoTurno.tsx`, `components/MapaSegundoTurno.tsx`, `lib/segundo.ts`): a abertura com a foto, o mapa
  com três vistas (onde Lula ganhou e onde virou; onde mais avançou; onde mais gente foi votar), a cidade com os dois turnos, as cidades
  que viraram, os estados, a abstenção por estado, a cronologia das 17h às 19h com as fontes e a conferência da soma. Estado na URL:
  `?e=UF&cidade={código TSE}&v=avanco|votar`.
- Definições: **virou** = entre os dois finalistas, Flávio à frente no 1º turno e Lula no 2º; **avançou** = margem Lula − Flávio
  (proporção dos válidos) no 2º turno menos a do 1º; **abstenção** = (aptos − comparecimento) ÷ aptos, em cada turno.
- Números: Lula ganhou em 2.875 das 5.571 cidades; virou em 211 (10,9 milhões de eleitores; Rio de Janeiro, Osasco, Ananindeua,
  Macapá...); uma cidade virou para Flávio (Uirapuru, GO); Minas Gerais virou (Flávio +4,9 → Lula +0,9). Abstenção 21,08% → 19,22%
  (oficial, com o exterior): 2.960.239 pessoas a mais votaram; a abstenção subiu em 9 estados: os 7 do Norte, o Maranhão e o Piauí.

## 4. Onda 2 (quando o TSE publicar os boletins e os arquivos de urna do 2º turno)

1. **Pronto em 26/10, a pedido do usuário ("saber qual escola virou"):** `pipeline/14_secoes_segundo_turno.py` procura os bweb_2t
   no portal (API do CKAN; sai com código 3 enquanto não saem), baixa com SHA-512, monta a base por seção (com a hora de abertura e
   de encerramento de cada urna) e só grava se a soma das urnas de cada município for igual ao resultado oficial dele (13). O `07`
   soma as urnas por escola (`aptos_2`, `faltosos_2`, `validos_2`, `v13_2`, `v22_2` nos arquivos de locais) com a trava
   `conferir_escolas_2t`, e a inicial mostra, no cartão da cidade, "As escolas de …": o mapa (quem ganhou cada escola e onde virou),
   as escolas que viraram e todas as escolas nos dois turnos (`components/EscolasSegundoTurno.tsx`). Ensaio com os boletins do
   1º turno (`--ensaio`): 497.897 urnas e 94.087 escolas fecham sem nenhuma diferença; a trava pega um voto a mais.
2. **Publicado em 29/10 com o resultado oficial por seção.** Em 26/10 o TSE atualizou votacao_secao e
   detalhe_votacao_secao com o 2º turno (antes dos boletins). O `14 --fonte totalizacao` monta a base por seção a partir deles:
   as 497.897 urnas fecham com os 5.571 municípios em 8 campos e as 94.087 escolas também (trava do `07`). Lula ganhou em
   55.069 escolas; 4.704 viraram para ele e 97 para Flávio (em Maceió, 54 das 230). O `09` passou a filtrar `NR_TURNO = '1'`,
   porque os mesmos arquivos agora trazem os dois turnos (os zips do 1º turno ficam com o nome antigo; os novos, com `_com_2t`).
3. **Votos depois das 17h (27/10):** 34.330, segundo levantamento da Setup News para a CNN Brasil com dados do TSE (13.961 no
   1º minuto, 29.001 até 17h05, 5.329 de 17h05 até o último voto, às 19h06); o G1, com os logs das 497.897 seções, chegou a
   35.521. Não há número oficial do TSE. A inicial mostra um gráfico com a cronologia numerada (inclusive o pedido recebido por
   Nunes Marques por volta das 13h30, segundo a Jovem Pan, e a ligação Zanin–Nunes Marques–Fachin que restringiu a decisão) e
   a curva dos votos depois das 17h (`components/GraficoHorario.tsx`).
   **Conta própria (29/10):** `pipeline/15_votos_depois_17h.py` leu os logs das urnas do 2º turno (publicados em 26/10, às 19h56:
   123 GB nos 27 estados, um estado por vez, apagando o zip), com o desenho registrado no plano de análise antes de rodar. Resultado:
   34.330 votos depois das 17h, igual ao da Setup News nos três números publicados (13.961 no 1º minuto, 29.001 até 17h05, 5.329
   depois); último voto às 19h06:21. Conferem com o resultado oficial 497.889 das 497.896 urnas com log (nas 7 que não conferem,
   nenhum voto depois das 17h); 1 urna sem log. No 1º turno, sem prorrogação, as mesmas urnas registraram 3.710.586 votos depois
   das 17h (108 vezes mais), o último às 23h47. A inicial mostra a curva acumulada, o gráfico por minuto dos dois turnos, as
   tabelas e a conta por estado (`site/public/dados/horario.json`, copiado pelo `07` de `resultados/15_votos_depois_17h.json`).
3. **Das 17h às 19h, com números:** o boletim traz a hora de abertura e de encerramento de cada urna, no fuso local (no Acre a urna
   abre às 06:00 = 8h de Brasília). Inferir o fuso de cada município pela hora de abertura e contar as urnas encerradas depois das 17h
   de Brasília, comparando com o 1º turno (a fila normal também passa das 17h). Com os logs, contar os votos registrados depois das
   17h e fazer a conta "mesmo que todos fossem para o mesmo candidato". O log diz quando, não em quem; o RDV diz em quem, não quando.
4. Registrar o desenho dessas contas em `docs/plano_de_analise.md` antes de ver os dados.

## 5. Onda 3 (quando sair o comparecimento por faixa etária do 2º turno)

Comparar o comparecimento por faixa etária entre os turnos, por zona (contagem oficial, não estimativa), com destaque para 70 anos ou
mais e 16–17 anos (voto facultativo). Linguagem: "onde mais pessoas de 70 anos ou mais votaram", nunca "levaram idosos" (transporte de
eleitores é crime).

## 6. Pendências

- Foto: resolvida em 26/10 (crédito e licença na abertura, no Sobre e no README). A CC BY-SA 4.0 pede que as versões recortadas
  (`site/public/foto/`) e a imagem de compartilhamento (`site/public/og.jpg`, JPEG abaixo de 300 kB por causa do WhatsApp) sigam sob
  a mesma licença.
- Ondas 2 e 3.
- Pedido de anulação anunciado por Flávio Bolsonaro: se o TSE ou o STF decidirem algo, atualizar a cronologia.
