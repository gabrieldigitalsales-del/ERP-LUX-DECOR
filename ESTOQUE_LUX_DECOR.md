# Estoque Lux Decor — 04/11/2026

Relação de estofados LUART, BOARETO, MAIS ESTOFADOS e showroom EDN cadastrada em `src/data/luxCurrentStock.json`.

- 37 variações de estofados e 17 produtos EDN únicos (54 cadastros).
- 41 unidades informadas explicitamente, sem estimativa para os registros sem quantidade.
- Registros sem quantidade têm `stock: 0`, `inventoryPending: true` e observação clara; zero é apenas o valor operacional inicial, **não significa ausência confirmada de peças**.
- Rack Legacy 2,00 m e Painel Avant 1,80 m repetidos foram consolidados; no segundo há uma ressalva de possível venda.
- Em instalações novas, os registros são pré-carregados; em instalações com dados no navegador, acesse Estoque > Importar relação para adicionar apenas cadastros faltantes.
- A importação não sobrescreve estoque de registros já existentes e não gera movimentações fictícias.
- Os dados persistem localmente no navegador; implantar no GitHub não sincroniza automaticamente bancos de dados de outros dispositivos.
- Valores de venda não informados foram deixados como zero e precisam de cadastro antes de vendas.
