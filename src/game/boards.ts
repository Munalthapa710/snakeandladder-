import type { BoardId, BoardLayout } from "./types";

export const BOARD_LAYOUTS: BoardLayout[] = [
  {
    id: "classic",
    name: "Board 1: Classic",
    description: "Familiar long ladders and sharp late-game snakes.",
    ladders: {
      4: 14,
      9: 31,
      20: 38,
      28: 84,
      40: 59,
      51: 67,
      63: 81,
      71: 91
    },
    snakes: {
      17: 7,
      54: 34,
      62: 19,
      64: 60,
      87: 24,
      93: 73,
      95: 75,
      99: 78
    }
  },
  {
    id: "easy",
    name: "Board 2: Easy",
    description: "More climbs, fewer deep setbacks.",
    ladders: {
      3: 22,
      8: 30,
      15: 44,
      27: 53,
      39: 60,
      49: 70,
      66: 86,
      79: 97
    },
    snakes: {
      36: 19,
      48: 26,
      65: 52,
      83: 62,
      94: 74,
      98: 88
    }
  },
  {
    id: "hard",
    name: "Board 3: Hard",
    description: "Short ladders and punishing snakes.",
    ladders: {
      6: 17,
      24: 36,
      42: 58,
      57: 76,
      72: 90
    },
    snakes: {
      16: 5,
      31: 11,
      47: 25,
      56: 33,
      68: 50,
      82: 61,
      89: 45,
      96: 72,
      99: 63
    }
  },
  {
    id: "balanced",
    name: "Board 4: Balanced",
    description: "Even spread of climbs and slips across the board.",
    ladders: {
      2: 18,
      12: 32,
      26: 46,
      37: 55,
      52: 68,
      69: 88,
      77: 96
    },
    snakes: {
      21: 9,
      35: 14,
      49: 29,
      61: 43,
      74: 54,
      85: 65,
      98: 79
    }
  },
  {
    id: "mixed",
    name: "Board 5: Mixed",
    description: "Alternating risk and reward zones.",
    ladders: {
      5: 25,
      11: 29,
      22: 41,
      34: 48,
      45: 66,
      58: 77,
      70: 92
    },
    snakes: {
      19: 8,
      33: 16,
      50: 32,
      63: 44,
      76: 57,
      88: 69,
      97: 80
    }
  }
];

export function getBoardLayout(boardId: BoardId): BoardLayout {
  return BOARD_LAYOUTS.find((board) => board.id === boardId) ?? BOARD_LAYOUTS[0];
}
