import type { CustomerSegment, AISuggestion } from "../types";
import { mockTextGenProvider } from "./provider";

/**
 * Turns segment counts into the doc's "42 customers haven't visited in 30
 * days → Send them a €10 comeback offer" style suggestions, each with a
 * ready-to-create Campaign attached. The segment membership is real; only
 * the copy generation goes through the (currently mock) text provider.
 */
export async function generateSuggestions(
  segments: CustomerSegment[],
  tenantId: string
): Promise<AISuggestion[]> {
  const suggestions: AISuggestion[] = [];

  const inactive = segments.find((s) => s.id === "seg_inactive");
  if (inactive && inactive.customer_ids.length > 0) {
    const { text: headline } = await mockTextGenProvider.generate({
      prompt: `${inactive.customer_ids.length} customers haven't visited recently and are at high risk of churning.`,
    });
    suggestions.push({
      id: "sugg_inactive",
      tenant_id: tenantId,
      segment_id: "seg_inactive",
      headline,
      recommended_action: "Send them a €10 comeback offer.",
      suggested_campaign: {
        name: "AI: Win back inactive customers",
        trigger: "inactive_30d",
        trigger_value: 30,
        action: "send_voucher",
        action_config: {
          message: "We miss you at Globowax — here's €10 off your next wash.",
          discount_value: 10,
          discount_type: "fixed",
          channel: "whatsapp",
        },
      },
      created_at: new Date().toISOString(),
    });
  }

  const atRisk = segments.find((s) => s.id === "seg_at_risk");
  if (atRisk && atRisk.customer_ids.length > 0) {
    const { text: headline } = await mockTextGenProvider.generate({
      prompt: `${atRisk.customer_ids.length} regular customers are visiting less often than usual.`,
    });
    suggestions.push({
      id: "sugg_at_risk",
      tenant_id: tenantId,
      segment_id: "seg_at_risk",
      headline,
      recommended_action: "Nudge them with a reminder before they lapse fully.",
      suggested_campaign: {
        name: "AI: Re-engage slowing customers",
        trigger: "points_threshold",
        trigger_value: 300,
        action: "send_notification",
        action_config: { message: "It's been a while — your car (and your points) are waiting.", channel: "whatsapp" },
      },
      created_at: new Date().toISOString(),
    });
  }

  const ceramic = segments.find((s) => s.id === "seg_ceramic");
  if (ceramic && ceramic.customer_ids.length > 0) {
    const { text: headline } = await mockTextGenProvider.generate({
      prompt: `${ceramic.customer_ids.length} customers have bought Ceramic Coating and are good fits for maintenance upsells.`,
    });
    suggestions.push({
      id: "sugg_ceramic",
      tenant_id: tenantId,
      segment_id: "seg_ceramic",
      headline,
      recommended_action: "Offer them a discounted ceramic maintenance top-up.",
      suggested_campaign: {
        name: "AI: Ceramic maintenance upsell",
        trigger: "nth_visit",
        trigger_value: 3,
        action: "send_voucher",
        action_config: {
          message: "Time to keep that ceramic finish sharp — 15% off maintenance details this month.",
          discount_value: 15,
          discount_type: "percentage",
          channel: "email",
        },
      },
      created_at: new Date().toISOString(),
    });
  }

  return suggestions;
}
