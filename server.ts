import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

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
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// In-Memory Storage (Replacing Database)
let users: any[] = [];
let projects: any[] = [];
let tasks: any[] = [];
let comments: any[] = [];
let notifications: any[] = [];
let attachments: any[] = [];

let nextIds = {
  users: 1,
  projects: 1,
  tasks: 1,
  comments: 1,
  notifications: 1,
  attachments: 1
};

// Seed Initial Data
const seedData = async () => {
  const adminPass = await bcrypt.hash('admin123', 10);
  const userPass = await bcrypt.hash('user123', 10);
  
  const admin = {
    id: nextIds.users++,
    name: 'System Admin',
    email: 'admin@amdox.com',
    password: adminPass,
    role: 'Admin'
  };
  users.push(admin);
  
  const sarah = {
    id: nextIds.users++,
    name: 'Sarah Chen',
    email: 'sarah@amdox.com',
    password: userPass,
    role: 'Editor'
  };
  users.push(sarah);

  const proj1 = {
    id: nextIds.projects++,
    name: 'Global Expansion',
    description: 'Strategic planning for new market entries in 2026.',
    owner_id: admin.id,
    created_at: new Date().toISOString()
  };
  projects.push(proj1);
  
  const proj2 = {
    id: nextIds.projects++,
    name: 'Product Redesign',
    description: 'Complete overhaul of the core user interface and experience.',
    owner_id: sarah.id,
    created_at: new Date().toISOString()
  };
  projects.push(proj2);

  tasks.push({
    id: nextIds.tasks++,
    project_id: proj1.id,
    title: 'Market Analysis',
    description: 'Research competitors in the SEA region.',
    status: 'Done',
    priority: 'High',
    assignee_id: admin.id,
    created_at: new Date().toISOString()
  });
  
  tasks.push({
    id: nextIds.tasks++,
    project_id: proj1.id,
    title: 'Legal Compliance',
    description: 'Review local regulations for data privacy.',
    status: 'In Progress',
    priority: 'Critical',
    assignee_id: sarah.id,
    created_at: new Date().toISOString()
  });
  
  tasks.push({
    id: nextIds.tasks++,
    project_id: proj2.id,
    title: 'User Interviews',
    description: 'Gather feedback from top 50 power users.',
    status: 'To Do',
    priority: 'Medium',
    assignee_id: sarah.id,
    created_at: new Date().toISOString()
  });

  notifications.push({
    id: nextIds.notifications++,
    user_id: sarah.id,
    content: 'Welcome to Amdox! You have been assigned to the Product Redesign project.',
    is_read: 0,
    created_at: new Date().toISOString()
  });
};
seedData();

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
  const { data: { user }, error } = await supabase.auth.getUser(token);
  
  if (user && !error) {
    let localUser = users.find(u => u.email === user.email);
    
    if (!localUser) {
      const name = user.user_metadata.name || user.email?.split('@')[0] || 'User';
      const role = user.user_metadata.role || 'Viewer';
      const avatar = user.user_metadata.avatar;
      
      localUser = {
        id: nextIds.users++,
        name,
        email: user.email,
        password: 'supabase-auth',
        role,
        avatar
      };
      users.push(localUser);
    }
    
    req.user = { id: localUser.id, email: localUser.email, role: localUser.role, name: localUser.name };
    return next();
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

// --- API Routes ---

// Auth
app.post('/api/auth/register', async (req, res) => {
  const { name, email, password, role } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = {
      id: nextIds.users++,
      name,
      email,
      password: hashedPassword,
      role: role || 'Viewer'
    };
    users.push(newUser);
    res.status(201).json({ id: newUser.id });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  const user = users.find(u => u.email === email);
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const token = jwt.sign({ id: user.id, email: user.email, role: user.role, name: user.name }, JWT_SECRET);
  res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role, avatar: user.avatar } });
});

app.get('/api/auth/me', authenticateToken, (req: any, res) => {
  const user = users.find(u => u.id === req.user.id);
  if (!user) return res.sendStatus(404);
  const { password, ...safeUser } = user;
  res.json(safeUser);
});

// Users
app.get('/api/users', authenticateToken, (req, res) => {
  const safeUsers = users.map(({ password, ...u }) => u);
  res.json(safeUsers);
});

// Projects
app.get('/api/projects', authenticateToken, (req, res) => {
  const sortedProjects = [...projects].sort((a, b) => 
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
  res.json(sortedProjects);
});

app.post('/api/projects', authenticateToken, (req: any, res) => {
  const { name, description } = req.body;
  const newProject = {
    id: nextIds.projects++,
    name,
    description,
    owner_id: req.user.id,
    created_at: new Date().toISOString()
  };
  projects.push(newProject);
  res.status(201).json(newProject);
});

// Tasks
app.get('/api/tasks', authenticateToken, (req, res) => {
  const { projectId } = req.query;
  let filteredTasks = tasks.map(t => {
    const assignee = users.find(u => u.id === t.assignee_id);
    return { ...t, assignee_name: assignee ? assignee.name : null };
  });
  
  if (projectId) {
    filteredTasks = filteredTasks.filter(t => t.project_id === Number(projectId));
  }
  
  filteredTasks.sort((a, b) => 
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
  
  res.json(filteredTasks);
});

app.post('/api/tasks', authenticateToken, (req, res) => {
  const { project_id, title, description, status, priority, assignee_id, due_date } = req.body;
  const newTask = {
    id: nextIds.tasks++,
    project_id: Number(project_id),
    title,
    description,
    status: status || 'To Do',
    priority: priority || 'Medium',
    assignee_id: assignee_id ? Number(assignee_id) : null,
    due_date,
    created_at: new Date().toISOString()
  };
  tasks.push(newTask);
  
  if (newTask.assignee_id) {
    const newNotif = {
      id: nextIds.notifications++,
      user_id: newTask.assignee_id,
      content: `You have been assigned to task: ${title}`,
      is_read: 0,
      created_at: new Date().toISOString()
    };
    notifications.push(newNotif);
    io.to(`user_${newTask.assignee_id}`).emit('notification', { content: newNotif.content });
  }

  res.status(201).json({ id: newTask.id });
});

app.patch('/api/tasks/:id', authenticateToken, (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  const taskIndex = tasks.findIndex(t => t.id === Number(id));
  
  if (taskIndex === -1) return res.sendStatus(404);
  
  tasks[taskIndex] = { ...tasks[taskIndex], ...updates };
  
  io.emit('task_updated', { id: Number(id), ...updates });
  res.json({ success: true });
});

app.delete('/api/tasks/:id', authenticateToken, (req, res) => {
  tasks = tasks.filter(t => t.id !== Number(req.params.id));
  res.json({ success: true });
});

// Comments
app.get('/api/tasks/:id/comments', authenticateToken, (req, res) => {
  const taskComments = comments
    .filter(c => c.task_id === Number(req.params.id))
    .map(c => {
      const user = users.find(u => u.id === c.user_id);
      return { ...c, user_name: user ? user.name : 'Unknown', user_avatar: user ? user.avatar : null };
    })
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  res.json(taskComments);
});

app.post('/api/tasks/:id/comments', authenticateToken, (req: any, res) => {
  const { content } = req.body;
  const newComment = {
    id: nextIds.comments++,
    task_id: Number(req.params.id),
    user_id: req.user.id,
    content,
    created_at: new Date().toISOString()
  };
  comments.push(newComment);
  
  const user = users.find(u => u.id === newComment.user_id);
  const commentWithUser = { ...newComment, user_name: user ? user.name : 'Unknown', user_avatar: user ? user.avatar : null };

  io.emit('new_comment', { taskId: req.params.id, comment: commentWithUser });
  res.status(201).json(commentWithUser);
});

// Notifications
app.get('/api/notifications', authenticateToken, (req: any, res) => {
  const userNotifs = notifications
    .filter(n => n.user_id === req.user.id)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  res.json(userNotifs);
});

app.patch('/api/notifications/:id/read', authenticateToken, (req, res) => {
  const notif = notifications.find(n => n.id === Number(req.params.id));
  if (notif) notif.is_read = 1;
  res.json({ success: true });
});

// Reports
app.get('/api/reports/stats', authenticateToken, (req, res) => {
  const statusCounts: any = {};
  const priorityCounts: any = {};
  
  tasks.forEach(t => {
    statusCounts[t.status] = (statusCounts[t.status] || 0) + 1;
    priorityCounts[t.priority] = (priorityCounts[t.priority] || 0) + 1;
  });
  
  const statusStats = Object.keys(statusCounts).map(status => ({ status, count: statusCounts[status] }));
  const priorityStats = Object.keys(priorityCounts).map(priority => ({ priority, count: priorityCounts[priority] }));
  
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
  
  const newAttachment = {
    id: nextIds.attachments++,
    task_id: Number(id),
    filename,
    original_name: originalname,
    mimetype,
    size,
    created_at: new Date().toISOString()
  };
  attachments.push(newAttachment);
  
  res.status(201).json(newAttachment);
});

app.get('/api/tasks/:id/attachments', authenticateToken, (req, res) => {
  const taskAttachments = attachments.filter(a => a.task_id === Number(req.params.id));
  res.json(taskAttachments);
});

// Profile Update
app.patch('/api/users/me', authenticateToken, (req: any, res) => {
  const { name, email, avatar } = req.body;
  const userIndex = users.findIndex(u => u.id === req.user.id);
  
  if (userIndex === -1) return res.status(404).json({ error: 'User not found' });

  if (name) users[userIndex].name = name;
  if (email) users[userIndex].email = email;
  if (avatar) users[userIndex].avatar = avatar;
  
  const { password, ...safeUser } = users[userIndex];
  res.json(safeUser);
});

export default app;

// --- Vite Integration ---
async function startServer() {
  if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }
  }

  if (!process.env.VERCEL) {
    httpServer.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }
}

startServer();
