/** userShare for spend aggregations (split expenses use userShare). */
export function spendAmountExpression() {
  return { $ifNull: ["$userShare", "$amount"] };
}
