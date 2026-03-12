"""Unit tests for the QuickPoll Team 6 v2 pitch deck generator."""

from __future__ import annotations

import importlib.util
import sys
from pathlib import Path
from types import ModuleType

MODULE_PATH = (
    Path(__file__).resolve().parents[2]
    / "presentation"
    / "generate_quickpoll_team6_pitch_deck_v2.py"
)


def _load_module() -> ModuleType:
    spec = importlib.util.spec_from_file_location("pitch_deck_v2", MODULE_PATH)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Unable to load module spec for {MODULE_PATH}")

    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


def test_build_slide_outline_matches_requested_sequence() -> None:
    module = _load_module()

    outline = module.build_slide_outline()

    assert len(outline) == 12
    assert [slide.title for slide in outline] == [
        "QuickPoll helps distributed teams decide faster",
        "Decision friction slows distributed team execution",
        "QuickPoll closes the loop from poll to insight",
        "Our MVP covers core polling and analytics needs",
        "A hybrid demo proves the flow honestly",
        "The architecture keeps QuickPoll reliable",
        "Trigger-based analytics turns votes into insight",
        "Quality and delivery practices build trust",
        "Clear ownership kept the team aligned",
        "QuickPoll maps directly to the evaluator scorecard",
        "Our retrospective shows value, gaps, and next steps",
        "QuickPoll is ready for broader use and Q&A",
    ]
    assert all(slide.notes.strip() for slide in outline)


def test_resolve_artifacts_uses_v2_output_names() -> None:
    module = _load_module()

    artifacts = module.resolve_artifacts(MODULE_PATH)

    assert artifacts.output_dir == MODULE_PATH.parent / "output"
    assert artifacts.output_pptx.name == "QuickPoll_Team6_Pitch_Deck_v2.pptx"
    assert artifacts.output_score.name == "QuickPoll_Team6_Pitch_Deck_v2_score.json"
    assert artifacts.skill_dir.name == "amalitech-pptx-creator"


def test_team_footer_lists_every_team_member() -> None:
    module = _load_module()

    footer = module._team_footer()

    for member in module.TEAM_MEMBERS:
        assert member in footer
    assert footer.startswith("Team 6 | ")
