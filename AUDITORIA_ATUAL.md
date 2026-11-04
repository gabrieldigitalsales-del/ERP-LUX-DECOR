# Auditoria atual — HOME ERP v2.18.3

## PWA
- Manifest presente e configurado como `standalone`.
- Ícones 192 e 512 presentes.
- Service Worker versionado e registrado pela aplicação.
- App shell armazenado para fallback offline depois da primeira carga publicada.
- Atualizações do Service Worker são notificadas dentro do HOME ERP.
- Rotas `/api/*` não são armazenadas pelo Service Worker.
- Botão de instalação funciona com `beforeinstallprompt` quando disponível.

## Observação
A instalação PWA exige contexto seguro: Vercel/HTTPS ou localhost. Abrir `index.html` diretamente pelo Explorer não instala PWA.
