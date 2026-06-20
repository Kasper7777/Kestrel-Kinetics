const header = document.querySelector("[data-header]");
const year = document.querySelector("[data-year]");
const commitSummary = document.querySelector("[data-commit-summary]");
const commitStatus = document.querySelector("[data-commit-status]");
const commitList = document.querySelector("[data-commit-list]");
const commitFeedPath = document.body?.dataset.commitFeed || "assets/commits.json";
const commitRefreshInterval = 5 * 60 * 1000;
const galleryGrid = document.querySelector("[data-gallery-grid]");
const galleryStatus = document.querySelector("[data-gallery-status]");
const galleryFeedPath = document.body?.dataset.galleryFeed;
const gallerySlots = [...document.querySelectorAll("[data-gallery-slot]")];

const syncHeader = () => {
  header?.classList.toggle("is-scrolled", window.scrollY > 12);
};

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
    console.error(error);
  }
};

const normaliseGallerySrc = (image) => {
  const source = image?.src || "";
  return source.startsWith("../") ? source : `../${source}`;
};

const isCoverImage = (image) => /(^|\/)title\.[a-z0-9]+$/i.test(image?.src || "");

const createGalleryItem = (image, index) => {
  const figure = document.createElement("figure");
  const img = document.createElement("img");
  const caption = document.createElement("figcaption");
  const tileClass = index % 7 === 0 ? "is-large" : index % 5 === 0 ? "is-wide" : "";

  figure.className = ["gallery-item", tileClass].filter(Boolean).join(" ");
  img.src = normaliseGallerySrc(image);
  img.alt = image.alt || image.title || "Cyber Bully: 502 Bad Gateway development image";
  img.loading = "lazy";
  caption.textContent = image.title || "Cyber Bully: 502 Bad Gateway";

  figure.append(img, caption);
  return figure;
};

const fillGallerySlot = (slot, image) => {
  slot.replaceChildren();

  if (!image) {
    slot.hidden = true;
    return;
  }

  const img = document.createElement("img");
  const caption = document.createElement("figcaption");

  slot.hidden = false;
  img.src = normaliseGallerySrc(image);
  img.alt = image.alt || image.title || "Cyber Bully: 502 Bad Gateway development image";
  img.loading = "lazy";
  caption.textContent = image.title || "Cyber Bully: 502 Bad Gateway";
  slot.append(img, caption);
};

const renderGallery = (feed) => {
  const images = Array.isArray(feed.images) ? feed.images : [];
  const editorialImages = images.filter((image) => !isCoverImage(image));
  const displayImages = editorialImages.length ? editorialImages : images;

  if (!displayImages.length) {
    galleryStatus.textContent = "Add images to assets/images/cyber-bully/gallery and push them to publish a gallery.";
    galleryStatus.hidden = false;
    gallerySlots.forEach((slot) => fillGallerySlot(slot));
    galleryGrid?.replaceChildren();
    if (galleryGrid) {
      galleryGrid.hidden = true;
    }
    return;
  }

  galleryStatus.textContent = "";
  galleryStatus.hidden = true;
  gallerySlots.forEach((slot, index) => fillGallerySlot(slot, displayImages[index]));

  if (!galleryGrid) {
    return;
  }

  const remainingImages = displayImages.slice(gallerySlots.length);
  galleryGrid.hidden = !remainingImages.length;
  galleryGrid.replaceChildren(...remainingImages.map(createGalleryItem));
};

const loadGallery = async () => {
  if ((!galleryGrid && !gallerySlots.length) || !galleryStatus || !galleryFeedPath) {
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
    gallerySlots.forEach((slot) => fillGallerySlot(slot));
    galleryGrid?.replaceChildren();
    if (galleryGrid) {
      galleryGrid.hidden = true;
    }
    console.error(error);
  }
};

year.textContent = new Date().getFullYear();
syncHeader();
loadCommitFeed();
loadGallery();
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
