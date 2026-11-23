import unittest
from pathlib import Path
from unittest.mock import patch
from subprocess import CompletedProcess

from link_transcription import validate_social_url, transcribe_public_video


class LinkTranscriptionTests(unittest.TestCase):
    def test_supported_instagram_and_tiktok_video_links(self):
        cases = [
            ("https://www.instagram.com/reel/DbOQEKCuQHc/", "instagram"),
            ("https://instagram.com/p/DbOQEKCuQHc", "instagram"),
            ("https://www.tiktok.com/@creator/video/7383949200000000000", "tiktok"),
            ("https://vm.tiktok.com/ZMabcdef/", "tiktok"),
        ]
        for url, platform in cases:
            with self.subTest(url=url):
                self.assertEqual(validate_social_url(url)[0], platform)

    def test_rejects_ssrf_credentials_and_non_video_links(self):
        bad = [
            "http://instagram.com/reel/DbOQEKCuQHc/",
            "https://instagram.com.evil.test/reel/DbOQEKCuQHc",
            "https://127.0.0.1/video/7383949200000000000",
            "https://www.tiktok.com@evil.test/@a/video/7383949200000000000",
            "https://www.tiktok.com:444/@a/video/7383949200000000000",
            "https://www.instagram.com/accounts/login/",
            "file:///etc/passwd",
            "https://www.tiktok.com/@username",
        ]
        for url in bad:
            with self.subTest(url=url):
                with self.assertRaises(ValueError):
                    validate_social_url(url)

    def test_download_and_whisper_flow(self):
        def downloaded(command, **kwargs):
            out = command[command.index("--output") + 1].replace("%(ext)s", "mp4")
            file = Path(out)
            file.write_bytes(b"video bytes")
            return CompletedProcess(command, 0, stdout=str(file) + "\\n", stderr="")

        with (
            patch("link_transcription.subprocess.run", side_effect=downloaded) as execute,
            patch("link_transcription.metadata", return_value={"duration_seconds": 48}),
            patch("link_transcription.transcribe", return_value={
                "enabled": True, "text": "Sample transcript", "segments": [], "provider": "local-whisper"
            }) as whisper,
        ):
            result = transcribe_public_video("https://www.instagram.com/reel/DbOQEKCuQHc/")
        self.assertEqual(result["transcript"]["text"], "Sample transcript")
        self.assertEqual(result["platform"], "instagram")
        self.assertIn("--no-playlist", execute.call_args.args[0])
        self.assertTrue(whisper.called)


if __name__ == "__main__":
    unittest.main()
