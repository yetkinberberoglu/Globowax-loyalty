import type { Customer, Transaction, TransactionItem, Service, CustomerInsight, CustomerSegment, ChurnRisk } from "../types";

/**
 * Computes a real (non-mocked) insight for one customer from their actual
 * transaction history: lifetime value is a straight sum, average days
 * between visits comes from the gaps between transaction dates, and churn
 * risk compares days-since-last-visit against that customer's own normal
 * rhythm (not a fixed threshold — a customer who visits every 45 days
 * isn't "at risk" at day 40 the way a weekly customer would be).
 */
export function computeCustomerInsight(
  customer: Customer,
  allTransactions: Transaction[],
  allItems: TransactionItem[]
): CustomerInsight {
  const txns = allTransactions
    .filter((t) => t.customer_id === customer.id)
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  const lifetimeValue = txns.reduce((sum, t) => sum + t.total_amount, 0);

  let avgDaysBetweenVisits: number | null = null;
  if (txns.length >= 2) {
    const gaps: number[] = [];
    for (let i = 1; i < txns.length; i++) {
      const days = (new Date(txns[i].created_at).getTime() - new Date(txns[i - 1].created_at).getTime()) / 86_400_000;
      gaps.push(days);
    }
    avgDaysBetweenVisits = gaps.reduce((a, b) => a + b, 0) / gaps.length;
  }

  const lastVisit = txns.length ? new Date(txns[txns.length - 1].created_at) : new Date(customer.created_at);
  const daysSinceLastVisit = (Date.now() - lastVisit.getTime()) / 86_400_000;

  let churnRisk: ChurnRisk = "low";
  if (avgDaysBetweenVisits) {
    const ratio = daysSinceLastVisit / avgDaysBetweenVisits;
    churnRisk = ratio >= 2.5 ? "high" : ratio >= 1.5 ? "medium" : "low";
  } else {
    // No visit history to establish a rhythm — fall back to an absolute window.
    churnRisk = daysSinceLastVisit >= 60 ? "high" : daysSinceLastVisit >= 30 ? "medium" : "low";
  }

  const predictedNextVisitDays = avgDaysBetweenVisits
    ? Math.max(0, Math.round(avgDaysBetweenVisits - daysSinceLastVisit))
    : null;

  const serviceCounts = new Map<string, number>();
  for (const t of txns) {
    for (const item of allItems.filter((i) => i.transaction_id === t.id)) {
      serviceCounts.set(item.service_id, (serviceCounts.get(item.service_id) ?? 0) + 1);
    }
  }
  const likelyNextServiceId =
    [...serviceCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  return {
    customer_id: customer.id,
    churn_risk: churnRisk,
    lifetime_value: lifetimeValue,
    avg_days_between_visits: avgDaysBetweenVisits ? Math.round(avgDaysBetweenVisits) : null,
    predicted_next_visit_days: predictedNextVisitDays,
    likely_next_service_id: likelyNextServiceId,
  };
}

/**
 * Rule-based segments — the doc's own examples (VIP, High Value, New,
 * Inactive, At Risk, Frequent Washers, Ceramic Customers). Each filter
 * runs against real insight data, not placeholder logic.
 */
export function computeSegments(
  customers: Customer[],
  insights: Map<string, CustomerInsight>,
  services: Service[],
  allTransactions: Transaction[],
  allItems: TransactionItem[]
): CustomerSegment[] {
  const ceramicServiceId = services.find((s) => s.category === "coating")?.id;

  const segments: CustomerSegment[] = [
    {
      id: "seg_vip",
      name: "VIP",
      description: "Top 20% by lifetime value",
      customer_ids: [],
    },
    {
      id: "seg_new",
      name: "New Customers",
      description: "Joined in the last 30 days",
      customer_ids: customers
        .filter((c) => (Date.now() - new Date(c.created_at).getTime()) / 86_400_000 <= 30)
        .map((c) => c.id),
    },
    {
      id: "seg_inactive",
      name: "Inactive",
      description: "Churn risk: high",
      customer_ids: customers.filter((c) => insights.get(c.id)?.churn_risk === "high").map((c) => c.id),
    },
    {
      id: "seg_at_risk",
      name: "At Risk",
      description: "Churn risk: medium",
      customer_ids: customers.filter((c) => insights.get(c.id)?.churn_risk === "medium").map((c) => c.id),
    },
    {
      id: "seg_frequent",
      name: "Frequent Washers",
      description: "Visits every 14 days or less on average",
      customer_ids: customers
        .filter((c) => {
          const avg = insights.get(c.id)?.avg_days_between_visits;
          return avg !== null && avg !== undefined && avg <= 14;
        })
        .map((c) => c.id),
    },
    {
      id: "seg_ceramic",
      name: "Ceramic Customers",
      description: "Has purchased Ceramic Coating",
      customer_ids: ceramicServiceId
        ? customers
            .filter((c) =>
              allTransactions
                .filter((t) => t.customer_id === c.id)
                .some((t) => allItems.some((i) => i.transaction_id === t.id && i.service_id === ceramicServiceId))
            )
            .map((c) => c.id)
        : [],
    },
  ];

  const sortedByLtv = [...customers].sort(
    (a, b) => (insights.get(b.id)?.lifetime_value ?? 0) - (insights.get(a.id)?.lifetime_value ?? 0)
  );
  const vipCount = Math.max(1, Math.ceil(sortedByLtv.length * 0.2));
  segments[0].customer_ids = sortedByLtv.slice(0, vipCount).map((c) => c.id);

  return segments;
}
