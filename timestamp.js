exports.monthStartDate = () => {
  const date = new Date();
  return new Date(date.getFullYear(), date.getMonth(), 1).getTime();
};

exports.weekStartDate = () => {
  const date = new Date();
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() - date.getDay() + (date.getDay() === 0 ? -6 : 1)).getTime();
};

exports.lastWeekStartDate = () => {
  const date = new Date();
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() - date.getDay() + (date.getDay() === 0 ? -6 : 1) - 7).getTime();
};
