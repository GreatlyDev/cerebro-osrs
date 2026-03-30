from dataclasses import dataclass, field

import httpx

from app.core.config import get_settings
from app.integrations.openai_responses import openai_responses_client


@dataclass(slots=True)
class AssistantChatContext:
    session_title: str
    user_display_name: str
    user_message: str
    structured_fallback: str
    recent_messages: list[tuple[str, str]] = field(default_factory=list)
    profile_summary: str | None = None
    account_summary: str | None = None
    snapshot_summary: str | None = None
    skills_summary: str | None = None
    progress_summary: str | None = None
    snapshot_delta_summary: str | None = None
    goal_summary: str | None = None
    session_focus_summary: str | None = None
    session_intent_summary: str | None = None


class AssistantService:
    def is_enabled(self) -> bool:
        return get_settings().ai_chat_available

    async def generate_chat_reply(self, context: AssistantChatContext) -> str | None:
        settings = get_settings()
        if not settings.ai_chat_available or not settings.openai_api_key:
            return None

        try:
            return await openai_responses_client.create_response(
                api_key=settings.openai_api_key,
                base_url=settings.openai_base_url,
                model=settings.openai_chat_model,
                instructions=self._build_instructions(),
                input_text=self._build_input(context),
                timeout_seconds=settings.openai_timeout_seconds,
            )
        except httpx.HTTPError:
            return None

    def _build_instructions(self) -> str:
        return (
            "You are Cerebro, an AI assistant for Old School RuneScape progression. "
            "Give concise, grounded advice based only on the structured context you are given. "
            "Do not invent skills, quests, gear, or account state that is not present in the prompt. "
            "If context is missing, say what is missing and give the safest useful next step. "
            "If the player asks a direct account question about a stat, unlock, quest count, gear, or recent progress, "
            "answer that question directly first using the exact data provided. "
            "Prefer practical coaching over generic hype, and write like a capable in-game advisor."
        )

    def _build_input(self, context: AssistantChatContext) -> str:
        recent_history = "\n".join(
            f"- {role}: {content}" for role, content in context.recent_messages[-6:]
        ) or "- No prior messages in this session."

        sections = [
            f"Session title: {context.session_title}",
            f"Player display name: {context.user_display_name}",
            f"Profile context: {context.profile_summary or 'No profile summary yet.'}",
            f"Account context: {context.account_summary or 'No linked account summary yet.'}",
            f"Snapshot context: {context.snapshot_summary or 'No synced snapshot yet.'}",
            f"Skill readout: {context.skills_summary or 'No detailed skill readout yet.'}",
            f"Progress context: {context.progress_summary or 'No tracked progress state yet.'}",
            f"Recent sync delta: {context.snapshot_delta_summary or 'No snapshot delta available yet.'}",
            f"Goal context: {context.goal_summary or 'No active goal summary yet.'}",
            f"Session focus: {context.session_focus_summary or 'No strong session focus inferred yet.'}",
            f"Session intent: {context.session_intent_summary or 'No strong session intent inferred yet.'}",
            f"Recent chat history:\n{recent_history}",
            f"Structured fallback answer:\n{context.structured_fallback}",
            f"Latest player message:\n{context.user_message}",
            (
                "Write the best reply to the latest player message. Keep it grounded in the context above, "
                "sound like an OSRS progression advisor, and preserve any concrete recommendations from the "
                "structured fallback when they are useful."
            ),
        ]
        return "\n\n".join(sections)


assistant_service = AssistantService()
