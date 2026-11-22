"""Tests for the workspace-scoped Trend Watch voiceover rewriter."""
import unittest
from unittest.mock import patch

import script_rewriter


class ScriptRewriteTests(unittest.TestCase):
    def test_rewrites_without_external_api_key(self):
        source = "A useful original video voiceover about choosing a practical daily tool."
        class FakeResponse:
            def raise_for_status(self):
                pass
            def json(self):
                return {"message": {"content": "An original short opening and a fresh product-focused spoken script."}}

        with patch.object(script_rewriter.httpx, "post", return_value=FakeResponse()) as post:
            result = script_rewriter.rewrite_voiceover(
                source, "Portable device for commuters", "en", "commuting, portable"
            )
        self.assertEqual(result["provider"], "ollama")
        self.assertTrue(result["text"].startswith("An original"))
        args, kwargs = post.call_args
        self.assertEqual(kwargs["json"]["stream"], False)
        self.assertIn("commuting, portable", kwargs["json"]["messages"][1]["content"])
        self.assertIn("fresh wording", kwargs["json"]["messages"][0]["content"])

    def test_rejects_empty_transcript_without_model_call(self):
        with patch.object(script_rewriter.httpx, "post") as post:
            with self.assertRaises(ValueError):
                script_rewriter.rewrite_voiceover("Too short", "")
            post.assert_not_called()

    def test_model_failure_is_safe(self):
        with patch.object(script_rewriter.httpx, "post", side_effect=script_rewriter.httpx.ConnectError("secret-host")):
            with self.assertRaisesRegex(RuntimeError, "temporarily unavailable") as ctx:
                script_rewriter.rewrite_voiceover("Enough transcript text here for a meaningful rewrite.", "")
            self.assertNotIn("secret-host", str(ctx.exception))


if __name__ == "__main__":
    unittest.main()
