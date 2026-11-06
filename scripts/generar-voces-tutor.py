"""Genera los audios del tutor visual a partir del guion compartido.

El texto vive en src/components/learning/tutor/guion.json: la interfaz muestra
ese mismo texto como alternativa, así que voz y subtítulo no se desincronizan.

Motor por defecto: Azure AI Speech (servicio con licencia para distribuir el
audio generado). Se usa su API REST, sin SDK:

  AZURE_SPEECH_KEY=<clave> AZURE_SPEECH_REGION=<región> \\
    python scripts/generar-voces-tutor.py --todos

  Requisitos: pip install truststore

Motor alternativo, solo para borradores locales: --motor edge
(pip install edge-tts truststore). edge-tts usa el servicio de lectura en voz
alta de Edge, que no está pensado para distribuir audio.

TLS: `truststore` hace que Python verifique con el almacén de certificados del
sistema operativo, donde una red corporativa o un proxy con inspección TLS
instalan su CA. Evita el «self-signed certificate in certificate chain» sin
desactivar nunca la verificación. El proxy se toma de HTTPS_PROXY.

Uso:
  python scripts/generar-voces-tutor.py            # solo los que faltan
  python scripts/generar-voces-tutor.py --todos    # regenera todos
  python scripts/generar-voces-tutor.py --listar   # muestra el guion
"""
import asyncio
import json
import os
import sys
import urllib.request
from pathlib import Path
from xml.sax.saxutils import escape

try:
    import truststore

    truststore.inject_into_ssl()  # antes de importar clientes HTTP/TLS
except ImportError:
    print("Aviso: falta 'truststore'; se usarán solo las CA por defecto de Python.", file=sys.stderr)

RAIZ = Path(__file__).resolve().parent.parent
GUION = RAIZ / "src" / "components" / "learning" / "tutor" / "guion.json"
DESTINO = RAIZ / "public" / "audio" / "tutor"
FORMATO_AZURE = "audio-24khz-48kbitrate-mono-mp3"


def clips(guion: dict):
    """Solo lo que dice la voz (`voz`, `momentos`, `avisos.*.voz`), no el texto corto de pantalla."""
    for tutorial in guion["tutoriales"].values():
        for escena in tutorial["escenas"]:
            for parte in ("intro", "pista", "logro"):
                yield f"{escena['id']}-{parte}", escena["voz"][parte]
            for clave, texto in escena.get("momentos", {}).items():
                yield f"{escena['id']}-{clave}", texto
    for clave, aviso in guion["avisos"].items():
        yield clave, aviso["voz"]


def ssml(texto: str, voz: str, velocidad: str) -> str:
    idioma = "-".join(voz.split("-")[:2])
    return (
        f'<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="{idioma}">'
        f'<voice name="{voz}"><prosody rate="{velocidad}">{escape(texto)}</prosody></voice></speak>'
    )


def azure(texto: str, voz: str, velocidad: str, archivo: Path) -> None:
    clave = os.environ.get("AZURE_SPEECH_KEY")
    region = os.environ.get("AZURE_SPEECH_REGION")
    if not clave or not region:
        sys.exit("Faltan AZURE_SPEECH_KEY y AZURE_SPEECH_REGION (clave y región del recurso de Speech).")
    peticion = urllib.request.Request(
        f"https://{region}.tts.speech.microsoft.com/cognitiveservices/v1",
        data=ssml(texto, voz, velocidad).encode("utf-8"),
        headers={
            "Ocp-Apim-Subscription-Key": clave,
            "Content-Type": "application/ssml+xml",
            "X-Microsoft-OutputFormat": FORMATO_AZURE,
            "User-Agent": "maths-tutor-voces",
        },
        method="POST",
    )
    with urllib.request.urlopen(peticion, timeout=60) as respuesta:
        archivo.write_bytes(respuesta.read())


async def edge(texto: str, voz: str, velocidad: str, archivo: Path) -> None:
    import edge_tts

    proxy = os.environ.get("HTTPS_PROXY") or os.environ.get("https_proxy")
    await edge_tts.Communicate(texto, voz, rate=velocidad, proxy=proxy).save(str(archivo))


async def main() -> None:
    guion = json.loads(GUION.read_text(encoding="utf-8"))
    if "--listar" in sys.argv:
        for nombre, texto in clips(guion):
            print(f"{nombre}: {texto}")
        return
    todos = "--todos" in sys.argv
    motor = sys.argv[sys.argv.index("--motor") + 1] if "--motor" in sys.argv else "azure"
    if motor not in ("azure", "edge"):
        sys.exit("--motor debe ser azure o edge")
    DESTINO.mkdir(parents=True, exist_ok=True)
    for nombre, texto in clips(guion):
        archivo = DESTINO / f"{nombre}.mp3"
        if archivo.exists() and not todos:
            continue
        if motor == "azure":
            azure(texto, guion["voz"], guion["velocidad"], archivo)
        else:
            await edge(texto, guion["voz"], guion["velocidad"], archivo)
        print(f"✓ {archivo.relative_to(RAIZ)} ({motor})")


asyncio.run(main())
