const BOX_SIZE = 3;
const SUDOKU_SIZE = 9;

function cloneGrid(grid) {
	return grid.map((row) => row.slice());
}

function isObject(value) {
	return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function validateGrid(grid, label) {
	if (!Array.isArray(grid) || grid.length !== SUDOKU_SIZE) {
		throw new Error(`${label} must be a 9x9 array`);
	}

	for (const row of grid) {
		if (!Array.isArray(row) || row.length !== SUDOKU_SIZE) {
			throw new Error(`${label} must be a 9x9 array`);
		}

		for (const cell of row) {
			if (!Number.isInteger(cell) || cell < 0 || cell > 9) {
				throw new Error(`${label} cells must be integers between 0 and 9`);
			}
		}
	}
}

function hasConflict(grid, row, col, value) {
	for (let index = 0; index < SUDOKU_SIZE; index += 1) {
		if (index !== col && grid[row][index] === value) {
			return true;
		}

		if (index !== row && grid[index][col] === value) {
			return true;
		}
	}

	const startRow = Math.floor(row / BOX_SIZE) * BOX_SIZE;
	const startCol = Math.floor(col / BOX_SIZE) * BOX_SIZE;

	for (let currentRow = startRow; currentRow < startRow + BOX_SIZE; currentRow += 1) {
		for (let currentCol = startCol; currentCol < startCol + BOX_SIZE; currentCol += 1) {
			if ((currentRow !== row || currentCol !== col) && grid[currentRow][currentCol] === value) {
				return true;
			}
		}
	}

	return false;
}

function validateSolvedState(grid, label) {
	for (let row = 0; row < SUDOKU_SIZE; row += 1) {
		for (let col = 0; col < SUDOKU_SIZE; col += 1) {
			const value = grid[row][col];
			if (value !== 0 && hasConflict(grid, row, col, value)) {
				throw new Error(`${label} contains conflicting values`);
			}
		}
	}
}

function validateMove(move) {
	if (!isObject(move)) {
		throw new Error('Move must be an object');
	}

	const { row, col, value } = move;

	if (!Number.isInteger(row) || row < 0 || row >= SUDOKU_SIZE) {
		throw new Error('Move row must be an integer between 0 and 8');
	}

	if (!Number.isInteger(col) || col < 0 || col >= SUDOKU_SIZE) {
		throw new Error('Move col must be an integer between 0 and 8');
	}

	if (!Number.isInteger(value) || value < 0 || value > 9) {
		throw new Error('Move value must be an integer between 0 and 9');
	}
}

function validateJSONState(json) {
	if (!isObject(json)) {
		throw new Error('Sudoku JSON must be an object');
	}

	if (!('givens' in json) || !('grid' in json)) {
		throw new Error('Sudoku JSON must include givens and grid');
	}

	validateGrid(json.givens, 'Sudoku givens');
	validateGrid(json.grid, 'Sudoku grid');
	validateSolvedState(json.givens, 'Sudoku givens');
	validateSolvedState(json.grid, 'Sudoku grid');

	for (let row = 0; row < SUDOKU_SIZE; row += 1) {
		for (let col = 0; col < SUDOKU_SIZE; col += 1) {
			const given = json.givens[row][col];
			if (given !== 0 && json.grid[row][col] !== given) {
				throw new Error('Sudoku grid must preserve givens');
			}
		}
	}
}

function createSudokuState({ givens: initialGivens, grid: initialGrid }) {
	const givens = cloneGrid(initialGivens);
	let grid = cloneGrid(initialGrid);

	return {
		getGrid() {
			return cloneGrid(grid);
		},

		guess(move) {
			validateMove(move);

			const { row, col, value } = move;

			if (givens[row][col] !== 0) {
				throw new Error('Cannot change a given cell');
			}

			if (value !== 0 && hasConflict(grid, row, col, value)) {
				throw new Error('Move conflicts with Sudoku rules');
			}

			grid[row][col] = value;
		},

		clone() {
			return createSudokuFromJSON({ givens, grid });
		},

		toJSON() {
			return {
				givens: cloneGrid(givens),
				grid: cloneGrid(grid),
			};
		},

		toString() {
			return grid.map((row) => row.join(' ')).join('\n');
		},
	};
}

export function createSudoku(input) {
	validateGrid(input, 'Sudoku grid');
	validateSolvedState(input, 'Sudoku grid');

	return createSudokuState({ givens: input, grid: input });
}

export function createSudokuFromJSON(json) {
	validateJSONState(json);

	return createSudokuState({ givens: json.givens, grid: json.grid });
}
