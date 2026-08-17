import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  resolveWorkspaceFaviconUrl,
  resolveWorkspaceSiteFaviconUrl,
  workspaceAvatarImageUrls,
} from "./workspaceFavicon";

describe("resolveWorkspaceFaviconUrl", () => {
  it("builds a Google favicon URL from a website hostname", () => {
    assert.equal(
      resolveWorkspaceFaviconUrl("https://www.greensquare.com.au/about"),
      "https://www.google.com/s2/favicons?domain=greensquare.com.au&sz=128"
    );
  });

  it("returns null when the website is missing or not a URL", () => {
    assert.equal(resolveWorkspaceFaviconUrl(null), null);
    assert.equal(resolveWorkspaceFaviconUrl(""), null);
    assert.equal(resolveWorkspaceFaviconUrl("   "), null);
    assert.equal(resolveWorkspaceFaviconUrl("not-a-url"), null);
  });
});

describe("resolveWorkspaceSiteFaviconUrl", () => {
  it("uses the stored origin including www", () => {
    assert.equal(
      resolveWorkspaceSiteFaviconUrl("https://www.greensquare.com.au/about"),
      "https://www.greensquare.com.au/favicon.ico"
    );
  });

  it("returns null when the website is missing or not a URL", () => {
    assert.equal(resolveWorkspaceSiteFaviconUrl(null), null);
    assert.equal(resolveWorkspaceSiteFaviconUrl(""), null);
    assert.equal(resolveWorkspaceSiteFaviconUrl("not-a-url"), null);
  });
});

describe("workspaceAvatarImageUrls", () => {
  it("orders Google, site ico, then stored logo", () => {
    assert.deepEqual(workspaceAvatarImageUrls("https://www.greensquare.com.au", "https://cdn.example/logo.png"), [
      "https://www.google.com/s2/favicons?domain=greensquare.com.au&sz=128",
      "https://www.greensquare.com.au/favicon.ico",
      "https://cdn.example/logo.png",
    ]);
  });
});
