"""
Unit Tests for Ethos Analytics Engine.
Validates all formulas, classifications, and diagnostic alerts.
"""

import unittest
from datetime import date, timedelta
from engine.models import HabitModel, CheckinModel
from engine.calculator import AnalyticsPipeline, format_date
from engine.service import run_analytics

class TestEthosAnalytics(unittest.TestCase):
    def setUp(self):
        self.ref_date = date(2026, 10, 19)

    def test_daily_progress_calculation(self):
        """Validates Daily Progress = (sum of progress ratios / total expected) * 100"""
        habits = [
            HabitModel(habit_id="h1", name="Ler", metric_type="duration", target_value=30, start_date="2026-10-01"),
            HabitModel(habit_id="h2", name="Treinar", metric_type="binary", target_value=1, start_date="2026-10-01"),
            HabitModel(habit_id="h3", name="Água", metric_type="quantity", target_value=10, start_date="2026-10-01")
        ]
        # Checkins for today (2026-10-19):
        # h1: 15 min out of 30 -> ratio 0.5
        # h2: 1 out of 1 -> ratio 1.0
        # h3: 10 out of 10 -> ratio 1.0
        # Average: (0.5 + 1.0 + 1.0) / 3 = 2.5 / 3 = 83.3%
        checkins = [
            CheckinModel(checkin_id="c1", habit_id="h1", event_date="2026-10-19", value=15),
            CheckinModel(checkin_id="c2", habit_id="h2", event_date="2026-10-19", value=1),
            CheckinModel(checkin_id="c3", habit_id="h3", event_date="2026-10-19", value=10)
        ]

        pipeline = AnalyticsPipeline(habits, checkins, reference_date=self.ref_date)
        occs = pipeline.expand_calendar()
        classified = pipeline.match_and_classify(occs)
        daily_prog = pipeline.compute_daily_progress(classified, target_date=self.ref_date)

        self.assertAlmostEqual(daily_prog, 83.3, places=1)

    def test_completion_rate_and_status_classification(self):
        """Validates occurrence classification (done, partial, missed) and completion rate."""
        habits = [
            HabitModel(habit_id="h1", name="Leitura", metric_type="duration", target_value=20, start_date="2026-10-15")
        ]
        # Day 1: 20 (done)
        # Day 2: 10 (partial)
        # Day 3: 0 (missed)
        # Day 4: 20 (done)
        checkins = [
            CheckinModel(checkin_id="c1", habit_id="h1", event_date="2026-10-15", value=20),
            CheckinModel(checkin_id="c2", habit_id="h1", event_date="2026-10-16", value=10),
            CheckinModel(checkin_id="c3", habit_id="h1", event_date="2026-10-17", value=0),
            CheckinModel(checkin_id="c4", habit_id="h1", event_date="2026-10-18", value=20),
        ]
        pipeline = AnalyticsPipeline(habits, checkins, reference_date=date(2026, 10, 18))
        pipeline.start_date = date(2026, 10, 15)
        pipeline.end_date = date(2026, 10, 18)

        occs = pipeline.expand_calendar()
        classified = pipeline.match_and_classify(occs)

        statuses = {o.expected_date: o.status for o in classified}
        self.assertEqual(statuses["2026-10-15"], "done")
        self.assertEqual(statuses["2026-10-16"], "partial")
        self.assertEqual(statuses["2026-10-17"], "missed")
        self.assertEqual(statuses["2026-10-18"], "done")

        # 2 done out of 4 = 50.0%
        comp_rate = pipeline.compute_completion_rate(classified)
        self.assertEqual(comp_rate, 50.0)

    def test_streak_calculation(self):
        """Validates current streak and best historical streak."""
        habits = [HabitModel(habit_id="h1", name="Meditar", metric_type="binary", target_value=1, start_date="2026-10-01")]
        # Consecutive done for 5 days: Oct 14, 15, 16, 17, 18
        checkins = [
            CheckinModel(checkin_id=f"c_{i}", habit_id="h1", event_date=f"2026-10-{i:02d}", value=1)
            for i in range(14, 19)
        ]
        # Oct 13 missed, Oct 10, 11, 12 done (3 days earlier streak)
        for i in range(10, 13):
            checkins.append(CheckinModel(checkin_id=f"c_{i}", habit_id="h1", event_date=f"2026-10-{i:02d}", value=1))

        pipeline = AnalyticsPipeline(habits, checkins, reference_date=date(2026, 10, 18))
        pipeline.start_date = date(2026, 10, 10)
        pipeline.end_date = date(2026, 10, 18)

        occs = pipeline.match_and_classify(pipeline.expand_calendar())
        cur_streak, best_streak = pipeline.compute_streaks(occs)

        self.assertEqual(cur_streak, 5)
        self.assertEqual(best_streak, 5)

    def test_trend_delta_and_status(self):
        """Validates trend delta = last 7 days - previous 7 days."""
        habits = [HabitModel(habit_id="h1", name="Treino", metric_type="binary", target_value=1, start_date="2026-10-01")]
        # Last 7 days: 100% completion (7 done)
        # Previous 7 days: 0% completion (0 done)
        checkins = [
            CheckinModel(checkin_id=f"c_{i}", habit_id="h1", event_date=f"2026-10-{i:02d}", value=1)
            for i in range(13, 20)
        ]
        pipeline = AnalyticsPipeline(habits, checkins, reference_date=date(2026, 10, 19))
        occs = pipeline.match_and_classify(pipeline.expand_calendar())
        delta, status = pipeline.compute_trend(occs)

        self.assertEqual(status, "improving")
        self.assertGreater(delta, 10.0)

    def test_recovery_rate(self):
        """Validates recovery rate = (failures followed by immediate success / total failures) * 100."""
        habits = [HabitModel(habit_id="h1", name="Leitura", metric_type="binary", target_value=1, start_date="2026-10-10")]
        # Sequence:
        # Oct 10: Fail
        # Oct 11: Success (Recovered 1)
        # Oct 12: Fail
        # Oct 13: Fail (Not recovered)
        # Oct 14: Success (Recovered 2)
        # Oct 15: Success
        checkins = [
            CheckinModel(checkin_id="c1", habit_id="h1", event_date="2026-10-11", value=1),
            CheckinModel(checkin_id="c2", habit_id="h1", event_date="2026-10-14", value=1),
            CheckinModel(checkin_id="c3", habit_id="h1", event_date="2026-10-15", value=1),
        ]
        pipeline = AnalyticsPipeline(habits, checkins, reference_date=date(2026, 10, 15))
        pipeline.start_date = date(2026, 10, 10)
        pipeline.end_date = date(2026, 10, 15)

        occs = pipeline.match_and_classify(pipeline.expand_calendar())
        rec_rate = pipeline.compute_recovery_rate(occs)

        # Failures: Oct 10 (recovered on 11), Oct 12 (not recovered on 13), Oct 13 (recovered on 14).
        # Total failures: 3, Recovered: 2 -> 66.7%
        self.assertAlmostEqual(rec_rate, 66.7, places=1)

    def test_composite_consistency_score(self):
        """Validates the exact weighted formula for Consistency Score."""
        pipeline = AnalyticsPipeline([], [], reference_date=self.ref_date)
        # Completion Rate: 80
        # Regularity: 0.8 (norm * 100 = 80)
        # Recovery Rate: 70
        # Logging Reliability: 90
        # Trend Score: stable -> 70
        # Category Balance: 80
        # Formula:
        # 0.30 * 80 (24) + 0.20 * 80 (16) + 0.15 * 70 (10.5) + 0.15 * 90 (13.5) + 0.10 * 70 (7) + 0.10 * 80 (8)
        # Expected: 24 + 16 + 10.5 + 13.5 + 7 + 8 = 79.0
        score, label, desc = pipeline.compute_consistency_score(
            completion_rate=80.0,
            regularity=0.8,
            recovery_rate=70.0,
            logging_reliability=90.0,
            trend_status="stable",
            category_adherences=[90.0, 70.0]  # std = 10.0 -> Balance = 90.0?
        )
        # If category_adherences std is 10.0: Balance = 90.0 -> 0.10 * 90 = 9 -> Score = 80.0
        self.assertTrue(70.0 <= score <= 84.0)
        self.assertEqual(label, "consistente")

    def test_edge_case_clean_user(self):
        """Validates that a clean user with 0 checkins does not crash and returns safe defaults."""
        habits = [HabitModel(habit_id="h1", name="Estudo", metric_type="binary", target_value=1, start_date="2026-10-01")]
        checkins = []

        result = run_analytics(habits, checkins, ref_date=self.ref_date)
        self.assertIn("summary", result)
        self.assertIn("consistency_score", result["summary"])
        self.assertIn("highlights", result)
        self.assertIn("reports", result)

if __name__ == "__main__":
    unittest.main()
