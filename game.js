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
let inputDisabled = false;
let highScore = 0;

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
const PIPE_GAP = 200; // fixed gap
let currentPipeInterval = 90; // adjustable for easy mode
const pipeSpeed = 1.8; // decreased from 2.2 for easier gameplay
let pipes = []; // each: {x, topHeight, passed, isRed}
let pipeCount = 0; // to track total pipes spawned
let weeds = []; // static weed positions
let groundOffset = 0; // for moving ground
let rainEnabled = false;
let raindrops = []; // Array to hold raindrop positions
let easyMode = false;
let musicEnabled = true;
let sfxEnabled = true;
let lowGraphicsMode = false;
let desertMode = false;
let snowMode = false;
let darkMode = false;
let hardMode = false;

// Sound effects
const bgMusic = new Audio('sfx/background music.mp3');
bgMusic.loop = true;
bgMusic.volume = 0.3; // low volume for background
const pointSound = new Audio('sfx/+1 point (mp3cut.net).mp3');
const rainSound = new Audio('sfx/calming-rain-257596.mp3');
rainSound.loop = true;
rainSound.volume = 0.1; // lowered by 80% from 0.5
const gameOverSound = new Audio('sfx/game-over-417465.mp3');

// DOM
const overlay = document.getElementById('overlay');
const message = document.getElementById('message');
const scoreEl = document.getElementById('score');

function reset() {
  frames = 0;
  running = false;
  gameOver = false;
  score = 0;
  inputDisabled = false; // enable inputs on reset
  bird.y = HEIGHT / 2;
  bird.vy = 0;
  bird.rotation = 0;
  pipes = [];
  pipeCount = 0; // reset pipe counter
  weeds = []; // generate static weeds as black dots
  for (let i = 0; i < 30; i++) {
    const x = Math.random() * WIDTH;
    const y = HEIGHT - 80 + Math.random() * 20;
    weeds.push({ x, y });
  }
  groundOffset = 0;
  bgMusic.currentTime = 0; // rewind bg music
  // removed bgMusic.play() from here to play only after user interaction
  message.textContent = 'Click or press Space to start';
  scoreEl.textContent = 'Score: 0 | High: ' + highScore;
}

function spawnPipe() {
  const topHeight = 60 + Math.random() * (HEIGHT - PIPE_GAP - 140);
  pipeCount++;
  const isRed = pipeCount % 5 === 0;
  pipes.push({ x: WIDTH + 20, topHeight, passed: false, isRed, offset: 0, direction: 1 });
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
  bird.rotation = Math.max(-1.0, Math.min(1.0, bird.vy * 0.06)); // increased lean for more apparent animation

  // Spawn pipes
  if (frames % currentPipeInterval === 0) spawnPipe();

  // Update pipes
  for (let i = pipes.length - 1; i >= 0; i--) {
    const p = pipes[i];
    p.x -= pipeSpeed;

    // Hard mode movement for every 5th pipe
    if (hardMode && p.isRed) {
      p.offset += p.direction * 0.4;
      if (p.offset > 30 || p.offset < -30) {
        p.direction *= -1;
      }
    } else {
      p.offset = 0;
    }

    // scoring
    if (!p.passed && bird.x > p.x + PIPE_WIDTH / 2) {
      p.passed = true;
      score++;
      scoreEl.textContent = 'Score: ' + score + ' | High: ' + highScore;
      pointSound.currentTime = 0; // rewind to start
      if (sfxEnabled) pointSound.play();
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
      const topLimit = p.topHeight + p.offset;
      if (bird.y - bird.radius < topLimit || bird.y + bird.radius > topLimit + PIPE_GAP) {
        endGame();
      }
    }
  }

  // Move ground
  groundOffset -= pipeSpeed;
  if (groundOffset <= -WIDTH) groundOffset = 0;

  // Rain effect
  if (rainEnabled) {
    for (let i = 0; i < raindrops.length; i++) {
      let drop = raindrops[i];
      drop.y += drop.speed;

      // Remove raindrop if it falls below the screen
      if (drop.y > HEIGHT) {
        raindrops.splice(i, 1);
        i--;
      }
    }

    // Occasionally spawn a new raindrop
    const spawnRate = lowGraphicsMode ? 0.05 : 0.2; // 75% fewer raindrops in low graphics mode
    if (Math.random() < spawnRate) {
      raindrops.push({
        x: Math.random() * WIDTH,
        y: 0,
        speed: 2 + Math.random() * 3,
      });
    }
  }
}

function endGame() {
  if (gameOver) return;
  if (score > highScore) highScore = score;
  scoreEl.textContent = 'Score: ' + score + ' | High: ' + highScore;
  gameOver = true;
  running = false;
  inputDisabled = true;
  if (musicEnabled) bgMusic.pause();
  gameOverSound.currentTime = 0; // rewind to start
  if (sfxEnabled) gameOverSound.play();
  message.textContent = 'Game Over';
  setTimeout(() => {
    inputDisabled = false;
    message.textContent = 'Game Over - Press Space or Click to Restart';
  }, 1000);
}

function draw() {
  // clear
  ctx.imageSmoothingEnabled = false; // disable linear filtering for crisp, pixelated look
  ctx.clearRect(0, 0, WIDTH, HEIGHT);

  // background sky solid color for pixelated look
  let skyColor = darkMode ? '#2d3436' : '#87CEEB'; // modern dark navy vs sky blue
  if (rainEnabled) skyColor = darkMode ? '#1e272e' : '#a29bfe'; // darker for rain vs lavender
  else if (desertMode) skyColor = darkMode ? '#830001' : '#ffeaa7'; // deep red vs warm yellow for desert
  else if (snowMode) skyColor = darkMode ? '#636e72' : '#74b9ff'; // dark gray vs light blue for snow
  ctx.fillStyle = skyColor;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // add clouds for normal mode
  if (!rainEnabled && !desertMode && !snowMode) {
    ctx.fillStyle = '#ffffff';
    // simple cloud shapes using overlapping rects
    ctx.fillRect(100, 40, 40, 15);
    ctx.fillRect(120, 35, 20, 10);
    ctx.fillRect(300, 60, 50, 20);
    ctx.fillRect(320, 55, 25, 12);
    ctx.fillRect(500, 45, 35, 18);
    ctx.fillRect(520, 40, 18, 8);
  }

  // add dark clouds for rainy mode
  if (rainEnabled) {
    ctx.fillStyle = darkMode ? '#2d3436' : '#636e72'; // dark gray clouds
    // larger, more ominous cloud shapes
    ctx.fillRect(80, 25, 60, 25);
    ctx.fillRect(110, 15, 35, 20);
    ctx.fillRect(90, 35, 45, 15);
    ctx.fillRect(280, 40, 80, 30);
    ctx.fillRect(310, 30, 40, 25);
    ctx.fillRect(290, 55, 55, 20);
    ctx.fillRect(480, 20, 70, 35);
    ctx.fillRect(510, 10, 30, 25);
    ctx.fillRect(490, 40, 50, 20);
    // add some smaller cloud wisps
    ctx.fillRect(200, 35, 25, 12);
    ctx.fillRect(220, 30, 15, 8);
    ctx.fillRect(600, 45, 30, 15);
    ctx.fillRect(620, 40, 20, 10);
  }

  // draw moving ground
  let dirtColor = darkMode ? '#654321' : '#8B4513'; // dark brown vs saddle brown
  let groundColor = darkMode ? '#636e72' : '#228B22'; // dark green-gray vs forest green
  if (desertMode) groundColor = darkMode ? '#e17055' : '#fdcb6e'; // warm orange vs sandy yellow
  else if (snowMode) groundColor = '#ffffff'; // snow white
  if (lowGraphicsMode) {
    ctx.strokeStyle = groundColor;
    ctx.lineWidth = 2;
    ctx.strokeRect(groundOffset, HEIGHT - 80, WIDTH, 80);
    ctx.strokeRect(groundOffset + WIDTH, HEIGHT - 80, WIDTH, 80);
  } else {
    if (!rainEnabled && !desertMode && !snowMode) {
      // normal mode: grass bottom, dirt top
      ctx.fillStyle = groundColor;
      ctx.fillRect(groundOffset, HEIGHT - 80, WIDTH, 40);
      ctx.fillRect(groundOffset + WIDTH, HEIGHT - 80, WIDTH, 40);
      ctx.fillStyle = dirtColor;
      ctx.fillRect(groundOffset, HEIGHT - 40, WIDTH, 40);
      ctx.fillRect(groundOffset + WIDTH, HEIGHT - 40, WIDTH, 40);
    } else if (snowMode) {
      // snow mode: snow bottom, dirt top
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(groundOffset, HEIGHT - 80, WIDTH, 40);
      ctx.fillRect(groundOffset + WIDTH, HEIGHT - 80, WIDTH, 40);
      ctx.fillStyle = dirtColor;
      ctx.fillRect(groundOffset, HEIGHT - 40, WIDTH, 40);
      ctx.fillRect(groundOffset + WIDTH, HEIGHT - 40, WIDTH, 40);
    } else if (desertMode) {
      // desert or rain: solid
      ctx.fillStyle = groundColor;
      ctx.fillRect(groundOffset, HEIGHT - 80, WIDTH, 80);
      ctx.fillRect(groundOffset + WIDTH, HEIGHT - 80, WIDTH, 80);
    }
    else //rain mode : grass top dirt bottom//
         {
        ctx.fillStyle = groundColor;
        ctx.fillRect(groundOffset, HEIGHT - 80, WIDTH, 40);
        ctx.fillRect(groundOffset + WIDTH, HEIGHT - 80, WIDTH, 40);
        ctx.fillStyle = dirtColor;
        ctx.fillRect(groundOffset, HEIGHT - 40, WIDTH, 40);
        ctx.fillRect(groundOffset + WIDTH, HEIGHT - 40, WIDTH, 40);

    }
  }

  // weeds on ground (black dots, moving with ground)
  let weedColor = darkMode ? '#b2bec3' : '#34495e'; // light gray vs dark blue-gray
  if (desertMode) weedColor = darkMode ? '#fdcb6e' : '#e17055'; // sandy vs warm orange
  else if (snowMode) weedColor = '#ffffff'; // white for snow
  if (lowGraphicsMode) {
    ctx.strokeStyle = weedColor;
    ctx.lineWidth = 2;
    for (const weed of weeds) {
      ctx.strokeRect(weed.x + groundOffset, weed.y, 2, 2);
      ctx.strokeRect(weed.x + groundOffset + WIDTH, weed.y, 2, 2);
    }
  } else {
    ctx.fillStyle = weedColor;
    for (const weed of weeds) {
      ctx.fillRect(weed.x + groundOffset, weed.y, 2, 2);
      ctx.fillRect(weed.x + groundOffset + WIDTH, weed.y, 2, 2);
    }
  }

  // pipes
  for (const p of pipes) {
    const baseColor = p.isRed ? (darkMode ? '#d63031' : '#e17055') : (darkMode ? '#00cec9' : '#00b894');
    const capFill = p.isRed
      ? (darkMode ? '#ff9aa2' : '#ffd6cc')
      : (darkMode ? '#9af5dd' : '#ccffda');
    const capStroke = p.isRed
      ? (darkMode ? '#861c27' : '#c45a4d')
      : (darkMode ? '#0f8f79' : '#2f9d6b');
    if (lowGraphicsMode) {
      ctx.strokeStyle = baseColor;
      ctx.lineWidth = 2;
      // top pipe
      ctx.strokeRect(p.x, 0, PIPE_WIDTH, p.topHeight + p.offset);
      // bottom pipe
      ctx.strokeRect(
        p.x,
        p.topHeight + PIPE_GAP + p.offset,
        PIPE_WIDTH,
        HEIGHT - (p.topHeight + PIPE_GAP + p.offset) - 80
      );

      // pipe cap (simple)
      ctx.strokeStyle = capStroke;
      ctx.strokeRect(p.x, p.topHeight + p.offset - 10, PIPE_WIDTH, 10);
      ctx.strokeRect(p.x, p.topHeight + PIPE_GAP + p.offset, PIPE_WIDTH, 10);
    } else {
      ctx.fillStyle = baseColor;
      // top pipe
      ctx.fillRect(p.x, 0, PIPE_WIDTH, p.topHeight + p.offset);
      ctx.fillRect(p.x, p.topHeight + PIPE_GAP + p.offset, PIPE_WIDTH, HEIGHT - (p.topHeight + PIPE_GAP + p.offset) - 80);

      // pipe cap (simple)
      ctx.fillStyle = capFill;
      ctx.fillRect(p.x, p.topHeight + p.offset - 10, PIPE_WIDTH, 10);
      ctx.fillRect(p.x, p.topHeight + PIPE_GAP + p.offset, PIPE_WIDTH, 10);
      // add outline
      ctx.strokeStyle = capStroke;
      ctx.lineWidth = 1;
      ctx.strokeRect(p.x, p.topHeight + p.offset - 10, PIPE_WIDTH, 10);
      ctx.strokeRect(p.x, p.topHeight + PIPE_GAP + p.offset, PIPE_WIDTH, 10);
    }
  }

  // bird
  let wingFlap = Math.sin(frames * 0.3) * 1.5; // wing flapping animation
// ...
  ctx.save();
  ctx.translate(bird.x, bird.y);
  ctx.rotate(bird.rotation);
  // body - circle for prettier look
  if (lowGraphicsMode) {
    ctx.strokeStyle = easyMode ? (darkMode ? '#e84393' : '#fd79a8') : (darkMode ? '#fdcb6e' : '#feca57');
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, bird.radius, 0, Math.PI * 2);
    ctx.stroke();
  } else {
    ctx.fillStyle = easyMode ? (darkMode ? '#e84393' : '#fd79a8') : (darkMode ? '#fdcb6e' : '#feca57');
    ctx.beginPath();
    ctx.arc(0, 0, bird.radius, 0, Math.PI * 2);
    ctx.fill();
    // add black outline for visibility
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1;
    ctx.stroke();
    // add shine for prettier look
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(-3, -3, 3, 0, Math.PI);
    ctx.fill();
  }
  // tail for regular bird
  if (!easyMode) {
    if (lowGraphicsMode) {
      ctx.strokeStyle = easyMode ? (darkMode ? '#e84393' : '#fd79a8') : (darkMode ? '#fdcb6e' : '#feca57');
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(bird.radius, 0);
      ctx.lineTo(bird.radius + 6, -3);
      ctx.lineTo(bird.radius + 6, 3);
      ctx.closePath();
      ctx.stroke();
    } else {
      ctx.fillStyle = easyMode ? (darkMode ? '#e84393' : '#fd79a8') : (darkMode ? '#fdcb6e' : '#feca57');
      ctx.beginPath();
      ctx.moveTo(bird.radius, 0);
      ctx.lineTo(bird.radius + 6, -3);
      ctx.lineTo(bird.radius + 6, 3);
      ctx.closePath();
      ctx.fill();
      // add black outline for visibility
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }
  // wing - triangle for prettier look
  if (lowGraphicsMode) {
    ctx.strokeStyle = darkMode ? '#e17055' : '#ff7675'; // modern orange
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-8, 2 + wingFlap);
    ctx.lineTo(-2, 2 + wingFlap);
    ctx.lineTo(-5, 5 + wingFlap);
    ctx.closePath();
    ctx.stroke();
  } else {
    ctx.fillStyle = darkMode ? '#e17055' : '#ff7675'; // modern orange
    ctx.beginPath();
    ctx.moveTo(-8, 2 + wingFlap);
    ctx.lineTo(-2, 2 + wingFlap);
    ctx.lineTo(-5, 5 + wingFlap);
    ctx.closePath();
    ctx.fill();
    // add black outline for visibility
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  // beak or pacifier
  if (easyMode) {
    // baby pacifier
    if (lowGraphicsMode) {
      ctx.strokeStyle = darkMode ? '#e84393' : '#fd79a8'; // pink
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(17, -3, 5, 0, Math.PI * 2);
      ctx.stroke();
      // handle
      ctx.strokeStyle = darkMode ? '#b2bec3' : '#ffffff';
      ctx.strokeRect(20, -5, 2, 10);
    } else {
      ctx.fillStyle = darkMode ? '#e84393' : '#fd79a8'; // pink
      ctx.beginPath();
      ctx.arc(17, -3, 5, 0, Math.PI * 2);
      ctx.fill();
      // add black outline for visibility
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 1;
      ctx.stroke();
      // handle
      ctx.fillStyle = darkMode ? '#b2bec3' : '#ffffff';
      ctx.fillRect(20, -5, 2, 10);
      // add black outline for visibility
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 1;
      ctx.strokeRect(20, -5, 2, 10);
    }
  } else {
    if (lowGraphicsMode) {
      ctx.strokeStyle = darkMode ? '#d63031' : '#ffa726';
      ctx.lineWidth = 2;
      ctx.strokeRect(12, -3, 10, 6);
    } else {
      ctx.fillStyle = darkMode ? '#d63031' : '#ffa726';
      ctx.fillRect(12, -3, 10, 6);
      // add black outline for visibility
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 1;
      ctx.strokeRect(12, -3, 10, 6);
    }
  }
  // eye - circle for prettier look
  if (lowGraphicsMode) {
    ctx.strokeStyle = darkMode ? '#b2bec3' : '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(4, -4, 2, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = '#000';
    ctx.beginPath();
    ctx.arc(4, -4, 1, 0, Math.PI * 2);
    ctx.stroke();
  } else {
    ctx.fillStyle = darkMode ? '#b2bec3' : '#ffffff';
    ctx.beginPath();
    ctx.arc(4, -4, 2, 0, Math.PI * 2);
    ctx.fill();
    // add black outline for visibility
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(4, -4, 1, 0, Math.PI * 2);
    ctx.fill();
    // add black outline for visibility
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  ctx.restore();


  // Rain drops
  if (rainEnabled) {
    if (lowGraphicsMode) {
      ctx.strokeStyle = darkMode ? '#b2bec3' : '#5246f1';
      ctx.lineWidth = 2;
      for (const drop of raindrops) {
        ctx.strokeRect(drop.x, drop.y, 2, 10);
      }
    } else {
      ctx.fillStyle = darkMode ? '#b2bec3' : '#4f45f1';
      for (const drop of raindrops) {
        ctx.fillRect(drop.x, drop.y, 2, 10);
      }
    }
  }
}

function loop() {
  if (running) update();
  draw();
  requestAnimationFrame(loop);
}

// Input handlers
window.addEventListener('keydown', (e) => {
  if (inputDisabled) return;
  if (e.code === 'Space') {
    e.preventDefault();
    if (gameOver) {
      reset();
      running = true;
      message.style.display = 'none';
      if (musicEnabled) bgMusic.play();
    } else if (!running) {
      running = true;
      message.style.display = 'none';
      if (musicEnabled) bgMusic.play();
    }
    if (!gameOver) flap();
  }
});

canvas.addEventListener('mousedown', (e) => {
  if (inputDisabled) return;
  e.preventDefault();
  if (gameOver) {
    reset();
    running = true;
    message.style.display = 'none';
    if (musicEnabled) bgMusic.play();
  } else if (!running) {
    running = true;
    message.style.display = 'none';
    if (musicEnabled) bgMusic.play();
  }
  if (!gameOver) flap();
});

canvas.addEventListener('touchstart', (e) => {
  if (inputDisabled) return;
  e.preventDefault();
  if (gameOver) {
    reset();
    running = true;
    message.style.display = 'none';
    if (musicEnabled) bgMusic.play();
  } else if (!running) {
    running = true;
    message.style.display = 'none';
    if (musicEnabled) bgMusic.play();
  }
  if (!gameOver) flap();
}, { passive: false });

// Rain toggle
const rainToggle = document.getElementById('rainToggle');
rainToggle.addEventListener('change', () => {
  rainEnabled = rainToggle.checked;
  if (rainEnabled && sfxEnabled) {
    rainSound.currentTime = 0;
    rainSound.play();
  } else {
    rainSound.pause();
  }
});

// Fullscreen toggle
const fullscreenToggle = document.getElementById('fullscreenToggle');
const fullscreenTarget = document.documentElement;

function getFullscreenElement() {
  return document.fullscreenElement ||
    document.webkitFullscreenElement ||
    document.mozFullScreenElement ||
    document.msFullscreenElement ||
    null;
}

function requestFullscreen(element) {
  const request = element.requestFullscreen ||
    element.webkitRequestFullscreen ||
    element.mozRequestFullScreen ||
    element.msRequestFullscreen;
  if (!request) {
    return Promise.reject(new Error('Fullscreen API not supported'));
  }
  const result = request.call(element);
  if (result instanceof Promise) return result;
  return Promise.resolve();
}

function exitFullscreen() {
  const exit = document.exitFullscreen ||
    document.webkitExitFullscreen ||
    document.mozCancelFullScreen ||
    document.msExitFullscreen;
  if (!exit) {
    return Promise.reject(new Error('Fullscreen API not supported'));
  }
  const result = exit.call(document);
  if (result instanceof Promise) return result;
  return Promise.resolve();
}

function syncFullscreenState() {
  const active = Boolean(getFullscreenElement());
  document.body.classList.toggle('fullscreen-active', active);
  
  if (fullscreenToggle) {
    fullscreenToggle.checked = active;
  }
}

if (fullscreenToggle) {
  fullscreenToggle.addEventListener('change', () => {
    if (fullscreenToggle.checked) {
      requestFullscreen(fullscreenTarget).catch((err) => {
        console.error('Failed to enter fullscreen mode', err);
        fullscreenToggle.checked = false;
      });
    } else {
      exitFullscreen().catch((err) => {
        console.error('Failed to exit fullscreen mode', err);
        fullscreenToggle.checked = true;
      });
    }
  });
}

document.addEventListener('fullscreenchange', syncFullscreenState);
document.addEventListener('webkitfullscreenchange', syncFullscreenState);
document.addEventListener('mozfullscreenchange', syncFullscreenState);
document.addEventListener('MSFullscreenChange', syncFullscreenState);

syncFullscreenState();

// Easy mode toggle
const easyToggle = document.getElementById('easyToggle');
easyToggle.addEventListener('change', () => {
  easyMode = easyToggle.checked;
  currentPipeInterval = easyMode ? 225 : 90; // increase interval in easy mode
});

// Hard mode toggle
const hardModeToggle = document.getElementById('hardModeToggle');
hardMode = hardModeToggle.checked;
hardModeToggle.addEventListener('change', () => {
  hardMode = hardModeToggle.checked;
});

// Low graphics toggle
const lowGraphicsToggle = document.getElementById('lowGraphicsToggle');
lowGraphicsToggle.addEventListener('change', () => {
  lowGraphicsMode = lowGraphicsToggle.checked;
});

// Desert toggle
const desertToggle = document.getElementById('desertToggle');
desertToggle.addEventListener('change', () => {
  desertMode = desertToggle.checked;
  if (desertMode) snowMode = false; // disable snow if desert is enabled
  document.getElementById('snowToggle').checked = false;
});

// Snow toggle
const snowToggle = document.getElementById('snowToggle');
snowToggle.addEventListener('change', () => {
  snowMode = snowToggle.checked;
  if (snowMode) desertMode = false; // disable desert if snow is enabled
  document.getElementById('desertToggle').checked = false;
});

// Dark mode toggle
const darkModeToggle = document.getElementById('darkModeToggle');
document.body.classList.toggle('dark-mode', darkModeToggle.checked);
darkMode = darkModeToggle.checked;
darkModeToggle.addEventListener('change', () => {
  darkMode = darkModeToggle.checked;
  if (darkMode) {
    document.body.classList.add('dark-mode');
  } else {
    document.body.classList.remove('dark-mode');
  }
});

// Music toggle
const musicToggle = document.getElementById('musicToggle');
musicToggle.addEventListener('change', () => {
  musicEnabled = musicToggle.checked;
  if (musicEnabled && !gameOver) {
    bgMusic.currentTime = 0;
    bgMusic.play();
  } else {
    bgMusic.pause();
  }
});

// SFX toggle
const sfxToggle = document.getElementById('sfxToggle');
sfxToggle.addEventListener('change', () => {
  sfxEnabled = sfxToggle.checked;
  if (!sfxEnabled) {
    rainSound.pause();
  } else if (rainEnabled) {
    rainSound.currentTime = 0;
    rainSound.play();
  }
});

// Settings dropdown toggle
const settingsToggle = document.getElementById('settingsToggle');
const menu = document.getElementById('menu');
settingsToggle.addEventListener('click', () => {
  const isHidden = menu.hasAttribute('hidden');
  if (isHidden) {
    menu.removeAttribute('hidden');
  } else {
    menu.setAttribute('hidden', '');
  }
  settingsToggle.setAttribute('aria-expanded', (!isHidden).toString());
});

// init
reset();
loop();

// expose for debugging
window._game = { reset, flap };
