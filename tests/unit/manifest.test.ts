import { describe, expect, it } from "vitest";
import manifest from "../../src/app/manifest";

describe("web app manifest", () => {
  it("declares GeoLearner as a French installable app", () => {
    expect(manifest()).toMatchObject({
      name: "GeoLearner — Apprendre la géographie",
      short_name: "GeoLearner",
      start_url: "/",
      scope: "/",
      display: "standalone",
      lang: "fr",
      icons: [
        { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
        { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      ],
    });
  });
});
