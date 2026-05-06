from dataclasses import dataclass, field
from typing import Any

from app.models.account import Account
from app.models.account_progress import AccountProgress
from app.models.account_snapshot import AccountSnapshot
from app.models.goal import Goal
from app.models.profile import Profile
from app.models.user import User
from app.services.knowledge_models import KnowledgeRetrievalPacket
from app.services.user_context import user_context_service


@dataclass(slots=True)
class AccountBrainPacket:
    identity: dict[str, object] = field(default_factory=dict)
    stats: dict[str, object] = field(default_factory=dict)
    companion_awareness: dict[str, object] = field(default_factory=dict)
    planning_signals: dict[str, object] = field(default_factory=dict)
    knowledge_route: dict[str, object] = field(default_factory=dict)
    readiness: dict[str, object] = field(default_factory=dict)
    advisor_brief: str = ""


class AccountBrainService:
    def build_packet(
        self,
        *,
        user: User,
        profile: Profile | None,
        account: Account | None,
        latest_goal: Goal | None,
        latest_snapshot: AccountSnapshot | None,
        previous_snapshot: AccountSnapshot | None,
        progress: AccountProgress | None,
        session_intent: str | None,
        session_focus_summary: str | None,
        retrieval_packet: KnowledgeRetrievalPacket,
        planning_state: dict[str, object] | None,
    ) -> AccountBrainPacket:
        identity = self._build_identity(
            user=user,
            profile=profile,
            account=account,
            latest_goal=latest_goal,
        )
        stats = self._build_stats(
            latest_snapshot=latest_snapshot,
            previous_snapshot=previous_snapshot,
        )
        companion_awareness = self._build_companion_awareness(progress=progress)
        planning_signals = self._build_planning_signals(
            progress=progress,
            session_intent=session_intent,
            session_focus_summary=session_focus_summary,
            planning_state=planning_state,
        )
        knowledge_route = self._build_knowledge_route(retrieval_packet=retrieval_packet)
        readiness = self._build_readiness(
            latest_goal=latest_goal,
            latest_snapshot=latest_snapshot,
            progress=progress,
            companion_awareness=companion_awareness,
        )
        advisor_brief = self._build_advisor_brief(
            identity=identity,
            stats=stats,
            companion_awareness=companion_awareness,
            planning_signals=planning_signals,
            knowledge_route=knowledge_route,
            readiness=readiness,
        )
        return AccountBrainPacket(
            identity=identity,
            stats=stats,
            companion_awareness=companion_awareness,
            planning_signals=planning_signals,
            knowledge_route=knowledge_route,
            readiness=readiness,
            advisor_brief=advisor_brief,
        )

    def _build_identity(
        self,
        *,
        user: User,
        profile: Profile | None,
        account: Account | None,
        latest_goal: Goal | None,
    ) -> dict[str, object]:
        return {
            "player": user.display_name,
            "account_rsn": account.rsn if account is not None else None,
            "profile_display_name": profile.display_name if profile is not None else None,
            "primary_account_rsn": profile.primary_account_rsn if profile is not None else None,
            "play_style": profile.play_style if profile is not None else None,
            "goals_focus": profile.goals_focus if profile is not None else None,
            "prefers_afk_methods": profile.prefers_afk_methods if profile is not None else None,
            "prefers_profitable_methods": profile.prefers_profitable_methods if profile is not None else None,
            "active_goal": latest_goal.title if latest_goal is not None else None,
            "active_goal_type": latest_goal.goal_type if latest_goal is not None else None,
        }

    def _build_stats(
        self,
        *,
        latest_snapshot: AccountSnapshot | None,
        previous_snapshot: AccountSnapshot | None,
    ) -> dict[str, object]:
        summary = latest_snapshot.summary if latest_snapshot is not None else {}
        previous_summary = previous_snapshot.summary if previous_snapshot is not None else {}
        summary = summary or {}
        previous_summary = previous_summary or {}
        overall_level = summary.get("overall_level")
        combat_level = summary.get("combat_level")
        previous_overall = previous_summary.get("overall_level")
        previous_combat = previous_summary.get("combat_level")
        return {
            "overall_level": overall_level,
            "combat_level": combat_level,
            "overall_delta": self._numeric_delta(overall_level, previous_overall),
            "combat_delta": self._numeric_delta(combat_level, previous_combat),
            "top_skills": self._extract_skill_labels(summary.get("top_skills")),
            "highest_skill": self._progression_value(summary, "highest_skill"),
            "lowest_tracked_skill": self._progression_value(summary, "lowest_tracked_skill"),
            "skills_at_99": self._progression_value(summary, "total_skills_at_99"),
        }

    def _build_companion_awareness(
        self,
        *,
        progress: AccountProgress | None,
    ) -> dict[str, object]:
        if progress is None:
            return {"source": None, "sync_active": False}

        companion_state = progress.companion_state or {}
        tracked_gear = sorted(user_context_service.tracked_owned_gear(progress))
        return {
            "source": self._humanize(companion_state.get("source")),
            "sync_active": companion_state.get("source") == "runelite_companion",
            "completed_quest_count": len(progress.completed_quests),
            "completed_quest_preview": list(progress.completed_quests[:5]),
            "diary_regions": list(progress.completed_diaries)[:5],
            "transport_unlocks": list(progress.unlocked_transports[:5]),
            "owned_gear": tracked_gear[:5],
            "equipped_gear": dict(progress.equipped_gear),
            "notable_items": list(progress.notable_items[:5]),
            "active_unlocks": list(progress.active_unlocks[:5]),
            "companion_state": companion_state,
        }

    def _build_planning_signals(
        self,
        *,
        progress: AccountProgress | None,
        session_intent: str | None,
        session_focus_summary: str | None,
        planning_state: dict[str, object] | None,
    ) -> dict[str, object]:
        known_unlocks = sorted(user_context_service.tracked_known_unlocks(progress)) if progress is not None else []
        planning_state = planning_state or {}
        return {
            "session_intent": session_intent,
            "session_focus": session_focus_summary,
            "last_recommended_skill": planning_state.get("last_recommended_skill"),
            "last_quest_id": planning_state.get("last_quest_id"),
            "last_destination": planning_state.get("last_destination"),
            "last_priority_label": planning_state.get("last_priority_label"),
            "last_blockers": planning_state.get("last_blockers"),
            "avoid_known_unlocks": known_unlocks[:8],
        }

    def _build_knowledge_route(
        self,
        *,
        retrieval_packet: KnowledgeRetrievalPacket,
    ) -> dict[str, object]:
        return {
            "question_mode": retrieval_packet.question_mode,
            "primary_domain": retrieval_packet.primary_domain,
            "secondary_domains": retrieval_packet.secondary_domains,
            "entry_matches": [entry.canonical_name for entry in retrieval_packet.entries[:5]],
            "document_matches": [document.title for document in retrieval_packet.documents[:3]],
            "match_notes": retrieval_packet.match_notes[:3],
        }

    def _build_readiness(
        self,
        *,
        latest_goal: Goal | None,
        latest_snapshot: AccountSnapshot | None,
        progress: AccountProgress | None,
        companion_awareness: dict[str, object],
    ) -> dict[str, object]:
        trusted_sources: list[str] = []
        missing_inputs: list[str] = []

        if latest_snapshot is not None:
            trusted_sources.append("hiscores")
        else:
            missing_inputs.append("hiscores sync")

        if companion_awareness.get("sync_active") is True:
            trusted_sources.append("runelite companion")
        else:
            missing_inputs.append("runelite companion sync")

        if progress is None or not progress.completed_quests:
            missing_inputs.append("quest state")
        else:
            trusted_sources.append("quest state")

        if progress is None or not progress.equipped_gear:
            missing_inputs.append("equipped gear")
        else:
            trusted_sources.append("equipped gear")

        if progress is None or not user_context_service.tracked_owned_gear(progress):
            missing_inputs.append("gear ownership")
        else:
            trusted_sources.append("gear ownership")

        # Deep bank sync is not implemented yet, so keep this explicit for safer gear and money advice.
        missing_inputs.append("bank sync")

        if latest_goal is None:
            missing_inputs.append("active goal")
        else:
            trusted_sources.append("active goal")

        if latest_snapshot is not None and companion_awareness.get("sync_active") is True and progress is not None:
            confidence = "high" if progress.completed_quests and progress.equipped_gear else "medium"
        elif latest_snapshot is not None or companion_awareness.get("sync_active") is True:
            confidence = "medium"
        else:
            confidence = "low"

        return {
            "confidence": confidence,
            "trusted_sources": trusted_sources,
            "missing_inputs": missing_inputs,
            "next_sync_needed": self._next_sync_needed(missing_inputs),
            "advisor_warning": self._advisor_warning(confidence, missing_inputs),
        }

    def _build_advisor_brief(
        self,
        *,
        identity: dict[str, object],
        stats: dict[str, object],
        companion_awareness: dict[str, object],
        planning_signals: dict[str, object],
        knowledge_route: dict[str, object],
        readiness: dict[str, object],
    ) -> str:
        lines = [
            "Account brain packet:",
            (
                "- Identity: "
                f"player={identity.get('player')}; account={identity.get('account_rsn') or 'none'}; "
                f"profile={identity.get('profile_display_name') or 'none'}; "
                f"play_style={identity.get('play_style') or 'unknown'}; "
                f"goals_focus={identity.get('goals_focus') or 'unknown'}; "
                f"active_goal={identity.get('active_goal') or 'none'}."
            ),
            (
                "- Stats: "
                f"overall={stats.get('overall_level') or 'unknown'}; "
                f"combat={stats.get('combat_level') or 'unknown'}; "
                f"highest_skill={stats.get('highest_skill') or 'unknown'}; "
                f"lowest_tracked_skill={stats.get('lowest_tracked_skill') or 'unknown'}; "
                f"top_skills={self._join(stats.get('top_skills'))}."
            ),
            (
                "- Companion awareness: "
                f"source={companion_awareness.get('source') or 'none'}; "
                f"sync_active={companion_awareness.get('sync_active')}; "
                f"{companion_awareness.get('completed_quest_count') or 0} completed quests tracked; "
                f"quest_preview={self._join(companion_awareness.get('completed_quest_preview'))}; "
                f"diaries={self._join(companion_awareness.get('diary_regions'))}; "
                f"transports={self._join(companion_awareness.get('transport_unlocks'))}."
            ),
            (
                "- Gear and items: "
                f"owned={self._join(companion_awareness.get('owned_gear'))}; "
                f"equipped={self._join_mapping(companion_awareness.get('equipped_gear'))}; "
                f"notable={self._join(companion_awareness.get('notable_items'))}."
            ),
            (
                "- Planning signals: "
                f"intent={planning_signals.get('session_intent') or 'unknown'}; "
                f"focus={planning_signals.get('session_focus') or 'none'}; "
                f"recommended_skill={planning_signals.get('last_recommended_skill') or 'none'}; "
                f"quest_id={planning_signals.get('last_quest_id') or 'none'}; "
                f"destination={planning_signals.get('last_destination') or 'none'}; "
                f"priority={planning_signals.get('last_priority_label') or 'none'}; "
                f"blockers={self._join(planning_signals.get('last_blockers'))}."
            ),
            (
                "- Avoid recommending already-known unlocks: "
                f"{self._join(planning_signals.get('avoid_known_unlocks'))}."
            ),
            (
                "- Readiness: "
                f"confidence={readiness.get('confidence') or 'unknown'}; "
                f"trusted_sources={self._join(readiness.get('trusted_sources'))}; "
                f"missing_inputs={self._join(readiness.get('missing_inputs'))}; "
                f"next_sync_needed={readiness.get('next_sync_needed') or 'none'}; "
                f"advisor_warning={readiness.get('advisor_warning') or 'none'}."
            ),
            (
                "- Knowledge route: "
                f"mode={knowledge_route.get('question_mode') or 'unknown'}; "
                f"primary_domain={knowledge_route.get('primary_domain') or 'none'}; "
                f"entries={self._join(knowledge_route.get('entry_matches'))}; "
                f"documents={self._join(knowledge_route.get('document_matches'))}."
            ),
        ]
        active_unlocks = self._join(companion_awareness.get("active_unlocks"))
        if active_unlocks != "none":
            lines.insert(4, f"- Active unlocks: {active_unlocks}.")
        return "\n".join(lines)

    def _next_sync_needed(self, missing_inputs: list[str]) -> str:
        priority = (
            "hiscores sync",
            "runelite companion sync",
            "bank sync",
            "equipped gear",
            "active goal",
            "quest state",
            "gear ownership",
        )
        for item in priority:
            if item in missing_inputs:
                return item
        return "none"

    def _advisor_warning(self, confidence: str, missing_inputs: list[str]) -> str:
        if "hiscores sync" in missing_inputs or "runelite companion sync" in missing_inputs:
            return (
                "Do not assume quest completion, unlocks, or gear state until the missing account syncs are complete."
            )
        if "bank sync" in missing_inputs:
            return "Bank state is missing, so do not make exact wealth, affordability, or owned-supplies assumptions."
        if confidence == "low":
            return "Account state is sparse; keep recommendations conservative and ask for the next missing sync."
        return "Account state is usable; stay grounded in the trusted sources and call out any missing inputs."

    def _progression_value(self, summary: dict[str, Any], key: str) -> object | None:
        progression_profile = summary.get("progression_profile")
        if not isinstance(progression_profile, dict):
            return None
        return progression_profile.get(key)

    def _extract_skill_labels(self, value: object) -> list[str]:
        if not isinstance(value, list):
            return []
        labels: list[str] = []
        for item in value[:5]:
            if isinstance(item, dict):
                skill = item.get("skill")
                level = item.get("level")
                labels.append(f"{skill} {level}" if skill and level else str(skill or item))
            else:
                labels.append(str(item))
        return labels

    def _numeric_delta(self, current: object, previous: object) -> int | None:
        if not isinstance(current, int) or not isinstance(previous, int):
            return None
        return current - previous

    def _humanize(self, value: object) -> str | None:
        if not isinstance(value, str) or not value:
            return None
        return value.replace("_", " ")

    def _join(self, value: object) -> str:
        if isinstance(value, list):
            cleaned = [str(item) for item in value if item]
            return ", ".join(cleaned) if cleaned else "none"
        if isinstance(value, tuple):
            cleaned = [str(item) for item in value if item]
            return ", ".join(cleaned) if cleaned else "none"
        if value:
            return str(value)
        return "none"

    def _join_mapping(self, value: object) -> str:
        if not isinstance(value, dict) or not value:
            return "none"
        return ", ".join(f"{slot}: {item}" for slot, item in list(value.items())[:5])


account_brain_service = AccountBrainService()
