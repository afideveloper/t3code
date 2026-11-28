import { describe, expect, it } from "vite-plus/test";

import { externalLinkLabel, extractExternalLinks } from "./externalLinks.ts";

describe("extractExternalLinks", () => {
  it.each([
    [
      "a plain link",
      "see https://acme.slack.com/archives/C01/p123",
      ["https://acme.slack.com/archives/C01/p123"],
    ],
    ["sentence punctuation", "review https://example.com/doc.", ["https://example.com/doc"]],
    ["a markdown link", "[spec](https://example.com/spec)", ["https://example.com/spec"]],
    ["parentheses around a link", "(https://example.com/a)", ["https://example.com/a"]],
    [
      "parentheses inside a link",
      "https://en.wikipedia.org/wiki/Go_(game)",
      ["https://en.wikipedia.org/wiki/Go_(game)"],
    ],
    [
      "Slack's label form",
      "<https://acme.slack.com/archives/C01|thread>",
      ["https://acme.slack.com/archives/C01"],
    ],
    ["duplicates", "https://example.com/a and https://example.com/a", ["https://example.com/a"]],
    [
      "local hosts",
      "http://localhost:3000 http://127.0.0.1:8080 http://192.168.1.4 http://10.0.0.2 " +
        "http://app.localhost http://box.local https://example.com",
      ["https://example.com/"],
    ],
    ["non-web schemes", "ftp://example.com mailto:me@example.com t3-thread://v1/abc", []],
  ])("handles %s", (_name, text, expected) => {
    expect(extractExternalLinks(text)).toEqual(expected);
  });
});

describe("externalLinkLabel", () => {
  it.each([
    ["https://acme.slack.com/archives/C01/p123", { site: "Slack", detail: "acme" }],
    ["https://app.slack.com/client/T01/C01", { site: "Slack", detail: "" }],
    ["https://acme.atlassian.net/browse/MGR-12", { site: "Jira", detail: "MGR-12" }],
    [
      "https://acme.atlassian.net/jira/software/projects/FW/boards/1?selectedIssue=FW-9",
      { site: "Jira", detail: "FW-9" },
    ],
    [
      "https://acme.atlassian.net/wiki/spaces/ENG/pages/4476/PRD+Order%3A+Retur",
      { site: "Confluence", detail: "PRD Order: Retur" },
    ],
    ["https://acme.atlassian.net/wiki/spaces/ENG/overview", { site: "Confluence", detail: "ENG" }],
    ["https://www.example.com/a%20b/", { site: "example.com", detail: "/a b" }],
    ["https://example.com/%E0%A4%A", { site: "example.com", detail: "/%E0%A4%A" }],
  ])("labels %s", (href, expected) => {
    expect(externalLinkLabel(href)).toEqual(expected);
  });
});
