from typing import Any

import httpx


class OpenAIResponsesClient:
    async def create_response(
        self,
        *,
        api_key: str,
        base_url: str,
        model: str,
        instructions: str,
        input_text: str,
        timeout_seconds: float,
    ) -> str | None:
        response = await self._post_response(
            api_key=api_key,
            base_url=base_url,
            payload={
                "model": model,
                "instructions": instructions,
                "input": input_text,
            },
            timeout_seconds=timeout_seconds,
        )
        return self._extract_output_text(response)

    async def _post_response(
        self,
        *,
        api_key: str,
        base_url: str,
        payload: dict[str, Any],
        timeout_seconds: float,
    ) -> dict[str, Any]:
        async with httpx.AsyncClient(timeout=timeout_seconds) as client:
            response = await client.post(
                f"{base_url.rstrip('/')}/responses",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
                json=payload,
            )
            response.raise_for_status()
        return response.json()

    def _extract_output_text(self, payload: dict[str, Any]) -> str | None:
        output_text = payload.get("output_text")
        if isinstance(output_text, str) and output_text.strip():
            return output_text.strip()

        text_parts: list[str] = []
        for item in payload.get("output", []):
            if not isinstance(item, dict):
                continue
            for content in item.get("content", []):
                if not isinstance(content, dict):
                    continue
                text_value = content.get("text")
                if isinstance(text_value, str) and text_value.strip():
                    text_parts.append(text_value.strip())
                    continue
                if isinstance(text_value, dict):
                    nested_value = text_value.get("value")
                    if isinstance(nested_value, str) and nested_value.strip():
                        text_parts.append(nested_value.strip())

        if text_parts:
            return "\n\n".join(text_parts)

        return None


openai_responses_client = OpenAIResponsesClient()
