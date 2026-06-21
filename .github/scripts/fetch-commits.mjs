import { mkdir, writeFile } from "node:fs/promises";

const sourceRepoInput = process.env.SOURCE_REPO || process.env.CYBER_BULLY_SOURCE_REPO;
const token = process.env.SOURCE_TOKEN || process.env.CYBER_BULLY_SOURCE_TOKEN || process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
const outputPath = process.env.OUTPUT_PATH || "assets/commits.json";
const feedLabel = process.env.FEED_LABEL || "development";
const apiBase = "https://api.github.com";
const headers = {
  Accept: "application/vnd.github+json",
  "User-Agent": "kestrel-kinetics-development-log",
  "X-GitHub-Api-Version": "2022-11-28",
};

if (token) {
  headers.Authorization = `Bearer ${token}`;
}

const normaliseRepo = (value) => {
  if (!value) {
    return "";
  }

  const repo = value
    .trim()
    .replace(/^https:\/\/github\.com\//i, "")
    .replace(/^git@github\.com:/i, "")
    .replace(/\.git$/i, "")
    .replace(/^\/+|\/+$/g, "");

  return repo;
};

const sourceRepo = normaliseRepo(sourceRepoInput);

if (!sourceRepo) {
  throw new Error(`Set SOURCE_REPO before refreshing the ${feedLabel} development log.`);
}

const request = async (url) => {
  const response = await fetch(url, { headers });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`GitHub API ${response.status} for ${url}: ${body}`);
  }

  return {
    data: await response.json(),
    link: response.headers.get("link"),
  };
};

const nextUrl = (linkHeader) => {
  if (!linkHeader) {
    return null;
  }

  const nextLink = linkHeader
    .split(",")
    .map((link) => link.trim())
    .find((link) => link.endsWith('rel="next"'));

  return nextLink?.match(/<([^>]+)>/)?.[1] || null;
};

const fetchPages = async (path, params = {}) => {
  const items = [];
  const url = new URL(`${apiBase}${path}`);
  Object.entries({ per_page: "100", ...params }).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });

  let pageUrl = url.toString();
  while (pageUrl) {
    const page = await request(pageUrl);
    items.push(...page.data);
    pageUrl = nextUrl(page.link);
  }

  return items;
};

const cleanMessage = (message) => {
  const firstLine = message.split("\n")[0];
  const escapedRepo = sourceRepo.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  return firstLine
    .replace(new RegExp(`https://github\\.com/${escapedRepo}`, "gi"), "private source")
    .replace(new RegExp(escapedRepo, "gi"), "private source")
    .replace(/https:\/\/github\.com\/[^\s]+/gi, "private source");
};

const repo = await request(`${apiBase}/repos/${sourceRepo}`).then((response) => response.data);
const branch = repo.default_branch;
const commits = await fetchPages(`/repos/${sourceRepo}/commits`, { sha: branch });
const feed = {
  generatedAt: new Date().toISOString(),
  commitCount: commits.length,
  commits: commits.map((commit) => ({
    shortSha: commit.sha.slice(0, 7),
    message: cleanMessage(commit.commit.message),
    author: commit.commit.author?.name || commit.author?.login || "Unknown",
    date: commit.commit.author?.date || commit.commit.committer?.date,
  })),
};

await mkdir("assets", { recursive: true });
await writeFile(outputPath, `${JSON.stringify(feed, null, 2)}\n`);
console.log(`Wrote ${commits.length} ${feedLabel} commits to ${outputPath}.`);
