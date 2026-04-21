const salaryData = {
  years: [2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025],
  latestYear: 2025,
  nationalGrowth: {
    2019: 0.032,
    2020: 0.032,
    2021: 0.0414,
    2022: 0.053,
    2023: 0.082,
    2024: 0.048,
    2025: 0.038,
  },
  positions: {
    "Assistant Lecturer": {
      level: 1.05,
      salaries: {
        2018: 61572,
        2019: 62803,
        2020: 64374,
        2021: 66305,
        2022: 66968,
        2023: 69647,
        2024: 72433,
        2025: 74606,
      },
    },
    Lecturer: {
      level: 2.01,
      salaries: {
        2018: 76204,
        2019: 77728,
        2020: 79671,
        2021: 82061,
        2022: 82882,
        2023: 86197,
        2024: 89645,
        2025: 92334,
      },
    },
    "Senior Lecturer": {
      level: 4.01,
      salaries: {
        2018: 97697,
        2019: 99651,
        2020: 102142,
        2021: 105206,
        2022: 106258,
        2023: 109977,
        2024: 113826,
        2025: 117241,
      },
    },
    "Senior Lecturer Above the Bar": {
      level: 5.01,
      salaries: {
        2018: 115681,
        2019: 117995,
        2020: 120944,
        2021: 124573,
        2022: 125819,
        2023: 130223,
        2024: 134781,
        2025: 138824,
      },
    },
    "Associate Professor": {
      level: 6.01,
      salaries: {
        2018: 127112,
        2019: 129654,
        2020: 132896,
        2021: 136882,
        2022: 138251,
        2023: 143090,
        2024: 148098,
        2025: 152541,
      },
    },
    Professor: {
      level: 7.01,
      salaries: {
        2018: 145628,
        2019: 148541,
        2020: 152254,
        2021: 156882,
        2022: 158390,
        2023: 163934,
        2024: 169672,
        2025: 174762,
      },
    },
    "Distinguished Professor": {
      level: 8,
      salaries: {
        2018: 188342,
        2019: 196754,
        2020: 201423,
        2021: 207165,
        2022: 210013,
        2023: 217363,
        2024: 224971,
        2025: 231720,
      },
    },
  },
};

const positionSelect = document.querySelector("#position-select");
const startYearSelect = document.querySelector("#start-year-select");
const scenarioTitle = document.querySelector("#scenario-title");
const latestYearChip = document.querySelector("#latest-year-chip");
const salaryGap = document.querySelector("#salary-gap");
const salaryGapFootnote = document.querySelector("#salary-gap-footnote");
const missedEarnings = document.querySelector("#missed-earnings");
const actualGrowth = document.querySelector("#actual-growth");
const actualGrowthFootnote = document.querySelector("#actual-growth-footnote");
const benchmarkGrowth = document.querySelector("#benchmark-growth");
const growthGapFootnote = document.querySelector("#growth-gap-footnote");
const tableBody = document.querySelector("#results-table-body");
const chart = document.querySelector("#trajectory-chart");

const currencyFormatter = new Intl.NumberFormat("en-NZ", {
  style: "currency",
  currency: "NZD",
  maximumFractionDigits: 0,
});

const percentageFormatter = new Intl.NumberFormat("en-NZ", {
  style: "percent",
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

function formatCurrency(value) {
  return currencyFormatter.format(value);
}

function formatPercent(value) {
  return percentageFormatter.format(value);
}

function getAvailableYearsForPosition(position) {
  return salaryData.years.filter((year) => year in salaryData.positions[position].salaries);
}

function buildCounterfactual(position, startYear) {
  const salaries = salaryData.positions[position].salaries;
  const years = salaryData.years.filter((year) => year >= startYear && year in salaries);
  const series = [];

  let runningValue = salaries[startYear];
  for (const year of years) {
    if (year === startYear) {
      series.push({ year, actual: salaries[year], counterfactual: salaries[year] });
      continue;
    }

    runningValue *= 1 + salaryData.nationalGrowth[year];
    series.push({ year, actual: salaries[year], counterfactual: runningValue });
  }

  return series;
}

function calculateScenario(position, startYear) {
  const series = buildCounterfactual(position, startYear);
  const first = series[0];
  const last = series[series.length - 1];
  const annualGap = last.counterfactual - last.actual;
  const cumulativeMissed = series.reduce(
    (sum, row) => sum + (row.counterfactual - row.actual),
    0,
  );
  const actualGrowthRate = first.actual === 0 ? 0 : last.actual / first.actual - 1;
  const benchmarkGrowthRate = first.actual === 0 ? 0 : last.counterfactual / first.actual - 1;
  const growthGap = benchmarkGrowthRate - actualGrowthRate;
  const currentGapShare = last.counterfactual === 0 ? 0 : annualGap / last.counterfactual;

  return {
    position,
    startYear,
    latestYear: last.year,
    series,
    annualGap,
    cumulativeMissed,
    actualGrowthRate,
    benchmarkGrowthRate,
    growthGap,
    currentGapShare,
  };
}

function createSvgElement(tagName, attributes = {}) {
  const node = document.createElementNS("http://www.w3.org/2000/svg", tagName);
  for (const [key, value] of Object.entries(attributes)) {
    node.setAttribute(key, value);
  }
  return node;
}

function drawChart(series) {
  chart.innerHTML = "";

  const width = 860;
  const height = 360;
  const margin = { top: 24, right: 24, bottom: 52, left: 84 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  const years = series.map((row) => row.year);
  const allValues = series.flatMap((row) => [row.actual, row.counterfactual]);
  const minValue = Math.min(...allValues) * 0.96;
  const maxValue = Math.max(...allValues) * 1.04;

  const xScale = (year) => {
    if (years.length === 1) {
      return margin.left + innerWidth / 2;
    }
    return (
      margin.left +
      ((year - years[0]) / (years[years.length - 1] - years[0])) * innerWidth
    );
  };

  const yScale = (value) =>
    margin.top + innerHeight - ((value - minValue) / (maxValue - minValue || 1)) * innerHeight;

  const chartArea = createSvgElement("rect", {
    x: margin.left,
    y: margin.top,
    width: innerWidth,
    height: innerHeight,
    rx: 18,
    fill: "#f8f5ef",
  });
  chart.appendChild(chartArea);

  const gridLineCount = 5;
  for (let i = 0; i <= gridLineCount; i += 1) {
    const value = minValue + ((maxValue - minValue) * i) / gridLineCount;
    const y = yScale(value);
    chart.appendChild(
      createSvgElement("line", {
        x1: margin.left,
        y1: y,
        x2: margin.left + innerWidth,
        y2: y,
        stroke: "#d7d1c4",
        "stroke-width": "1",
      }),
    );
    const label = createSvgElement("text", {
      x: margin.left - 12,
      y: y + 5,
      "text-anchor": "end",
      fill: "#5e5a52",
      "font-size": "12",
      "font-family": "Space Grotesk, sans-serif",
    });
    label.textContent = formatCurrency(value);
    chart.appendChild(label);
  }

  years.forEach((year) => {
    const x = xScale(year);
    chart.appendChild(
      createSvgElement("line", {
        x1: x,
        y1: margin.top,
        x2: x,
        y2: margin.top + innerHeight,
        stroke: "#ece6da",
        "stroke-width": "1",
      }),
    );
    const label = createSvgElement("text", {
      x,
      y: margin.top + innerHeight + 28,
      "text-anchor": "middle",
      fill: "#5e5a52",
      "font-size": "12",
      "font-family": "Space Grotesk, sans-serif",
    });
    label.textContent = year;
    chart.appendChild(label);
  });

  const makePath = (key) =>
    series
      .map((row, index) => {
        const prefix = index === 0 ? "M" : "L";
        return `${prefix} ${xScale(row.year)} ${yScale(row[key])}`;
      })
      .join(" ");

  chart.appendChild(
    createSvgElement("path", {
      d: makePath("counterfactual"),
      fill: "none",
      stroke: "#d97706",
      "stroke-width": "4",
      "stroke-linecap": "round",
      "stroke-linejoin": "round",
      "stroke-dasharray": "10 10",
    }),
  );

  chart.appendChild(
    createSvgElement("path", {
      d: makePath("actual"),
      fill: "none",
      stroke: "#0f766e",
      "stroke-width": "4",
      "stroke-linecap": "round",
      "stroke-linejoin": "round",
    }),
  );

  series.forEach((row) => {
    chart.appendChild(
      createSvgElement("circle", {
        cx: xScale(row.year),
        cy: yScale(row.actual),
        r: "5",
        fill: "#0f766e",
      }),
    );
    chart.appendChild(
      createSvgElement("circle", {
        cx: xScale(row.year),
        cy: yScale(row.counterfactual),
        r: "5",
        fill: "#d97706",
      }),
    );
  });
}

function renderTable(series) {
  tableBody.innerHTML = "";

  for (const row of series) {
    const gap = row.counterfactual - row.actual;
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${row.year}</td>
      <td>${formatCurrency(row.actual)}</td>
      <td>${formatCurrency(row.counterfactual)}</td>
      <td>${formatCurrency(gap)}</td>
    `;
    tableBody.appendChild(tr);
  }
}

function renderScenario(position, startYear) {
  const scenario = calculateScenario(position, startYear);

  scenarioTitle.textContent = `${position} from ${startYear}`;
  latestYearChip.textContent = `Through ${scenario.latestYear}`;
  salaryGap.textContent = formatCurrency(scenario.annualGap);
  salaryGapFootnote.textContent = `${formatPercent(scenario.currentGapShare)} below the national-growth benchmark salary`;
  missedEarnings.textContent = formatCurrency(scenario.cumulativeMissed);
  actualGrowth.textContent = formatPercent(scenario.actualGrowthRate);
  actualGrowthFootnote.textContent = `Actual growth from ${startYear} to ${scenario.latestYear}`;
  benchmarkGrowth.textContent = formatPercent(scenario.benchmarkGrowthRate);

  const gapDirection = scenario.growthGap >= 0 ? "behind" : "ahead of";
  growthGapFootnote.textContent = `${formatPercent(Math.abs(scenario.growthGap))} ${gapDirection} national wage growth`;

  drawChart(scenario.series);
  renderTable(scenario.series);
}

function syncStartYearOptions(position) {
  const availableYears = getAvailableYearsForPosition(position);
  const selectedYear = Number(startYearSelect.value);

  startYearSelect.innerHTML = "";
  for (const year of availableYears) {
    const option = document.createElement("option");
    option.value = String(year);
    option.textContent = String(year);
    startYearSelect.appendChild(option);
  }

  const nextYear = availableYears.includes(selectedYear) ? selectedYear : availableYears[0];
  startYearSelect.value = String(nextYear);
}

function initialiseControls() {
  Object.keys(salaryData.positions).forEach((position) => {
    const option = document.createElement("option");
    option.value = position;
    option.textContent = position;
    positionSelect.appendChild(option);
  });

  positionSelect.value = "Lecturer";
  syncStartYearOptions(positionSelect.value);
  startYearSelect.value = "2018";
  renderScenario(positionSelect.value, Number(startYearSelect.value));

  positionSelect.addEventListener("change", () => {
    syncStartYearOptions(positionSelect.value);
    renderScenario(positionSelect.value, Number(startYearSelect.value));
  });

  startYearSelect.addEventListener("change", () => {
    renderScenario(positionSelect.value, Number(startYearSelect.value));
  });
}

initialiseControls();
