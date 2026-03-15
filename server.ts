import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import Database from 'better-sqlite3';

dotenv.config();

const db = new Database('amdox.db');

// Initialize Database Schema
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT DEFAULT 'Viewer',
    avatar TEXT
  );

  CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    owner_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(owner_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'To Do',
    priority TEXT DEFAULT 'Medium',
    assignee_id INTEGER,
    due_date TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(project_id) REFERENCES projects(id),
    FOREIGN KEY(assignee_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id INTEGER,
    user_id INTEGER,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(task_id) REFERENCES tasks(id),
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    content TEXT NOT NULL,
    is_read INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS attachments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id INTEGER,
    filename TEXT NOT NULL,
    original_name TEXT NOT NULL,
    mimetype TEXT,
    size INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(task_id) REFERENCES tasks(id)
  );
`);

// Seed Initial Data if empty
const seedData = async () => {
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as any;
  if (userCount.count === 0) {
    const adminPass = await bcrypt.hash('admin123', 10);
    const userPass = await bcrypt.hash('user123', 10);
    
    const insertUser = db.prepare('INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)');
    const adminId = insertUser.run('System Admin', 'admin@amdox.com', adminPass, 'Admin').lastInsertRowid;
    const sarahId = insertUser.run('Sarah Chen', 'sarah@amdox.com', userPass, 'Editor').lastInsertRowid;

    const insertProject = db.prepare('INSERT INTO projects (name, description, owner_id) VALUES (?, ?, ?)');
    const proj1Id = insertProject.run('Global Expansion', 'Strategic planning for new market entries in 2026.', adminId).lastInsertRowid;
    const proj2Id = insertProject.run('Product Redesign', 'Complete overhaul of the core user interface and experience.', sarahId).lastInsertRowid;

    const insertTask = db.prepare('INSERT INTO tasks (project_id, title, description, status, priority, assignee_id) VALUES (?, ?, ?, ?, ?, ?)');
    insertTask.run(proj1Id, 'Market Analysis', 'Research competitors in the SEA region.', 'Done', 'High', adminId);
    insertTask.run(proj1Id, 'Legal Compliance', 'Review local regulations for data privacy.', 'In Progress', 'Critical', sarahId);
    insertTask.run(proj2Id, 'User Interviews', 'Gather feedback from top 50 power users.', 'To Do', 'Medium', sarahId);

    const insertNotif = db.prepare('INSERT INTO notifications (user_id, content) VALUES (?, ?)');
    insertNotif.run(sarahId, 'Welcome to Amdox! You have been assigned to the Product Redesign project.');
  }
};
seedData();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
  }
});

const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'amdox-secret-key-2026';

// Supabase Setup for Auth Verification
const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';

// Only create client if URL is provided to avoid crash
const supabase = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// Middleware
app.use(express.json());
app.use('/uploads', express.static('uploads'));

// Ensure uploads directory exists
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

// Auth Middleware
const authenticateToken = async (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.sendStatus(401);

  // Try Supabase Auth first
  if (supabase) {
    try {
      const { data: { user }, error } = await supabase.auth.getUser(token);
      
      if (user && !error) {
        let localUser = db.prepare('SELECT * FROM users WHERE email = ?').get(user.email) as any;
        
        if (!localUser) {
          const name = user.user_metadata.name || user.email?.split('@')[0] || 'User';
          const role = user.user_metadata.role || 'Viewer';
          const avatar = user.user_metadata.avatar;
          
          const id = db.prepare('INSERT INTO users (name, email, password, role, avatar) VALUES (?, ?, ?, ?, ?)')
            .run(name, user.email, 'supabase-auth', role, avatar).lastInsertRowid;
          
          localUser = { id, name, email: user.email, role, avatar };
        }
        
        req.user = { id: localUser.id, email: localUser.email, role: localUser.role, name: localUser.name };
        return next();
      }
    } catch (err) {
      console.error('Supabase auth error:', err);
    }
  }

  jwt.verify(token, JWT_SECRET, (err: any, decoded: any) => {
    if (err) return res.sendStatus(403);
    req.user = decoded;
    next();
  });
};

// Multer Setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });

// API routes go here
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Amdox API is running' });
});

// Auth
app.post('/api/auth/register', async (req, res) => {
  const { name, email, password, role } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = db.prepare('INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)')
      .run(name, email, hashedPassword, role || 'Viewer');
    res.status(201).json({ id: result.lastInsertRowid });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as any;
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const token = jwt.sign({ id: user.id, email: user.email, role: user.role, name: user.name }, JWT_SECRET);
  res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role, avatar: user.avatar } });
});

app.get('/api/auth/me', authenticateToken, (req: any, res) => {
  const user = db.prepare('SELECT id, name, email, role, avatar FROM users WHERE id = ?').get(req.user.id) as any;
  if (!user) return res.sendStatus(404);
  res.json(user);
});

// Users
app.get('/api/users', authenticateToken, (req, res) => {
  const allUsers = db.prepare('SELECT id, name, email, role, avatar FROM users').all();
  res.json(allUsers);
});

// Projects
app.get('/api/projects', authenticateToken, (req, res) => {
  const allProjects = db.prepare('SELECT * FROM projects ORDER BY created_at DESC').all();
  res.json(allProjects);
});

app.post('/api/projects', authenticateToken, (req: any, res) => {
  const { name, description } = req.body;
  const result = db.prepare('INSERT INTO projects (name, description, owner_id) VALUES (?, ?, ?)')
    .run(name, description, req.user.id);
  
  const newProject = db.prepare('SELECT * FROM projects WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(newProject);
});

// Tasks
app.get('/api/tasks', authenticateToken, (req, res) => {
  const { projectId } = req.query;
  let query = `
    SELECT t.*, u.name as assignee_name 
    FROM tasks t 
    LEFT JOIN users u ON t.assignee_id = u.id
  `;
  let params: any[] = [];

  if (projectId) {
    query += ' WHERE t.project_id = ?';
    params.push(Number(projectId));
  }

  query += ' ORDER BY t.created_at DESC';
  
  const filteredTasks = db.prepare(query).all(...params);
  res.json(filteredTasks);
});

app.post('/api/tasks', authenticateToken, (req, res) => {
  const { project_id, title, description, status, priority, assignee_id, due_date } = req.body;
  const result = db.prepare(`
    INSERT INTO tasks (project_id, title, description, status, priority, assignee_id, due_date)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    Number(project_id),
    title,
    description,
    status || 'To Do',
    priority || 'Medium',
    assignee_id ? Number(assignee_id) : null,
    due_date
  );
  
  const taskId = result.lastInsertRowid;

  if (assignee_id) {
    const content = `You have been assigned to task: ${title}`;
    db.prepare('INSERT INTO notifications (user_id, content) VALUES (?, ?)')
      .run(Number(assignee_id), content);
    
    io.to(`user_${assignee_id}`).emit('notification', { content });
  }

  res.status(201).json({ id: taskId });
});

app.patch('/api/tasks/:id', authenticateToken, (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  
  const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
  const params = [...Object.values(updates), Number(id)];
  
  db.prepare(`UPDATE tasks SET ${fields} WHERE id = ?`).run(...params);
  
  io.emit('task_updated', { id: Number(id), ...updates });
  res.json({ success: true });
});

app.delete('/api/tasks/:id', authenticateToken, (req, res) => {
  db.prepare('DELETE FROM tasks WHERE id = ?').run(Number(req.params.id));
  res.json({ success: true });
});

// Comments
app.get('/api/tasks/:id/comments', authenticateToken, (req, res) => {
  const taskComments = db.prepare(`
    SELECT c.*, u.name as user_name, u.avatar as user_avatar
    FROM comments c
    JOIN users u ON c.user_id = u.id
    WHERE c.task_id = ?
    ORDER BY c.created_at ASC
  `).all(Number(req.params.id));
  res.json(taskComments);
});

app.post('/api/tasks/:id/comments', authenticateToken, (req: any, res) => {
  const { content } = req.body;
  const result = db.prepare('INSERT INTO comments (task_id, user_id, content) VALUES (?, ?, ?)')
    .run(Number(req.params.id), req.user.id, content);
  
  const comment = db.prepare(`
    SELECT c.*, u.name as user_name, u.avatar as user_avatar
    FROM comments c
    JOIN users u ON c.user_id = u.id
    WHERE c.id = ?
  `).get(result.lastInsertRowid) as any;

  io.emit('new_comment', { taskId: req.params.id, comment });
  res.status(201).json(comment);
});

// Notifications
app.get('/api/notifications', authenticateToken, (req: any, res) => {
  const userNotifs = db.prepare('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC')
    .all(req.user.id);
  res.json(userNotifs);
});

app.patch('/api/notifications/:id/read', authenticateToken, (req, res) => {
  db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ?').run(Number(req.params.id));
  res.json({ success: true });
});

// Reports
app.get('/api/reports/stats', authenticateToken, (req, res) => {
  const statusStats = db.prepare('SELECT status, COUNT(*) as count FROM tasks GROUP BY status').all();
  const priorityStats = db.prepare('SELECT priority, COUNT(*) as count FROM tasks GROUP BY priority').all();
  res.json({ statusStats, priorityStats });
});

// Socket.io connection handling
io.on('connection', (socket) => {
  socket.on('join_user', (userId) => {
    socket.join(`user_${userId}`);
  });
});

// Attachments
app.post('/api/tasks/:id/attachments', authenticateToken, upload.single('file'), (req: any, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  
  const { id } = req.params;
  const { filename, originalname, mimetype, size } = req.file;
  
  const result = db.prepare(`
    INSERT INTO attachments (task_id, filename, original_name, mimetype, size)
    VALUES (?, ?, ?, ?, ?)
  `).run(Number(id), filename, originalname, mimetype, size);
  
  const newAttachment = db.prepare('SELECT * FROM attachments WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(newAttachment);
});

app.get('/api/tasks/:id/attachments', authenticateToken, (req, res) => {
  const taskAttachments = db.prepare('SELECT * FROM attachments WHERE task_id = ?').all(Number(req.params.id));
  res.json(taskAttachments);
});

// Profile Update
app.patch('/api/users/me', authenticateToken, (req: any, res) => {
  const { name, email, avatar } = req.body;
  
  const updates: string[] = [];
  const params: any[] = [];
  
  if (name) { updates.push('name = ?'); params.push(name); }
  if (email) { updates.push('email = ?'); params.push(email); }
  if (avatar) { updates.push('avatar = ?'); params.push(avatar); }
  
  if (updates.length > 0) {
    params.push(req.user.id);
    db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...params);
  }
  
  const safeUser = db.prepare('SELECT id, name, email, role, avatar FROM users WHERE id = ?').get(req.user.id);
  res.json(safeUser);
});

export default app;

// --- Vite Integration ---
async function startServer() {
  if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    
    httpServer.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } else if (!process.env.VERCEL) {
    // Production standalone (not Vercel)
    const distPath = path.join(process.cwd(), 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }
    
    httpServer.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }
}

startServer();
