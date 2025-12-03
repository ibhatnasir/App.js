// --- DOM ---
let boxes = document.querySelectorAll(".box");
let resetBtn = document.querySelector("#reset-btn");
let newGameBtn = document.querySelector("#new-btn");
let container2 = document.querySelector(".container2");
let msg = document.querySelector("#msg");
let turnIndicator = document.querySelector("#turn-indicator");

let turnO = true; // true => O's turn (player). false => X's turn (AI)
let gameOver = false;

// winning patterns
const winPatterns = [
    [0,1,2],
    [3,4,5],
    [6,7,8],
    [0,3,6],
    [1,4,7],
    [2,5,8],
    [0,4,8],
    [2,4,6]
];

// --- Sound using WebAudio for click/win/draw ---
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
function playTone(freq=440, duration=0.08, type='sine') {
    try {
        const o = audioCtx.createOscillator();
        const g = audioCtx.createGain();
        o.type = type;
        o.frequency.value = freq;
        o.connect(g);
        g.connect(audioCtx.destination);
        o.start();
        g.gain.setValueAtTime(0.0001, audioCtx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.2, audioCtx.currentTime + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);
        o.stop(audioCtx.currentTime + duration + 0.02);
    } catch (e) {
        // fallback silence
    }
}

function playSound(kind){
    if(kind === 'click') playTone(880, 0.06);
    if(kind === 'win') playTone(440, 0.22, 'sawtooth');
    if(kind === 'draw') playTone(220, 0.26, 'triangle');
    if(kind === 'ai') playTone(660, 0.08, 'square');
}

// --- Game utility functions ---
const updateTurnUI = () => {
    turnIndicator.innerText = `Turn: ${turnO ? 'O' : 'X'}`;
};

const showWinner = (winner) => {
    msg.innerText = `Congratulations! ${winner} has won the game!`;
    container2.classList.remove("hide");
    playSound('win');
    gameOver = true;
};

const showDraw = () => {
    msg.innerText = `It's a draw!`;
    container2.classList.remove("hide");
    playSound('draw');
    gameOver = true;
};

const disableAllBoxes = () => {
    boxes.forEach((box) => box.disabled = true);
};

const enableEmptyBoxes = () => {
    boxes.forEach((box) => {
        if(box.innerText === "") box.disabled = false;
    });
};

const clearBoardUI = () => {
    boxes.forEach((box) => {
        box.innerText = "";
        box.disabled = false;
        box.classList.remove("win");
        box.style.backgroundColor = "";
    });
    container2.classList.add("hide");
    gameOver = false;
    turnO = true; // player O starts
    updateTurnUI();
};

// --- Win & Draw Check ---
const checkWin = () => {
    for(let pattern of winPatterns){
        let a = boxes[pattern[0]].innerText;
        let b = boxes[pattern[1]].innerText;
        let c = boxes[pattern[2]].innerText;

        if(a !== "" && a === b && b === c){
            // highlight
            boxes[pattern[0]].classList.add("win");
            boxes[pattern[1]].classList.add("win");
            boxes[pattern[2]].classList.add("win");
            disableAllBoxes();
            showWinner(a);
            return true;
        }
    }
    return false;
};

const checkDraw = () => {
    const allFilled = Array.from(boxes).every(box => box.innerText !== "");
    if(allFilled && !gameOver){
        showDraw();
        disableAllBoxes();
        return true;
    }
    return false;
};

// --- Player action ---
boxes.forEach((box, index) => {
    box.addEventListener("click", () => {
        if(gameOver) return;
        if(box.innerText !== "") return;
        if(!turnO) return; // only allow player when it's O's turn

        box.innerText = "O";
        box.disabled = true;
        playSound('click');

        // check win/draw
        if (checkWin()) return;
        if (checkDraw()) return;

        // switch to AI
        turnO = false;
        updateTurnUI();

        // AI move after short delay
        setTimeout(() => {
            aiMove();
        }, 300);
    });
});

// --- AI (X) logic ---
// Helper: returns array of indices that are empty
const emptyIndices = () => {
    const arr = [];
    boxes.forEach((b,i) => { if(b.innerText === "") arr.push(i); });
    return arr;
};

// Simulate a move and return true if it creates win for playerSymbol
const isWinningAfterMove = (index, playerSymbol) => {
    // temporarily set
    const prev = boxes[index].innerText;
    boxes[index].innerText = playerSymbol;

    // check win
    let wins = false;
    for(let pattern of winPatterns){
        let a = boxes[pattern[0]].innerText;
        let b = boxes[pattern[1]].innerText;
        let c = boxes[pattern[2]].innerText;
        if(a !== "" && a === b && b === c){
            wins = true;
            break;
        }
    }

    // rollback
    boxes[index].innerText = prev;
    return wins;
};

// AI chooses: win if possible, block if needed, take center, take corner, else random
const aiMove = () => {
    if(gameOver) return;

    const empties = emptyIndices();
    if(empties.length === 0) {
        checkDraw();
        return;
    }

    // 1. Win if possible
    for(let idx of empties){
        if(isWinningAfterMove(idx, 'X')){
            makeAIMoveAt(idx);
            return;
        }
    }

    // 2. Block player's immediate win
    for(let idx of empties){
        if(isWinningAfterMove(idx, 'O')){
            makeAIMoveAt(idx);
            return;
        }
    }

    // 3. Take center if free
    if(empties.includes(4)){
        makeAIMoveAt(4);
        return;
    }

    // 4. Take a corner if available
    const corners = [0,2,6,8].filter(i => empties.includes(i));
    if(corners.length > 0){
        const pick = corners[Math.floor(Math.random()*corners.length)];
        makeAIMoveAt(pick);
        return;
    }

    // 5. Else pick random edge
    const pick = empties[Math.floor(Math.random()*empties.length)];
    makeAIMoveAt(pick);
};

const makeAIMoveAt = (idx) => {
    if(gameOver) return;
    boxes[idx].innerText = "X";
    boxes[idx].disabled = true;
    playSound('ai');

    // check win/draw
    if (checkWin()) return;
    if (checkDraw()) return;

    // switch turn back to player
    turnO = true;
    updateTurnUI();
    enableEmptyBoxes();
};

// --- Buttons ---
resetBtn.addEventListener("click", () => {
    clearBoardUI();
    playSound('click');
});

newGameBtn.addEventListener("click", () => {
    clearBoardUI();
    playSound('click');
});

// Initialize UI
updateTurnUI();
