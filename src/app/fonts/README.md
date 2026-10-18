# Fuentes locales

Quicksand y Space Grotesk son las mismas familias que ya utiliza la interfaz. Se incluyen sus archivos WOFF2 variables del subconjunto latino, con los caracteres españoles, servidos por Google Fonts. Se usan los pesos 500–700 mediante `next/font/local`.

Al versionar los archivos, Next puede compilar y arrancar sin contactar a Google Fonts ni pasar por el importador de `next/font/google` de Turbopack. Este último impidió arrancar el shard e2e 2/2 tras fusionar el PR #83 (`next/font/google queries have exactly one entry`).

Fuentes originales y licencias SIL Open Font License 1.1:

- [Quicksand](https://github.com/google/fonts/tree/main/ofl/quicksand): `quicksand-OFL.txt`.
- [Space Grotesk](https://github.com/google/fonts/tree/main/ofl/spacegrotesk): `space-grotesk-OFL.txt`.

Los archivos conservan su contenido original; no se han modificado sus glifos o nombres.
