const mongoose = require('mongoose');
const Lesson = require('../models/Lesson');

const DEFAULT_LESSONS = [
  {
    title: 'Distributed Algorithms in Python',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    language: 'python',
    requiresPro: false,
    initialCode: `# CodeCast Lesson 1: Distributed Hashing & Ring Routing\nimport hashlib\n\ndef hash_node(key: str) -> int:\n    return int(hashlib.sha256(key.encode()).hexdigest(), 16) % 360\n\nfor node in ["edge-africa-1", "edge-eu-2", "edge-us-3"]:\n    print(f"{node} -> Ring Position {hash_node(node)}°")\n`,
    milestones: [
      {
        timestamp: 0,
        description: 'Consistent Hashing Ring Overview',
        targetCode: `# Milestone 1: Basic Hash Ring\nimport hashlib\n\ndef hash_node(key: str) -> int:\n    return int(hashlib.sha256(key.encode()).hexdigest(), 16) % 360\n\nprint("Ring initialized:", hash_node("edge-africa-1"))\n`,
      },
      {
        timestamp: 5,
        description: 'Implementing SHA-256 Node Mapping',
        targetCode: `# Milestone 2: Multi-Region Node Mapping\nimport hashlib\n\ndef hash_node(key: str) -> int:\n    return int(hashlib.sha256(key.encode()).hexdigest(), 16) % 360\n\nnodes = ["edge-africa-1", "edge-eu-2", "edge-us-3"]\nfor node in nodes:\n    print(f"{node} -> {hash_node(node)}°")\n`,
      },
      {
        timestamp: 10,
        description: 'Testing Node Distribution Output',
        targetCode: `# Milestone 3: Virtual Nodes & Load Distribution\nimport hashlib\n\ndef hash_node(key: str) -> int:\n    return int(hashlib.sha256(key.encode()).hexdigest(), 16) % 360\n\nfor node in ["edge-africa-1", "edge-eu-2", "edge-us-3"]:\n    for vnode in range(2):\n        pos = hash_node(f"{node}#v{vnode}")\n        print(f"{node}#v{vnode} -> Ring Position {pos}°")\n`,
      },
    ],
  },
  {
    title: 'High-Concurrency Event Loops in Node.js',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
    language: 'javascript',
    requiresPro: false,
    initialCode: `// CodeCast Lesson 2: Microtasks vs Macrotasks in Node.js\nconsole.log("1. Synchronous Start");\n\nsetTimeout(() => console.log("4. Macrotask (Timer)"), 0);\nPromise.resolve().then(() => console.log("3. Microtask (Promise)"));\n\nconsole.log("2. Synchronous End");\n`,
    milestones: [
      {
        timestamp: 0,
        description: 'Call Stack Execution Order',
        targetCode: `// Milestone 1: Synchronous Call Stack\nconsole.log("1. Synchronous Start");\nconsole.log("2. Synchronous End");\n`,
      },
      {
        timestamp: 4,
        description: 'Microtask Queue Priority',
        targetCode: `// Milestone 2: Promise Microtasks Run First\nconsole.log("1. Synchronous Start");\nPromise.resolve().then(() => console.log("3. Microtask (Promise)"));\nconsole.log("2. Synchronous End");\n`,
      },
      {
        timestamp: 9,
        description: 'Timer Phase & Event Loop Tick',
        targetCode: `// Milestone 3: Full Event Loop Tick\nconsole.log("1. Synchronous Start");\nsetTimeout(() => console.log("4. Macrotask (Timer)"), 0);\nPromise.resolve().then(() => console.log("3. Microtask (Promise)"));\nconsole.log("2. Synchronous End");\n`,
      },
    ],
  },
  {
    title: 'Zero-Cost Abstractions in Rust (Pro Masterclass)',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
    language: 'rust',
    requiresPro: true,
    initialCode: `// CodeCast Pro Masterclass: Ownership & Iterators in Rust\nfn main() {\n    let latencies = vec![12, 18, 9, 24, 15];\n    let avg: f64 = latencies.iter().sum::<i32>() as f64 / latencies.len() as f64;\n    println!("Average Edge Latency: {:.2}ms", avg);\n}\n`,
    milestones: [
      {
        timestamp: 0,
        description: 'Memory Safety Without GC',
        targetCode: `fn main() {\n    let latencies = vec![12, 18, 9, 24, 15];\n    println!("Samples: {:?}", latencies);\n}\n`,
      },
      {
        timestamp: 6,
        description: 'Borrowing & Slice Iterators',
        targetCode: `fn main() {\n    let latencies = vec![12, 18, 9, 24, 15];\n    let sum: i32 = latencies.iter().sum();\n    println!("Total Latency: {}ms", sum);\n}\n`,
      },
      {
        timestamp: 12,
        description: 'Compiling Zero-Overhead Loops',
        targetCode: `fn main() {\n    let latencies = vec![12, 18, 9, 24, 15];\n    let avg: f64 = latencies.iter().sum::<i32>() as f64 / latencies.len() as f64;\n    println!("Average Edge Latency: {:.2}ms", avg);\n}\n`,
      },
    ],
  },
];

const FALLBACK_LESSONS = DEFAULT_LESSONS.map((lesson, idx) => ({
  _id: `default-lesson-${idx + 1}`,
  ...lesson,
}));

exports.getLessons = async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(200).json({ lessons: FALLBACK_LESSONS, source: 'fallback' });
    }
    let lessons = await Lesson.find().sort({ createdAt: 1 });
    if (lessons.length === 0) {
      lessons = await Lesson.insertMany(DEFAULT_LESSONS);
    }
    return res.status(200).json({ lessons });
  } catch (error) {
    return res.status(200).json({ lessons: FALLBACK_LESSONS, source: 'fallback' });
  }
};

exports.getLessonById = async (req, res) => {
  try {
    const lesson = await Lesson.findById(req.params.id);
    if (!lesson) {
      return res.status(404).json({ message: 'Lesson not found.' });
    }
    return res.status(200).json({ lesson });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch lesson.', error: error.message });
  }
};

exports.createLesson = async (req, res) => {
  try {
    const { title, videoUrl, language, initialCode, milestones, requiresPro } = req.body;
    if (!title || !videoUrl || !language) {
      return res.status(400).json({ message: 'Title, videoUrl, and language are required.' });
    }

    const lesson = new Lesson({
      title,
      videoUrl,
      language,
      initialCode: initialCode || '',
      requiresPro: Boolean(requiresPro),
      milestones: Array.isArray(milestones) ? milestones : [],
    });

    await lesson.save();
    return res.status(201).json({ message: 'Lesson created successfully.', lesson });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to create lesson.', error: error.message });
  }
};
