const Docker = require('dockerode');
const { v4: uuidv4 } = require('uuid');
const { execFile } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Detect Windows named pipe vs. Linux socket
const defaultSocketPath = process.platform === 'win32' ? '//./pipe/docker_engine' : '/var/run/docker.sock';
const dockerSocket = process.env.DOCKER_SOCKET || defaultSocketPath;
const docker = new Docker({ socketPath: dockerSocket });

const FREE_EXECUTION_TIMEOUT_MS = 3000;
const PRO_EXECUTION_TIMEOUT_MS = 10000;
const MEMORY_LIMIT_BYTES = 128 * 1024 * 1024;

const LANGUAGE_CONFIG = {
  python: {
    image: 'python:3.9-slim',
    buildCmd: (code) => ['python3', '-c', code],
    ext: 'py',
    requiresPro: false,
  },
  javascript: {
    image: 'node:18-alpine',
    buildCmd: (code) => ['node', '-e', code],
    ext: 'js',
    requiresPro: false,
  },
  typescript: {
    image: 'node:18-alpine',
    buildCmd: (code) => {
      const base64Code = Buffer.from(code, 'utf-8').toString('base64');
      const shellScript =
        "echo '" +
        base64Code +
        "' | base64 -d > main.ts && npx --yes ts-node main.ts";
      return ['sh', '-c', shellScript];
    },
    ext: 'ts',
    requiresPro: true,
  },
  cpp: {
    image: 'gcc:latest',
    buildCmd: (code) => {
      const base64Code = Buffer.from(code, 'utf-8').toString('base64');
      const shellScript =
        "echo '" +
        base64Code +
        "' | base64 -d > main.cpp && g++ main.cpp -o app && ./app";
      return ['bash', '-c', shellScript];
    },
    ext: 'cpp',
    requiresPro: true,
  },
  java: {
    image: 'openjdk:17-alpine',
    buildCmd: (code) => {
      const base64Code = Buffer.from(code, 'utf-8').toString('base64');
      const shellScript =
        "echo '" +
        base64Code +
        "' | base64 -d > Main.java && javac Main.java && java Main";
      return ['sh', '-c', shellScript];
    },
    ext: 'java',
    requiresPro: true,
  },
  go: {
    image: 'golang:1.20-alpine',
    buildCmd: (code) => {
      const base64Code = Buffer.from(code, 'utf-8').toString('base64');
      const shellScript =
        "echo '" +
        base64Code +
        "' | base64 -d > main.go && go run main.go";
      return ['sh', '-c', shellScript];
    },
    ext: 'go',
    requiresPro: true,
  },
  rust: {
    image: 'rust:1.70-alpine',
    buildCmd: (code) => {
      const base64Code = Buffer.from(code, 'utf-8').toString('base64');
      const shellScript =
        "echo '" +
        base64Code +
        "' | base64 -d > main.rs && rustc main.rs -o app && ./app";
      return ['sh', '-c', shellScript];
    },
    ext: 'rs',
    requiresPro: true,
  },
};

function streamToBuffers(container, stream) {
  return new Promise((resolve, reject) => {
    const stdoutChunks = [];
    const stderrChunks = [];

    try {
      docker.modem.demuxStream(
        stream,
        {
          write: (chunk) => stdoutChunks.push(chunk),
        },
        {
          write: (chunk) => stderrChunks.push(chunk),
        }
      );
    } catch (demuxErr) {
      reject(demuxErr);
      return;
    }

    stream.on('end', () => {
      resolve({
        stdout: Buffer.concat(stdoutChunks).toString('utf-8'),
        stderr: Buffer.concat(stderrChunks).toString('utf-8'),
      });
    });

    stream.on('error', (err) => {
      reject(err);
    });
  });
}

async function pullImageIfNeeded(image) {
  try {
    await docker.getImage(image).inspect();
    return;
  } catch (err) {
    // Image not present locally
  }

  await new Promise((resolve, reject) => {
    docker.pull(image, (pullErr, stream) => {
      if (pullErr) {
        reject(pullErr);
        return;
      }
      docker.modem.followProgress(stream, (progressErr, output) => {
        if (progressErr) {
          reject(progressErr);
          return;
        }
        resolve(output);
      });
    });
  });
}

async function forceRemoveContainer(container) {
  if (!container) return;
  try {
    await container.remove({ force: true });
  } catch (removeErr) {
    // Container may already be removed
  }
}

function cleanupFiles(files) {
  for (const filePath of files) {
    try {
      if (filePath && fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (e) {
      // Ignore cleanup errors
    }
  }
}

function runProcess(cmd, args, cwd, timeoutMs) {
  return new Promise((resolve) => {
    execFile(cmd, args, { cwd, timeout: timeoutMs, maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
      if (error && error.killed) {
        return resolve({
          stdout: stdout || '',
          stderr: `⏱️ Execution hardcapped and timed out after ${timeoutMs / 1000} seconds.`,
          exitCode: 124,
          timedOut: true,
        });
      }

      return resolve({
        stdout: stdout || '',
        stderr: stderr || (error ? error.message : ''),
        exitCode: error ? (typeof error.code === 'number' ? error.code : 1) : 0,
        timedOut: false,
      });
    });
  });
}

/**
 * Native execution fallback when Docker daemon is not active on host machine
 */
async function executeNativeFallback(normalizedLang, code, timeoutMs) {
  const tmpDir = os.tmpdir();
  const uniqueId = uuidv4().slice(0, 8);
  const config = LANGUAGE_CONFIG[normalizedLang];
  const isWin = process.platform === 'win32';
  const exeExt = isWin ? '.exe' : '';

  const createdFiles = [];

  try {
    if (normalizedLang === 'javascript') {
      const codeFile = path.join(tmpDir, `synapse_${uniqueId}.js`);
      fs.writeFileSync(codeFile, code, 'utf-8');
      createdFiles.push(codeFile);
      return await runProcess('node', [codeFile], tmpDir, timeoutMs);
    }

    if (normalizedLang === 'python') {
      const codeFile = path.join(tmpDir, `synapse_${uniqueId}.py`);
      fs.writeFileSync(codeFile, code, 'utf-8');
      createdFiles.push(codeFile);
      return await runProcess(isWin ? 'python' : 'python3', [codeFile], tmpDir, timeoutMs);
    }

    if (normalizedLang === 'typescript') {
      const codeFile = path.join(tmpDir, `synapse_${uniqueId}.ts`);
      fs.writeFileSync(codeFile, code, 'utf-8');
      createdFiles.push(codeFile);
      const npxCmd = isWin ? 'npx.cmd' : 'npx';
      return await runProcess(npxCmd, ['--yes', 'ts-node', codeFile], tmpDir, timeoutMs);
    }

    if (normalizedLang === 'cpp') {
      const codeFile = path.join(tmpDir, `synapse_${uniqueId}.cpp`);
      const binFile = path.join(tmpDir, `synapse_${uniqueId}${exeExt}`);
      fs.writeFileSync(codeFile, code, 'utf-8');
      createdFiles.push(codeFile, binFile);
      const compileRes = await runProcess('g++', [codeFile, '-o', binFile], tmpDir, timeoutMs);
      if (compileRes.exitCode !== 0) return compileRes;
      return await runProcess(binFile, [], tmpDir, timeoutMs);
    }

    if (normalizedLang === 'java') {
      const javaDir = path.join(tmpDir, `synapse_java_${uniqueId}`);
      fs.mkdirSync(javaDir, { recursive: true });
      const codeFile = path.join(javaDir, 'Main.java');
      const classFile = path.join(javaDir, 'Main.class');
      fs.writeFileSync(codeFile, code, 'utf-8');
      createdFiles.push(codeFile, classFile);
      try {
        const compileRes = await runProcess('javac', [codeFile], javaDir, timeoutMs);
        if (compileRes.exitCode !== 0) return compileRes;
        return await runProcess('java', ['-cp', javaDir, 'Main'], javaDir, timeoutMs);
      } finally {
        cleanupFiles(createdFiles);
        try {
          if (fs.existsSync(javaDir)) fs.rmSync(javaDir, { recursive: true, force: true });
        } catch (e) {}
      }
    }

    if (normalizedLang === 'go') {
      const codeFile = path.join(tmpDir, `synapse_${uniqueId}.go`);
      fs.writeFileSync(codeFile, code, 'utf-8');
      createdFiles.push(codeFile);
      return await runProcess('go', ['run', codeFile], tmpDir, timeoutMs);
    }

    if (normalizedLang === 'rust') {
      const codeFile = path.join(tmpDir, `synapse_${uniqueId}.rs`);
      const binFile = path.join(tmpDir, `synapse_${uniqueId}${exeExt}`);
      fs.writeFileSync(codeFile, code, 'utf-8');
      createdFiles.push(codeFile, binFile);
      const compileRes = await runProcess('rustc', [codeFile, '-o', binFile], tmpDir, timeoutMs);
      if (compileRes.exitCode !== 0) return compileRes;
      return await runProcess(binFile, [], tmpDir, timeoutMs);
    }

    return {
      stdout: '',
      stderr: `Unsupported fallback language: ${config.ext}`,
      exitCode: 1,
      timedOut: false,
    };
  } finally {
    cleanupFiles(createdFiles);
  }
}

/**
 * Execute code inside an isolated Docker container based on tier with self-healing local fallback
 * @param {string} language - python, javascript, typescript, cpp, java, go, rust
 * @param {string} code - Source code to execute
 * @param {boolean} isPro - User SaaS tier status
 */
async function executeCode(language, code, isPro = false) {
  const normalizedLang = (language || '').toLowerCase().trim();
  const config = LANGUAGE_CONFIG[normalizedLang];

  if (!config) {
    return {
      stdout: '',
      stderr: `Unsupported language: ${language}. Supported runtimes: Python, JavaScript, TypeScript, C++, Java, Go, and Rust.`,
      exitCode: 1,
      timedOut: false,
    };
  }

  if (config.requiresPro && !isPro) {
    return {
      stdout: '',
      stderr: `🔒 ${normalizedLang.toUpperCase()} container execution requires a SynapseCode Pro Subscription. Upgrade to Pro to unlock all 7 runtimes and 10s timeouts.`,
      exitCode: 403,
      timedOut: false,
    };
  }

  if (typeof code !== 'string' || code.trim().length === 0) {
    return {
      stdout: '',
      stderr: 'No code provided for execution.',
      exitCode: 1,
      timedOut: false,
    };
  }

  const timeoutMs = isPro ? PRO_EXECUTION_TIMEOUT_MS : FREE_EXECUTION_TIMEOUT_MS;
  const containerName = `synapse-exec-${uuidv4()}`;
  let container = null;
  let timedOut = false;
  let timeoutHandle = null;

  try {
    await pullImageIfNeeded(config.image);

    container = await docker.createContainer({
      name: containerName,
      Image: config.image,
      Cmd: config.buildCmd(code),
      Tty: false,
      AttachStdout: true,
      AttachStderr: true,
      NetworkDisabled: true,
      HostConfig: {
        Memory: MEMORY_LIMIT_BYTES,
        MemorySwap: MEMORY_LIMIT_BYTES,
        CpuShares: 512,
        PidsLimit: 64,
        AutoRemove: false,
        NetworkMode: 'none',
        ReadonlyRootfs: false,
        SecurityOpt: ['no-new-privileges'],
      },
    });

    const attachStream = await container.attach({
      stream: true,
      stdout: true,
      stderr: true,
    });

    const outputPromise = streamToBuffers(container, attachStream);

    await container.start();

    const timeoutPromise = new Promise((resolve) => {
      timeoutHandle = setTimeout(async () => {
        timedOut = true;
        try {
          await container.kill();
        } catch (killErr) {
          // Container already finished
        }
        resolve({ stdout: '', stderr: '', timedOutFlag: true });
      }, timeoutMs);
    });

    const waitPromise = container.wait().then(async (waitResult) => {
      const collected = await outputPromise;
      return { ...collected, statusCode: waitResult.StatusCode };
    });

    const result = await Promise.race([waitPromise, timeoutPromise]);

    if (timeoutHandle) clearTimeout(timeoutHandle);

    if (timedOut) {
      return {
        stdout: '',
        stderr: `⏱️ Execution hardcapped and timed out after ${timeoutMs / 1000} seconds (${isPro ? 'Pro Limit' : 'Free Tier Limit'}). Upgrade to Pro for extended limits.`,
        exitCode: 124,
        timedOut: true,
      };
    }

    return {
      stdout: result.stdout || '',
      stderr: result.stderr || '',
      exitCode: typeof result.statusCode === 'number' ? result.statusCode : 0,
      timedOut: false,
    };
  } catch (err) {
    if (
      err.code === 'ENOENT' ||
      err.code === 'ECONNREFUSED' ||
      err.code === 'EACCES' ||
      (err.message && err.message.includes('connect')) ||
      (err.message && err.message.includes('docker'))
    ) {
      console.log(`[EXEC] Docker unavailable (${err.message}). Using self-healing native execution fallback...`);
      return await executeNativeFallback(normalizedLang, code, timeoutMs);
    }

    return {
      stdout: '',
      stderr: `Execution engine message: ${err.message}`,
      exitCode: 1,
      timedOut: false,
    };
  } finally {
    if (timeoutHandle) clearTimeout(timeoutHandle);
    await forceRemoveContainer(container);
  }
}

module.exports = { executeCode };
