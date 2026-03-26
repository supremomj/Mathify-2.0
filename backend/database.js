const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { seedCurriculumIfEmpty } = require('./auto-seed-curriculum');

// Use environment variable for database path in production (e.g. on Railway)
// Default to project root 'mathify.db' for local development
const dbPath = process.env.DATABASE_URL || process.env.DATABASE_PATH || path.join(__dirname, '../mathify.db');

let db = null;

// Initialize database
function initDatabase() {
  return new Promise((resolve, reject) => {
    db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('Error opening database:', err);
        reject(err);
        return;
      }
      console.log('Connected to SQLite database');

      // Check if migration is needed
      checkAndMigrate().then(() => {
        createTables().then(() => {
          // Auto-seed curriculum data if the table is empty (for fresh installs)
          seedCurriculumIfEmpty(db).then(() => {
            // Clean expired sessions on startup and periodically
            deleteExpiredSessions().catch(err => console.error('Error cleaning expired sessions:', err));
            setInterval(() => {
              deleteExpiredSessions().catch(err => console.error('Error cleaning expired sessions:', err));
            }, 3600000); // Every hour
            resolve();
          }).catch(err => {
            console.error('Error auto-seeding curriculum:', err);
            resolve(); // Don't block startup if seeding fails
          });
        }).catch(reject);
      }).catch(reject);
    });
  });
}

// Check and migrate database schema if needed
function checkAndMigrate() {
  return new Promise((resolve, reject) => {
    // Check if users table exists and has old schema
    db.get("SELECT sql FROM sqlite_master WHERE type='table' AND name='users'", [], (err, row) => {
      if (err) {
        reject(err);
        return;
      }

      // If table exists and has old schema (contains 'parent' in CHECK constraint)
      if (row && row.sql && row.sql.includes("'parent'")) {
        console.log('⚠️  Old database schema detected. Migrating...');

        db.serialize(() => {
          // Step 1: Create new table with updated schema
          db.run(`CREATE TABLE users_new (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            full_name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            user_type TEXT NOT NULL CHECK(user_type IN ('admin', 'student')),
            student_name TEXT,
            student_grade INTEGER,
            student_code TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )`, (err) => {
            if (err) {
              console.error('Error creating new users table:', err);
              reject(err);
              return;
            }

            // Step 2: Copy data, converting 'parent' to 'admin'
            db.run(`INSERT INTO users_new (id, full_name, email, password, user_type, student_name, student_grade, student_code, created_at)
                    SELECT id, full_name, email, password, 
                           CASE WHEN user_type = 'parent' THEN 'admin' ELSE user_type END,
                           student_name, student_grade, student_code, created_at
                    FROM users`, (err) => {
              if (err) {
                console.error('Error migrating data:', err);
                // Drop the new table if migration failed
                db.run('DROP TABLE IF EXISTS users_new', () => { });
                reject(err);
                return;
              }

              // Step 3: Drop old table
              db.run('DROP TABLE users', (err) => {
                if (err) {
                  console.error('Error dropping old table:', err);
                  reject(err);
                  return;
                }

                // Step 4: Rename new table
                db.run('ALTER TABLE users_new RENAME TO users', (err) => {
                  if (err) {
                    console.error('Error renaming table:', err);
                    reject(err);
                    return;
                  }

                  console.log('✅ Database migration completed successfully');
                  resolve();
                });
              });
            });
          });
        });
      } else {
        // No migration needed
        resolve();
      }
    });
  });
}

// Create tables
function createTables() {
  return new Promise((resolve, reject) => {
    const queries = [
      `CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        full_name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        user_type TEXT NOT NULL CHECK(user_type IN ('admin', 'student')),
        student_name TEXT,
        student_grade INTEGER,
        student_code TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS children (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        parent_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        grade INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (parent_id) REFERENCES users(id)
      )`,
      `CREATE TABLE IF NOT EXISTS sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        token TEXT UNIQUE NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        expires_at DATETIME NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )`,
      `CREATE TABLE IF NOT EXISTS curriculum_topics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        grade INTEGER NOT NULL,
        quarter INTEGER,
        topic_code TEXT NOT NULL,
        topic_title TEXT NOT NULL,
        description TEXT,
        learning_outcome TEXT NOT NULL,
        category TEXT,
        order_index INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(grade, topic_code)
      )`,
      `CREATE TABLE IF NOT EXISTS student_topic_progress (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        topic_id INTEGER NOT NULL,
        progress_percentage INTEGER DEFAULT 0,
        completed BOOLEAN DEFAULT 0,
        last_accessed DATETIME,
        best_score INTEGER,
        attempts INTEGER DEFAULT 0,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (topic_id) REFERENCES curriculum_topics(id) ON DELETE CASCADE,
        UNIQUE(user_id, topic_id)
      )`,
      `CREATE TABLE IF NOT EXISTS student_progress (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER UNIQUE NOT NULL,
        level INTEGER DEFAULT 1,
        coins INTEGER DEFAULT 0,
        streak_days INTEGER DEFAULT 0,
        total_lessons_completed INTEGER DEFAULT 0,
        current_lesson TEXT,
        current_lesson_progress INTEGER DEFAULT 0,
        last_active_date DATE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )`,
      `CREATE TABLE IF NOT EXISTS practice_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        topic_id INTEGER,
        score INTEGER,
        total_questions INTEGER,
        completed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (topic_id) REFERENCES curriculum_topics(id) ON DELETE CASCADE
      )`,

      `CREATE TABLE IF NOT EXISTS daily_tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        task_name TEXT NOT NULL,
        task_description TEXT,
        task_type TEXT,
        reward_stars INTEGER DEFAULT 0,
        reward_coins INTEGER DEFAULT 0,
        completed BOOLEAN DEFAULT 0,
        assigned_date DATE DEFAULT CURRENT_DATE,
        completed_date DATE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )`,
      `CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        token TEXT UNIQUE NOT NULL,
        expires_at DATETIME NOT NULL,
        used BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )`,
      `CREATE TABLE IF NOT EXISTS achievements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        achievement_type TEXT NOT NULL,
        achievement_title TEXT NOT NULL,
        achievement_message TEXT,
        earned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        topic_id INTEGER,
        session_id INTEGER,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (topic_id) REFERENCES curriculum_topics(id) ON DELETE SET NULL
      )`
    ];

    let completed = 0;
    queries.forEach((query, index) => {
      db.run(query, (err) => {
        if (err) {
          console.error(`Error creating table ${index}:`, err);
          reject(err);
          return;
        }
        completed++;
        if (completed === queries.length) {
          console.log('Database tables created successfully');
          resolve();
        }
      });
    });
  });
}

// Register new user
async function registerUser(userData) {
  return new Promise((resolve, reject) => {
    const { fullName, email, password, userType, studentName, studentGrade, studentCode } = userData;

    // Hash password
    bcrypt.hash(password, 10, (err, hashedPassword) => {
      if (err) {
        reject(err);
        return;
      }

      const query = `INSERT INTO users (full_name, email, password, user_type, student_name, student_grade, student_code)
                     VALUES (?, ?, ?, ?, ?, ?, ?)`;

      db.run(query, [
        fullName,
        email,
        hashedPassword,
        userType,
        studentName || null,
        studentGrade || null,
        studentCode || null
      ], function (err) {
        if (err) {
          if (err.message.includes('UNIQUE constraint failed')) {
            reject(new Error('Email already exists'));
          } else {
            reject(err);
          }
          return;
        }
        resolve({
          id: this.lastID,
          fullName,
          email,
          userType
        });
      });
    });
  });
}

// Login user with rate limiting
async function loginUser(email, password) {
  return new Promise((resolve, reject) => {
    // Check rate limiting first
    const rateLimitCheck = isRateLimited(email);
    if (!rateLimitCheck.allowed) {
      reject(new Error(rateLimitCheck.error));
      return;
    }

    const query = `SELECT id, full_name, email, password, user_type, student_name, student_grade 
                   FROM users WHERE email = ?`;

    db.get(query, [email], async (err, row) => {
      if (err) {
        reject(err);
        return;
      }

      if (!row) {
        // Record failed attempt
        recordLoginAttempt(email, false);
        reject(new Error('Invalid email or password'));
        return;
      }

      // Verify password
      bcrypt.compare(password, row.password, (err, isMatch) => {
        if (err) {
          reject(err);
          return;
        }

        if (!isMatch) {
          // Record failed attempt
          const attemptResult = recordLoginAttempt(email, false);
          if (attemptResult.warning) {
            reject(new Error(`Invalid email or password. ${attemptResult.warning}`));
          } else {
            reject(new Error(attemptResult.error || 'Invalid email or password'));
          }
          return;
        }

        // Record successful login
        recordLoginAttempt(email, true);

        // Return user data (without password)
        resolve({
          id: row.id,
          fullName: row.full_name,
          email: row.email,
          userType: row.user_type,
          studentName: row.student_name,
          studentGrade: row.student_grade
        });
      });
    });
  });
}

// Get user by ID
function getUserById(userId) {
  return new Promise((resolve, reject) => {
    const query = `SELECT id, full_name, email, user_type, student_name, student_grade 
                   FROM users WHERE id = ?`;

    db.get(query, [userId], (err, row) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(row);
    });
  });
}

// Get children for a parent
function getChildrenByParentId(parentId) {
  return new Promise((resolve, reject) => {
    const query = `SELECT id, name, grade, created_at FROM children WHERE parent_id = ? ORDER BY created_at DESC`;

    db.all(query, [parentId], (err, rows) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(rows || []);
    });
  });
}

// Get all students (for admin dashboard)
function getAllStudents(gradeFilter = null) {
  return new Promise((resolve, reject) => {
    let query = `SELECT id, full_name as name, student_grade as grade, email, created_at FROM users WHERE user_type = 'student'`;
    const params = [];

    if (gradeFilter !== null && gradeFilter !== undefined && gradeFilter !== '') {
      query += ` AND student_grade = ?`;
      params.push(parseInt(gradeFilter));
    }

    query += ` ORDER BY student_grade ASC, full_name ASC`;

    db.all(query, params, (err, rows) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(rows || []);
    });
  });
}



// Get only the logged-in student record for a student session
async function getOwnStudentRecord(token) {
  if (!token) return [];
  const session = await getSessionByToken(token);
  if (!session || session.user_type !== 'student') return [];

  return new Promise((resolve, reject) => {
    const query = `SELECT id, full_name as name, student_grade as grade, email, created_at 
                   FROM users WHERE id = ? AND user_type = 'student'`;
    db.get(query, [session.user_id], (err, row) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(row ? [row] : []);
    });
  });
}



// Get student user ID from children table (if linked)
function getStudentUserIdFromChild(childId) {
  return new Promise((resolve, reject) => {
    // First try to find user by matching name and grade from children
    const query = `
      SELECT u.id, u.full_name, u.student_grade 
      FROM children c
      JOIN users u ON u.full_name = c.name AND u.student_grade = c.grade
      WHERE c.id = ? AND u.user_type = 'student'
      LIMIT 1
    `;

    db.get(query, [childId], (err, row) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(row ? row.id : null);
    });
  });
}

// Add child to parent
function addChild(parentId, childName, grade) {
  return new Promise((resolve, reject) => {
    const query = `INSERT INTO children (parent_id, name, grade) VALUES (?, ?, ?)`;

    db.run(query, [parentId, childName, grade], function (err) {
      if (err) {
        reject(err);
        return;
      }
      resolve({
        id: this.lastID,
        name: childName,
        grade: grade
      });
    });
  });
}

// Get child by ID
function getChildById(childId) {
  return new Promise((resolve, reject) => {
    const query = `SELECT id, parent_id, name, grade, created_at FROM children WHERE id = ?`;
    db.get(query, [childId], (err, row) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(row || null);
    });
  });
}

// Delete child
function deleteChild(childId) {
  return new Promise((resolve, reject) => {
    const query = `DELETE FROM children WHERE id = ?`;
    db.run(query, [childId], function (err) {
      if (err) {
        reject(err);
        return;
      }
      if (this.changes === 0) {
        reject(new Error('Child not found'));
        return;
      }
      resolve({ success: true, changes: this.changes });
    });
  });
}

// Update child
function updateChild(childId, updates) {
  return new Promise((resolve, reject) => {
    const fields = [];
    const values = [];

    if (updates.name !== undefined) {
      fields.push('name = ?');
      values.push(updates.name);
    }
    if (updates.grade !== undefined) {
      fields.push('grade = ?');
      values.push(updates.grade);
    }

    if (fields.length === 0) {
      reject(new Error('No fields to update'));
      return;
    }

    values.push(childId);
    const query = `UPDATE children SET ${fields.join(', ')} WHERE id = ?`;

    db.run(query, values, function (err) {
      if (err) {
        reject(err);
        return;
      }
      if (this.changes === 0) {
        reject(new Error('Child not found'));
        return;
      }
      resolve({ success: true, changes: this.changes });
    });
  });
}

// Get curriculum topics by grade
function getCurriculumTopics(grade, quarter = null) {
  return new Promise((resolve, reject) => {
    let query = `SELECT * FROM curriculum_topics WHERE grade = ?`;
    const params = [grade];

    if (quarter !== null && quarter !== undefined) {
      query += ` AND quarter = ?`;
      params.push(quarter);
    }

    query += ` ORDER BY quarter ASC, order_index ASC, id ASC`;

    db.all(query, params, (err, rows) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(rows || []);
    });
  });
}

// Get quarters for a grade
function getQuartersForGrade(grade) {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT DISTINCT quarter 
      FROM curriculum_topics 
      WHERE grade = ? AND quarter IS NOT NULL
      ORDER BY quarter ASC
    `;
    db.all(query, [grade], (err, rows) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(rows.map(r => r.quarter) || []);
    });
  });
}

// Get student topic progress
function getStudentTopicProgress(userId, grade) {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT stp.*, ct.grade 
      FROM student_topic_progress stp
      JOIN curriculum_topics ct ON stp.topic_id = ct.id
      WHERE stp.user_id = ? AND ct.grade = ?
      ORDER BY ct.order_index ASC
    `;
    db.all(query, [userId, grade], (err, rows) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(rows || []);
    });
  });
}

// Update student topic progress
function updateStudentTopicProgress(userId, topicId, progressData) {
  return new Promise((resolve, reject) => {
    const { progressPercentage, completed, bestScore } = progressData;
    const query = `
      INSERT INTO student_topic_progress (user_id, topic_id, progress_percentage, completed, best_score, last_accessed, attempts)
      VALUES (?, ?, ?, ?, ?, datetime('now'), 1)
      ON CONFLICT(user_id, topic_id) DO UPDATE SET
        progress_percentage = MAX(progress_percentage, ?),
        completed = CASE WHEN ? = 1 THEN 1 ELSE completed END,
        best_score = MAX(COALESCE(best_score, 0), ?),
        last_accessed = datetime('now'),
        attempts = attempts + 1
    `;
    db.run(query, [userId, topicId, progressPercentage, completed ? 1 : 0, bestScore || progressPercentage, progressPercentage, completed ? 1 : 0, bestScore || progressPercentage], function (err) {
      if (err) {
        reject(err);
        return;
      }
      resolve({ success: true, changes: this.changes });
    });
  });
}

// Get or create student progress
function getStudentProgress(userId) {
  return new Promise((resolve, reject) => {
    const query = `SELECT * FROM student_progress WHERE user_id = ?`;
    db.get(query, [userId], (err, row) => {
      if (err) {
        reject(err);
        return;
      }
      if (!row) {
        // Create default progress
        const insertQuery = `INSERT INTO student_progress (user_id) VALUES (?)`;
        db.run(insertQuery, [userId], function (insertErr) {
          if (insertErr) {
            reject(insertErr);
            return;
          }
          // Return the newly created progress
          db.get(query, [userId], (getErr, newRow) => {
            if (getErr) {
              reject(getErr);
              return;
            }
            resolve(newRow);
          });
        });
      } else {
        resolve(row);
      }
    });
  });
}

// Update student progress
function updateStudentProgress(userId, progressData) {
  return new Promise((resolve, reject) => {
    const fields = [];
    const updateFields = [];
    const values = [];

    for (const [key, value] of Object.entries(progressData)) {
      fields.push(key);
      updateFields.push(`${key} = ?`);
      values.push(value);
    }

    const query = `
      INSERT INTO student_progress (user_id, ${fields.join(', ')})
      VALUES (?, ${fields.map(() => '?').join(', ')})
      ON CONFLICT(user_id) DO UPDATE SET ${updateFields.join(', ')}
    `;

    const allValues = [userId, ...values, ...values];
    db.run(query, allValues, function (err) {
      if (err) {
        reject(err);
        return;
      }
      resolve({ success: true, changes: this.changes });
    });
  });
}

// Get practice sessions
function getPracticeSessions(userId) {
  return new Promise((resolve, reject) => {
    const query = `SELECT * FROM practice_sessions WHERE user_id = ? ORDER BY completed_at DESC LIMIT 50`;
    db.all(query, [userId], (err, rows) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(rows || []);
    });
  });
}

// Save practice session
function savePracticeSession(userId, topicId, score, totalQuestions) {
  return new Promise((resolve, reject) => {
    const query = `INSERT INTO practice_sessions (user_id, topic_id, score, total_questions, completed_at) 
                   VALUES (?, ?, ?, ?, datetime('now'))`;
    db.run(query, [userId, topicId, score, totalQuestions], function (err) {
      if (err) {
        reject(err);
        return;
      }
      resolve({ success: true, id: this.lastID });
    });
  });
}

// Get daily tasks
function getDailyTasks(userId) {
  return new Promise((resolve, reject) => {
    const query = `SELECT * FROM daily_tasks WHERE user_id = ? AND assigned_date = date('now') ORDER BY id DESC`;
    db.all(query, [userId], (err, rows) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(rows || []);
    });
  });
}

// Complete daily task
function completeDailyTask(taskId) {
  return new Promise((resolve, reject) => {
    const query = `UPDATE daily_tasks SET completed = 1, completed_date = date('now') WHERE id = ?`;
    db.run(query, [taskId], function (err) {
      if (err) {
        reject(err);
        return;
      }
      resolve({ success: true, changes: this.changes });
    });
  });
}

// Update student grade
function updateStudentGrade(userId, grade) {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error('Database not initialized'));
      return;
    }

    // First verify the user exists and is a student
    const checkQuery = `SELECT id, user_type FROM users WHERE id = ?`;
    db.get(checkQuery, [userId], (err, row) => {
      if (err) {
        reject(err);
        return;
      }

      if (!row) {
        reject(new Error('User not found'));
        return;
      }

      if (row.user_type !== 'student') {
        reject(new Error('User is not a student'));
        return;
      }

      // Update the grade
      const updateQuery = `UPDATE users SET student_grade = ? WHERE id = ? AND user_type = 'student'`;
      db.run(updateQuery, [grade, userId], function (updateErr) {
        if (updateErr) {
          reject(updateErr);
          return;
        }

        if (this.changes === 0) {
          reject(new Error('Failed to update grade. User may not exist or is not a student.'));
          return;
        }

        resolve({ success: true, changes: this.changes });
      });
    });
  });
}

// Session Management Functions
function createSession(userId) {
  return new Promise((resolve, reject) => {
    // Generate secure random token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // 24 hour expiration

    const query = `INSERT INTO sessions (user_id, token, expires_at) VALUES (?, ?, ?)`;
    db.run(query, [userId, token, expiresAt.toISOString()], function (err) {
      if (err) {
        reject(err);
        return;
      }
      resolve({ token, expiresAt });
    });
  });
}

function getSessionByToken(token) {
  return new Promise((resolve, reject) => {
    const query = `SELECT s.id AS session_id, s.user_id, s.token, s.expires_at,
                          u.id AS user_id, u.full_name, u.email, u.user_type, u.student_name, u.student_grade 
                   FROM sessions s
                   JOIN users u ON s.user_id = u.id
                   WHERE s.token = ? AND s.expires_at > datetime('now')`;

    db.get(query, [token], (err, row) => {
      if (err) {
        reject(err);
        return;
      }
      if (!row) {
        resolve(null);
        return;
      }
      resolve({
        id: row.user_id,
        fullName: row.full_name,
        email: row.email,
        userType: row.user_type,
        user_type: row.user_type,
        studentName: row.student_name,
        studentGrade: row.student_grade,
        sessionId: row.session_id,
        token: row.token,
        expiresAt: row.expires_at
      });
    });
  });
}

function deleteSession(token) {
  return new Promise((resolve, reject) => {
    const query = `DELETE FROM sessions WHERE token = ?`;
    db.run(query, [token], function (err) {
      if (err) {
        reject(err);
        return;
      }
      resolve({ success: true });
    });
  });
}

function deleteExpiredSessions() {
  return new Promise((resolve, reject) => {
    const query = `DELETE FROM sessions WHERE expires_at < datetime('now')`;
    db.run(query, function (err) {
      if (err) {
        reject(err);
        return;
      }
      resolve({ deleted: this.changes });
    });
  });
}

function deleteUserSessions(userId) {
  return new Promise((resolve, reject) => {
    const query = `DELETE FROM sessions WHERE user_id = ?`;
    db.run(query, [userId], function (err) {
      if (err) {
        reject(err);
        return;
      }
      resolve({ success: true, deleted: this.changes });
    });
  });
}

// Rate Limiting Functions
const loginAttempts = new Map(); // In-memory store for login attempts

function recordLoginAttempt(email, success) {
  const key = email.toLowerCase();
  if (!loginAttempts.has(key)) {
    loginAttempts.set(key, { count: 0, lastAttempt: Date.now(), lockedUntil: null });
  }

  const attempt = loginAttempts.get(key);

  if (success) {
    // Reset on successful login
    loginAttempts.delete(key);
    return { allowed: true };
  }

  // Check if account is locked
  if (attempt.lockedUntil && Date.now() < attempt.lockedUntil) {
    const minutesLeft = Math.ceil((attempt.lockedUntil - Date.now()) / 60000);
    return {
      allowed: false,
      error: `Account temporarily locked. Try again in ${minutesLeft} minute(s).`,
      locked: true
    };
  }

  // Reset lock if expired
  if (attempt.lockedUntil && Date.now() >= attempt.lockedUntil) {
    attempt.count = 0;
    attempt.lockedUntil = null;
  }

  attempt.count++;
  attempt.lastAttempt = Date.now();

  // Lock after 5 failed attempts for 30 minutes
  if (attempt.count >= 5) {
    attempt.lockedUntil = Date.now() + (30 * 60 * 1000); // 30 minutes
    return {
      allowed: false,
      error: 'Too many failed login attempts. Account locked for 30 minutes.',
      locked: true
    };
  }

  const remainingAttempts = 5 - attempt.count;
  return {
    allowed: true,
    warning: remainingAttempts > 0 ? `${remainingAttempts} attempt(s) remaining before account lock.` : null
  };
}

function isRateLimited(email) {
  const key = email.toLowerCase();
  if (!loginAttempts.has(key)) {
    return { allowed: true };
  }

  const attempt = loginAttempts.get(key);
  if (attempt.lockedUntil && Date.now() < attempt.lockedUntil) {
    const minutesLeft = Math.ceil((attempt.lockedUntil - Date.now()) / 60000);
    return {
      allowed: false,
      error: `Account temporarily locked. Try again in ${minutesLeft} minute(s).`
    };
  }

  return { allowed: true };
}

// Clean up expired rate limit entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, attempt] of loginAttempts.entries()) {
    if (attempt.lockedUntil && now >= attempt.lockedUntil) {
      loginAttempts.delete(key);
    }
  }
}, 60000); // Check every minute

// Session cleanup is started inside initDatabase() after db is initialized

// Close database
function closeDatabase() {
  return new Promise((resolve, reject) => {
    if (db) {
      db.close((err) => {
        if (err) {
          reject(err);
          return;
        }
        console.log('Database connection closed');
        resolve();
      });
    } else {
      resolve();
    }
  });
}

// Password reset functions
function createPasswordResetToken(userId) {
  return new Promise((resolve, reject) => {
    // Generate secure random token
    const token = crypto.randomBytes(32).toString('hex');
    // Token expires in 1 hour
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    // Invalidate any existing tokens for this user
    db.run('UPDATE password_reset_tokens SET used = 1 WHERE user_id = ? AND used = 0', [userId], (err) => {
      if (err) {
        reject(err);
        return;
      }

      // Insert new token
      const query = `INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES (?, ?, ?)`;
      db.run(query, [userId, token, expiresAt], function (err) {
        if (err) {
          reject(err);
          return;
        }
        resolve({ id: this.lastID, token, expires_at: expiresAt });
      });
    });
  });
}

function validatePasswordResetToken(token) {
  return new Promise((resolve, reject) => {
    const query = `SELECT * FROM password_reset_tokens WHERE token = ? AND used = 0 AND expires_at > CURRENT_TIMESTAMP`;
    db.get(query, [token], (err, row) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(row);
    });
  });
}

function usePasswordResetToken(token) {
  return new Promise((resolve, reject) => {
    const query = `UPDATE password_reset_tokens SET used = 1 WHERE token = ?`;
    db.run(query, [token], function (err) {
      if (err) {
        reject(err);
        return;
      }
      resolve({ success: true, changes: this.changes });
    });
  });
}

function getUserByEmail(email) {
  return new Promise((resolve, reject) => {
    const query = `SELECT id, full_name, email, user_type, student_name, student_grade, student_code, created_at FROM users WHERE email = ?`;
    db.get(query, [email], (err, row) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(row);
    });
  });
}

function updateUserPassword(userId, newPassword) {
  return new Promise((resolve, reject) => {
    bcrypt.hash(newPassword, 10, (err, hashedPassword) => {
      if (err) {
        reject(err);
        return;
      }

      const query = `UPDATE users SET password = ? WHERE id = ?`;
      db.run(query, [hashedPassword, userId], function (err) {
        if (err) {
          reject(err);
          return;
        }
        resolve({ success: true, changes: this.changes });
      });
    });
  });
}

// Save achievement
function saveAchievement(userId, achievementData) {
  return new Promise((resolve, reject) => {
    const { achievementType, title, message, topicId, sessionId } = achievementData;
    const query = `INSERT INTO achievements (user_id, achievement_type, achievement_title, achievement_message, topic_id, session_id) 
                   VALUES (?, ?, ?, ?, ?, ?)`;
    db.run(query, [userId, achievementType, title, message || null, topicId || null, sessionId || null], function (err) {
      if (err) {
        reject(err);
        return;
      }
      resolve({ success: true, id: this.lastID });
    });
  });
}

// Get user achievements
function getUserAchievements(userId) {
  return new Promise((resolve, reject) => {
    const query = `SELECT * FROM achievements WHERE user_id = ? ORDER BY earned_at DESC`;
    db.all(query, [userId], (err, rows) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(rows || []);
    });
  });
}

// Check if user has specific achievement type
function hasAchievement(userId, achievementType) {
  return new Promise((resolve, reject) => {
    const query = `SELECT COUNT(*) as count FROM achievements WHERE user_id = ? AND achievement_type = ?`;
    db.get(query, [userId, achievementType], (err, row) => {
      if (err) {
        reject(err);
        return;
      }
      resolve((row && row.count > 0) || false);
    });
  });
}

// Create admin account (for initial setup)
function createAdminAccount(adminData) {
  return registerUser(adminData);
}

module.exports = {
  initDatabase,
  registerUser,
  createAdminAccount,
  loginUser,
  getUserById,
  getUserByEmail,
  getChildrenByParentId,
  getChildById,
  addChild,
  deleteChild,
  updateChild,
  getAllStudents,
  getOwnStudentRecord,
  getStudentUserIdFromChild,
  updateStudentGrade,
  getCurriculumTopics,
  getQuartersForGrade,
  getStudentTopicProgress,
  updateStudentTopicProgress,
  getStudentProgress,
  updateStudentProgress,
  getPracticeSessions,
  savePracticeSession,
  getDailyTasks,
  completeDailyTask,
  createSession,
  getSessionByToken,
  deleteSession,
  deleteExpiredSessions,
  deleteUserSessions,
  createPasswordResetToken,
  validatePasswordResetToken,
  usePasswordResetToken,
  updateUserPassword,
  recordLoginAttempt,
  isRateLimited,
  saveAchievement,
  getUserAchievements,
  hasAchievement,
  closeDatabase
};

