import { mkdir, writeFile } from "node:fs/promises";

const sourceRepo = process.env.SOURCE_REPO || "Kasper7777/Cyber_Bully_502_Bad_Gateway";
const token = process.env.CYBER_BULLY_SOURCE_TOKEN || process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
const apiBase = "https://api.github.com";
const headers = {
  Accept: "application/vnd.github+json",
  "User-Agent": "kestrel-kinetics-development-log",
  "X-GitHub-Api-Version": "2022-11-28",
};

if (token) {
  headers.Authorization = `Bearer ${token}`;
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

const repo = await request(`${apiBase}/repos/${sourceRepo}`).then((response) => response.data);
const branch = repo.default_branch;
const commits = await fetchPages(`/repos/${sourceRepo}/commits`, { sha: branch });
const feed = {
  repo: sourceRepo,
  repoUrl: repo.html_url,
  branch,
  generatedAt: new Date().toISOString(),
  commitCount: commits.length,
  commits: commits.map((commit) => ({
    sha: commit.sha,
    shortSha: commit.sha.slice(0, 7),
    url: commit.html_url,
    message: commit.commit.message.split("\n")[0],
    author: commit.commit.author?.name || commit.author?.login || "Unknown",
    date: commit.commit.author?.date || commit.commit.committer?.date,
  })),
};

await mkdir("assets", { recursive: true });
await writeFile("assets/commits.json", `${JSON.stringify(feed, null, 2)}\n`);
