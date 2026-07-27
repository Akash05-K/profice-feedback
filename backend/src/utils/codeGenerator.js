export const generateFeedbackCode = (num) => {
  if (typeof num === "number") {
    const finalNum = num >= 1043 ? num : 1043 + num;
    return `FB-${finalNum}`;
  }
  return `FB-${num}`;
};

export const generateActionCode = (num) => {
  if (typeof num === "number") {
    const finalNum = num >= 113 ? num : 113 + num;
    return `ACT-${finalNum}`;
  }
  return `ACT-${num}`;
};

