from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.account import Account
from app.models.goal import Goal
from app.models.profile import Profile
from app.models.user import User
from app.schemas.gear import GearRecommendationRequest
from app.schemas.recommendation import (
    NextActionRecommendation,
    NextActionRequest,
    NextActionResponse,
)
from app.schemas.teleport import TeleportRouteRequest
from app.services.account_context import account_context_service
from app.services.account_brain import account_brain_service
from app.services.knowledge_models import KnowledgeRetrievalPacket
from app.services.gear import gear_service
from app.services.planner import planner_service
from app.services.quests import quest_service
from app.services.skills import skill_service
from app.services.teleports import teleport_service
from app.services.user_context import user_context_service


class RecommendationService:
    async def get_next_actions(
        self,
        db_session: AsyncSession,
        user: User,
        payload: NextActionRequest,
    ) -> NextActionResponse:
        profile = await user_context_service.get_profile(db_session=db_session, user=user)
        goal = await self._resolve_goal(db_session=db_session, user=user, goal_id=payload.goal_id)
        account_rsn = await self._resolve_account_rsn(
            db_session=db_session,
            user=user,
            requested_account_rsn=payload.account_rsn,
            goal=goal,
            profile=profile,
        )
        snapshot = await account_context_service.get_latest_snapshot(
            db_session=db_session,
            user=user,
            account_rsn=account_rsn,
        )
        previous_snapshot = await account_context_service.get_previous_snapshot(
            db_session=db_session,
            user=user,
            account_rsn=account_rsn,
        )
        progress = await account_context_service.get_progress(
            db_session=db_session,
            user=user,
            account_rsn=account_rsn,
        )
        account = await account_context_service.get_account_by_rsn(
            db_session=db_session,
            user=user,
            account_rsn=account_rsn,
        )
        snapshot_delta = self._build_snapshot_delta(
            latest_snapshot=snapshot,
            previous_snapshot=previous_snapshot,
        )
        account_brain = account_brain_service.build_packet(
            user=user,
            profile=profile,
            account=account,
            latest_goal=goal,
            latest_snapshot=snapshot,
            previous_snapshot=previous_snapshot,
            progress=progress,
            session_intent="progression",
            session_focus_summary=f"Next-action recommendations for {account_rsn or 'the workspace'}.",
            retrieval_packet=KnowledgeRetrievalPacket(),
            planning_state={},
        )

        goal_like = goal or self._build_default_goal(account_rsn=account_rsn, profile=profile)
        recommendations = await planner_service.build_goal_recommendations(
            db_session=db_session,
            user=user,
            goal=goal_like,
            profile=profile,
            snapshot=snapshot,
            target_rsn=account_rsn,
        )
        actions = self._build_actions(
            goal=goal,
            account_rsn=account_rsn,
            recommendations=recommendations,
            progress=progress,
            snapshot_delta=snapshot_delta,
            account_readiness=account_brain.readiness,
        )
        ordered = sorted(actions, key=lambda action: action.score, reverse=True)
        trimmed = self._with_ranking_context(ordered[: payload.limit])

        return NextActionResponse(
            account_rsn=account_rsn,
            goal_id=goal.id if goal else None,
            goal_title=goal.title if goal else None,
            top_action=trimmed[0] if trimmed else None,
            actions=trimmed,
            context={
                "profile_play_style": profile.play_style if profile else None,
                "profile_goals_focus": profile.goals_focus if profile else None,
                "snapshot_available": snapshot is not None,
                "snapshot_delta_available": snapshot_delta is not None,
                "overall_level_delta": snapshot_delta["overall_level_delta"] if snapshot_delta else 0,
                "recently_progressed_skills": snapshot_delta["improved_skills"] if snapshot_delta else [],
                "progress_available": progress is not None,
                "owned_gear_count": len(user_context_service.tracked_owned_gear(progress)),
                "completed_diary_regions": len(progress.completed_diaries) if progress else 0,
                "notable_item_count": len(progress.notable_items) if progress else 0,
                "active_unlock_count": len(progress.active_unlocks) if progress else 0,
                "companion_sync_active": (
                    progress is not None
                    and progress.companion_state.get("source") == "runelite_companion"
                ),
                "account_readiness": account_brain.readiness,
                "goal_influenced": goal is not None,
                "returned_action_count": len(trimmed),
            },
        )

    async def _resolve_goal(
        self,
        db_session: AsyncSession,
        user: User,
        goal_id: int | None,
    ) -> Goal | None:
        if goal_id is not None:
            return await db_session.scalar(
                select(Goal).where(Goal.id == goal_id, Goal.user_id == user.id)
            )
        return await db_session.scalar(
            select(Goal).where(Goal.user_id == user.id).order_by(desc(Goal.id))
        )

    async def _resolve_account_rsn(
        self,
        db_session: AsyncSession,
        user: User,
        requested_account_rsn: str | None,
        goal: Goal | None,
        profile: Profile | None,
    ) -> str | None:
        if requested_account_rsn:
            return requested_account_rsn
        if goal and goal.target_account_rsn:
            return goal.target_account_rsn
        if profile and profile.primary_account_rsn:
            return profile.primary_account_rsn

        latest_account = await db_session.scalar(
            select(Account).where(Account.user_id == user.id).order_by(desc(Account.id))
        )
        return latest_account.rsn if latest_account else None

    def _build_default_goal(
        self,
        account_rsn: str | None,
        profile: Profile | None,
    ) -> Goal:
        goal_type = "quest cape" if profile and profile.goals_focus == "progression" else "barrows gloves"
        title = "Account Progression"
        return Goal(
            id=0,
            title=title,
            goal_type=goal_type,
            target_account_rsn=account_rsn,
            status="active",
            notes=None,
            generated_plan=None,
        )

    def _build_actions(
        self,
        goal: Goal | None,
        account_rsn: str | None,
        recommendations: dict[str, object],
        progress,
        snapshot_delta: dict[str, object] | None,
        account_readiness: dict[str, object],
    ) -> list[NextActionRecommendation]:
        skill = recommendations["recommended_skill"]
        quest = recommendations["recommended_quest"]
        gear = recommendations["recommended_gear"]
        teleport = recommendations["recommended_teleport"]
        readiness = quest["readiness"]
        owned_gear = user_context_service.tracked_owned_gear(progress)
        known_unlocks = user_context_service.tracked_known_unlocks(progress)
        account_fit = self._build_account_fit_signals(
            goal=goal,
            account_rsn=account_rsn,
            progress=progress,
            snapshot_delta=snapshot_delta,
            account_readiness=account_readiness,
        )

        skill_blockers = []
        current_level = skill.get("current_level")
        if current_level is None:
            skill_blockers.append("No synced skill snapshot yet")

        quest_blockers = [
            *[
                f"{item['skill']} {item['current_level']}->{item['required_level']}"
                for item in readiness.get("missing_skills", [])
            ],
            *readiness.get("missing_quests", []),
            *readiness.get("missing_other_requirements", []),
        ]
        teleport_blockers = [
            requirement
            for requirement in teleport.get("requirements", [])
            if requirement
        ]
        gear_owned = gear["item_name"].strip().lower() in owned_gear
        quest_matches_active_unlock = self._quest_matches_known_unlock(quest, known_unlocks)
        travel_matches_active_unlock = self._travel_matches_known_unlock(teleport, known_unlocks)
        improving_skills = set(snapshot_delta["improved_skills"]) if snapshot_delta else set()
        overall_level_delta = int(snapshot_delta["overall_level_delta"]) if snapshot_delta else 0
        skill_has_momentum = skill["skill"] in improving_skills
        skill_stalled = snapshot_delta is not None and not skill_has_momentum and overall_level_delta == 0
        quest_momentum_bonus = 6 if skill_has_momentum or overall_level_delta > 0 else 0
        skill_score = 78 if skill_has_momentum else 86 if current_level is not None else 74
        skill_adjustments = [{"label": "stalled account nudge", "value": 6 if skill_stalled else 0}]
        if skill_stalled:
            skill_score += skill_adjustments[0]["value"]
        quest_score_raw = (
            92
            - (len(quest_blockers) * 8)
            - (18 if quest_matches_active_unlock else 0)
            + quest_momentum_bonus
        )
        quest_score = max(40, quest_score_raw)
        quest_adjustments = [
            {"label": "blocker penalty", "value": -(len(quest_blockers) * 8)},
            {"label": "already-known unlock penalty", "value": -18 if quest_matches_active_unlock else 0},
            {"label": "momentum bonus", "value": quest_momentum_bonus},
        ]
        if quest_score != quest_score_raw:
            quest_adjustments.append({"label": "minimum score floor", "value": quest_score - quest_score_raw})
        gear_base_score = 72
        gear_adjustments = [{"label": "already-owned gear penalty", "value": -28 if gear_owned else 0}]
        gear_score = gear_base_score + gear_adjustments[0]["value"]
        travel_base_score = 68 if "fallback" not in teleport.get("route_type", "") else 58
        travel_adjustments = [
            {"label": "already-known travel penalty", "value": -18 if travel_matches_active_unlock else 0}
        ]
        travel_score = travel_base_score + travel_adjustments[0]["value"]
        readiness_warning = self._readiness_warning(account_readiness)

        actions = [
            NextActionRecommendation(
                action_type="quest",
                title=f"Push toward {quest['name']}",
                summary=quest["why_it_matters"],
                score=quest_score,
                priority="low" if quest_matches_active_unlock else "high" if len(quest_blockers) <= 2 else "medium",
                target={"quest_id": quest["id"], "goal_title": goal.title if goal else None},
                blockers=(
                    ["Already synced as unlocked via companion state"] + quest_blockers
                    if quest_matches_active_unlock
                    else quest_blockers
                ),
                supporting_data={
                    "readiness": readiness,
                    "goal_type": goal.goal_type if goal else None,
                    "active_unlock_match": quest_matches_active_unlock,
                    "recent_momentum_detected": skill_has_momentum or overall_level_delta > 0,
                    "readiness_warning": readiness_warning,
                    "account_fit": self._account_fit_for_action(
                        account_fit,
                        action_type="quest",
                        title=f"Push toward {quest['name']}",
                    ),
                    "score_breakdown": self._score_breakdown(
                        action_type="quest",
                        base_score=92,
                        adjustments=quest_adjustments,
                        final_score=quest_score,
                    ),
                },
            ),
            NextActionRecommendation(
                action_type="skill",
                title=f"Train {skill['skill']}",
                summary=f"Use {skill['method']} as the next efficient training method.",
                score=skill_score,
                priority="high" if current_level is not None else "medium",
                target={"skill": skill["skill"], "account_rsn": account_rsn},
                blockers=skill_blockers,
                supporting_data={
                    "current_level": current_level,
                    "reason": skill["reason"],
                    "recommended_method": skill["method"],
                    "recent_momentum_detected": skill_has_momentum,
                    "skill_stalled": skill_stalled,
                    "readiness_warning": readiness_warning,
                    "account_fit": self._account_fit_for_action(
                        account_fit,
                        action_type="skill",
                        title=f"Train {skill['skill']}",
                    ),
                    "score_breakdown": self._score_breakdown(
                        action_type="skill",
                        base_score=78 if skill_has_momentum else 86 if current_level is not None else 74,
                        adjustments=skill_adjustments,
                        final_score=skill_score,
                    ),
                },
            ),
            NextActionRecommendation(
                action_type="gear",
                title=f"Upgrade into {gear['item_name']}",
                summary=gear["upgrade_reason"],
                score=gear_score,
                priority="low" if gear_owned else "medium",
                target={"item_name": gear["item_name"], "slot": gear["slot"]},
                blockers=["Already tracked as owned"] if gear_owned else [],
                supporting_data={
                    "account_rsn": account_rsn,
                    "already_owned": gear_owned,
                    "readiness_warning": readiness_warning,
                    "account_fit": self._account_fit_for_action(
                        account_fit,
                        action_type="gear",
                        title=f"Upgrade into {gear['item_name']}",
                    ),
                    "score_breakdown": self._score_breakdown(
                        action_type="gear",
                        base_score=gear_base_score,
                        adjustments=gear_adjustments,
                        final_score=gear_score,
                    ),
                },
            ),
            NextActionRecommendation(
                action_type="travel",
                title=f"Set up {teleport['method']}",
                summary=f"Travel plan for {teleport['destination']}: {teleport['travel_notes']}",
                score=travel_score,
                priority="low" if travel_matches_active_unlock else "medium",
                target={
                    "destination": teleport["destination"],
                    "method": teleport["method"],
                },
                blockers=(
                    ["Already synced as unlocked via companion state"] + teleport_blockers
                    if travel_matches_active_unlock
                    else teleport_blockers
                ),
                supporting_data={
                    "account_rsn": account_rsn,
                    "active_unlock_match": travel_matches_active_unlock,
                    "readiness_warning": readiness_warning,
                    "account_fit": self._account_fit_for_action(
                        account_fit,
                        action_type="travel",
                        title=f"Set up {teleport['method']}",
                    ),
                    "score_breakdown": self._score_breakdown(
                        action_type="travel",
                        base_score=travel_base_score,
                        adjustments=travel_adjustments,
                        final_score=travel_score,
                    ),
                },
            ),
        ]
        return actions

    def _with_ranking_context(self, actions: list[NextActionRecommendation]) -> list[NextActionRecommendation]:
        if not actions:
            return []

        top_score = actions[0].score
        returned_count = len(actions)
        enriched: list[NextActionRecommendation] = []
        for index, action in enumerate(actions, start=1):
            next_action = actions[index] if index < returned_count else None
            ranking_context = {
                "rank": index,
                "returned_action_count": returned_count,
                "is_top_action": index == 1,
                "score_gap_from_top": top_score - action.score,
                "score_gap_to_next": action.score - next_action.score if next_action is not None else None,
                "rank_summary": self._rank_summary(
                    action=action,
                    rank=index,
                    returned_count=returned_count,
                    top_score=top_score,
                    next_action=next_action,
                ),
            }
            enriched.append(
                action.model_copy(
                    update={
                        "supporting_data": {
                            **(action.supporting_data or {}),
                            "ranking_context": ranking_context,
                        }
                    },
                    deep=True,
                )
            )
        return enriched

    def _rank_summary(
        self,
        *,
        action: NextActionRecommendation,
        rank: int,
        returned_count: int,
        top_score: int,
        next_action: NextActionRecommendation | None,
    ) -> str:
        if rank == 1:
            if next_action is None:
                return f"{action.title} is the top ranked action out of {returned_count} returned option."
            return (
                f"{action.title} is the top ranked action out of {returned_count} returned options, "
                f"ahead of the next option by {action.score - next_action.score} score points."
            )
        return (
            f"{action.title} is ranked {rank} of {returned_count}, "
            f"{top_score - action.score} score points behind the top action."
        )

    def _readiness_warning(self, account_readiness: dict[str, object]) -> str | None:
        warning = account_readiness.get("advisor_warning")
        return warning if isinstance(warning, str) and warning else None

    def _score_breakdown(
        self,
        *,
        action_type: str,
        base_score: int,
        adjustments: list[dict[str, int | str]],
        final_score: int,
    ) -> dict[str, object]:
        adjustment_total = sum(
            int(adjustment.get("value", 0))
            for adjustment in adjustments
            if isinstance(adjustment, dict)
        )
        adjustment_summary = ", ".join(
            f"{adjustment.get('label')}: {adjustment.get('value')}"
            for adjustment in adjustments[:4]
        )
        return {
            "base_score": base_score,
            "adjustments": adjustments,
            "adjustment_total": adjustment_total,
            "final_score": final_score,
            "score_summary": (
                f"{action_type} score starts at {base_score}, adjusts by {adjustment_total}, "
                f"and lands at {final_score}. Signals: {adjustment_summary}."
            ),
        }

    def _build_account_fit_signals(
        self,
        *,
        goal: Goal | None,
        account_rsn: str | None,
        progress,
        snapshot_delta: dict[str, object] | None,
        account_readiness: dict[str, object],
    ) -> dict[str, object]:
        trusted_sources = [
            str(source)
            for source in account_readiness.get("trusted_sources", [])
            if source
        ]
        missing_inputs = [
            str(item)
            for item in account_readiness.get("missing_inputs", [])
            if item
        ]
        fit_reasons: list[str] = []
        caution_reasons: list[str] = []

        if goal is not None:
            fit_reasons.append(f"matches active goal {goal.title}")
        if account_rsn:
            fit_reasons.append(f"targets account {account_rsn}")
        if trusted_sources:
            fit_reasons.append(f"grounded by {', '.join(trusted_sources[:3])}")
        if progress is not None and progress.companion_state.get("source") == "runelite_companion":
            fit_reasons.append("runelite companion state is active")
        if snapshot_delta is not None and int(snapshot_delta.get("overall_level_delta", 0) or 0) > 0:
            fit_reasons.append("recent account momentum detected")

        if "bank sync" in missing_inputs:
            caution_reasons.append("bank sync missing")
        for item in missing_inputs:
            if item != "bank sync":
                caution_reasons.append(f"{item} missing")
        if not caution_reasons:
            caution_reasons.append("no major missing inputs")

        confidence = account_readiness.get("confidence")
        return {
            "confidence": confidence if isinstance(confidence, str) else "unknown",
            "fit_reasons": fit_reasons or ["general account progression"],
            "caution_reasons": caution_reasons,
            "account_rsn": account_rsn,
        }

    def _account_fit_for_action(
        self,
        account_fit: dict[str, object],
        *,
        action_type: str,
        title: str,
    ) -> dict[str, object]:
        account_rsn = account_fit.get("account_rsn")
        fit_reasons = list(account_fit.get("fit_reasons", []))
        caution_reasons = list(account_fit.get("caution_reasons", []))
        confidence = account_fit.get("confidence")
        summary_account = account_rsn if isinstance(account_rsn, str) and account_rsn else "the selected account"
        signal_summary = (
            f"{title} is a {action_type} action for {summary_account}; "
            f"confidence={confidence}; fit={'; '.join(str(reason) for reason in fit_reasons[:2])}; "
            f"caution={'; '.join(str(reason) for reason in caution_reasons[:2])}."
        )
        return {
            "confidence": confidence,
            "fit_reasons": fit_reasons,
            "caution_reasons": caution_reasons,
            "signal_summary": signal_summary,
        }

    def _quest_matches_known_unlock(
        self,
        quest: dict[str, object],
        known_unlocks: set[str],
    ) -> bool:
        quest_name = str(quest.get("name", "")).strip().lower()
        if not quest_name:
            return False
        if quest_name in known_unlocks:
            return True
        return any(alias in known_unlocks for alias in self._unlock_aliases_for_text(quest_name))

    def _travel_matches_known_unlock(
        self,
        teleport: dict[str, object],
        known_unlocks: set[str],
    ) -> bool:
        destination = str(teleport.get("destination", "")).strip().lower()
        if not destination:
            return False
        if destination in known_unlocks:
            return True
        return any(alias in known_unlocks for alias in self._unlock_aliases_for_text(destination))

    def _unlock_aliases_for_text(self, value: str) -> set[str]:
        aliases = {value}
        if "fossil island" in value or "bone voyage" in value:
            aliases.update({"bone voyage", "fossil island", "fossil island access"})
        if "fairy ring" in value:
            aliases.update({"fairy rings", "fairy ring utility", "fairy ring network", "fairy rings unlocked"})
        return aliases

    def _build_snapshot_delta(
        self,
        latest_snapshot,
        previous_snapshot,
    ) -> dict[str, object] | None:
        if latest_snapshot is None or previous_snapshot is None:
            return None

        latest_overall = int(latest_snapshot.summary.get("overall_level", 0) or 0)
        previous_overall = int(previous_snapshot.summary.get("overall_level", 0) or 0)
        latest_skills = latest_snapshot.summary.get("skills", {})
        previous_skills = previous_snapshot.summary.get("skills", {})
        improved_skills: list[str] = []

        if isinstance(latest_skills, dict) and isinstance(previous_skills, dict):
            for skill_name, latest_data in latest_skills.items():
                if skill_name == "overall" or not isinstance(latest_data, dict):
                    continue
                previous_data = previous_skills.get(skill_name, {})
                latest_level = int(latest_data.get("level", 0) or 0)
                previous_level = int(previous_data.get("level", 0) or 0) if isinstance(previous_data, dict) else 0
                if latest_level > previous_level:
                    improved_skills.append(skill_name)

        return {
            "overall_level_delta": latest_overall - previous_overall,
            "improved_skills": sorted(improved_skills),
        }


recommendation_service = RecommendationService()
