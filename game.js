// Simple Flappy Bird clone — game.js
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

// Logical size (we'll scale via CSS) - keep integers for crisp rendering
const WIDTH = canvas.width;
const HEIGHT = canvas.height;

// Game state
let frames = 0;
let running = false;
let gameOver = false;
let score = 0;

// Bird
const bird = {
  x: 80,
  y: HEIGHT / 2,
  vy: 0,
  radius: 12,
  gravity: 0.35, // decreased from 0.45 for easier gameplay
  lift: -9.5, // increased from -8.5 for easier gameplay
  rotation: 0,
};

// Pipes
const PIPE_WIDTH = 64;
const PIPE_GAP = 200; // increased from 150 for easier gameplay
const PIPE_INTERVAL = 90; // frames
const pipeSpeed = 1.8; // decreased from 2.2 for easier gameplay
let pipes = []; // each: {x, topHeight, passed}

// DOM
const overlay = document.getElementById('overlay');
const message = document.getElementById('message');
const scoreEl = document.getElementById('score');

function reset() {
  frames = 0;
  running = false;
  gameOver = false;
  score = 0;
  bird.y = HEIGHT / 2;
  bird.vy = 0;
  bird.rotation = 0;
  pipes = [];
  message.textContent = 'Click or press Space to start';
  scoreEl.textContent = 'Score: 0';
}

function spawnPipe() {
  const topHeight = 60 + Math.random() * (HEIGHT - PIPE_GAP - 140);
  pipes.push({ x: WIDTH + 20, topHeight, passed: false });
}

function flap() {
  if (gameOver) return;
  bird.vy = bird.lift;
  running = true;
}

function update() {
  frames++;

  // Bird physics
  bird.vy += bird.gravity;
  bird.y += bird.vy;
  bird.rotation = Math.max(-0.6, Math.min(1.2, bird.vy / 10));

  // Spawn pipes
  if (frames % PIPE_INTERVAL === 0) spawnPipe();

  // Update pipes
  for (let i = pipes.length - 1; i >= 0; i--) {
    const p = pipes[i];
    p.x -= pipeSpeed;

    // scoring
    if (!p.passed && p.x + PIPE_WIDTH < bird.x) {
      p.passed = true;
      score++;
      scoreEl.textContent = 'Score: ' + score;
    }

    // remove off-screen
    if (p.x + PIPE_WIDTH < -50) pipes.splice(i, 1);
  }

  // Collisions
  if (bird.y + bird.radius > HEIGHT) {
    bird.y = HEIGHT - bird.radius;
    endGame();
  }
  if (bird.y - bird.radius < 0) {
    bird.y = bird.radius;
    bird.vy = 0;
  }

  for (const p of pipes) {
    const inX = bird.x + bird.radius > p.x && bird.x - bird.radius < p.x + PIPE_WIDTH;
    if (inX) {
      // check overlap with gap
      if (bird.y - bird.radius < p.topHeight || bird.y + bird.radius > p.topHeight + PIPE_GAP) {
        endGame();
      }
    }
  }
}

function endGame() {
  if (gameOver) return;
  gameOver = true;
  running = false;
  message.textContent = 'Game Over - Restarting...';
  setTimeout(() => reset(), 2000);
}

function draw() {
  // clear
  ctx.clearRect(0, 0, WIDTH, HEIGHT);

  // background sky gradient
  const g = ctx.createLinearGradient(0, 0, 0, HEIGHT);
  g.addColorStop(0, '#70c5ce');
  g.addColorStop(1, '#5eb7c9');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // ground
  ctx.fillStyle = '#ded090';
  ctx.fillRect(0, HEIGHT - 80, WIDTH, 80);

  // pipes
  ctx.fillStyle = '#4bb34b';
  for (const p of pipes) {
    // top pipe
    ctx.fillRect(p.x, 0, PIPE_WIDTH, p.topHeight);
    // bottom pipe
    ctx.fillRect(p.x, p.topHeight + PIPE_GAP, PIPE_WIDTH, HEIGHT - (p.topHeight + PIPE_GAP) - 80);

    // pipe cap (simple)
    ctx.fillStyle = '#3aa33a';
    ctx.fillRect(p.x, p.topHeight - 10, PIPE_WIDTH, 10);
    ctx.fillRect(p.x, p.topHeight + PIPE_GAP, PIPE_WIDTH, 10);
    ctx.fillStyle = '#4bb34b';
  }

  // bird
  ctx.save();
  ctx.translate(bird.x, bird.y);
  ctx.rotate(bird.rotation);
  ctx.fillStyle = '#FFDD55';
  ctx.beginPath();
  ctx.arc(0, 0, bird.radius, 0, Math.PI * 2);
  ctx.fill();
  // beak
  ctx.fillStyle = '#E07A00';
  ctx.beginPath();
  ctx.moveTo(bird.radius, 0);
  ctx.lineTo(bird.radius + 10, -6);
  ctx.lineTo(bird.radius + 10, 6);
  ctx.closePath();
  ctx.fill();
  // eye
  ctx.fillStyle = '#222';
  ctx.beginPath();
  ctx.arc(4, -4, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // score big
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.font = '48px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(score, WIDTH / 2, 80);
}

function loop() {
  if (running) update();
  draw();
  requestAnimationFrame(loop);
}

// Input handlers
window.addEventListener('keydown', (e) => {
  if (e.code === 'Space') {
    e.preventDefault();
    if (!running && !gameOver) {
      running = true;
      message.style.display = 'none';
    }
    flap();
  }
});

canvas.addEventListener('click', () => {
  if (!running && !gameOver) {
    running = true;
    message.style.display = 'none';
  }
  flap();
});

canvas.addEventListener('touchstart', (e) => {
  e.preventDefault();
  if (!running && !gameOver) {
    running = true;
    message.style.display = 'none';
  }
  flap();
}, { passive: false });

// init
reset();
loop();

// expose for debugging
window._game = { reset, flap };
