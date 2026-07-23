export const generateFeedbackCode = (count) => {
  const nextNum = 1043 + count;
  return `FB-${nextNum}`;
};

export const generateActionCode = (count) => {
  const nextNum = 113 + count;
  return `ACT-${nextNum}`;
};
