import { createSudokuFromJSON } from './sudoku.js';

function isObject(value) {
	return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function validateSudoku(sudoku) {
	if (
		!isObject(sudoku) ||
		typeof sudoku.clone !== 'function' ||
		typeof sudoku.guess !== 'function' ||
		typeof sudoku.getGrid !== 'function' ||
		typeof sudoku.toJSON !== 'function'
	) {
		throw new Error('Game requires a valid sudoku object');
	}
}

function createGameState({ currentSudoku: initialSudoku, undoStack: initialUndoStack = [], redoStack: initialRedoStack = [] }) {
	let currentSudoku = initialSudoku;
	let undoStack = initialUndoStack.slice();
	let redoStack = initialRedoStack.slice();

	return {
		getSudoku() {
			return currentSudoku.clone();
		},

		guess(move) {
			const previousSudoku = currentSudoku.clone();
			currentSudoku.guess(move);
			undoStack.push(previousSudoku);
			redoStack = [];
		},

		undo() {
			if (!undoStack.length) {
				return;
			}

			redoStack.push(currentSudoku.clone());
			currentSudoku = undoStack.pop();
		},

		redo() {
			if (!redoStack.length) {
				return;
			}

			undoStack.push(currentSudoku.clone());
			currentSudoku = redoStack.pop();
		},

		canUndo() {
			return undoStack.length > 0;
		},

		canRedo() {
			return redoStack.length > 0;
		},

		toJSON() {
			return {
				sudoku: currentSudoku.toJSON(),
				undoStack: undoStack.map((item) => item.toJSON()),
				redoStack: redoStack.map((item) => item.toJSON()),
			};
		},
	};
}

export function createGame({ sudoku } = {}) {
	validateSudoku(sudoku);

	return createGameState({
		currentSudoku: sudoku.clone(),
	});
}

export function createGameFromJSON(json) {
	if (!isObject(json)) {
		throw new Error('Game JSON must be an object');
	}

	if (!('sudoku' in json)) {
		throw new Error('Game JSON must include sudoku');
	}

	const undoStack = 'undoStack' in json ? json.undoStack : [];
	const redoStack = 'redoStack' in json ? json.redoStack : [];

	if (!Array.isArray(undoStack) || !Array.isArray(redoStack)) {
		throw new Error('Game history stacks must be arrays');
	}

	return createGameState({
		currentSudoku: createSudokuFromJSON(json.sudoku),
		undoStack: undoStack.map((item) => createSudokuFromJSON(item)),
		redoStack: redoStack.map((item) => createSudokuFromJSON(item)),
	});
}
