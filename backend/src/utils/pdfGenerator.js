import { jsPDF } from "jspdf";

export const generateFeedbackPdf = (records, kpis, filterInfo) => {
  const doc = new jsPDF("p", "mm", "a4");
  const primaryColor = [37, 99, 235];
  const textColor = [17, 24, 39];
  const lightGray = [107, 114, 128];

  // Header bar
  doc.setFillColor(37, 99, 235);
  doc.rect(0, 0, 210, 12, "F");

  // Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text("Feedback Analyzer Report", 14, 25);

  // Metadata
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(lightGray[0], lightGray[1], lightGray[2]);
  doc.text("Scope: Filtered Feedback Report Summary", 14, 32);
  doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 38);

  doc.setDrawColor(229, 231, 235);
  doc.line(14, 42, 196, 42);

  // Filters text
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(textColor[0], textColor[1], textColor[2]);
  doc.text("Active Filters:", 14, 48);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(filterInfo, 14, 53);

  // KPI block
  doc.setFillColor(248, 250, 252);
  doc.rect(14, 58, 182, 26, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(lightGray[0], lightGray[1], lightGray[2]);
  doc.text("TOTAL REVIEWS", 20, 65);
  doc.text("AVERAGE RATING", 65, 65);
  doc.text("SATISFACTION SCORE", 110, 65);
  doc.text("POSITIVE SENTIMENT", 155, 65);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text(String(kpis.total), 20, 75);
  doc.text(`${kpis.avgRating} / 5.0`, 65, 75);
  doc.text(`${kpis.satisfaction}%`, 110, 75);
  doc.text(`${kpis.positivePercent}%`, 155, 75);

  // Table header
  let y = 95;
  doc.setFillColor(229, 231, 235);
  doc.rect(14, y, 182, 8, "F");
  doc.setFontSize(8);
  doc.setTextColor(textColor[0], textColor[1], textColor[2]);
  doc.text("Student", 17, y + 5.5);
  doc.text("Course / Trainer", 52, y + 5.5);
  doc.text("Rating", 132, y + 5.5);
  doc.text("Sentiment", 152, y + 5.5);
  doc.text("Date", 177, y + 5.5);

  y += 8;
  doc.setFont("helvetica", "normal");

  records.slice(0, 25).forEach((row, idx) => {
    if (y > 275) {
      doc.addPage();
      y = 20;
    }

    if (idx % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(14, y, 182, 7, "F");
    }

    doc.text(String(row.studentName || row.student).substring(0, 18), 17, y + 4.5);
    doc.text(`${String(row.course?.title || row.course || "").substring(0, 18)} / ${String(row.trainer?.name || row.trainer || "").substring(0, 14)}`, 52, y + 4.5);
    doc.text(`${row.rating} / 5`, 132, y + 4.5);
    doc.text(String(row.sentiment).toUpperCase(), 152, y + 4.5);
    doc.text(new Date(row.createdAt || row.date).toISOString().slice(0, 10), 177, y + 4.5);
    y += 7;
  });

  return doc.output("arraybuffer");
};
