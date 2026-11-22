"""Tests for Trend Watch transcription provider selection and local fallback."""
import sys
import tempfile
import types
import unittest
from pathlib import Path
from unittest.mock import patch

import analyzer


class TranscriptionFallbackTests(unittest.TestCase):
    def test_local_whisper_when_no_api_credentials(self):
        class FakeSegment:
            def __init__(self, start, end, text):
                self.start, self.end, self.text = start, end, text

        class FakeWhisperModel:
            def __init__(self, model_name, **kwargs):
                self.model_name = model_name
                self.kwargs = kwargs

            def transcribe(self, audio_path, **kwargs):
                return (
                    iter([
                        FakeSegment(0.0, 1.25, " Hello"),
                        FakeSegment(1.25, 2.5, " world!"),
                    ]),
                    types.SimpleNamespace(language="en"),
                )

        fake_module = types.ModuleType("faster_whisper")
        fake_module.WhisperModel = FakeWhisperModel

        with tempfile.TemporaryDirectory() as temp:
            output_dir = Path(temp)
            def stub_extract_audio(_video, destination):
                destination.write_bytes(b"fake audio")

            with (
                patch.object(analyzer, "GROQ_API_KEY", ""),
                patch.object(analyzer, "OPENAI_API_KEY", ""),
                patch.object(analyzer, "DATA_DIR", output_dir),
                patch.object(analyzer, "extract_audio", stub_extract_audio),
                patch.dict(sys.modules, {"faster_whisper": fake_module}),
            ):
                result = analyzer.transcribe(output_dir / "video.mp4", output_dir)

            self.assertTrue(result["enabled"])
            self.assertEqual(result["provider"], "local-whisper")
            self.assertEqual(result["language"], "en")
            self.assertEqual(result["text"], "Hello world!")
            self.assertEqual(result["segments"], [
                {"start": 0.0, "end": 1.25, "text": "Hello"},
                {"start": 1.25, "end": 2.5, "text": "world!"},
            ])


if __name__ == "__main__":
    unittest.main()
