const REQUIRED_ENV = ["DISCORD_WEBHOOK_URL"];
const ENQUIRY_TYPES = ["General enquiry", "Support", "Press or collaboration"];
const PROJECTS = ["Milenko Sketch", "Cyber Bully", "Manic Monday's"];
const JSON_HEADERS = {
  "Cache-Control": "no-store",
  "Content-Type": "application/json; charset=utf-8",
};

const json = (statusCode, data, headers = {}) => ({
  statusCode,
  headers: {
    ...JSON_HEADERS,
    ...headers,
  },
  body: JSON.stringify(data),
});

const getHeader = (headers, name) => {
  if (!headers) {
    return "";
  }

  if (typeof headers.get === "function") {
    return headers.get(name) || "";
  }

  const requested = name.toLowerCase();
  const match = Object.entries(headers).find(([key]) => key.toLowerCase() === requested);
  const value = match?.[1];
  return Array.isArray(value) ? value[0] || "" : value || "";
};

const parsePayload = (body, contentType) => {
  if (!body) {
    return {};
  }

  if (typeof body === "object") {
    return body;
  }

  if (contentType.includes("application/x-www-form-urlencoded")) {
    return Object.fromEntries(new URLSearchParams(body));
  }

  return JSON.parse(body);
};

const cleanLine = (value, maxLength) =>
  String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);

const cleanMessage = (value) =>
  String(value || "")
    .replace(/\r\n/g, "\n")
    .trim()
    .slice(0, 3000);

const cleanChoice = (value, options, fallback) => {
  const choice = cleanLine(value, 80);
  return options.includes(choice) ? choice : fallback;
};

const isValidEmail = (value) =>
  value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

const truncate = (value, maxLength) =>
  value.length > maxLength ? `${value.slice(0, maxLength - 1)}...` : value;

const getDiscordWebhookUrl = () => {
  const value = String(process.env.DISCORD_WEBHOOK_URL || "")
    .trim()
    .replace(/^<(.+)>$/, "$1")
    .replace(/^["'](.+)["']$/, "$1")
    .trim();

  if (!value) {
    return "";
  }

  try {
    const url = new URL(value);
    const isDiscordWebhook =
      url.protocol === "https:" &&
      (url.hostname === "discord.com" || url.hostname === "discordapp.com") &&
      url.pathname.startsWith("/api/webhooks/");

    return isDiscordWebhook ? url.toString() : "";
  } catch (error) {
    return "";
  }
};

const buildDiscordPayload = ({ type, project, name, email, message }) => ({
  username: "Kestrel Contact",
  content: truncate(
    [
      `New ${type.toLowerCase()} message for ${project}`,
      "",
      `Name: ${name}`,
      `Reply email: ${email}`,
      "",
      message,
    ].join("\n"),
    1900
  ),
  allowed_mentions: {
    parse: [],
  },
});

const getDiscordErrorMessage = (status) => {
  if (status === 401 || status === 404) {
    return "The Discord webhook URL is invalid or has been revoked.";
  }

  if (status === 400) {
    return "Discord rejected the contact message format.";
  }

  if (status === 429) {
    return "Discord is rate limiting the contact form. Please try again in a minute.";
  }

  return "Discord could not accept the message right now.";
};

const sendDiscordMessage = async ({ type, project, name, email, message }) => {
  let response;
  const webhookUrl = getDiscordWebhookUrl();

  if (!webhookUrl) {
    return {
      ok: false,
      message: "The Discord webhook URL is missing or not a valid webhook URL.",
    };
  }

  try {
    response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(buildDiscordPayload({ type, project, name, email, message })),
    });
  } catch (error) {
    console.error("Contact Discord webhook request failed", error);
    return {
      ok: false,
      message: "The Discord webhook URL could not be reached.",
    };
  }

  if (!response.ok) {
    const details = await response.text().catch(() => "");
    console.error("Contact Discord webhook failed", response.status, details.slice(0, 500));
    return {
      ok: false,
      message: getDiscordErrorMessage(response.status),
    };
  }

  return {
    ok: true,
  };
};

const createContactResponse = async ({ method, headers, body }) => {
  if (method === "GET") {
    return json(200, {
      ok: true,
      endpoint: "contact",
      webhookConfigured: Boolean(getDiscordWebhookUrl()),
      message: "Contact endpoint is running.",
    });
  }

  if (method === "OPTIONS") {
    return {
      statusCode: 204,
      headers: {
        Allow: "POST, OPTIONS",
        "Cache-Control": "no-store",
      },
      body: "",
    };
  }

  if (method !== "POST") {
    return json(405, { message: "Use the contact form to send a message." }, { Allow: "POST" });
  }

  let payload;
  try {
    payload = parsePayload(body, getHeader(headers, "content-type"));
  } catch (error) {
    return json(400, { message: "The message could not be read." });
  }

  if (cleanLine(payload.website, 120)) {
    return json(200, { message: "Message sent. Thank you." });
  }

  const name = cleanLine(payload.name, 80);
  const email = cleanLine(payload.email, 254).toLowerCase();
  const message = cleanMessage(payload.message);
  const type = cleanChoice(payload.type, ENQUIRY_TYPES, ENQUIRY_TYPES[0]);
  const project = cleanChoice(payload.project, PROJECTS, PROJECTS[0]);

  if (!name || !isValidEmail(email) || !message) {
    return json(400, { message: "Please add your name, email and message." });
  }

  const missingEnv = REQUIRED_ENV.filter((key) => !process.env[key]);
  if (missingEnv.length) {
    console.error(`Contact form missing environment variables: ${missingEnv.join(", ")}`);
    return json(500, { message: "The contact form is not configured yet." });
  }

  const sent = await sendDiscordMessage({ type, project, name, email, message });
  if (!sent.ok) {
    return json(502, { message: sent.message });
  }

  return json(200, { message: "Message sent. Thank you." });
};

module.exports = {
  createContactResponse,
};
