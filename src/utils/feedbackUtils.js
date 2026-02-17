// --- Feedback emoji mapping for Q2 and Q3 ---
export const FEEDBACK_EMOJI_Q2 = {
  1: "😁",
  2: "🙂",
  3: "🤔",
  4: "😕",
  5: "😞"
};

export const FEEDBACK_EMOJI_Q3 = {
  1: "😕",
  2: "🤔",
  3: "😐",
  4: "🙂",
  5: "💡"
};

// --- Helper: get next 5 weekdays ---
export function getNextFiveWeekdays() {
  const result = [];
  let current = new Date();
  while (result.length < 5) {
    const day = current.getDay();
    if (day !== 0 && day !== 6) {
      const d = current.toISOString().split("T")[0];
      result.push({ date: d, weekday: ["P", "E", "T", "K", "N", "R", "L"][day] });
    }
    current.setDate(current.getDate() + 1);
  }
  return result;
}
