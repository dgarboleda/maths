"""Genera los audios del tutor visual a partir del guion compartido.

El texto vive en src/components/learning/tutor/guion.json: la interfaz muestra
ese mismo texto como alternativa, así que voz y subtítulo no se desincronizan.

Requisitos (fuera del repositorio):  pip install edge-tts truststore

TLS: edge-tts verifica con el paquete certifi, que no incluye las CA de una
red corporativa o de un proxy con inspección TLS (de ahí el
SSLCertVerificationError «self-signed certificate in certificate chain»).
`truststore` hace que Python verifique con el almacén de certificados del
sistema operativo (Windows, macOS o Linux), donde el administrador ya instaló
esas CA. La verificación sigue activa: nunca se desactiva.
El proxy se toma de HTTPS_PROXY si existe.

Uso:
  python scripts/generar-voces-tutor.py            # solo los que faltan
  python scripts/generar-voces-tutor.py --todos    # regenera todos
  python scripts/generar-voces-tutor.py --listar   # muestra el guion
"""
import asyncio
import json
import os
import sys
from pathlib import Path

try:
    import truststore

    truststore.inject_into_ssl()  # antes de importar edge_tts: crea su contexto TLS al importarse
except ImportError:
    print("Aviso: falta 'truststore'; se usarán solo las CA de certifi.", file=sys.stderr)

RAIZ = Path(__file__).resolve().parent.parent
GUION = RAIZ / "src" / "components" / "learning" / "tutor" / "guion.json"
DESTINO = RAIZ / "public" / "audio" / "tutor"


def clips(guion: dict):
    for tutorial in guion["tutoriales"].values():
        for escena in tutorial["escenas"]:
            for parte in ("intro", "pista", "logro"):
                yield f"{escena['id']}-{parte}", escena[parte]
    for clave, texto in guion["avisos"].items():
        yield clave, texto


async def main() -> None:
    guion = json.loads(GUION.read_text(encoding="utf-8"))
    todos = "--todos" in sys.argv
    if "--listar" in sys.argv:
        for nombre, texto in clips(guion):
            print(f"{nombre}: {texto}")
        return
    import edge_tts

    DESTINO.mkdir(parents=True, exist_ok=True)
    proxy = os.environ.get("HTTPS_PROXY") or os.environ.get("https_proxy")
    for nombre, texto in clips(guion):
        archivo = DESTINO / f"{nombre}.mp3"
        if archivo.exists() and not todos:
            continue
        await edge_tts.Communicate(texto, guion["voz"], rate=guion["velocidad"], proxy=proxy).save(str(archivo))
        print(f"✓ {archivo.relative_to(RAIZ)}")


asyncio.run(main())
