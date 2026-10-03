const PART_TWO_OPTIONS = ["a", "b", "c", "d"];

function normalizeText(value) {
  return String(value ?? "").trim();
}

function getAnswerValue(answerEntry) {
  if (answerEntry && typeof answerEntry === "object" && "ans" in answerEntry) {
    return answerEntry.ans;
  }
  return answerEntry;
}

function getPartTwoPoints(correctOptions) {
  return {
    0: 0,
    1: 0.1,
    2: 0.25,
    3: 0.5,
    4: 1,
  }[correctOptions] || 0;
}

function createBreakdown(part) {
  return {
    part_key: part.key,
    title: part.title,
    total: part.questionCount,
    correct: 0,
    partial: 0,
    incorrect: 0,
    unanswered: 0,
    earned_points: 0,
    max_points: 0,
  };
}

function addResultToBreakdown(breakdown, result) {
  breakdown[result.status] += 1;
  breakdown.earned_points += result.earned_points;
  breakdown.max_points += result.max_points;
}

export function analyzeExamAttempt({ answers = {}, keys = {}, parts = [] }) {
  const questionResults = [];
  const breakdown = parts.map(createBreakdown);

  parts.forEach((part, partIndex) => {
    const partBreakdown = breakdown[partIndex];

    for (let questionNumber = 1; questionNumber <= part.questionCount; questionNumber += 1) {
      if (part.key === "P2") {
        const answerKey = keys.P2?.[questionNumber] || {};
        const hasCompleteKey = PART_TWO_OPTIONS.every(
          (option) => answerKey?.[option] === "T" || answerKey?.[option] === "F",
        );
        const userAnswer = {};
        const correctAnswer = {};
        let answeredOptions = 0;
        let correctOptions = 0;

        PART_TWO_OPTIONS.forEach((option) => {
          const selected = answers[`ans_P2_${questionNumber}${option}`];
          if (selected === "T" || selected === "F") {
            userAnswer[option] = selected;
            answeredOptions += 1;
          }
          if (hasCompleteKey) correctAnswer[option] = answerKey[option];
          if (hasCompleteKey && selected === answerKey[option]) correctOptions += 1;
        });

        const earnedPoints = hasCompleteKey ? getPartTwoPoints(correctOptions) : 0;
        const status =
          answeredOptions === 0
            ? "unanswered"
            : correctOptions === 4
              ? "correct"
              : correctOptions > 0
                ? "partial"
                : "incorrect";
        const result = {
          question_id: `P2-${questionNumber}`,
          part_key: "P2",
          part_title: part.title,
          question_number: questionNumber,
          status,
          answered: answeredOptions > 0,
          correct_options: correctOptions,
          option_count: 4,
          earned_points: earnedPoints,
          max_points: 1,
          user_answer: userAnswer,
          correct_answer: correctAnswer,
        };
        questionResults.push(result);
        addResultToBreakdown(partBreakdown, result);
        continue;
      }

      const answerEntry = keys[part.key]?.[questionNumber];
      const correctValue = normalizeText(getAnswerValue(answerEntry));
      const answerName = `ans_${part.key}_${questionNumber}`;
      const userValue = normalizeText(answers[answerName]);
      const answered = userValue !== "";
      const isCorrect = correctValue !== "" && userValue === correctValue;
      const maxPoints = part.key === "P1" ? 0.25 : 0.5;
      const status = !answered ? "unanswered" : isCorrect ? "correct" : "incorrect";
      const result = {
        question_id: `${part.key}-${questionNumber}`,
        part_key: part.key,
        part_title: part.title,
        question_number: questionNumber,
        status,
        answered,
        earned_points: isCorrect ? maxPoints : 0,
        max_points: maxPoints,
        user_answer: userValue,
        correct_answer: correctValue,
      };
      questionResults.push(result);
      addResultToBreakdown(partBreakdown, result);
    }
  });

  const earnedPoints = breakdown.reduce(
    (total, part) => total + part.earned_points,
    0,
  );
  const maximumPoints = breakdown.reduce(
    (total, part) => total + part.max_points,
    0,
  );
  const totals = questionResults.reduce(
    (summary, result) => {
      summary.total += 1;
      summary[result.status] += 1;
      if (result.answered) summary.answered += 1;
      return summary;
    },
    {
      total: 0,
      answered: 0,
      correct: 0,
      partial: 0,
      incorrect: 0,
      unanswered: 0,
    },
  );

  return {
    score:
      maximumPoints > 0
        ? Math.round((earnedPoints / maximumPoints) * 1000) / 100
        : 0,
    earnedPoints,
    maximumPoints,
    breakdown: breakdown.map((part) => ({
      ...part,
      earned_points: Math.round(part.earned_points * 100) / 100,
      max_points: Math.round(part.max_points * 100) / 100,
    })),
    questionResults,
    totals,
  };
}

export function formatStoredAnswer(value) {
  if (value === null || value === undefined || value === "") return "Chưa trả lời";
  if (typeof value !== "object") return String(value);
  const entries = Object.entries(value);
  if (!entries.length) return "Chưa trả lời";
  return entries
    .map(([key, answer]) => `${key}) ${answer === "T" ? "Đúng" : answer === "F" ? "Sai" : answer}`)
    .join(" · ");
}
