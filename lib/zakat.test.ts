import assert from "node:assert/strict"
import test from "node:test"
import { EMPTY_ZAKAT, zakatFor } from "./zakat"

test("no zakat until a price sets the nisab", () => {
  const r = zakatFor({ ...EMPTY_ZAKAT, cash: "10000" })
  assert.equal(r.nisab, 0)
  assert.equal(r.due, 0)
})

test("2.5% once wealth reaches the silver nisab", () => {
  const r = zakatFor({ ...EMPTY_ZAKAT, cash: "1000", silver: "100", silverPrice: "1", debts: "100" })
  assert.equal(r.wealth, 1000)
  assert.equal(r.nisab, 595)
  assert.equal(r.due, 25)
})

test("below the gold nisab nothing is due", () => {
  const r = zakatFor({ ...EMPTY_ZAKAT, basis: "gold", cash: "4000", goldPrice: "50" })
  assert.equal(r.nisab, 4250)
  assert.equal(r.due, 0)
})

test("debts never make wealth negative, and commas read as decimals", () => {
  assert.equal(zakatFor({ ...EMPTY_ZAKAT, cash: "10", debts: "50" }).wealth, 0)
  assert.equal(zakatFor({ ...EMPTY_ZAKAT, cash: "10,5" }).wealth, 10.5)
})
