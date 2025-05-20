import { useState, useEffect } from 'react';
import './App.css';

// Minimax Algorithm for Tic Tac Toe
function minimax(newBoard, isMaximizing) {
  const winner = checkWinner(newBoard);
  if (winner === "O") return { score: 1 };
  if (winner === "X") return { score: -1 };
  if (newBoard.every(Boolean)) return { score: 0 };

  let bestMove;
  if (isMaximizing) {
    let bestScore = -Infinity;
    for (let i = 0; i < 9; i++) {
      if (!newBoard[i]) {
        newBoard[i] = "O";
        const { score } = minimax(newBoard, false);
        newBoard[i] = null;
        if (score > bestScore) {
          bestScore = score;
          bestMove = i;
        }
      }
    }
    return { score: bestScore, move: bestMove };
  } else {
    let bestScore = Infinity;
    for (let i = 0; i < 9; i++) {
      if (!newBoard[i]) {
        newBoard[i] = "X";
        const { score } = minimax(newBoard, true);
        newBoard[i] = null;
        if (score < bestScore) {
          bestScore = score;
          bestMove = i;
        }
      }
    }
    return { score: bestScore, move: bestMove };
  }
}

function checkWinner(board) {
  const lines = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6],
  ];
  for (let line of lines) {
    const [a, b, c] = line;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a];
    }
  }
  return null;
}

// Update: Get winning squares indices for highlighting
function getWinningLine(board) {
  const lines = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6],
  ];
  for (let line of lines) {
    const [a, b, c] = line;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return line;
    }
  }
  return null;
}

function App() {
  const [board, setBoard] = useState(Array(9).fill(null));
  const [xIsNext, setXisNext] = useState(true); // X = human, O = AI

  const winner = checkWinner(board);
  const winningLine = getWinningLine(board);
  const isDraw = board.every(Boolean) && !winner;

  const status = winner
    ? `Winner: ${winner}`
    : isDraw
    ? "Draw!"
    : `Next player: ${xIsNext ? "X (You)" : "O (AI)"}`;

  function handleClick(idx) {
    if (!xIsNext || board[idx] || winner) return;
    const newBoard = board.slice();
    newBoard[idx] = "X";
    setBoard(newBoard);
    setXisNext(false);
  }

  // AI move using useEffect
  useEffect(() => {
    if (!xIsNext && !winner && board.some(v => !v)) {
      const { move } = minimax([...board], true);
      if (move !== undefined) {
        setTimeout(() => {
          const newBoard = board.slice();
          newBoard[move] = "O";
          setBoard(newBoard);
          setXisNext(true);
        }, 400); // Delay for UX
      }
    }
  }, [xIsNext, board, winner]);

  function handleReset() {
    setBoard(Array(9).fill(null));
    setXisNext(true);
  }

  return (
    <div className="ttt-root">
      <h1>Tic Tac Toe</h1>
      <div className={
        `status${winner ? ' winner' : ''}${isDraw ? ' draw' : ''}`
      }>
        {status}
      </div>
      <div className="board">
        {board.map((value, idx) => (
          <button
            key={idx}
            className={`square${winningLine && winningLine.includes(idx) ? ' highlight' : ''}`}
            onClick={() => handleClick(idx)}
            disabled={!!value || winner || !xIsNext}
          >
            {value}
          </button>
        ))}
      </div>
      <button className="reset-btn" onClick={handleReset}>
        Reset
      </button>
    </div>
  );
}

export default App;