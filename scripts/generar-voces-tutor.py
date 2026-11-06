"""Genera los audios del tutor visual a partir del guion compartido.

El texto vive en src/components/learning/tutor/guion.json: la interfaz muestra
ese mismo texto como alternativa, así que voz y subtítulo no se desincronizan.

Motor por defecto: Azure AI Speech (servicio con licencia para distribuir el
audio generado). Se usa su API REST, sin SDK:

  AZURE_SPEECH_KEY=<clave> AZURE_SPEECH_REGION=<región> \\
    python scripts/generar-voces-tutor.py --todos

  Requisitos: pip install truststore

Motor ElevenLabs (--motor elevenlabs), voz de español latino:

  ELEVENLABS_API_KEY=<clave> ELEVENLABS_VOICE_ID=<id de la voz> \
    python scripts/generar-voces-tutor.py --motor elevenlabs --todos

  Modelo eleven_multilingual_v2 con language_code "es". La voz se elige en
  la Voice Library de ElevenLabs (filtro: Spanish, Latin American) y se
  añade a «My voices» para usar su id. Con el plan gratuito el audio no
  admite uso comercial y exige atribución; desde Starter se puede usar.

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
  python scripts/generar-voces-tutor.py --todos --solo=grupos-1-intro   # un clip de prueba
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


def elevenlabs(texto: str, archivo: Path) -> None:
    clave = os.environ.get("ELEVENLABS_API_KEY")
    voz = os.environ.get("ELEVENLABS_VOICE_ID")
    if not clave or not voz:
        sys.exit("Faltan ELEVENLABS_API_KEY y ELEVENLABS_VOICE_ID.")
    cuerpo = {
        "text": texto,
        "model_id": os.environ.get("ELEVENLABS_MODEL", "eleven_multilingual_v2"),
        "language_code": "es",
        # Estable y clara para niños: poca variación entre clips, ritmo pausado.
        "voice_settings": {"stability": 0.6, "similarity_boost": 0.8, "style": 0.15, "use_speaker_boost": True, "speed": 0.92},
    }
    peticion = urllib.request.Request(
        f"https://api.elevenlabs.io/v1/text-to-speech/{voz}?output_format=mp3_44100_64",
        data=json.dumps(cuerpo).encode("utf-8"),
        headers={"xi-api-key": clave, "Content-Type": "application/json", "Accept": "audio/mpeg", "User-Agent": "maths-tutor-voces"},
        method="POST",
    )
    with urllib.request.urlopen(peticion, timeout=120) as respuesta:
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
    if motor not in ("azure", "elevenlabs", "edge"):
        sys.exit("--motor debe ser azure, elevenlabs o edge")
    DESTINO.mkdir(parents=True, exist_ok=True)
    solo = next((a.split("=", 1)[1] for a in sys.argv if a.startswith("--solo=")), None)
    for nombre, texto in clips(guion):
        if solo and nombre != solo:
            continue
        archivo = DESTINO / f"{nombre}.mp3"
        if archivo.exists() and not todos:
            continue
        if motor == "azure":
            azure(texto, guion["voz"], guion["velocidad"], archivo)
        elif motor == "elevenlabs":
            elevenlabs(texto, archivo)
        else:
            await edge(texto, guion["voz"], guion["velocidad"], archivo)
        print(f"✓ {archivo.relative_to(RAIZ)} ({motor})")


asyncio.run(main())
