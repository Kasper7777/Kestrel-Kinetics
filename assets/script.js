const header = document.querySelector("[data-header]");
const year = document.querySelector("[data-year]");
const commitSummary = document.querySelector("[data-commit-summary]");
const commitStatus = document.querySelector("[data-commit-status]");
const commitList = document.querySelector("[data-commit-list]");

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

  commitSummary.textContent = `${commits.length} commits tracked from ${feed.repo}. Last refreshed ${refreshed}.`;
  commitStatus.textContent = commits.length
    ? `Showing commits from ${feed.branch || "the source repository"}.`
    : "No commits found yet.";
  commitList.replaceChildren(
    ...commits.map((commit) => {
      const item = document.createElement("li");
      const link = document.createElement("a");
      const meta = document.createElement("div");
      const date = document.createElement("span");
      const author = document.createElement("span");
      const sha = document.createElement("span");

      item.className = "commit-item";
      link.href = commit.url;
      link.target = "_blank";
      link.rel = "noopener";
      link.textContent = commit.message || "Untitled commit";
      meta.className = "commit-meta";
      date.textContent = commit.date ? formatDate(commit.date) : "Unknown date";
      author.textContent = commit.author ? `by ${commit.author}` : "unknown author";
      sha.className = "commit-sha";
      sha.textContent = commit.shortSha || commit.sha?.slice(0, 7) || "";

      meta.append(date, author, sha);
      item.append(link, meta);
      return item;
    })
  );
};

const loadCommitFeed = async () => {
  if (!commitList || !commitSummary || !commitStatus) {
    return;
  }

  try {
    const response = await fetch("assets/commits.json", { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`Commit feed returned ${response.status}`);
    }

    renderCommitFeed(await response.json());
  } catch (error) {
    commitSummary.textContent = "The development log could not be loaded right now.";
    commitStatus.textContent = "Check the source repository for the latest commits.";
    commitList.replaceChildren();
    console.error(error);
  }
};

year.textContent = new Date().getFullYear();
syncHeader();
loadCommitFeed();
window.addEventListener("scroll", syncHeader, { passive: true });
