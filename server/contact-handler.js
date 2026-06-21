const REQUIRED_ENV = ["DISCORD_WEBHOOK_URL"];
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

const isValidEmail = (value) =>
  value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

const buildDiscordPayload = ({ name, email, message }) => ({
  username: "Kestrel Contact",
  content: "New website contact message",
  allowed_mentions: {
    parse: [],
  },
  embeds: [
    {
      title: "Website contact form",
      color: 3594751,
      fields: [
        {
          name: "Name",
          value: name,
          inline: true,
        },
        {
          name: "Reply email",
          value: email,
          inline: true,
        },
      ],
      description: message,
      timestamp: new Date().toISOString(),
    },
  ],
});

const sendDiscordMessage = async ({ name, email, message }) => {
  const response = await fetch(process.env.DISCORD_WEBHOOK_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(buildDiscordPayload({ name, email, message })),
  });

  if (!response.ok) {
    const details = await response.text().catch(() => "");
    console.error("Contact Discord webhook failed", response.status, details.slice(0, 500));
    return false;
  }

  return true;
};

const createContactResponse = async ({ method, headers, body }) => {
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

  if (!name || !isValidEmail(email) || !message) {
    return json(400, { message: "Please add your name, email and message." });
  }

  const missingEnv = REQUIRED_ENV.filter((key) => !process.env[key]);
  if (missingEnv.length) {
    console.error(`Contact form missing environment variables: ${missingEnv.join(", ")}`);
    return json(500, { message: "The contact form is not configured yet." });
  }

  const sent = await sendDiscordMessage({ name, email, message });
  if (!sent) {
    return json(502, { message: "The message could not be sent right now." });
  }

  return json(200, { message: "Message sent. Thank you." });
};

module.exports = {
  createContactResponse,
};
