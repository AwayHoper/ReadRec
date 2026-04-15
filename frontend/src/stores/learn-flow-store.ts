import { createStore } from 'zustand/vanilla';

export type LearnRound = 'READ' | 'REVIEW' | 'QUESTIONS' | 'SUMMARY';

interface LearnFlowState {
  currentRound: LearnRound;
  startRound: (round: LearnRound) => void;
  goToNextRound: () => void;
}

/** Summary: This function creates the round-navigation store used by the learning flow UI. */
export function createLearnFlowStore() {
  return createStore<LearnFlowState>(
    /** Summary: This callback defines the initial store state and round transition handlers. */
    function buildLearnFlowState(set, get) {
      return {
        currentRound: 'READ',
        /** Summary: This function sets the learning flow to a specific round. */
        startRound(round) {
          set({ currentRound: round });
        },
        /** Summary: This function advances the learning flow to the next available round. */
        goToNextRound() {
          const order: LearnRound[] = ['READ', 'REVIEW', 'QUESTIONS', 'SUMMARY'];
          const currentIndex = order.indexOf(get().currentRound);
          set({ currentRound: order[Math.min(currentIndex + 1, order.length - 1)] });
        }
      };
    }
  );
}