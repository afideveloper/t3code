// `|` and `>` end Slack's `<url|label>` form; quotes and backticks end code and attributes.
const URL_CANDIDATE = /https?:\/\/[^\s<>|"'`]+/gi;
const TRAILING_PUNCTUATION = /[.,;:!?*_~]+$/;

const KNOWN_SITES: ReadonlyArray<readonly [suffix: string, name: string]> = [
  ["slack.com", "Slack"],
  ["atlassian.net", "Jira"],
  ["figma.com", "Figma"],
  ["notion.so", "Notion"],
  ["notion.site", "Notion"],
  ["linear.app", "Linear"],
  ["docs.google.com", "Google Docs"],
  ["github.com", "GitHub"],
  ["coda.io", "Coda"],
];

function isPrivateIpv4(host: string): boolean {
  const parts = host.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part))) return false;
  const [a = 0, b = 0] = parts;
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168)
  );
}

/** Hosts only this machine or its network can open, which mean nothing from another device. */
function isLocalHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return (
    host === "localhost" ||
    host === "[::1]" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    isPrivateIpv4(host)
  );
}

// A link written inside parentheses keeps its own closing parenthesis only when it opened one.
function trimUrl(candidate: string): string {
  let url = candidate.replace(TRAILING_PUNCTUATION, "");
  while (url.endsWith(")") || url.endsWith("]")) {
    const close = url.at(-1);
    const open = close === ")" ? "(" : "[";
    if (url.split(open).length >= url.split(close!).length) break;
    url = url.slice(0, -1).replace(TRAILING_PUNCTUATION, "");
  }
  return url;
}

/** Web links in `text` that open from any device, first occurrence first, without duplicates. */
export function extractExternalLinks(text: string): ReadonlyArray<string> {
  const links = new Set<string>();
  for (const [candidate] of text.matchAll(URL_CANDIDATE)) {
    const trimmed = trimUrl(candidate);
    if (!URL.canParse(trimmed)) continue;
    const url = new URL(trimmed);
    if (isLocalHost(url.hostname)) continue;
    links.add(url.href);
  }
  return [...links];
}

interface ExternalLinkLabel {
  /** The service's name for a known site, otherwise the host. */
  readonly site: string;
  /** The Slack workspace, Jira issue, or Confluence page; the path for other sites. */
  readonly detail: string;
}

function decodePath(path: string): string {
  try {
    return decodeURIComponent(path);
  } catch {
    // Keep a path with a malformed escape as written.
    return path;
  }
}

// Confluence and Jira share atlassian.net hosts; Confluence lives under /wiki.
function atlassianLabel(url: URL): ExternalLinkLabel {
  const path = url.pathname;
  if (path.startsWith("/wiki")) {
    const page = /\/pages\/\d+\/([^/]+)/.exec(path)?.[1];
    const space = /\/spaces\/([^/]+)/.exec(path)?.[1];
    return {
      site: "Confluence",
      detail: page ? decodePath(page.replaceAll("+", " ")) : (space ?? decodePath(path)),
    };
  }
  const issue =
    /\/browse\/([A-Z][A-Z0-9_]*-\d+)/.exec(path)?.[1] ?? url.searchParams.get("selectedIssue");
  return { site: "Jira", detail: issue ?? decodePath(path.replace(/\/+$/, "")) };
}

export function externalLinkLabel(href: string): ExternalLinkLabel {
  const url = new URL(href);
  const host = url.hostname.replace(/^www\./, "");
  const known = KNOWN_SITES.find(([suffix]) => host === suffix || host.endsWith(`.${suffix}`));
  if (known?.[1] === "Slack") {
    const workspace = host.endsWith(".slack.com") ? host.slice(0, -".slack.com".length) : "";
    return { site: "Slack", detail: workspace === "app" ? "" : workspace };
  }
  if (known?.[1] === "Jira") return atlassianLabel(url);
  return { site: known?.[1] ?? host, detail: decodePath(url.pathname.replace(/\/+$/, "")) };
}
