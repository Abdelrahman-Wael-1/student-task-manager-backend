// server.js
const express = require('express');
const cors = require('cors');
const { MongoClient, ObjectId } = require('mongodb');

const app = express();
app.use(cors());
app.use(express.json());

// ── MongoDB Connection ────────────────────────────────────
const MONGO_URI = 'mongodb+srv://abdowaelabdo_db_user:1h2hf6OrZV8t3gh3@cluster0.ro9conq.mongodb.net/?appName=Cluster0';
const DB_NAME = 'student_task_manager';

let db;

async function connectDB() {
  const client = new MongoClient(MONGO_URI);
  await client.connect();
  db = client.db(DB_NAME);
  console.log('✅ Connected to MongoDB Atlas');
}

function usersCol() { return db.collection('users'); }
function tasksCol() { return db.collection('tasks'); }

// ── ID counter helper ─────────────────────────────────────
async function nextId(collection) {
  const last = await collection.find().sort({ id: -1 }).limit(1).toArray();
  return last.length === 0 ? 1 : last[0].id + 1;
}

// ══════════════════════════════════════════════════════════
// AUTH ROUTES
// ══════════════════════════════════════════════════════════

// POST /api/auth/register
app.post('/api/auth/register', async (req, res) => {
  try {
    const { fullName, gender, email, studentId, academicLevel, password, profilePhotoPath } = req.body;

    if (!fullName || !email || !studentId || !password) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    const emailExists = await usersCol().findOne({ email: email.toLowerCase() });
    if (emailExists) {
      return res.status(409).json({ success: false, message: 'Email already registered' });
    }

    const idExists = await usersCol().findOne({ studentId });
    if (idExists) {
      return res.status(409).json({ success: false, message: 'Student ID already registered' });
    }

    const id = await nextId(usersCol());
    const newUser = {
      id,
      fullName,
      gender: gender || null,
      email: email.toLowerCase(),
      studentId,
      academicLevel: academicLevel || null,
      password,
      profilePhotoPath: profilePhotoPath || null,
    };

    await usersCol().insertOne(newUser);

    const { password: _, _id, ...userWithoutPassword } = newUser;
    res.status(201).json({ success: true, user: userWithoutPassword });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/auth/login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Missing email or password' });
    }

    const user = await usersCol().findOne({
      email: email.toLowerCase(),
      password,
    });

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const { password: _, _id, ...userWithoutPassword } = user;
    res.json({ success: true, user: userWithoutPassword });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/auth/user/:id
app.get('/api/auth/user/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const user = await usersCol().findOne({ id });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const { password: _, _id, ...userWithoutPassword } = user;
    res.json({ success: true, user: userWithoutPassword });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PUT /api/auth/user/:id
app.put('/api/auth/user/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const update = { ...req.body };
    delete update._id;

    const result = await usersCol().findOneAndUpdate(
      { id },
      { $set: update },
      { returnDocument: 'after' }
    );

    if (!result) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const { password: _, _id, ...userWithoutPassword } = result;
    res.json({ success: true, user: userWithoutPassword });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ══════════════════════════════════════════════════════════
// TASK ROUTES
// ══════════════════════════════════════════════════════════

// GET /api/tasks/:userId
app.get('/api/tasks/:userId', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const tasks = await tasksCol()
      .find({ userId })
      .sort({ createdAt: -1 })
      .toArray();

    const cleaned = tasks.map(({ _id, ...t }) => t);
    res.json({ success: true, tasks: cleaned });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/tasks
app.post('/api/tasks', async (req, res) => {
  try {
    const { userId, title, description, dueDate, priority, isCompleted, createdAt } = req.body;

    if (!userId || !title || !dueDate || !priority) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    const id = await nextId(tasksCol());
    const newTask = {
      id,
      userId,
      title,
      description: description || null,
      dueDate,
      priority,
      isCompleted: isCompleted || false,
      createdAt: createdAt || new Date().toISOString(),
    };

    await tasksCol().insertOne(newTask);
    const { _id, ...taskWithoutId } = newTask;
    res.status(201).json({ success: true, task: taskWithoutId });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PUT /api/tasks/:id
app.put('/api/tasks/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const update = { ...req.body };
    delete update._id;

    const result = await tasksCol().findOneAndUpdate(
      { id },
      { $set: update },
      { returnDocument: 'after' }
    );

    if (!result) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    const { _id, ...taskWithoutId } = result;
    res.json({ success: true, task: taskWithoutId });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// DELETE /api/tasks/:id
app.delete('/api/tasks/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const result = await tasksCol().deleteOne({ id });

    if (result.deletedCount === 0) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    res.json({ success: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ══════════════════════════════════════════════════════════
// START SERVER
// ══════════════════════════════════════════════════════════
const PORT = 3000;
connectDB().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Backend server running at http://localhost:${PORT}`);
  });
}).catch(err => {
  console.error('❌ Failed to connect to MongoDB:', err);
  process.exit(1);
});