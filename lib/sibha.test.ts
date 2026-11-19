import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { DEFAULT_SIBHA, currentStep, tapSibha, type SibhaState } from "./sibha"

const tapN = (s: SibhaState, n: number) => {
  let reachedAt: number[] = []
  for (let i = 1; i <= n; i++) {
    const r = tapSibha(s)
    s = r.next
    if (r.reached) reachedAt = [...reachedAt, i]
  }
  return { s, reachedAt }
}

describe("sibha", () => {
  it("counts to the target, starts a new round, and keeps the all-time total", () => {
    const { s, reachedAt } = tapN({ ...DEFAULT_SIBHA, target: 33 }, 70)
    assert.deepEqual(reachedAt, [33, 66])
    assert.equal(s.count, 4)
    assert.equal(s.rounds, 2)
    assert.equal(s.total, 70)
  })

  it("never stops counting without a target", () => {
    const { s, reachedAt } = tapN({ ...DEFAULT_SIBHA, target: 0 }, 250)
    assert.deepEqual(reachedAt, [])
    assert.equal(s.count, 250)
  })

  it("moves through 33·33·34 after prayer", () => {
    let s: SibhaState = { ...DEFAULT_SIBHA, mode: "after-prayer" }
    assert.equal(currentStep(s).phrase.id, "subhanallah")
    s = tapN(s, 33).s
    assert.equal(currentStep(s).phrase.id, "alhamdulillah")
    s = tapN(s, 33).s
    assert.equal(currentStep(s).phrase.id, "allahuakbar")
    assert.equal(currentStep(s).target, 34)
    const end = tapN(s, 34)
    assert.deepEqual(end.reachedAt, [34])
    assert.equal(end.s.rounds, 3)
    assert.equal(end.s.total, 100)
  })
})
