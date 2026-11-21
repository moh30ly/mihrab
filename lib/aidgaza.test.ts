import assert from "node:assert/strict"
import test from "node:test"
import { aidgazaDonateUrl } from "./aidgaza"

test("donate link uses Aid Gaza's own language where it has one", () => {
  assert.equal(aidgazaDonateUrl("ar"), "https://aidgaza.org/ar/donate")
  assert.equal(aidgazaDonateUrl("tr"), "https://aidgaza.org/tr/donate")
  assert.equal(aidgazaDonateUrl("en"), "https://aidgaza.org/en/donate")
})

test("donate link falls back to English", () => {
  assert.equal(aidgazaDonateUrl("de"), "https://aidgaza.org/en/donate")
  assert.equal(aidgazaDonateUrl("ja"), "https://aidgaza.org/en/donate")
})
