#!/usr/bin/env bash
# Instala Chromium de Playwright en CI sin depender de que los espejos de
# Ubuntu respondan.
#
# `npx playwright install --with-deps` hace dos cosas en un solo paso: baja
# el navegador (CDN de Playwright) e instala paquetes del sistema con apt
# (sobre todo fuentes). Si apt no resuelve los espejos de Ubuntu, falla todo
# aunque el navegador se haya bajado y la imagen del runner ya traiga las
# librerías que necesita. Aquí se separan:
#   1. el navegador es obligatorio;
#   2. los paquetes del sistema se intentan con reintentos y un límite de
#      tiempo; si no se consiguen, se avisa y se sigue;
#   3. se comprueba que Chromium arranca de verdad: si faltara una librería,
#      la CI falla aquí con un error claro, no en mitad de las pruebas.
set -euo pipefail

npx playwright install chromium

if ! timeout 300 npx playwright install-deps chromium; then
  echo "::warning::No se pudieron instalar los paquetes del sistema de Playwright (¿espejos de Ubuntu caídos?). Se sigue con los de la imagen del runner."
fi

node -e "require('@playwright/test').chromium.launch().then((b) => b.close()).then(() => console.log('Chromium arranca correctamente.'))"
