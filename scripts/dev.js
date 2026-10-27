const { spawn } = require('child_process');

console.log('🚀 Starting RateFlow in Development Mode (Live Hot-Reload)...');
console.log('👉 Backend will run on:  http://localhost:5000');
console.log('👉 Frontend will run on: http://localhost:3000 (Instant UI Updates)\n');

const backend = spawn('npm', ['run', 'dev'], {
  cwd: 'backend',
  stdio: 'inherit',
  shell: true
});

const frontend = spawn('npm', ['run', 'dev'], {
  cwd: 'frontend',
  stdio: 'inherit',
  shell: true
});

const cleanup = () => {
  console.log('\nStopping development servers...');
  backend.kill();
  frontend.kill();
  process.exit();
};

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

