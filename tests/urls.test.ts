import { describe, expect, it } from "vitest";
import { InvalidProfileUrlError } from "../src/errors.js";
import { extractVanity } from "../src/linkedin/urls.js";

describe("extractVanity — accepted formats", () => {
  it.each([
    ["https://www.linkedin.com/in/john-doe-12345/", "john-doe-12345"],
    ["https://www.linkedin.com/in/john-doe-12345", "john-doe-12345"],
    ["http://linkedin.com/in/john-doe", "john-doe"],
    ["linkedin.com/in/john-doe", "john-doe"],
    ["https://in.linkedin.com/in/john-doe", "john-doe"],
    ["https://uk.linkedin.com/in/john-doe", "john-doe"],
    ["https://m.linkedin.com/in/john-doe", "john-doe"],
    ["https://www.linkedin.com/in/john-doe/?originalSubdomain=in", "john-doe"],
    ["https://www.linkedin.com/in/john-doe/details/experience/", "john-doe"],
    ["https://www.linkedin.com/in/%E5%BC%A0%E4%B8%89", "张三"],
    ["https://www.linkedin.com/pub/john-doe/1/2/3", "john-doe"],
  ])("extracts vanity from %s", (input, expected) => {
    expect(extractVanity(input)).toBe(expected);
  });
});

describe("extractVanity — rejected formats", () => {
  it.each([
    "https://www.linkedin.com/company/acme",
    "https://www.linkedin.com/school/mit",
    "https://www.linkedin.com/jobs/view/123",
    "https://twitter.com/johndoe",
    "https://www.linkedin.com/in/",
    "not-a-url",
  ])("rejects %s", (input) => {
    expect(() => extractVanity(input)).toThrow(InvalidProfileUrlError);
  });

  it("rejects empty string", () => {
    expect(() => extractVanity("")).toThrow(InvalidProfileUrlError);
  });
});
