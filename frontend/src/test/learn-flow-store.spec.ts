import { describe, expect, it } from "vitest";
import { createLearnFlowStore } from "../stores/learn-flow-store";

/** Summary: This callback verifies the learning flow store's round transition behavior. */
describe("createLearnFlowStore", function runLearnFlowStoreSuite() {
  /** Summary: This callback verifies that the store advances through all rounds to the summary state. */
  it("moves between the three rounds and summary state", function verifyRoundTransitions() {
    const store = createLearnFlowStore();

    store.getState().startRound("READ");
    store.getState().goToNextRound();
    store.getState().goToNextRound();
    store.getState().goToNextRound();

    expect(store.getState().currentRound).toBe("SUMMARY");
  });
});