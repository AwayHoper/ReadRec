import { AppState } from '../domain/models.js';

/** Summary: This function returns the initial in-memory application state for the MVP server. */
export function createSeedState(): AppState {
  return {
    users: [],
    books: [
      { id: 'book-kaoyan', key: 'kaoyan-2', title: '考研英语二词库', description: '面向考研英语二语境的官方词库。' },
      { id: 'book-cet4', key: 'cet4', title: '大学英语四级词库', description: '覆盖 CET-4 高频词汇与阅读场景。' },
      { id: 'book-cet6', key: 'cet6', title: '大学英语六级词库', description: '覆盖 CET-6 高频词汇与阅读场景。' }
    ],
    words: [
      { id: 'w1', bookId: 'book-kaoyan', word: 'sustain', phonetic: '/səˈsteɪn/', partOfSpeech: 'v.', definitions: ['维持', '支撑'], senses: [{ partOfSpeech: 'v.', definitions: ['维持', '支撑'] }], examples: ['Universities must sustain funding for long-term research.'] },
      { id: 'w2', bookId: 'book-kaoyan', word: 'allocate', phonetic: '/ˈæləkeɪt/', partOfSpeech: 'v.', definitions: ['分配', '拨给'], senses: [{ partOfSpeech: 'v.', definitions: ['分配', '拨给'] }], examples: ['The agency allocates resources to public health programs.'] },
      { id: 'w3', bookId: 'book-kaoyan', word: 'resilient', phonetic: '/rɪˈzɪliənt/', partOfSpeech: 'adj.', definitions: ['有韧性的', '能迅速恢复的'], senses: [{ partOfSpeech: 'adj.', definitions: ['有韧性的', '能迅速恢复的'] }], examples: ['A resilient city recovers quickly after disruption.'] },
      { id: 'w4', bookId: 'book-kaoyan', word: 'compile', phonetic: '/kəmˈpaɪl/', partOfSpeech: 'v.', definitions: ['汇编', '编纂'], senses: [{ partOfSpeech: 'v.', definitions: ['汇编', '编纂'] }], examples: ['Researchers compile evidence from several studies.'] },
      { id: 'w5', bookId: 'book-cet4', word: 'essential', phonetic: '/ɪˈsenʃl/', partOfSpeech: 'adj.', definitions: ['必要的', '本质的'], senses: [{ partOfSpeech: 'adj.', definitions: ['必要的', '本质的'] }], examples: ['Sleep is essential for concentration.'] },
      { id: 'w6', bookId: 'book-cet4', word: 'decline', phonetic: '/dɪˈklaɪn/', partOfSpeech: 'v./n.', definitions: ['下降', '谢绝'], senses: [{ partOfSpeech: 'v./n.', definitions: ['下降', '谢绝'] }], examples: ['Attendance began to decline after midterm week.'] },
      { id: 'w7', bookId: 'book-cet6', word: 'advocate', phonetic: '/ˈædvəkeɪt/', partOfSpeech: 'v./n.', definitions: ['提倡', '拥护者'], senses: [{ partOfSpeech: 'v./n.', definitions: ['提倡', '拥护者'] }], examples: ['Scientists advocate wider access to clean energy.'] },
      { id: 'w8', bookId: 'book-cet6', word: 'inevitable', phonetic: '/ɪnˈevɪtəbl/', partOfSpeech: 'adj.', definitions: ['不可避免的'], senses: [{ partOfSpeech: 'adj.', definitions: ['不可避免的'] }], examples: ['Some level of uncertainty is inevitable in innovation.'] }
    ],
    progress: [],
    plans: [],
    sessions: [],
    wrongBookEntries: []
  };
}
