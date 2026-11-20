import assert from "node:assert/strict";
import { test } from "node:test";
import { filterPolicies, POLICIES } from "./policies";

test("policy catalog has ten sourced and recently verified records", () => {
  assert.equal(POLICIES.length, 10);
  for (const policy of POLICIES) {
    assert.match(policy.sourceUrl, /^https:\/\//);
    assert.equal(policy.verifiedAt, "2026-11-20");
    assert.ok(policy.caveat.zh && policy.caveat.en);
  }
});

test("Chinese and English search both match policy content", () => {
  assert.ok(filterPolicies(POLICIES, "增值税", "all").some((item) => item.id === "vat-small-scale"));
  assert.ok(filterPolicies(POLICIES, "VAT", "all").some((item) => item.id === "vat-small-scale"));
  assert.ok(filterPolicies(POLICIES, "work permit", "all").some((item) => item.id === "foreign-work-permit"));
});

test("category and query compose instead of replacing each other", () => {
  const results = filterPolicies(POLICIES, "社保", "startup");
  assert.equal(results.length, 1);
  assert.equal(results[0].id, "graduate-flexible-social-security");
  assert.equal(filterPolicies(POLICIES, "社保", "tax").length, 0);
});

test("unknown searches and clearing behave predictably", () => {
  assert.equal(filterPolicies(POLICIES, "没有这条政策", "all").length, 0);
  assert.equal(filterPolicies(POLICIES, "", "all").length, POLICIES.length);
  assert.equal(filterPolicies(POLICIES, "   ", "all").length, POLICIES.length);
});
