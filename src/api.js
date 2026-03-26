// Web fetch API wrapper to replace Electron's IPC bridge seamlessly
window.navigateToAuth = () => window.location.href = 'auth.html';
window.navigateToLanding = () => window.location.href = 'landing.html';
window.navigateToAdminDashboard = () => window.location.href = 'admin-dashboard.html';
window.navigateToStudentDashboard = () => window.location.href = 'student-dashboard.html';

window.electronAPI = {
  invoke: async (channel, ...args) => {
    // Intercept client-side navigation
    if (channel === 'navigate-to') {
      const page = args[0];
      const pages = {
        'landing': 'landing.html',
        'auth': 'auth.html',
        'student-dashboard': 'student-dashboard.html',
        'admin-dashboard': 'admin-dashboard.html'
      };
      if (pages[page]) window.location.href = pages[page];
      return;
    }

    // Argument mapping logic
    let body = {};
    if (channel === 'login') {
      body = { email: args[0], password: args[1] };
    } else if (channel === 'get-current-user' || channel === 'validate-session' || channel === 'logout') {
      body = { token: args[0] };
    } else if (channel === 'create-user') {
      body = args[0];
    } else if (channel === 'get-all-students') {
      body = { gradeFilter: args[0], token: args[1] };

    } else if (channel === 'get-user-by-id') {
      body = { userId: args[0], token: args[1] };
    } else if (channel === 'update-student-grade') {
      body = { userId: args[0], grade: args[1] };
    } else if (channel === 'get-children') {
      body = { parentId: args[0] }; 
    } else if (channel === 'get-child' || channel === 'delete-child') {
      body = { childId: args[0] }; 
    } else if (channel === 'update-child') {
      body = { childId: args[0], updates: args[1] };
    } else if (channel === 'add-child') {
      body = { parentId: args[0], childName: args[1], grade: args[2] };

    } else if (channel === 'get-curriculum-topics') {
      body = { grade: args[0], quarter: args[1], token: args[2] };
    } else if (channel === 'get-quarters-for-grade') {
      body = { grade: args[0], token: args[1] };
    } else if (channel === 'get-student-topic-progress') {
      body = { userId: args[0], grade: args[1] };
    } else if (channel === 'update-student-topic-progress') {
      body = { userId: args[0], topicId: args[1], progressData: args[2] };
    } else if (channel === 'get-student-progress') {
      body = { userId: args[0] };
    } else if (channel === 'update-student-progress') {
      body = { userId: args[0], progressData: args[1] };
    } else if (channel === 'get-practice-sessions') {
      body = { userId: args[0] };
    } else if (channel === 'save-practice-session') {
      body = { userId: args[0], topicId: args[1], score: args[2], totalQuestions: args[3] };
    } else if (channel === 'get-daily-tasks') {
      body = { userId: args[0] };
    } else if (channel === 'complete-daily-task') {
      body = { taskId: args[0] };
    } else if (channel === 'get-user-achievements') {
      body = { userId: args[0] };
    } else if (channel === 'save-achievement') {
      body = { userId: args[0], achievementData: args[1] };
    } else if (channel === 'has-achievement') {
      body = { userId: args[0], achievementType: args[1] };
    } else if (channel === 'analyze-student-performance') {
      body = { userId: args[0], grade: args[1] };
    } else if (channel === 'recommend-learning-path') {
      body = { userId: args[0], grade: args[1] };
    } else if (channel === 'generate-curriculum-questions') {
      body = { topic: args[0], count: args[1], difficulty: args[2] };
    } else if (channel === 'request-password-reset') {
      body = { email: args[0] };
    } else if (channel === 'reset-password') {
      body = { token: args[0], newPassword: args[1] };
    }

    // Endpoint mapping
    const routeMap = {
      'login': '/api/auth/login',
      'logout': '/api/auth/logout',
      'validate-session': '/api/auth/validate',
      'request-password-reset': '/api/auth/request-password-reset',
      'reset-password': '/api/auth/reset-password',
      'get-current-user': '/api/auth/current-user',
      'create-user': '/api/users/create',
      'get-all-students': '/api/users/students',

      'get-user-by-id': '/api/users/by-id',
      'update-student-grade': '/api/users/update-grade',
      'get-children': '/api/children',
      'get-child': '/api/children/get', 
      'delete-child': '/api/children/delete', 
      'update-child': '/api/children/update', 
      'add-child': '/api/children/add',

      'get-curriculum-topics': '/api/curriculum/topics',
      'get-quarters-for-grade': '/api/curriculum/quarters',
      'generate-curriculum-questions': '/api/curriculum/generate',
      'get-student-topic-progress': '/api/progress/topic-progress',
      'update-student-topic-progress': '/api/progress/update-topic',
      'get-student-progress': '/api/progress/get',
      'update-student-progress': '/api/progress/update',
      'get-practice-sessions': '/api/practice/sessions',
      'save-practice-session': '/api/practice/save',
      'get-daily-tasks': '/api/tasks/daily',
      'complete-daily-task': '/api/tasks/complete',
      'get-user-achievements': '/api/achievements/get',
      'save-achievement': '/api/achievements/save',
      'has-achievement': '/api/achievements/has',
      'analyze-student-performance': '/api/ai/analyze',
      'recommend-learning-path': '/api/ai/recommend'
    };

    const path = routeMap[channel];
    if (!path) {
      console.error('Unknown channel: ' + channel);
      throw new Error('Unknown API channel: ' + channel);
    }

    // Detection logic for production vs development
    const isLocalDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    // If we're on localhost but on port 80 (WAMP), we still need the port 3000 backend.
    // Otherwise, we assume the backend serves the frontend from the same origin.
    const BASE_URL = (isLocalDevelopment && window.location.port !== '3000') 
      ? 'http://localhost:3000' 
      : window.location.origin;
    const fullPath = BASE_URL + path;
    
    try {
      const response = await fetch(fullPath, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      return await response.json();
    } catch (e) {
      console.error('API Fetch Error:', e);
      throw e;
    }
  }
};

window.auth = {
  getCurrentUser: async () => {
    const token = window.sessionStorage.getItem('sessionToken');
    if (!token) return null;
    const result = await window.electronAPI.invoke('get-current-user', token);
    return result.success ? result.user : null;
  },
  login: async (email, password) => {
    const result = await window.electronAPI.invoke('login', email, password);
    if (result.success && result.token) {
      window.sessionStorage.setItem('sessionToken', result.token);
    }
    return result;
  },
  logout: async () => {
    const token = window.sessionStorage.getItem('sessionToken');
    if (token) {
      await window.electronAPI.invoke('logout', token);
      window.sessionStorage.removeItem('sessionToken');
    }
    window.navigateToLanding();
  },
  validateSession: async () => {
    const token = window.sessionStorage.getItem('sessionToken');
    if (!token) return { valid: false };
    return await window.electronAPI.invoke('validate-session', token);
  },
  requestPasswordReset: async (email) => await window.electronAPI.invoke('request-password-reset', email),
  resetPassword: async (token, newPassword) => await window.electronAPI.invoke('reset-password', token, newPassword)
};
