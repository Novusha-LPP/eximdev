export const calculateColumnWidth = (rows, columnId) => {
  let maxWidth = 100;
  rows.forEach((row) => {
    const width = measureTextWidth(row[columnId]);
    if (width > maxWidth) {
      maxWidth = width;
    }
  });
  return maxWidth + 100; // Add some padding
};

const measureTextWidth = (text) => {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  context.font = "12px Arial";
  return context.measureText(text).width;
};
