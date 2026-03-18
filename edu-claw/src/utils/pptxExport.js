import PptxGenJS from 'pptxgenjs';

const COLORS = {
  primary: '5470c6',
  secondary: '3ba272',
  dark: '2c3e50',
  gray: '666666',
  lightBg: 'f0f4ff',
  white: 'ffffff',
  red: 'dc2626',
  green: '059669',
  tipBg: 'fff8e1',
  tipBorder: 'fac858',
};

export function exportToPptx(slideData) {
  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_16x9';
  pptx.author = 'AI Tutor';
  pptx.title = slideData.title;

  for (const slide of slideData.slides) {
    switch (slide.type) {
      case 'title': addTitleSlide(pptx, slide); break;
      case 'question': addQuestionSlide(pptx, slide); break;
      case 'knowledge': addKnowledgeSlide(pptx, slide); break;
      case 'analysis': addAnalysisSlide(pptx, slide); break;
      case 'mistakes': addMistakesSlide(pptx, slide); break;
      case 'summary': addSummarySlide(pptx, slide); break;
      default: break;
    }
  }

  pptx.writeFile({ fileName: `${slideData.title}.pptx` });
}

function addTitleSlide(pptx, slide) {
  const s = pptx.addSlide();
  s.background = { fill: COLORS.primary };
  s.addText(slide.heading, {
    x: 0.5, y: 1.5, w: 9, h: 1.5,
    fontSize: 36, fontFace: 'Microsoft YaHei',
    color: COLORS.white, bold: true, align: 'center',
  });
  s.addText(slide.subheading, {
    x: 0.5, y: 3.2, w: 9, h: 0.8,
    fontSize: 18, fontFace: 'Microsoft YaHei',
    color: COLORS.white, align: 'center',
  });
}

function addQuestionSlide(pptx, slide) {
  const s = pptx.addSlide();
  s.background = { fill: COLORS.white };
  addHeading(s, slide.heading);

  s.addText(slide.question, {
    x: 0.5, y: 1.2, w: 9, h: 0.8,
    fontSize: 14, fontFace: 'Microsoft YaHei',
    color: COLORS.dark, fill: { color: 'f8f9fa' },
    valign: 'middle',
  });

  let y = 2.2;
  if (slide.options) {
    for (const opt of slide.options) {
      const color = opt.status === 'correct' ? COLORS.green : opt.status === 'wrong' ? COLORS.red : COLORS.gray;
      s.addText(`${opt.key}. ${opt.text}`, {
        x: 0.8, y, w: 8.2, h: 0.4,
        fontSize: 13, fontFace: 'Microsoft YaHei', color,
        bold: opt.status !== 'neutral',
      });
      y += 0.45;
    }
  }

  y += 0.2;
  s.addText(`你的答案：${slide.studentAnswer}`, {
    x: 0.5, y, w: 4, h: 0.4,
    fontSize: 13, fontFace: 'Microsoft YaHei', color: COLORS.red, bold: true,
  });
  s.addText(`正确答案：${slide.correctAnswer}`, {
    x: 5, y, w: 4, h: 0.4,
    fontSize: 13, fontFace: 'Microsoft YaHei', color: COLORS.green, bold: true,
  });
}

function addKnowledgeSlide(pptx, slide) {
  const s = pptx.addSlide();
  s.background = { fill: COLORS.white };
  addHeading(s, slide.heading);

  const bullets = slide.bullets.map((b) => ({ text: b, options: { bullet: true } }));
  s.addText(bullets, {
    x: 0.6, y: 1.4, w: 8.8, h: 3.5,
    fontSize: 14, fontFace: 'Microsoft YaHei',
    color: COLORS.dark, lineSpacingMultiple: 1.8,
    paraSpaceAfter: 8,
  });
}

function addAnalysisSlide(pptx, slide) {
  const s = pptx.addSlide();
  s.background = { fill: COLORS.white };
  addHeading(s, slide.heading);

  let y = 1.4;
  for (const step of slide.steps) {
    s.addShape(pptx.ShapeType.oval, {
      x: 0.6, y, w: 0.4, h: 0.4,
      fill: { color: COLORS.primary },
    });
    s.addText(String(step.step), {
      x: 0.6, y, w: 0.4, h: 0.4,
      fontSize: 13, fontFace: 'Microsoft YaHei',
      color: COLORS.white, bold: true, align: 'center', valign: 'middle',
    });
    s.addText(step.text, {
      x: 1.2, y, w: 8.3, h: 0.5,
      fontSize: 14, fontFace: 'Microsoft YaHei',
      color: COLORS.dark, valign: 'middle',
    });
    y += 0.7;
  }
}

function addMistakesSlide(pptx, slide) {
  const s = pptx.addSlide();
  s.background = { fill: COLORS.white };
  addHeading(s, slide.heading);

  let y = 1.4;
  for (const item of slide.items) {
    s.addText(`\u2717 ${item.misconception}`, {
      x: 0.5, y, w: 9, h: 0.5,
      fontSize: 13, fontFace: 'Microsoft YaHei',
      color: COLORS.red, fill: { color: 'fff5f5' },
    });
    y += 0.55;
    s.addText(`\u2713 ${item.correction}`, {
      x: 0.5, y, w: 9, h: 0.5,
      fontSize: 13, fontFace: 'Microsoft YaHei',
      color: COLORS.green, fill: { color: 'f0fff4' },
    });
    y += 0.7;
  }
}

function addSummarySlide(pptx, slide) {
  const s = pptx.addSlide();
  s.background = { fill: COLORS.white };
  addHeading(s, slide.heading);

  const bullets = slide.keyPoints.map((p) => ({ text: p, options: { bullet: true } }));
  s.addText(bullets, {
    x: 0.6, y: 1.4, w: 8.8, h: 2.5,
    fontSize: 14, fontFace: 'Microsoft YaHei',
    color: COLORS.dark, lineSpacingMultiple: 1.8,
    paraSpaceAfter: 8,
  });

  if (slide.tip) {
    s.addShape(pptx.ShapeType.roundRect, {
      x: 0.5, y: 3.8, w: 9, h: 0.7,
      fill: { color: COLORS.tipBg },
      line: { color: COLORS.tipBorder, width: 1.5 },
      rectRadius: 0.1,
    });
    s.addText(`\uD83D\uDCA1 ${slide.tip}`, {
      x: 0.7, y: 3.85, w: 8.6, h: 0.6,
      fontSize: 14, fontFace: 'Microsoft YaHei',
      color: '7c6900', valign: 'middle',
    });
  }
}

function addHeading(slide, text) {
  slide.addText(text, {
    x: 0.5, y: 0.3, w: 9, h: 0.7,
    fontSize: 24, fontFace: 'Microsoft YaHei',
    color: COLORS.dark, bold: true,
    border: { type: 'solid', pt: 0, color: COLORS.white },
  });
  slide.addShape('rect', {
    x: 0.5, y: 0.95, w: 2, h: 0.05,
    fill: { color: COLORS.primary },
  });
}
