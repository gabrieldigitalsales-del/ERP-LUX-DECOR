# HOME ERP — Home Interiores

Versão **2.18.2**. Aplicação React/Vite preparada para GitHub + Vercel e instalação como PWA no computador.

## Rodar localmente
```bash
npm install
npm run dev
```

## Publicar
1. Envie a pasta do projeto para um repositório GitHub.
2. Importe o repositório na Vercel.
3. Framework: Vite. Build: `npm run build`. Output: `dist`.
4. Depois de publicada, abra a URL no Chrome ou Edge.

## Instalar como aplicativo no desktop
Abra o HOME ERP publicado e use **Configurações > Aplicativo no computador > Instalar no computador**. Se o navegador não liberar o botão ainda, use o ícone de instalação na barra de endereço ou **Menu > Instalar HOME ERP**. O sistema abre em janela própria e cria atalho com a identidade Home Interiores ERP.

## Fiscal
Configurações possui campos preparados para razão social, CNPJ, IE, CRT, CNAE, séries e numeração NF-e/NFC-e, ambiente fiscal, ID CSC e tipo de certificado.

**Não grave certificado, senha ou token CSC no navegador.** Esses segredos devem ir para o backend quando a integração SEFAZ for implementada.

## Auditoria
```bash
npm run audit
npm run test:release
```
