"""Genera los clips revisables del tutor; requiere edge-tts instalado aparte."""
import asyncio
from pathlib import Path
import edge_tts

TEXTOS = {
    "unidades-1": "En el almacén hay ocho piezas y llegan cinco más. Vamos a agruparlas para contar mejor.",
    "unidades-2": "Una decena representa diez unidades. Podemos cambiar diez piezas por una decena sin cambiar la cantidad.",
    "grupos-1": "La ciudad instala tres filas de cuatro paneles. Cada fila tiene la misma cantidad.",
    "grupos-2": "Podemos contar los mismos paneles por filas o por columnas sin cambiar el total.",
    "fracciones-1": "Dos reservas del mismo tamaño contienen un medio y un cuarto. Para juntarlas necesitamos partes del mismo tamaño.",
    "fracciones-2": "Ahora las dos cantidades están expresadas en cuartos: dos cuartos y un cuarto.",
}

async def main():
    destino = Path(__file__).resolve().parent.parent / "public" / "audio" / "tutor"
    destino.mkdir(parents=True, exist_ok=True)
    for nombre, texto in TEXTOS.items():
        await edge_tts.Communicate(texto, "es-PE-CamilaNeural", rate="-10%").save(str(destino / f"{nombre}.mp3"))

asyncio.run(main())
