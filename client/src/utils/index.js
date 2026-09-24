export function computeScores(items) {
  let total = 0;
  let maxTotal = 0;
  const scoredItems = (items || []).map((item) => {
    const rating = item.rating || 0;
    const weightage = item.weightage || 0;
    const score = parseFloat(((rating * weightage) / 10).toFixed(2));
    total += score;
    maxTotal += weightage;
    return { ...item, score };
  });
  const percentage = maxTotal > 0 ? Math.round((total / maxTotal) * 100) : 0;
  return { items: scoredItems, total, maxTotal, percentage };
}

export function getRatingLabel(pct) {
  if (pct >= 90) return { label: "Excellent", badgeClass: "badge-excellent" };
  if (pct >= 70) return { label: "Good", badgeClass: "badge-good" };
  if (pct >= 60) return { label: "Satisfactory", badgeClass: "badge-satisfactory" };
  if (pct >= 50) return { label: "Needs Improvement", badgeClass: "badge-warning" };
  return { label: "Poor", badgeClass: "badge-danger" };
}

export function getScoreBadgeClass(score, weightage) {
  if (!weightage) return "badge-empty";
  const pct = (score / (weightage / 10)) * 10;
  if (pct >= 9) return "badge-excellent";
  if (pct >= 7) return "badge-good";
  if (pct >= 6) return "badge-satisfactory";
  if (pct >= 5) return "badge-warning";
  return "badge-danger";
}

export function getStatusClass(status) {
  switch (status) {
    case "Approved": return "badge-success";
    case "Submitted": return "badge-submitted";
    case "Draft": default: return "badge-secondary";
  }
}

export function fmtDate(dateStr) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}
