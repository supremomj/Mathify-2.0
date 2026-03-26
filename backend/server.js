const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./database');
const RuleBasedAI = require('./rule-based-ai');
const CurriculumQuestionGenerator = require('./curriculum-question-generator');
const logger = require('./logger');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Serve static UI files
app.use(express.static(path.join(__dirname, '../src')));
app.use('/assets', express.static(path.join(__dirname, '../assets')));

// Default route routes to landing
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../src/landing.html'));
});

// Session cache
const activeSessions = new Map();

// Initialize database
db.initDatabase().then(async () => {
  logger.info('Database initialized successfully');
  try {
    const adminCheck = await db.getUserByEmail('admin@mathify.local');
    if (!adminCheck) {
      logger.info('Creating default admin account...');
      await db.createAdminAccount({
        fullName: 'Administrator',
        email: 'admin@mathify.local',
        password: 'Admin123!',
        userType: 'admin'
      });
      logger.warn('✅ Default admin account created successfully!');
    }
  } catch (err) {
    logger.error('Failed to check/create admin account', err);
  }
}).catch(err => {
  logger.error('Failed to initialize database', err);
});

// Auth Helper
async function getSession(token) {
  if (!token) return null;
  if (activeSessions.has(token)) return activeSessions.get(token);
  const session = await db.getSessionByToken(token);
  if (session) {
    activeSessions.set(token, session);
    return session;
  }
  return null;
}

// RESTful API Routes

// ---- Auth ----
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await db.loginUser(email, password);
    const session = await db.createSession(user.id);
    activeSessions.set(session.token, user);
    res.json({ success: true, user, token: session.token });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

app.post('/api/auth/logout', async (req, res) => {
  try {
    const { token } = req.body;
    if (token) {
      await db.deleteSession(token);
      activeSessions.delete(token);
    }
    res.json({ success: true });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

app.post('/api/auth/validate', async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.json({ valid: false });
    if (activeSessions.has(token)) return res.json({ valid: true, user: activeSessions.get(token) });
    const session = await db.getSessionByToken(token);
    if (session) {
      activeSessions.set(token, session);
      return res.json({ valid: true, user: session });
    }
    res.json({ valid: false });
  } catch (error) {
    res.json({ valid: false });
  }
});

app.post('/api/auth/current-user', async (req, res) => {
  try {
    const { token } = req.body;
    const session = await getSession(token);
    res.json({ success: !!session, user: session });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// ---- Users ----
app.post('/api/users/create', async (req, res) => {
  try {
    const userData = req.body;
    const token = userData.token || null;
    const session = await getSession(token);
    
    if (!session || (session.userType !== 'admin' && session.user_type !== 'admin')) {
      throw new Error('Unauthorized: Admin access required');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(userData.email)) throw new Error('Invalid email format');
    if (userData.password.length < 8) throw new Error('Password must be at least 8 characters long');

    const result = await db.registerUser(userData);

    res.json({ success: true, user: result });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

app.post('/api/users/students', async (req, res) => {
  try {
    const { gradeFilter, token } = req.body;
    const sessionInfo = await getSession(token);
    let scope = 'admin';
    let scopedGradeFilter = gradeFilter;

    if (sessionInfo && sessionInfo.user_type) {
      if (sessionInfo.user_type === 'student') {
        scope = 'student';
      }
    }

    let students;
    if (scope === 'student') students = await db.getOwnStudentRecord(token);
    else students = await db.getAllStudents(scopedGradeFilter);

    res.json({ success: true, students });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});



app.post('/api/users/by-id', async (req, res) => {
  try {
    const { userId } = req.body;
    const user = await db.getUserById(userId);
    if (user) {
      if (user.student_grade !== undefined) user.studentGrade = user.student_grade;
      res.json({ success: true, user });
    } else {
      res.json({ success: false, error: 'User not found' });
    }
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

app.post('/api/users/update-grade', async (req, res) => {
  try {
    const { userId, grade } = req.body;
    const result = await db.updateStudentGrade(userId, grade);
    res.json({ success: result.success, error: result.success ? null : 'Failed to update' });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// ---- Parent / Child ----
app.post('/api/children', async (req, res) => {
  try {
    const { parentId } = req.body;
    const children = await db.getChildrenByParentId(parentId);
    res.json({ success: true, children });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

app.post('/api/children/add', async (req, res) => {
  try {
    const { parentId, childName, grade } = req.body;
    const child = await db.addChild(parentId, childName, grade);
    res.json({ success: true, child });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

app.post('/api/children/get', async (req, res) => {
  try {
    const { childId } = req.body;
    const child = await db.getChildById(childId);
    if (!child) return res.json({ success: false, error: 'Child not found' });
    res.json({ success: true, child });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

app.post('/api/children/delete', async (req, res) => {
  try {
    const { childId } = req.body;
    const result = await db.deleteChild(childId);
    res.json(result);
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

app.post('/api/children/update', async (req, res) => {
  try {
    const { childId, updates } = req.body;
    const result = await db.updateChild(childId, updates);
    res.json(result);
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// ---- Password Reset ----
app.post('/api/auth/request-password-reset', async (req, res) => {
  try {
    const { email } = req.body;
    const user = await db.getUserByEmail(email);
    if (!user) {
      return res.json({ success: true, message: 'If an account exists with this email, a password reset link has been sent.' });
    }
    const tokenData = await db.createPasswordResetToken(user.id);
    res.json({ success: true, message: 'Password reset token generated.', token: tokenData.token });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (newPassword.length < 8) throw new Error('Password must be at least 8 characters long');
    const hasUpperCase = /[A-Z]/.test(newPassword);
    const hasLowerCase = /[a-z]/.test(newPassword);
    const hasNumber = /[0-9]/.test(newPassword);
    if (!hasUpperCase || !hasLowerCase || !hasNumber) throw new Error('Password must contain upper, lower and number');

    const tokenData = await db.validatePasswordResetToken(token);
    if (!tokenData) throw new Error('Invalid or expired reset token');

    await db.updateUserPassword(tokenData.user_id, newPassword);
    await db.usePasswordResetToken(token);
    await db.deleteUserSessions(tokenData.user_id);
    res.json({ success: true, message: 'Password reset successfully' });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// ---- Curriculum & Progress ----
app.post('/api/curriculum/topics', async (req, res) => {
  try {
    const { grade, quarter } = req.body;
    const actualQuarter = (quarter !== null && quarter !== undefined && typeof quarter === 'number') ? quarter : null;
    const topics = await db.getCurriculumTopics(grade, actualQuarter);
    res.json({ success: true, topics });
  } catch (error) {
    res.json({ success: false, error: error.message, topics: [] });
  }
});

app.post('/api/curriculum/quarters', async (req, res) => {
  try {
    const { grade } = req.body;
    const quarters = await db.getQuartersForGrade(grade);
    res.json({ success: true, quarters });
  } catch (error) {
    res.json({ success: false, error: error.message, quarters: [] });
  }
});

// Question Generation
app.post('/api/curriculum/generate', async (req, res) => {
  try {
    const { topic, count = 10, difficulty = 'medium' } = req.body;
    const generator = new CurriculumQuestionGenerator();
    const questions = generator.generateQuestionsForTopic(topic, count, 0, difficulty);
    res.json({ success: true, questions });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// Progress
app.post('/api/progress/topic-progress', async (req, res) => {
  try {
    const { userId, grade } = req.body;
    const progress = await db.getStudentTopicProgress(userId, grade);
    res.json({ success: true, progress });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

app.post('/api/progress/update-topic', async (req, res) => {
  try {
    const { userId, topicId, progressData } = req.body;
    const result = await db.updateStudentTopicProgress(userId, topicId, progressData);
    res.json(result);
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

app.post('/api/progress/get', async (req, res) => {
  try {
    const { userId } = req.body;
    const progress = await db.getStudentProgress(userId);
    res.json({ success: true, progress });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

app.post('/api/progress/update', async (req, res) => {
  try {
    const { userId, progressData } = req.body;
    const result = await db.updateStudentProgress(userId, progressData);
    res.json(result);
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// ---- Practice Sessions & Tasks ----
app.post('/api/practice/sessions', async (req, res) => {
  try {
    const { userId } = req.body;
    const sessions = await db.getPracticeSessions(userId);
    res.json({ success: true, sessions });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

app.post('/api/practice/save', async (req, res) => {
  try {
    const { userId, topicId, score, totalQuestions } = req.body;
    const result = await db.savePracticeSession(userId, topicId, score, totalQuestions);
    res.json(result);
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

app.post('/api/tasks/daily', async (req, res) => {
  try {
    const { userId } = req.body;
    const tasks = await db.getDailyTasks(userId);
    res.json({ success: true, tasks });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

app.post('/api/tasks/complete', async (req, res) => {
  try {
    const { taskId } = req.body;
    const result = await db.completeDailyTask(taskId);
    res.json(result);
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// ---- Achievements ----
app.post('/api/achievements/get', async (req, res) => {
  try {
    const { userId } = req.body;
    const achievements = await db.getUserAchievements(userId);
    res.json({ success: true, achievements });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

app.post('/api/achievements/save', async (req, res) => {
  try {
    const { userId, achievementData } = req.body;
    const result = await db.saveAchievement(userId, achievementData);
    res.json(result);
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

app.post('/api/achievements/has', async (req, res) => {
  try {
    const { userId, achievementType } = req.body;
    const has = await db.hasAchievement(userId, achievementType);
    res.json({ success: true, has });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// ---- AI Analysis ----
app.post('/api/ai/analyze', async (req, res) => {
  try {
    const { userId, grade } = req.body;
    const ai = new RuleBasedAI();
    const progressResult = await db.getStudentTopicProgress(userId, grade);
    const topicsResult = await db.getCurriculumTopics(grade);
    const analysis = ai.analyzeStudentPerformance({ grade, progress: progressResult || [] }, topicsResult || []);
    res.json(analysis);
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

app.post('/api/ai/recommend', async (req, res) => {
  try {
    const { userId, grade } = req.body;
    const ai = new RuleBasedAI();
    const progressResult = await db.getStudentTopicProgress(userId, grade);
    const topicsResult = await db.getCurriculumTopics(grade);
    const recommendations = ai.recommendLearningPath({ grade, progress: progressResult || [] }, topicsResult || []);
    res.json(recommendations);
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// ---- Start Server ----
app.listen(PORT, () => {
  logger.info(`Mathify Web Server running on http://localhost:${PORT}`);
});
