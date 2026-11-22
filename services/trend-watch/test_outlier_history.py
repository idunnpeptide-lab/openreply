"""Regression tests for historical Reel collection and server-side views ranking."""
import unittest
from unittest.mock import patch

import app as trend


class HistoryCollectionTests(unittest.TestCase):
    def test_traverses_old_reel_pages_until_no_cursor(self):
        calls = []
        def fake_scrape(_path, **kwargs):
            calls.append(kwargs.get("cursor"))
            if kwargs.get("cursor") is None:
                return {
                    "user": {"username": "competitor"},
                    "reels": [{"code": "recent"}],
                    "next_cursor": "older1",
                    "has_more": True,
                }
            return {
                "user": None,
                "reels": [{"code": "old-viral"}],
                "next_cursor": None,
                "has_more": False,
            }
        with (
            patch.object(trend, "REEL_PAGES", 50),
            patch.object(trend, "scraper_get", side_effect=fake_scrape),
        ):
            _, reels = trend.scraper_reels("competitor")
        self.assertEqual(calls, [None, "older1"])
        self.assertEqual([reel["code"] for reel in reels], ["recent", "old-viral"])

    def test_repeated_cursor_stops_cleanly(self):
        def repeat_cursor(_path, **kwargs):
            return {"reels": [{"code": "one"}], "has_more": True, "next_cursor": "same"}
        with (
            patch.object(trend, "REEL_PAGES", 50),
            patch.object(trend, "scraper_get", side_effect=repeat_cursor) as mock,
        ):
            trend.scraper_reels("competitor")
        self.assertEqual(mock.call_count, 2)

    def test_all_time_views_filter_and_pagination_are_applied_in_sql(self):
        statements = []
        def fake_one(sql, params):
            statements.append((sql, params))
            return {"total": 1234}
        def fake_all(sql, params):
            statements.append((sql, params))
            return [{"code": "older-most-viewed", "plays": 999999}]
        with (
            patch.object(trend, "query_one", side_effect=fake_one),
            patch.object(trend, "query_all", side_effect=fake_all),
        ):
            result = trend.outliers(
                period="all", sort="plays", username="competitor",
                min_outlier=0, limit=60, offset=60, workspace_id="test-workspace"
            )
        self.assertEqual(result["total"], 1234)
        self.assertTrue(result["has_more"])
        self.assertEqual(result["items"][0]["code"], "older-most-viewed")
        select_sql, query_params = statements[1]
        self.assertIn("ORDER BY r.plays DESC NULLS LAST", select_sql)
        self.assertIn("LOWER(r.username) = LOWER(%s)", select_sql)
        self.assertNotIn("r.published_at >= %s", select_sql)
        self.assertEqual(query_params[-2:], (60, 60))

    def test_page_size_is_bounded_without_restricting_total_history(self):
        with (
            patch.object(trend, "query_one", return_value={"total": 30000}),
            patch.object(trend, "query_all", return_value=[]),
        ):
            result = trend.outliers(
                period="all", sort="plays", limit=999, offset=300,
                workspace_id="test-workspace"
            )
        self.assertEqual(result["total"], 30000)
        self.assertEqual(result["limit"], 100)


if __name__ == "__main__":
    unittest.main()
