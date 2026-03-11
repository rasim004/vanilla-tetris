import {Tetris} from "./tetris.js";
import { convertPositionToIndex, PLAYFIELD_COLUMNS, SAD, PLAYFIELD_ROWS } from "./utilities.js";

let hammer;
let requestId;
let timeoutId;
let isGameEnded = false;
let isPaused = false;
let animationTimeouts = [];
let highScore = parseInt(localStorage.getItem('tetrisHighScore')) || 0;
document.getElementById('highscore').textContent = highScore;
let isGhostEnabled = true;

const tetris = new Tetris();

const cells = document.querySelectorAll('.grid>div');
const restartBtn = document.querySelector('.restart');
const pauseBtn = document.querySelector('.pause');

initKeydown();
initTouch();
startLoop();

restartBtn.addEventListener("click", restartGame);
pauseBtn.addEventListener("click", togglePause);

// ---------------- KEYBOARD ----------------
function initKeydown() {
    document.addEventListener('keydown', onKeydown);
}

function onKeydown(event) {
    if (isGameEnded) return;

    if (event.key === 'Escape') {
        togglePause();
        return;
    }
    

    if (isPaused) return;

    switch (event.key) {
        case 'ArrowUp': rotate(); break;
        case 'ArrowDown': moveDown(); break;
        case 'ArrowLeft': moveLeft(); break;
        case 'ArrowRight': moveRight(); break;
        case ' ':
            event.preventDefault();
            dropDown();
            break;
    }
}

// ---------------- TOUCH ----------------
function initTouch() {
    document.addEventListener('dblclick', (event) => event.preventDefault());

    if (hammer) hammer.destroy();
    hammer = new Hammer(document.querySelector('.grid'));

    hammer.get('pan').set({ direction: Hammer.DIRECTION_ALL });
    hammer.get('swipe').set({ direction: Hammer.DIRECTION_ALL });

    const threshold = 30;
    let deltaX = 0;
    let deltaY = 0;

    hammer.on('panstart', () => { deltaX = 0; deltaY = 0; });

    hammer.on('panleft', (event) => {
        if (isPaused) return;
        if (Math.abs(event.deltaX - deltaX) > threshold) {
            moveLeft();
            deltaX = event.deltaX;
        }
    });

    hammer.on('panright', (event) => {
        if (isPaused) return;
        if (Math.abs(event.deltaX - deltaX) > threshold) {
            moveRight();
            deltaX = event.deltaX;
        }
    });

    hammer.on('pandown', (event) => {
        if (isPaused) return;
        if (Math.abs(event.deltaY - deltaY) > threshold) {
            moveDown();
            deltaY = event.deltaY;
        }
    });

    hammer.on('swipedown', () => { if (!isPaused) dropDown(); });
    hammer.on('tap', () => { if (!isPaused) rotate(); });
}

// ---------------- PAUSE ----------------
function togglePause() {
    if (isGameEnded) return;

    isPaused = !isPaused;
    pauseBtn.textContent = isPaused ? '▶' : '⏸';

    if (isPaused) {
        stopLoop();
    } else {
        startLoop();
    }
}

// ---------------- GAME MOVEMENTS ----------------
function moveDown() {
    if (isGameEnded || isPaused) return;

    tetris.moveTetrominoDown();
    draw();

    stopLoop();
    startLoop();

    if (tetris.isGameOver) gameOver();
}

function moveLeft()  { if (isPaused) return; tetris.moveTetrominoLeft();  draw(); }
function moveRight() { if (isPaused) return; tetris.moveTetrominoRight(); draw(); }
function rotate()    { if (isPaused) return; tetris.rotateTetromino();    draw(); }

function dropDown() {
    if (isPaused) return;

    tetris.dropTetrominoDown();
    draw();

    stopLoop();
    startLoop();

    if (tetris.isGameOver) gameOver();
}

// ---------------- GAME LOOP ----------------
function startLoop() {
    timeoutId = setTimeout(() => {
        requestId = requestAnimationFrame(moveDown);
    }, 700);
}

function stopLoop() {
    cancelAnimationFrame(requestId);
    clearTimeout(timeoutId);
}

// ---------------- DRAWING ----------------
function draw() {
    cells.forEach(cell => cell.removeAttribute('class'));
    drawPlayfield();
    drawTetromino();
     if (isGhostEnabled) drawGhostTetromino(); // 👈 вот тут
    updateScore(); 
}

function drawPlayfield() {
    for (let row = 0; row < PLAYFIELD_ROWS; row++) {
        for (let column = 0; column < PLAYFIELD_COLUMNS; column++) {
            if (!tetris.playfield[row][column]) continue;
            const name = tetris.playfield[row][column];
            const cellIndex = convertPositionToIndex(row, column);
            cells[cellIndex].classList.add(name);
        }
    }
}

function drawTetromino() {
    const name = tetris.tetromino.name;
    const size = tetris.tetromino.matrix.length;

    for (let row = 0; row < size; row++) {
        for (let column = 0; column < size; column++) {
            if (!tetris.tetromino.matrix[row][column]) continue;
            if (tetris.tetromino.row + row < 0) continue;
            const cellIndex = convertPositionToIndex(
                tetris.tetromino.row + row,
                tetris.tetromino.column + column
            );
            cells[cellIndex].classList.add(name);
        }
    }
}

function drawGhostTetromino() {
    const size = tetris.tetromino.matrix.length;

    for (let row = 0; row < size; row++) {
        for (let column = 0; column < size; column++) {
            if (!tetris.tetromino.matrix[row][column]) continue;
            if (tetris.tetromino.ghostRow + row < 0) continue;
            const cellIndex = convertPositionToIndex(
                tetris.tetromino.ghostRow + row,
                tetris.tetromino.ghostColumn + column
            );
            cells[cellIndex].classList.add('ghost');
        }
    }
}

// ---------------- GAME OVER ----------------
function gameOver() {
    isGameEnded = true;
    stopLoop();

    document.removeEventListener('keydown', onKeydown);
    if (hammer) hammer.destroy();
    hammer = null;

    gameOverAnimation();
}

function gameOverAnimation() {
    const filledCells = [...cells].filter(cell => cell.classList.length > 0);

    filledCells.forEach((cell, i) => {
        animationTimeouts.push(setTimeout(() => cell.classList.add('hide'), i * 10));
        animationTimeouts.push(setTimeout(() => cell.removeAttribute('class'), i * 10 + 500));
    });

    animationTimeouts.push(setTimeout(drawSad, filledCells.length * 10 + 1000));
}

function clearAllAnimationTimeouts() {
    animationTimeouts.forEach(id => clearTimeout(id));
    animationTimeouts = [];
}

function drawSad() {
    const TOP_OFFSET = 5;

    for (let row = 0; row < SAD.length; row++) {
        for (let column = 0; column < SAD[0].length; column++) {
            if (!SAD[row][column]) continue;
            const cellIndex = convertPositionToIndex(TOP_OFFSET + row, column);
            cells[cellIndex].classList.add('sad');
        }
    }
}

// ---------------- RESTART Animation ----------------

function restartAnimation() {
    const filledCells = [...cells].filter(cell => cell.classList.length > 0);

    filledCells.forEach((cell, i) => {
        animationTimeouts.push(setTimeout(() => cell.classList.add('hide'), i * 10));
        animationTimeouts.push(setTimeout(() => cell.removeAttribute('class'), i * 10 + 500));
    });

    
}

// ---------------- RESTART ----------------
function restartGame() {
    isPaused = false;
    pauseBtn.textContent = '⏸';

    stopLoop();
    clearAllAnimationTimeouts();
    restartAnimation()

    tetris.init();
    document.getElementById('score').textContent = 0;
    isGameEnded = false;

    cells.forEach(cell => cell.removeAttribute('class'));

    document.removeEventListener('keydown', onKeydown);
    document.addEventListener('keydown', onKeydown);
    initTouch();
    

    draw();
    startLoop();
}


//ррр


function updateScore() {
    document.getElementById('score').textContent = tetris.score;
    if (tetris.score > highScore) {
        highScore = tetris.score;
        document.getElementById('highscore').textContent = highScore;
        localStorage.setItem('tetrisHighScore', highScore);
    }
}

// Получи кнопку:
const ghostBtn = document.querySelector('.ghost-toggle');

// Добавь обработчик:
ghostBtn.addEventListener('click', toggleGhost);

function toggleGhost() {
    isGhostEnabled = !isGhostEnabled;
    ghostBtn.textContent = isGhostEnabled ? '👻 ' : '👻 ';
    ghostBtn.style.opacity = isGhostEnabled ? '1' : '0.5';
    draw();
}
