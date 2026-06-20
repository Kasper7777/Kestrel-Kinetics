const header = document.querySelector("[data-header]");
const year = document.querySelector("[data-year]");
const commitSummary = document.querySelector("[data-commit-summary]");
const commitStatus = document.querySelector("[data-commit-status]");
const commitList = document.querySelector("[data-commit-list]");
const commitFeedPath = document.body?.dataset.commitFeed || "assets/commits.json";
const commitRefreshInterval = 5 * 60 * 1000;
const galleryStatus = document.querySelector("[data-gallery-status]");
const galleryFeedPath = document.body?.dataset.galleryFeed;
const galleryBlocks = [...document.querySelectorAll("[data-gallery-block]")];
const galleryCarousel = document.querySelector("[data-gallery-carousel]");
const galleryCarouselImage = document.querySelector("[data-gallery-carousel-image]");
const galleryCarouselCount = document.querySelector("[data-gallery-carousel-count]");
const galleryPrevButton = document.querySelector("[data-gallery-prev]");
const galleryNextButton = document.querySelector("[data-gallery-next]");
const magazineImageCount = 5;
let carouselImages = [];
let carouselIndex = 0;

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
  img.alt = image.alt || image.title || "Cyber Bully: 502 Bad Gateway development image";
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
  galleryCarouselImage.alt = image.alt || image.title || "Cyber Bully: 502 Bad Gateway screenshot";
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
    galleryStatus.textContent = "Add images to assets/images/cyber-bully/gallery and push them to publish a gallery.";
    galleryStatus.hidden = false;
    if (galleryCarousel) {
      galleryCarousel.hidden = true;
    }
    return;
  }

  galleryStatus.textContent = "";
  galleryStatus.hidden = true;

  const featuredImages = shuffle(displayImages).slice(0, magazineImageCount);
  featuredImages.forEach((image, index) => {
    const block = galleryBlocks[index % galleryBlocks.length];
    if (!block) {
      return;
    }
    block.prepend(createMagazineImage(image, index));
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

year.textContent = new Date().getFullYear();
syncHeader();
loadCommitFeed();
loadGallery();
galleryPrevButton?.addEventListener("click", () => stepCarousel(-1));
galleryNextButton?.addEventListener("click", () => stepCarousel(1));
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
