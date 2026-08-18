const header = document.querySelector("[data-header]");
const year = document.querySelector("[data-year]");
const navGroups = [...document.querySelectorAll("[data-nav-group]")];
const commitSummary = document.querySelector("[data-commit-summary]");
const commitStatus = document.querySelector("[data-commit-status]");
const commitList = document.querySelector("[data-commit-list]");
const commitFeedPath = document.body?.dataset.commitFeed || "assets/commits.json";
const commitRefreshInterval = 5 * 60 * 1000;
const metricsRoot = document.querySelector("[data-metrics]");
const metricsStatus = document.querySelector("[data-metrics-status]");
const metricsBody = document.querySelector("[data-metrics-body]");
const heatmapTable = document.querySelector("[data-heatmap]");
const heatmapScroll = document.querySelector(".heatmap-scroll");
const heatLegend = document.querySelector("[data-heat-legend]");
const heatRange = document.querySelector("[data-heat-range]");
const monthChart = document.querySelector("[data-month-chart]");
const monthRange = document.querySelector("[data-month-range]");
const chartTip = document.querySelector("[data-chart-tip]");
const heatmapWeeks = 26;
const monthChartMonths = 12;
const weekdayTicks = [0, 2, 4];
const galleryStatus = document.querySelector("[data-gallery-status]");
const galleryFeedPath = document.body?.dataset.galleryFeed;
const galleryBlocks = [...document.querySelectorAll("[data-gallery-block]")];
const galleryCarousel = document.querySelector("[data-gallery-carousel]");
const galleryCarouselImage = document.querySelector("[data-gallery-carousel-image]");
const galleryCarouselCount = document.querySelector("[data-gallery-carousel-count]");
const galleryPrevButton = document.querySelector("[data-gallery-prev]");
const galleryNextButton = document.querySelector("[data-gallery-next]");
const contactForm = document.querySelector("[data-contact-form]");
const contactStatus = document.querySelector("[data-contact-status]");
const gameName = document.body?.dataset.gameName || "Cyber Bully: 502 Bad Gateway";
let carouselImages = [];
let carouselIndex = 0;

const syncHeader = () => {
  header?.classList.toggle("is-scrolled", window.scrollY > 12);
};

const setNavMenu = (group, open) => {
  const trigger = group.querySelector("[data-nav-trigger]");
  const menu = group.querySelector("[data-nav-menu]");

  if (!trigger || !menu) {
    return;
  }

  trigger.setAttribute("aria-expanded", String(open));
  menu.hidden = !open;
};

const closeNavMenus = (except) => {
  navGroups.forEach((group) => {
    if (group !== except) {
      setNavMenu(group, false);
    }
  });
};

navGroups.forEach((group) => {
  const trigger = group.querySelector("[data-nav-trigger]");

  trigger?.addEventListener("click", () => {
    const open = trigger.getAttribute("aria-expanded") === "true";
    closeNavMenus(group);
    setNavMenu(group, !open);
  });

  group.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") {
      return;
    }

    setNavMenu(group, false);
    trigger?.focus();
  });
});

// A pointer or focus landing anywhere outside an open menu should close it.
if (navGroups.length) {
  document.addEventListener("pointerdown", (event) => {
    closeNavMenus(navGroups.find((group) => group.contains(event.target)));
  });

  document.addEventListener("focusin", (event) => {
    closeNavMenus(navGroups.find((group) => group.contains(event.target)));
  });
}


const formatDate = (value) =>
  new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));

const renderCommitFeed = (feed) => {
  const commits = Array.isArray(feed.commits) ? feed.commits : [];
  const refreshed = feed.generatedAt ? formatDate(feed.generatedAt) : "recently";

  commitSummary.textContent = `${commits.length} development commits tracked. Last refreshed ${refreshed}.`;
  commitStatus.textContent = commits.length
    ? "Showing the latest generated commit log."
    : "No commits found yet.";
  commitList.replaceChildren(
    ...commits.map((commit) => {
      const item = document.createElement("li");
      const title = document.createElement("span");
      const meta = document.createElement("div");
      const date = document.createElement("span");
      const author = document.createElement("span");
      const sha = document.createElement("span");

      item.className = "commit-item";
      title.className = "commit-title";
      title.textContent = commit.message || "Untitled commit";
      meta.className = "commit-meta";
      date.textContent = commit.date ? formatDate(commit.date) : "Unknown date";
      author.textContent = commit.author ? `by ${commit.author}` : "unknown author";
      sha.className = "commit-sha";
      sha.textContent = commit.shortSha || "";

      meta.append(date, author, sha);
      item.append(title, meta);
      return item;
    })
  );

  renderCommitMetrics(commits);
};

const loadCommitFeed = async () => {
  if (!commitList || !commitSummary || !commitStatus) {
    return;
  }

  try {
    const response = await fetch(commitFeedPath, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`Commit feed returned ${response.status}`);
    }

    renderCommitFeed(await response.json());
  } catch (error) {
    commitSummary.textContent = "The development log could not be loaded right now.";
    commitStatus.textContent = "Try refreshing this page later.";
    commitList.replaceChildren();
    clearCommitMetrics();
    console.error(error);
  }
};

const numberFormat = new Intl.NumberFormat();
const fullDateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: "full" });
const shortDateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: "medium" });
const monthTickFormat = new Intl.DateTimeFormat(undefined, { month: "short" });
const monthTitleFormat = new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" });
const monthRangeFormat = new Intl.DateTimeFormat(undefined, { month: "short", year: "numeric" });
const weekdayFormat = new Intl.DateTimeFormat(undefined, { weekday: "long" });
const weekdayTickFormat = new Intl.DateTimeFormat(undefined, { weekday: "short" });

const startOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
const addDays = (date, days) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
const monthKey = (date) => `${date.getFullYear()}-${date.getMonth()}`;
const countLabel = (count, noun) => `${numberFormat.format(count)} ${noun}${count === 1 ? "" : "s"}`;
const dayRange = (from, to) =>
  to > from ? `${from}–${to} commits a day` : `${countLabel(from, "commit")} a day`;
// 1 January 2024 was a Monday, so the weekday labels start there.
const weekdaySamples = Array.from({ length: 7 }, (_, index) => addDays(new Date(2024, 0, 1), index));

const buildCommitStats = (commits) => {
  const perDay = new Map();
  const perMonth = new Map();
  const stamps = [];
  let earliest = null;
  let latest = null;

  commits.forEach((commit) => {
    const date = new Date(commit.date);
    if (Number.isNaN(date.getTime())) {
      return;
    }

    const dayStamp = startOfDay(date).getTime();
    perDay.set(dayStamp, (perDay.get(dayStamp) || 0) + 1);
    perMonth.set(monthKey(date), (perMonth.get(monthKey(date)) || 0) + 1);
    stamps.push(dayStamp);
    if (!earliest || date < earliest) {
      earliest = date;
    }
    if (!latest || date > latest) {
      latest = date;
    }
  });

  if (!stamps.length) {
    return null;
  }

  const today = startOfDay(new Date());
  const recentStart = addDays(today, -29).getTime();
  const previousStart = addDays(today, -59).getTime();
  const activeStamps = [...perDay.keys()].sort((a, b) => a - b);
  let longestStreak = 1;
  let currentStreak = 1;

  for (let index = 1; index < activeStamps.length; index += 1) {
    const expected = addDays(new Date(activeStamps[index - 1]), 1).getTime();
    currentStreak = activeStamps[index] === expected ? currentStreak + 1 : 1;
    longestStreak = Math.max(longestStreak, currentStreak);
  }

  let busiest = { stamp: activeStamps[0], count: 0 };
  perDay.forEach((count, stamp) => {
    if (count > busiest.count) {
      busiest = { stamp, count };
    }
  });

  // A project that has gone quiet would otherwise chart 26 empty weeks, so the
  // chart windows end at the last commit once the work stops.
  const latestDay = startOfDay(latest);
  const anchor = latestDay >= addDays(today, -13) ? today : latestDay;

  return {
    total: commits.length,
    perDay,
    perMonth,
    earliest,
    latest,
    today,
    anchor,
    recent: stamps.filter((stamp) => stamp >= recentStart).length,
    previous: stamps.filter((stamp) => stamp >= previousStart && stamp < recentStart).length,
    activeDays: activeStamps.length,
    trackedDays: Math.round((latestDay - startOfDay(earliest)) / 86400000) + 1,
    longestStreak,
    busiest,
  };
};

const buildHeatmapWeeks = (perDay, anchor, today) => {
  // Weeks run Monday to Sunday and the grid ends with the anchor's week.
  const lastSunday = addDays(anchor, (7 - anchor.getDay()) % 7);
  const firstMonday = addDays(lastSunday, -(heatmapWeeks * 7 - 1));

  return Array.from({ length: heatmapWeeks }, (_, week) =>
    Array.from({ length: 7 }, (_, day) => {
      const date = addDays(firstMonday, week * 7 + day);
      return {
        date,
        count: perDay.get(date.getTime()) || 0,
        future: date > today,
      };
    })
  );
};

// Split the visible days into four density steps at the 40th, 65th and 85th
// percentile of active days, so the ramp describes this window's real spread.
const buildDensitySteps = (counts) => {
  const active = counts.filter((count) => count > 0).sort((a, b) => a - b);
  if (!active.length) {
    return [2, 3, 4];
  }

  const percentile = (ratio) => active[Math.min(active.length - 1, Math.floor(active.length * ratio))];
  const steps = [Math.max(percentile(0.4), 2), percentile(0.65), percentile(0.85)];
  for (let index = 1; index < steps.length; index += 1) {
    steps[index] = Math.max(steps[index], steps[index - 1] + 1);
  }

  return steps;
};

const densityLevel = (count, steps) => {
  if (count <= 0) {
    return 0;
  }
  if (count >= steps[2]) {
    return 4;
  }
  if (count >= steps[1]) {
    return 3;
  }
  return count >= steps[0] ? 2 : 1;
};

// Month names float above narrow columns, so keep three columns between them
// and drop a leading partial month that would crowd the first full one.
const pickMonthLabelColumns = (weeks) => {
  const starts = [];
  let seenMonth = -1;

  weeks.forEach((week, index) => {
    const month = week[0].date.getMonth();
    if (month !== seenMonth) {
      seenMonth = month;
      starts.push(index);
    }
  });

  const columns = new Set();
  let lastColumn = -Infinity;

  starts.forEach((column, index) => {
    if (column === 0 && starts[index + 1] < 3) {
      return;
    }
    if (column - lastColumn < 3) {
      return;
    }
    columns.add(column);
    lastColumn = column;
  });

  return columns;
};

const createHiddenText = (text) => {
  const hidden = document.createElement("span");
  hidden.className = "sr-only";
  hidden.textContent = text;
  return hidden;
};

const renderHeatmap = (weeks, steps) => {
  const caption = document.createElement("caption");
  const head = document.createElement("thead");
  const headRow = document.createElement("tr");
  const body = document.createElement("tbody");
  const monthLabelColumns = pickMonthLabelColumns(weeks);

  caption.className = "sr-only";
  caption.textContent = `Commits per day over the last ${heatmapWeeks} weeks.`;
  headRow.append(document.createElement("td"));

  weeks.forEach((week, weekIndex) => {
    const monday = week[0].date;
    const cell = document.createElement("th");
    cell.scope = "col";
    cell.className = "heat-month";

    if (monthLabelColumns.has(weekIndex)) {
      const label = document.createElement("span");
      label.setAttribute("aria-hidden", "true");
      label.textContent = monthTickFormat.format(monday);
      cell.append(label);
    }

    cell.append(createHiddenText(`Week of ${shortDateFormat.format(monday)}`));
    headRow.append(cell);
  });

  head.append(headRow);

  weekdaySamples.forEach((sample, dayIndex) => {
    const row = document.createElement("tr");
    const rowHeader = document.createElement("th");
    rowHeader.scope = "row";
    rowHeader.className = "heat-weekday";

    if (weekdayTicks.includes(dayIndex)) {
      const tick = document.createElement("span");
      tick.setAttribute("aria-hidden", "true");
      tick.textContent = weekdayTickFormat.format(sample);
      rowHeader.append(tick);
    }
    rowHeader.append(createHiddenText(weekdayFormat.format(sample)));
    row.append(rowHeader);

    weeks.forEach((week, weekIndex) => {
      const day = week[dayIndex];
      const cell = document.createElement("td");
      cell.className = "heat-cell";
      cell.dataset.row = String(dayIndex);
      cell.dataset.col = String(weekIndex);

      if (day.future) {
        cell.classList.add("is-future");
      } else {
        const value = countLabel(day.count, "commit");
        const label = fullDateFormat.format(day.date);
        cell.dataset.level = String(densityLevel(day.count, steps));
        cell.dataset.tipValue = value;
        cell.dataset.tipLabel = label;
        cell.tabIndex = -1;
        cell.append(createHiddenText(`${value} on ${label}`));
      }

      row.append(cell);
    });

    body.append(row);
  });

  heatmapTable.replaceChildren(caption, head, body);

  const firstCell = heatmapTable.querySelector(".heat-cell:not(.is-future)");
  if (firstCell) {
    firstCell.tabIndex = 0;
  }
};

const renderHeatLegend = (steps) => {
  const swatches = [
    { level: 0, text: "No commits" },
    { level: 1, text: dayRange(1, steps[0] - 1) },
    { level: 2, text: dayRange(steps[0], steps[1] - 1) },
    { level: 3, text: dayRange(steps[1], steps[2] - 1) },
    { level: 4, text: `${steps[2]} or more commits a day` },
  ];
  const fewer = document.createElement("span");
  const more = document.createElement("span");

  fewer.textContent = "Fewer";
  more.textContent = "More";

  heatLegend.replaceChildren(
    fewer,
    ...swatches.map((swatch) => {
      const box = document.createElement("span");
      box.className = "heat-legend-swatch";
      box.dataset.level = String(swatch.level);
      box.title = swatch.text;
      box.append(createHiddenText(`${swatch.text}. `));
      return box;
    }),
    more
  );
};

// Round the axis top up to a readable tick, always leaving the tallest bar headroom.
const axisCeiling = (value) => {
  const magnitude = 10 ** Math.floor(Math.log10(Math.max(value, 1)));
  const step = Math.max(magnitude / 2, 1);
  const ceiling = Math.ceil(value / step) * step;
  return ceiling > value ? ceiling : ceiling + step;
};

const renderMonthChart = (perMonth, today) => {
  const months = Array.from({ length: monthChartMonths }, (_, index) => {
    const date = new Date(today.getFullYear(), today.getMonth() - (monthChartMonths - 1 - index), 1);
    return { date, count: perMonth.get(monthKey(date)) || 0 };
  });
  const peak = Math.max(...months.map((month) => month.count));
  const ceiling = axisCeiling(peak);
  const grid = document.createElement("div");
  const bars = document.createElement("div");
  const axis = document.createElement("div");
  let peakLabelled = false;

  grid.className = "month-grid";
  grid.setAttribute("aria-hidden", "true");
  bars.className = "month-bars";
  axis.className = "month-axis";

  [
    { className: "month-gridline is-top", value: ceiling },
    { className: "month-gridline is-base", value: 0 },
  ].forEach((line) => {
    const rule = document.createElement("span");
    const tick = document.createElement("i");
    rule.className = line.className;
    tick.textContent = numberFormat.format(line.value);
    rule.append(tick);
    grid.append(rule);
  });

  months.forEach((month) => {
    const column = document.createElement("div");
    const bar = document.createElement("div");
    const height = (month.count / ceiling) * 100;
    const value = countLabel(month.count, "commit");
    const label = monthTitleFormat.format(month.date);
    const tick = document.createElement("span");

    column.className = "month-col";
    column.tabIndex = 0;
    column.dataset.tipValue = value;
    column.dataset.tipLabel = label;

    bar.className = month.count ? "month-bar has-value" : "month-bar";
    bar.style.height = `${height}%`;
    column.append(bar);

    // Direct-label the peak only; the rest are carried by the axis and tooltip.
    if (month.count === peak && peak > 0 && !peakLabelled) {
      const peakValue = document.createElement("span");
      peakValue.className = "month-value";
      peakValue.style.bottom = `calc(${height}% + 0.35rem)`;
      peakValue.textContent = numberFormat.format(month.count);
      column.append(peakValue);
      peakLabelled = true;
    }

    column.append(createHiddenText(`${value} in ${label}`));
    bars.append(column);

    tick.textContent = monthTickFormat.format(month.date);
    axis.append(tick);
  });

  monthChart.replaceChildren(grid, bars, axis);

  if (monthRange) {
    monthRange.textContent = `${monthRangeFormat.format(months[0].date)} – ${monthRangeFormat.format(
      months[months.length - 1].date
    )}`;
  }
};

const setMetric = (selector, value) => {
  const target = document.querySelector(selector);
  if (target) {
    target.textContent = value;
  }
};

const renderCommitMetrics = (commits) => {
  if (!metricsRoot || !heatmapTable || !monthChart) {
    return;
  }

  const stats = buildCommitStats(commits);
  if (!stats) {
    metricsStatus.textContent = "No commit history to chart yet.";
    metricsStatus.hidden = false;
    metricsBody.hidden = true;
    return;
  }

  const weeks = buildHeatmapWeeks(stats.perDay, stats.anchor, stats.today);
  const steps = buildDensitySteps(weeks.flat().filter((day) => !day.future).map((day) => day.count));
  const delta = stats.recent - stats.previous;
  const trend = document.querySelector("[data-metric-trend]");

  setMetric("[data-metric-total]", numberFormat.format(stats.total));
  setMetric("[data-metric-since]", shortDateFormat.format(stats.earliest));
  setMetric("[data-metric-recent]", numberFormat.format(stats.recent));
  setMetric("[data-metric-active]", numberFormat.format(stats.activeDays));
  setMetric("[data-metric-active-note]", `of ${countLabel(stats.trackedDays, "day")} tracked`);
  setMetric("[data-metric-streak]", numberFormat.format(stats.longestStreak));
  setMetric("[data-metric-streak-note]", "consecutive days");
  setMetric("[data-metric-peak]", numberFormat.format(stats.busiest.count));
  setMetric("[data-metric-peak-note]", shortDateFormat.format(new Date(stats.busiest.stamp)));

  if (trend) {
    const sign = delta > 0 ? "+" : delta < 0 ? "−" : "±";
    const quiet = stats.recent === 0 && stats.previous === 0;
    trend.textContent = quiet
      ? `Last commit ${shortDateFormat.format(stats.latest)}`
      : `${sign}${numberFormat.format(Math.abs(delta))} on the 30 days before`;
    trend.classList.toggle("is-up", !quiet && delta > 0);
  }

  if (heatRange) {
    heatRange.textContent = `${heatmapWeeks} weeks to ${shortDateFormat.format(stats.anchor)}`;
  }

  renderHeatmap(weeks, steps);
  renderHeatLegend(steps);
  renderMonthChart(stats.perMonth, stats.anchor);

  metricsStatus.hidden = true;
  metricsBody.hidden = false;
};

const clearCommitMetrics = () => {
  if (!metricsRoot) {
    return;
  }

  metricsStatus.textContent = "The commit charts could not be loaded right now.";
  metricsStatus.hidden = false;
  metricsBody.hidden = true;
};

const hideChartTip = () => {
  if (chartTip) {
    chartTip.hidden = true;
  }
};

const showChartTip = (target) => {
  if (!chartTip || !metricsRoot || !target.dataset.tipValue) {
    return;
  }

  const value = document.createElement("strong");
  const label = document.createElement("span");
  value.textContent = target.dataset.tipValue;
  label.textContent = target.dataset.tipLabel || "";
  chartTip.replaceChildren(value, label);
  chartTip.hidden = false;

  const bounds = metricsRoot.getBoundingClientRect();
  const rect = target.getBoundingClientRect();
  const half = chartTip.offsetWidth / 2;
  const centre = rect.left - bounds.left + rect.width / 2;

  chartTip.style.left = `${Math.min(Math.max(centre, half), Math.max(bounds.width - half, half))}px`;
  chartTip.style.top = `${rect.top - bounds.top - 8}px`;
};

const handleChartPointer = (event) => {
  const target = event.target.closest?.("[data-tip-value]");
  if (target) {
    showChartTip(target);
  } else {
    hideChartTip();
  }
};

// The heatmap is a single tab stop; arrow keys walk the grid from there.
const handleHeatmapKeys = (event) => {
  const moves = { ArrowLeft: [0, -1], ArrowRight: [0, 1], ArrowUp: [-1, 0], ArrowDown: [1, 0] };
  const move = moves[event.key];
  const cell = event.target.closest?.(".heat-cell");
  if (!move || !cell) {
    return;
  }

  const row = Number(cell.dataset.row) + move[0];
  const col = Number(cell.dataset.col) + move[1];
  const next = heatmapTable.querySelector(
    `.heat-cell[data-row="${row}"][data-col="${col}"]:not(.is-future)`
  );
  if (!next) {
    return;
  }

  event.preventDefault();
  cell.tabIndex = -1;
  next.tabIndex = 0;
  next.focus();
};

const normaliseGallerySrc = (image) => {
  const source = image?.src || "";
  return source.startsWith("../") ? source : `../${source}`;
};

const isCoverImage = (image) => /(^|\/)title\.[a-z0-9]+$/i.test(image?.src || "");

const shuffle = (list) => {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

const createMagazineImage = (image, index) => {
  const img = document.createElement("img");
  const classes = ["magazine-image"];

  if (index % 2 === 1) {
    classes.push("is-right");
  }
  if (index === 0) {
    classes.push("is-featured");
  }

  img.className = classes.join(" ");
  img.src = normaliseGallerySrc(image);
  img.alt = image.alt || image.title || `${gameName} development image`;
  img.loading = "lazy";
  return img;
};

const clearGalleryBlocks = () => {
  galleryBlocks.forEach((block) => {
    block.querySelectorAll(".magazine-image").forEach((img) => img.remove());
  });
};

const renderCarouselImage = () => {
  if (!galleryCarouselImage || !carouselImages.length) {
    return;
  }

  const image = carouselImages[carouselIndex];
  galleryCarouselImage.src = normaliseGallerySrc(image);
  galleryCarouselImage.alt = image.alt || image.title || `${gameName} screenshot`;
  if (galleryCarouselCount) {
    galleryCarouselCount.textContent = `${carouselIndex + 1} / ${carouselImages.length}`;
  }
};

const stepCarousel = (direction) => {
  if (!carouselImages.length) {
    return;
  }
  carouselIndex = (carouselIndex + direction + carouselImages.length) % carouselImages.length;
  renderCarouselImage();
};

const renderGallery = (feed) => {
  const images = Array.isArray(feed.images) ? feed.images : [];
  const editorialImages = images.filter((image) => !isCoverImage(image));
  const displayImages = editorialImages.length ? editorialImages : images;

  clearGalleryBlocks();

  if (!displayImages.length) {
    galleryStatus.textContent = `Add images to the ${gameName} gallery folder and push them to publish a gallery.`;
    galleryStatus.hidden = false;
    if (galleryCarousel) {
      galleryCarousel.hidden = true;
    }
    return;
  }

  galleryStatus.textContent = "";
  galleryStatus.hidden = true;

  const requestedCount = Number(document.body?.dataset.galleryCount);
  const magazineImageCount = Math.min(
    Number.isFinite(requestedCount) && requestedCount > 0 ? requestedCount : galleryBlocks.length,
    galleryBlocks.length,
    displayImages.length
  );
  const featuredImages = shuffle(displayImages).slice(0, magazineImageCount);
  const targetBlocks = shuffle(galleryBlocks).slice(0, magazineImageCount);
  featuredImages.forEach((image, index) => {
    const block = targetBlocks[index];
    if (!block) {
      return;
    }
    const heading = block.querySelector("h3");
    const img = createMagazineImage(image, index);
    if (heading) {
      heading.insertAdjacentElement("afterend", img);
    } else {
      block.prepend(img);
    }
  });

  carouselImages = displayImages;
  carouselIndex = 0;
  if (galleryCarousel) {
    galleryCarousel.hidden = false;
  }
  renderCarouselImage();
};

const loadGallery = async () => {
  if (!galleryBlocks.length || !galleryStatus || !galleryFeedPath) {
    return;
  }

  try {
    const response = await fetch(galleryFeedPath, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`Gallery feed returned ${response.status}`);
    }

    renderGallery(await response.json());
  } catch (error) {
    galleryStatus.textContent = "The image gallery could not be loaded right now.";
    galleryStatus.hidden = false;
    clearGalleryBlocks();
    console.error(error);
  }
};

const setContactStatus = (message, state = "") => {
  if (!contactStatus) {
    return;
  }

  contactStatus.textContent = message;
  contactStatus.classList.toggle("is-success", state === "success");
  contactStatus.classList.toggle("is-error", state === "error");
};

const ENQUIRY_TYPES = ["General enquiry", "Support", "Press or collaboration"];
const PROJECTS = ["Milenko Sketch", "Cyber Bully", "Manic Monday's"];
const contactWebhookUrl = (() => {
  const encoded = (contactForm?.dataset.ck || "").trim();
  if (!encoded) {
    return "";
  }
  try {
    const reversed = encoded.split("").reverse().join("");
    const url = atob(reversed);
    return url.startsWith("https://") ? url : "";
  } catch (error) {
    return "";
  }
})();

const truncate = (value, maxLength) =>
  value.length > maxLength ? `${value.slice(0, maxLength - 1)}...` : value;

const buildDiscordContent = ({ type, project, name, email, message }) =>
  truncate(
    [
      `New ${type.toLowerCase()} message for ${project}`,
      "",
      `Name: ${name}`,
      `Reply email: ${email}`,
      "",
      message,
    ].join("\n"),
    1900
  );

const handleContactSubmit = async (event) => {
  event.preventDefault();

  const submitButton = contactForm.querySelector('button[type="submit"]');
  const formData = new FormData(contactForm);
  const payload = Object.fromEntries(formData.entries());

  // Honeypot: silently accept obvious bot submissions without sending anything.
  if ((payload.website || "").trim()) {
    contactForm.reset();
    setContactStatus("Message sent. Thank you.", "success");
    return;
  }

  if (!contactWebhookUrl) {
    setContactStatus("The contact form is not configured yet.", "error");
    return;
  }

  const name = (payload.name || "").trim();
  const email = (payload.email || "").trim();
  const message = (payload.message || "").trim();
  if (!name || !email || !message) {
    setContactStatus("Please add your name, email and message.", "error");
    return;
  }

  submitButton.disabled = true;
  setContactStatus("Sending...");

  try {
    const response = await fetch(contactWebhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username: "Kestrel Contact",
        content: buildDiscordContent({
          type: ENQUIRY_TYPES.includes(payload.type) ? payload.type : ENQUIRY_TYPES[0],
          project: PROJECTS.includes(payload.project) ? payload.project : PROJECTS[0],
          name,
          email,
          message,
        }),
        allowed_mentions: { parse: [] },
      }),
    });

    if (!response.ok) {
      throw new Error(
        response.status === 429
          ? "Discord is rate limiting the form. Please try again in a minute."
          : "Discord could not accept the message right now."
      );
    }

    contactForm.reset();
    setContactStatus("Message sent. Thank you.", "success");
  } catch (error) {
    console.error("Contact form request failed", error);
    setContactStatus(
      error instanceof TypeError
        ? "The contact form could not reach Discord. Please try again."
        : error.message || "The message could not be sent right now.",
      "error"
    );
  } finally {
    submitButton.disabled = false;
  }
};

year.textContent = new Date().getFullYear();
syncHeader();
loadCommitFeed();
loadGallery();
galleryPrevButton?.addEventListener("click", () => stepCarousel(-1));
galleryNextButton?.addEventListener("click", () => stepCarousel(1));
contactForm?.addEventListener("submit", handleContactSubmit);
metricsRoot?.addEventListener("pointermove", handleChartPointer);
metricsRoot?.addEventListener("pointerleave", hideChartTip);
metricsRoot?.addEventListener("focusin", handleChartPointer);
metricsRoot?.addEventListener("focusout", hideChartTip);
metricsRoot?.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    hideChartTip();
    return;
  }
  handleHeatmapKeys(event);
});
// The tip is positioned inside the panel, so it tracks page scroll on its own;
// only the heatmap's own sideways scroll moves a cell out from under it.
heatmapScroll?.addEventListener("scroll", hideChartTip, { passive: true });
if (commitList) {
  window.setInterval(() => {
    if (document.visibilityState !== "hidden") {
      loadCommitFeed();
    }
  }, commitRefreshInterval);

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      loadCommitFeed();
    }
  });
}
window.addEventListener("scroll", syncHeader, { passive: true });
