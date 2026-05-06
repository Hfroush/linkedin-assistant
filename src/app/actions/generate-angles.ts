"use server";

import { anthropic } from "@/lib/anthropic";
import { logger } from "@/lib/logger";
import { getVoiceProfile } from "@/lib/voice-profile";

/**
 * Generates 3 post angle options for a given topic using Claude.
 * Uses the cached voice profile (ephemeral cache_control on block 1).
 * Returns empty array on any failure — TopicPromptCard renders null on [].
 *
 * @param topicName - Short topic label (e.g. "Founder psychology")
 * @param topicDescription - Full topic description from topicAreas table
 * @param trendingTitles - Optional: recent article titles from trendingItems for this topic
 */
export async function generateAngles(
  topicName: string,
  topicDescription: string,
  trendingTitles: string[] = []
): Promise<string[]> {
  if (topicName.trim().length === 0) {
    return []; // silent fail — no point calling Claude
  }

  const voiceProfileText = await getVoiceProfile();

  const contextBlock =
    trendingTitles.length > 0
      ? `\n\nRecent articles in this space:\n${trendingTitles
          .slice(0, 5)
          .map((t) => `- ${t}`)
          .join("\n")}`
      : "";

  let response;
  try {
    response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 256,
      system: [
        {
          type: "text",
          text: voiceProfileText,
          cache_control: { type: "ephemeral" }, // REQUIRED — voice profile is cached; task block is not
        },
        {
          type: "text",
          text: "You are a LinkedIn content assistant for Houtan Froushan. Generate exactly 3 angle options for a LinkedIn post. Each angle must be a specific, thought-provoking question or observation — no more than 12 words. Output only the 3 angles as a JSON array of strings, with no other text, no markdown, no preamble.",
        },
      ],
      messages: [
        {
          role: "user",
          content: `Topic: ${topicName}\nDescription: ${topicDescription}${contextBlock}\n\nGenerate 3 post angles.`,
        },
      ],
    });
  } catch (error) {
    logger.error("Failed to generate topic angles", error, {
      topicName,
      topicDescriptionLength: topicDescription.length,
      trendingTitlesCount: trendingTitles.length,
    });
    return [];
  }

  const firstContent = response.content[0];
  if (!firstContent || firstContent.type !== "text") {
    logger.warn("Topic angle generation returned unexpected response format", {
      topicName,
      contentTypes: response.content.map((content) => content.type),
    });
    return [];
  }

  try {
    const angles = JSON.parse(firstContent.text);
    if (Array.isArray(angles) && angles.length === 3 && angles.every((a) => typeof a === "string")) {
      return angles;
    }
    logger.warn("Topic angle generation returned invalid JSON payload", {
      topicName,
      rawResponse: firstContent.text,
    });
  } catch (error) {
    logger.error("Failed to parse topic angles JSON", error, {
      topicName,
      rawResponse: firstContent.text,
    });
  }

  return [];
}
