# Async TTS using Edge TTS with a gTTS fallback. Returns base64-encoded audio.

import base64
from typing import Optional

import edge_tts
from gtts import gTTS
from io import BytesIO


async def generate_audio_async(text: str) -> Optional[str]:
    """
    Generate TTS audio as a base64-encoded MP3 string.

    Flow:
    1) Try Edge TTS (ar-SA-HamedNeural or ar-SA-ZariyahNeural).
    2) If Edge fails or returns no audio, fall back to gTTS.
    3) Return base64-encoded audio, or None on total failure.
    """
    if not text or not text.strip():
        print("TTS: Empty text, skipping.")
        return None

    clean_text = text.strip()
    print(f"TTS input text (first 80 chars): {clean_text[:80]!r}")

    # 1) TRY EDGE_TTS FIRST
    try:
        voice = "ar-SA-HamedNeural "
        communicate = edge_tts.Communicate(clean_text, voice)

        audio_bytes = b""
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                audio_bytes += chunk["data"]
            elif chunk["type"] == "error":
                print(f"Edge TTS stream error chunk: {chunk}")

        print(f"Edge TTS raw bytes length: {len(audio_bytes)}")

        if audio_bytes:
            audio_b64 = base64.b64encode(audio_bytes).decode("utf-8")
            print(f" Edge TTS base64 length: {len(audio_b64)}")
            return audio_b64
        else:
            print("Edge TTS produced no audio data, will try gTTS fallback.")

    except Exception as e:
        print(f"❌ Edge TTS Error: {repr(e)}")
        print("⚠️ Will try gTTS fallback...")

    # 2) FALLBACK: GTTS
    try:
        tts = gTTS(clean_text, lang="ar")
        buf = BytesIO()
        tts.write_to_fp(buf)
        audio_bytes = buf.getvalue()

        print(f"gTTS raw bytes length: {len(audio_bytes)}")

        if not audio_bytes:
            print("⚠️ gTTS also produced no audio; returning None.")
            return None

        audio_b64 = base64.b64encode(audio_bytes).decode("utf-8")
        print(f"gTTS base64 length: {len(audio_b64)}")
        return audio_b64

    except Exception as e:
        print(f"❌ gTTS Error: {repr(e)}")
        return None
