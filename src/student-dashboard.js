let currentUser = null;
    let studentProgress = null;

    // Load current user and initialize
    async function loadCurrentUser() {
      try {
        if (window.auth && window.auth.getCurrentUser) {
          const user = await window.auth.getCurrentUser();
          if (user) {
            currentUser = user;
            // Ensure studentGrade is set (handle both camelCase and snake_case)
            if (!currentUser.studentGrade && user.student_grade) {
              currentUser.studentGrade = user.student_grade;
            }
            // If still no grade, try to get it from database
            if (!currentUser.studentGrade && user.id) {
              try {
                const userResult = await window.electronAPI.invoke('get-user-by-id', user.id);
                if (userResult.success && userResult.user) {
                  currentUser.studentGrade = userResult.user.student_grade || userResult.user.studentGrade;
                }
              } catch (error) {
                console.error('Error fetching user grade:', error);
              }
            }
            const nameToUse = user.fullName || user.studentName || 'Student';
            const studentNameElements = document.querySelectorAll('#studentName');
            studentNameElements.forEach(el => {
              el.textContent = nameToUse;
            });
            
            const profileAvatar = document.getElementById('profileAvatar');
            if (profileAvatar) {
              profileAvatar.textContent = nameToUse.charAt(0).toUpperCase();
            }
            
            // Show grade modal if grade is missing
            if (!currentUser.studentGrade || currentUser.studentGrade === null || currentUser.studentGrade === undefined) {
              showGradeModal();
            } else {
              await loadStudentData();
            }
          } else {
            window.navigateToAuth();
          }
        }
      } catch (error) {
        console.error('Error loading current user:', error);
        window.navigateToAuth();
      }
    }

    // Show grade selection modal
    function showGradeModal() {
      const modal = document.getElementById('gradeModal');
      if (modal) {
        modal.classList.add('active');
      }
    }

    // Hide grade selection modal
    function hideGradeModal() {
      const modal = document.getElementById('gradeModal');
      if (modal) {
        modal.classList.remove('active');
      }
    }

    // Page navigation
    function switchPage(pageName) {
      // Feature 5: Trophy Case intercept
      if (pageName === 'trophycase') {
        renderTrophyCase();
        document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
        const navItem = document.querySelector('[data-page="trophycase"]');
        if (navItem) navItem.classList.add('active');
        return;
      }

      // Hide all pages
      document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
      });
      
      // Show selected page
      const targetPage = document.getElementById(`page-${pageName}`);
      if (targetPage) {
        targetPage.classList.add('active');
      }
      
      // Update nav items
      document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
      });
      
      const navItem = document.querySelector(`[data-page="${pageName}"]`);
      if (navItem) {
        navItem.classList.add('active');
      }
    }

    // Initialize navigation
    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', function() {
        const page = this.getAttribute('data-page');
        if (page) {
          switchPage(page);
        }
      });
    });

    // Save grade
    async function saveGrade() {
      const gradeSelect = document.getElementById('gradeSelect');
      const gradeError = document.getElementById('gradeError');
      const selectedGrade = gradeSelect.value;

      if (!selectedGrade) {
        showToast('Please select your grade', 'warning');
        return;
      }

      if (!currentUser || !currentUser.id) {
        showToast('User not found. Please log in again.', 'error');
        return;
      }

      try {
        console.log('Saving grade:', { userId: currentUser.id, grade: parseInt(selectedGrade) });
        const result = await window.auth.updateStudentGrade(currentUser.id, parseInt(selectedGrade));
        console.log('Grade save result:', result);
        if (result && result.success) {
          currentUser.studentGrade = parseInt(selectedGrade);
          hideGradeModal();
          showToast('Grade saved successfully!', 'success');
          await loadStudentData();
        } else {
          showToast((result && result.error) || 'Failed to save grade. Please try again.', 'error');
        }
      } catch (error) {
        console.error('Error saving grade:', error);
        showToast(error.message || 'An error occurred. Please try again.', 'error');
      }
    }
    
    // Toast Notification System
    window.showToast = function(message, type = 'error') {
      let container = document.getElementById('toast-container');
      if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
      }
      const toast = document.createElement('div');
      const icon = type === 'success' ? '✅' : type === 'warning' ? '⚠️' : '❌';
      const bgColor = type === 'success' ? 'var(--success)' : type === 'warning' ? 'var(--warning)' : '#ef4444';
      
      toast.className = 'toast';
      toast.style.cssText = `
        background: white;
        color: var(--text-primary);
        padding: 14px 20px;
        border-radius: 12px;
        box-shadow: 0 8px 24px rgba(0,0,0,0.12);
        display: flex;
        align-items: center;
        gap: 12px;
        font-weight: 500;
        font-size: 0.95rem;
        border-left: 4px solid ${bgColor};
        animation: slideInToast 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
        margin-top: 10px;
      `;
      
      toast.innerHTML = `<span style="font-size: 1.2rem;">${icon}</span><span>${message}</span>`;
      container.appendChild(toast);
      
      setTimeout(() => {
        toast.style.animation = 'fadeOutToast 0.3s ease forwards';
        setTimeout(() => toast.remove(), 300);
      }, 3500);
    };

    // Load student progress and data
    async function loadStudentData() {
      if (!currentUser) return;

      try {
        // Ensure we have the latest user data with grade
        if (!currentUser.studentGrade || currentUser.studentGrade === null || currentUser.studentGrade === undefined) {
          try {
            const userResult = await window.electronAPI.invoke('get-user-by-id', currentUser.id);
            if (userResult.success && userResult.user) {
              currentUser.studentGrade = userResult.user.studentGrade || userResult.user.student_grade;
              console.log('Updated student grade from database:', currentUser.studentGrade);
            }
          } catch (error) {
            console.error('Error fetching user grade:', error);
          }
        }

        // Update grade display
        if (currentUser.studentGrade) {
          const gradeDisplays = document.querySelectorAll('#studentGradeDisplay, #studentGradeDisplay2');
          gradeDisplays.forEach(el => {
            el.textContent = currentUser.studentGrade;
          });
        }

        // Load progress
        const progressResult = await window.electronAPI.invoke('get-student-progress', currentUser.id);
        if (progressResult.success) {
          studentProgress = progressResult.progress;
          updateProgressDisplay();
        }

        // Load daily tasks
        const tasksResult = await window.electronAPI.invoke('get-daily-tasks', currentUser.id);
        if (tasksResult.success) {
          displayDailyTasks(tasksResult.tasks);
        }

        // Load practice sessions for stats
        const sessionsResult = await window.electronAPI.invoke('get-practice-sessions', currentUser.id);
        
        // Load topic progress and curriculum topics (only if grade is set)
        let topicProgress = [];
        let curriculumTopics = [];
        if (currentUser.studentGrade) {
          try {
            const topicProgressResult = await window.electronAPI.invoke('get-student-topic-progress', currentUser.id, currentUser.studentGrade);
            const curriculumResult = await window.electronAPI.invoke('get-curriculum-topics', currentUser.studentGrade);
            
            topicProgress = topicProgressResult.success ? (topicProgressResult.progress || []) : [];
            curriculumTopics = curriculumResult.success ? (curriculumResult.topics || []) : [];
            
            console.log('Loaded curriculum data:', {
              grade: currentUser.studentGrade,
              topicsCount: curriculumTopics.length,
              progressCount: topicProgress.length
            });
          } catch (error) {
            console.error('Error loading curriculum data:', error);
          }
        } else {
          console.warn('Student grade not set. Cannot load curriculum topics.');
        }
        
        const sessions = sessionsResult.success ? (sessionsResult.sessions || []) : [];
        
        // Update stats with all available data (for dashboard + basic progress summary)
        updateStats(sessions, topicProgress, curriculumTopics);

        // Load detailed progress metrics for the Progress page
        updateDetailedProgress(topicProgress, curriculumTopics, sessions);

        // Load achievements for Achievements page
        loadAchievements();

        // Load learning path (curriculum-based)
        loadLearningPath();
        
        // Load AI recommendations
        loadAIRecommendations();
      } catch (error) {
        console.error('Error loading student data:', error);
      }
    }

    // Load AI recommendations using rule-based AI
    async function loadAIRecommendations() {
      if (!currentUser || !currentUser.studentGrade) return;

      try {
        const analysisResult = await window.electronAPI.invoke('analyze-student-performance', currentUser.id, currentUser.studentGrade);
        
        if (analysisResult.success && analysisResult.analysis) {
          displayAIRecommendations(analysisResult.analysis);
        }
      } catch (error) {
        console.error('Error loading AI recommendations:', error);
      }
    }

    // Display AI recommendations
    function displayAIRecommendations(analysis) {
      const container = document.getElementById('aiSuggestions');
      if (!container) return;

      // Show the container
      container.style.display = 'block';

      container.innerHTML = `
        <h3>Personalized Learning Recommendations</h3>
        
        ${analysis.summary ? `
          <div class="suggestion-item">
            <strong>📊 Performance Summary:</strong>
            <p>${analysis.summary}</p>
          </div>
        ` : ''}
        
        ${analysis.strengths && analysis.strengths.length > 0 ? `
          <div class="suggestion-item">
            <strong>⭐ Your Strengths:</strong>
            <ul style="margin-top: 10px; padding-left: 20px;">
              ${analysis.strengths.map(s => `<li>${s}</li>`).join('')}
            </ul>
          </div>
        ` : ''}
        
        ${analysis.weaknesses && analysis.weaknesses.length > 0 ? `
          <div class="suggestion-item">
            <strong>📈 Areas to Improve:</strong>
            <ul style="margin-top: 10px; padding-left: 20px;">
              ${analysis.weaknesses.map(w => `<li>${w}</li>`).join('')}
            </ul>
          </div>
        ` : ''}
        
        ${analysis.recommendedTopics && analysis.recommendedTopics.length > 0 ? `
          <div class="suggestion-item">
            <strong>🎯 Recommended Next Topics:</strong>
            <ul style="margin-top: 10px; padding-left: 20px;">
              ${analysis.recommendedTopics.map(t => `<li>${t}</li>`).join('')}
            </ul>
          </div>
        ` : ''}
        
        ${analysis.remedialActions && analysis.remedialActions.length > 0 ? `
          <div class="suggestion-item" style="background: #fff3cd; border-left-color: #ffc107;">
            <strong>💡 Remedial Actions:</strong>
            <ul style="margin-top: 10px; padding-left: 20px;">
              ${analysis.remedialActions.map(a => `<li>${a}</li>`).join('')}
            </ul>
          </div>
        ` : ''}
        
        ${analysis.difficultyAdjustment ? `
          <div class="suggestion-item" style="background: #d1ecf1; border-left-color: #0c5460;">
            <strong>⚙️ Difficulty Recommendation:</strong>
            <p style="margin-top: 5px;">${analysis.difficultyAdjustment}</p>
          </div>
        ` : ''}
      `;
    }

    // Update header and "Current Lesson" block on dashboard
    function updateProgressDisplay() {
      if (!studentProgress) return;

      // Update header stats
      const levelCountEl = document.getElementById('levelCount');
      const coinsCountEl = document.getElementById('coinsCount');
      const streakCountEl = document.getElementById('streakCount');
      
      if (levelCountEl) levelCountEl.textContent = studentProgress.level || 1;
      if (coinsCountEl) coinsCountEl.textContent = studentProgress.coins || 0;
      if (streakCountEl) streakCountEl.textContent = studentProgress.streak_days || 0;

      // Check if student is new (no current lesson)
      const isNewStudent = !studentProgress.current_lesson || studentProgress.current_lesson_progress === 0;
      
      // Update main action button
      const mainActionBtn = document.getElementById('mainActionBtn');
      if (mainActionBtn) {
        if (isNewStudent) {
          // New student - show Start Learning
          const actionTitle = mainActionBtn.querySelector('.action-title');
          const actionDesc = mainActionBtn.querySelector('.action-desc');
          if (actionTitle) actionTitle.textContent = 'Start Learning';
          if (actionDesc) actionDesc.textContent = 'Begin your math journey';
          mainActionBtn.onclick = continueLearning;
        } else {
          // Returning student - show Continue Learning
          const actionTitle = mainActionBtn.querySelector('.action-title');
          const actionDesc = mainActionBtn.querySelector('.action-desc');
          if (actionTitle) actionTitle.textContent = 'Continue Learning';
          if (actionDesc) actionDesc.textContent = 'Pick up where you left off';
          mainActionBtn.onclick = continueLearning;
        }
      }

      // Update current lesson section
      const currentLessonSection = document.getElementById('currentLessonSection');
      const currentLessonTitle = document.getElementById('currentLessonTitle');
      const currentLessonDesc = document.getElementById('currentLessonDesc');
      const currentLessonProgress = document.getElementById('currentLessonProgress');
      const currentLessonProgressText = document.getElementById('currentLessonProgressText');
      
      if (currentLessonSection) {
        if (isNewStudent) {
          currentLessonSection.style.display = 'none';
        } else {
          currentLessonSection.style.display = 'block';
          if (currentLessonTitle) {
            currentLessonTitle.textContent = studentProgress.current_lesson || 'No current lesson';
          }
          if (currentLessonDesc) {
            currentLessonDesc.textContent = 'Continue where you left off';
          }
          const progress = studentProgress.current_lesson_progress || 0;
          if (currentLessonProgress) {
            currentLessonProgress.style.setProperty('--target-width', progress + '%');
            // Adding a small delay class to trigger the animation
            currentLessonProgress.classList.remove('animated-fill');
            void currentLessonProgress.offsetWidth; // trigger reflow
            currentLessonProgress.classList.add('animated-fill');
          }
          if (currentLessonProgressText) {
            currentLessonProgressText.textContent = progress + '%';
          }
        }
      }
    }

    // Update the Progress tab metrics to reflect real student status
    function updateDetailedProgress(topicProgress, curriculumTopics, sessions) {
      const completionRateEl = document.getElementById('completionRate');
      const totalLessonsEl = document.getElementById('totalLessons');
      const avgScoreDetailEl = document.getElementById('avgScoreDetail');

      // Guard: if elements are missing, nothing to do
      if (!completionRateEl && !totalLessonsEl && !avgScoreDetailEl) return;

      const totalTopics = curriculumTopics ? curriculumTopics.length : 0;
      let completedCount = 0;

      if (topicProgress && topicProgress.length > 0) {
        completedCount = topicProgress.filter(p =>
          (p.completed === 1 || p.completed === true) ||
          (p.progress_percentage >= 100)
        ).length;
      }

      // Completion Rate = completed topics / total topics
      const completionRate = totalTopics > 0 ? Math.round((completedCount / totalTopics) * 100) : 0;

      if (completionRateEl) {
        completionRateEl.textContent = `${completionRate}%`;
      }

      if (totalLessonsEl) {
        totalLessonsEl.textContent = totalTopics;
      }

      // Average score detail – reuse same calculation as header stats
      let avgScore = 0;
      if (sessions && sessions.length > 0) {
        const totalScore = sessions.reduce((sum, s) => sum + (s.score || 0), 0);
        const totalQuestions = sessions.reduce((sum, s) => sum + (s.total_questions || 0), 0);
        avgScore = totalQuestions > 0 ? Math.round((totalScore / totalQuestions) * 100) : 0;
      } else if (topicProgress && topicProgress.length > 0) {
        const topicsWithScores = topicProgress.filter(p => p.best_score && p.best_score > 0);
        if (topicsWithScores.length > 0) {
          const totalScore = topicsWithScores.reduce((sum, p) => sum + (p.best_score || 0), 0);
          avgScore = Math.round(totalScore / topicsWithScores.length);
        }
      }

      if (avgScoreDetailEl) {
        avgScoreDetailEl.textContent = `${avgScore}%`;
      }
    }

    // Load and render achievements on the Achievements tab
    async function loadAchievements() {
      const container = document.querySelector('#page-achievements .achievements-grid');
      if (!currentUser || !container) return;

      try {
        const result = await window.electronAPI.invoke('get-user-achievements', currentUser.id);
        if (!result.success) {
          console.error('Error loading achievements:', result.error);
          return;
        }

        const achievements = result.achievements || [];

        if (achievements.length === 0) {
          container.innerHTML = `
            <div class="empty-state-card" style="text-align: center; padding: 3rem 2rem; background: var(--surface); border-radius: 24px; border: 2px dashed var(--border); margin: 1rem 0; width: 100%; grid-column: 1 / -1;">
              <div style="font-size: 3.5rem; margin-bottom: 1rem;">🏆</div>
              <h3 style="color: var(--text-primary); margin-bottom: 0.5rem; font-size: 1.25rem; font-weight: 700;">No Achievements Yet</h3>
              <p style="color: var(--text-secondary); font-size: 0.95rem;">Play quizzes and complete lessons to start unlocking exclusive trophies!</p>
            </div>
          `;
          return;
        }

        container.innerHTML = achievements.map(a => `
          <div class="achievement-card">
            <div class="achievement-icon">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"></path>
              </svg>
            </div>
            <h3 class="achievement-title">${a.title || 'Achievement'}</h3>
            <p class="achievement-desc">${a.message || ''}</p>
          </div>
        `).join('');
      } catch (error) {
        console.error('Error loading achievements:', error);
      }
    }

    // Display daily tasks
    function displayDailyTasks(tasks) {
      const container = document.getElementById('dailyTasks');
      if (tasks.length === 0) {
        container.innerHTML = `
          <div class="empty-state-card" style="text-align: center; padding: 3rem 2rem; background: var(--surface); border-radius: 24px; border: 2px dashed var(--border); margin: 1rem 0;">
            <div style="font-size: 3.5rem; margin-bottom: 1rem;">🌟</div>
            <h3 style="color: var(--text-primary); margin-bottom: 0.5rem; font-size: 1.25rem; font-weight: 700;">You're all caught up!</h3>
            <p style="color: var(--text-secondary); font-size: 0.95rem;">No tasks for today. Check back tomorrow for more challenges and rewards!</p>
          </div>
        `;
        return;
      }

      container.innerHTML = tasks.map(task => `
        <div class="task-item ${task.completed ? 'completed' : ''}">
          <div class="task-info">
            <h4>${task.task_name}</h4>
            <p>${task.task_description || ''}</p>
          </div>
          <div style="display: flex; align-items: center; gap: 15px;">
            ${task.reward_stars > 0 || task.reward_coins > 0 ? `
              <div style="display: flex; gap: 10px;">
                ${task.reward_stars > 0 ? `<span style="color: var(--warning);">⭐ ${task.reward_stars}</span>` : ''}
                ${task.reward_coins > 0 ? `<span style="color: var(--warning);">🪙 ${task.reward_coins}</span>` : ''}
              </div>
            ` : ''}
            ${!task.completed ? `
              <button class="task-btn" onclick="completeTask(${task.id})">Complete</button>
            ` : `
              <span style="color: var(--success); font-weight: bold;">✓ Done</span>
            `}
          </div>
        </div>
      `).join('');
    }

    // Load learning path based on curriculum (organized by quarters)
    async function loadLearningPath() {
      const container = document.getElementById('learningPathLessons');
      if (!container) return;
      
      container.innerHTML = '<p style="color: #666;">Loading your learning path...</p>';

      // Ensure we have the latest user data with grade
      if (currentUser && currentUser.id && (!currentUser.studentGrade || currentUser.studentGrade === null || currentUser.studentGrade === undefined)) {
        try {
          const userResult = await window.electronAPI.invoke('get-user-by-id', currentUser.id);
          if (userResult.success && userResult.user) {
            currentUser.studentGrade = userResult.user.studentGrade;
          }
        } catch (error) {
          console.error('Error fetching user grade:', error);
        }
      }

      if (!currentUser || !currentUser.studentGrade) {
        container.innerHTML = `
          <div class="empty-state-card" style="text-align: center; padding: 3rem 2rem; background: var(--surface); border-radius: 24px; border: 2px dashed var(--border); margin: 1rem 0;">
            <div style="font-size: 3.5rem; margin-bottom: 1rem;">📚</div>
            <h3 style="color: var(--text-primary); margin-bottom: 0.5rem; font-size: 1.25rem; font-weight: 700;">Grade Not Set</h3>
            <p style="color: var(--text-secondary); font-size: 0.95rem;">Please set your grade level to see your personalized learning path.</p>
          </div>
        `;
        return;
      }

      console.log('Loading learning path for grade:', currentUser.studentGrade);

      try {
        // Get curriculum topics for student's grade
        const result = await window.electronAPI.invoke('get-curriculum-topics', currentUser.studentGrade);
        
        console.log('Curriculum topics result:', {
          success: result.success,
          topicsCount: result.topics ? result.topics.length : 0,
          error: result.error,
          grade: currentUser.studentGrade
        });
        
        if (!result.success) {
          container.innerHTML = `<p style="color: #fc8181;">Error loading curriculum: ${result.error || 'Unknown error'}. Please contact your teacher.</p>`;
          return;
        }
        
        if (!result.topics || result.topics.length === 0) {
          container.innerHTML = `
            <div class="empty-state-card" style="text-align: center; padding: 3rem 2rem; background: var(--surface); border-radius: 24px; border: 2px dashed var(--border); margin: 1rem 0;">
              <div style="font-size: 3.5rem; margin-bottom: 1rem;">🚧</div>
              <h3 style="color: var(--text-primary); margin-bottom: 0.5rem; font-size: 1.25rem; font-weight: 700;">Coming Soon!</h3>
              <p style="color: var(--text-secondary); font-size: 0.95rem;">No curriculum topics found for Grade ${currentUser.studentGrade}. Your learning path is being prepared.</p>
            </div>
          `;
          return;
        }

        // Get quarters for this grade
        const quartersResult = await window.electronAPI.invoke('get-quarters-for-grade', currentUser.studentGrade);
        const quarters = quartersResult.success ? (quartersResult.quarters || []) : [];

        // Get student's progress for these topics
        const progressResult = await window.electronAPI.invoke('get-student-topic-progress', currentUser.id, currentUser.studentGrade);
        const progressMap = {};
        if (progressResult.success && progressResult.progress) {
          progressResult.progress.forEach(p => {
            progressMap[p.topic_id] = p;
          });
        }

        // Group topics by quarter
        const topicsByQuarter = {};
        result.topics.forEach(topic => {
          const quarter = topic.quarter || 'unassigned';
          if (!topicsByQuarter[quarter]) {
            topicsByQuarter[quarter] = [];
          }
          topicsByQuarter[quarter].push(topic);
        });

        // Build HTML grouped by quarters
        let html = '';
        
        if (quarters.length > 0) {
          // Display by quarters
          quarters.forEach(quarter => {
            const quarterTopics = topicsByQuarter[quarter] || [];
            if (quarterTopics.length === 0) return;

            // Calculate quarter progress
            let quarterCompleted = 0;
            let quarterTotal = quarterTopics.length;
            quarterTopics.forEach(topic => {
              const progress = progressMap[topic.id];
              if (progress && progress.completed) {
                quarterCompleted++;
              }
            });
            const quarterProgress = Math.round((quarterCompleted / quarterTotal) * 100);

            html += `
              <div class="quarter-section" style="margin-bottom: 2rem;">
                <div class="quarter-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; padding: 1rem; background: rgba(99, 102, 241, 0.1); border-radius: 12px; border-left: 4px solid var(--primary);">
                  <h3 style="margin: 0; color: var(--primary); font-size: 1.25rem;">Quarter ${quarter}</h3>
                  <div style="display: flex; align-items: center; gap: 1rem;">
                    <span style="color: #666; font-size: 0.9rem;">${quarterCompleted}/${quarterTotal} quizzes completed</span>
                    <div style="width: 100px; height: 8px; background: rgba(255,255,255,0.1); border-radius: 4px; overflow: hidden;">
                      <div style="width: ${quarterProgress}%; height: 100%; background: var(--primary); transition: width 0.3s;"></div>
                    </div>
                    <span style="color: var(--primary); font-weight: 600;">${quarterProgress}%</span>
                  </div>
                </div>
                <div class="quarter-topics" style="display: grid; gap: 1rem;">
                  ${quarterTopics.map(topic => {
                    const progress = progressMap[topic.id] || { progress_percentage: 0, completed: false };
                    const progressPercent = progress.progress_percentage || 0;
                    const isCompleted = progress.completed || false;
                    
                    return `
                      <div class="path-item ${isCompleted ? 'completed' : ''}" style="padding: 1rem; background: rgba(255,255,255,0.05); border-radius: 8px; border: 1px solid rgba(255,255,255,0.1);">
                        <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 0.5rem;">
                          <h4 style="margin: 0; font-size: 1rem; color: var(--text-primary);">${topic.topic_title}</h4>
                          ${isCompleted ? '<span style="color: #10b981; font-size: 1.2rem;">✓</span>' : ''}
                        </div>
                        <p style="margin: 0.5rem 0; color: #999; font-size: 0.9rem;">${topic.learning_outcome}</p>
                        ${topic.category ? `<span style="background: ${getCategoryBg(topic.category)}; color: ${getCategoryText(topic.category)}; border: 1px solid ${getCategoryBorder(topic.category)}; padding: 4px 12px; border-radius: 8px; font-size: 0.85rem; display: inline-block; margin-bottom: 0.5rem; font-weight: 500;">${topic.category}</span>` : ''}
                        <div class="lesson-progress" style="margin-top: 0.5rem;">
                          <div class="progress-bar" style="width: 100%; height: 6px; background: rgba(255,255,255,0.1); border-radius: 3px; overflow: hidden;">
                            <div class="progress-fill animated-fill" style="--target-width: ${progressPercent}%; height: 100%; background: var(--primary);"></div>
                          </div>
                          <span class="progress-text" style="font-size: 0.85rem; color: #999; margin-top: 0.25rem; display: block;">${progressPercent}% Complete</span>
                        </div>
                      </div>
                    `;
                  }).join('')}
                </div>
              </div>
            `;
          });
        } else {
          // Fallback: display without quarters (for backward compatibility)
          html = result.topics.map(topic => {
            const progress = progressMap[topic.id] || { progress_percentage: 0, completed: false };
            const progressPercent = progress.progress_percentage || 0;
            const isCompleted = progress.completed || false;
            
            return `
              <div class="path-item ${isCompleted ? 'completed' : ''}">
                <h4>${topic.topic_title}</h4>
                <p>${topic.learning_outcome}</p>
                ${topic.category ? `<span style="background: ${getCategoryBg(topic.category)}; color: ${getCategoryText(topic.category)}; border: 1px solid ${getCategoryBorder(topic.category)}; padding: 4px 12px; border-radius: 8px; font-size: 0.85rem; display: inline-block; margin-bottom: 1rem; font-weight: 500;">${topic.category}</span>` : ''}
                <div class="lesson-progress">
                  <div class="progress-bar">
                    <div class="progress-fill animated-fill" style="--target-width: ${progressPercent}%;"></div>
                  </div>
                  <span class="progress-text">${progressPercent}% ${isCompleted ? '✓' : ''}</span>
                </div>
              </div>
            `;
          }).join('');
        }

        container.innerHTML = html;
      } catch (error) {
        console.error('Error loading learning path:', error);
        container.innerHTML = '<p style="color: #fc8181;">Error loading learning path. Please try again.</p>';
      }
    }
    
    // Helper function for category colors
    function getCategoryBg(category) {
      if (!category) return 'rgba(99, 102, 241, 0.1)';
      const cat = category.toLowerCase();
      if (cat.includes('number')) return 'rgba(99, 102, 241, 0.1)'; // Indigo
      if (cat.includes('geometry')) return 'rgba(16, 185, 129, 0.1)'; // Green
      if (cat.includes('algebra')) return 'rgba(139, 92, 246, 0.1)'; // Violet
      if (cat.includes('measurement')) return 'rgba(236, 72, 153, 0.1)'; // Pink
      if (cat.includes('statistics') || cat.includes('probability')) return 'rgba(245, 158, 11, 0.1)'; // Amber
      return 'rgba(99, 102, 241, 0.1)';
    }

    function getCategoryText(category) {
      if (!category) return 'var(--primary)';
      const cat = category.toLowerCase();
      if (cat.includes('number')) return 'var(--primary)'; // Indigo
      if (cat.includes('geometry')) return 'var(--success)'; // Green
      if (cat.includes('algebra')) return 'var(--secondary)'; // Violet
      if (cat.includes('measurement')) return 'var(--accent)'; // Pink
      if (cat.includes('statistics') || cat.includes('probability')) return '#b45309'; // Amber/Dark Orange
      return 'var(--primary)';
    }

    function getCategoryBorder(category) {
      if (!category) return 'rgba(99, 102, 241, 0.2)';
      const cat = category.toLowerCase();
      if (cat.includes('number')) return 'rgba(99, 102, 241, 0.2)';
      if (cat.includes('geometry')) return 'rgba(16, 185, 129, 0.2)';
      if (cat.includes('algebra')) return 'rgba(139, 92, 246, 0.2)';
      if (cat.includes('measurement')) return 'rgba(236, 72, 153, 0.2)';
      if (cat.includes('statistics') || cat.includes('probability')) return 'rgba(245, 158, 11, 0.2)';
      return 'rgba(99, 102, 241, 0.2)';
    }

    // Update stats with real data
    function updateStats(sessions, topicProgress, curriculumTopics) {
      // Calculate Average Score from practice sessions
      let avgScore = 0;
      if (sessions && sessions.length > 0) {
        const totalScore = sessions.reduce((sum, s) => sum + (s.score || 0), 0);
        const totalQuestions = sessions.reduce((sum, s) => sum + (s.total_questions || 0), 0);
        avgScore = totalQuestions > 0 ? Math.round((totalScore / totalQuestions) * 100) : 0;
      } else if (topicProgress && topicProgress.length > 0) {
        // Fallback: calculate from topic progress best scores
        const topicsWithScores = topicProgress.filter(p => p.best_score && p.best_score > 0);
        if (topicsWithScores.length > 0) {
          const totalScore = topicsWithScores.reduce((sum, p) => sum + (p.best_score || 0), 0);
          avgScore = Math.round(totalScore / topicsWithScores.length);
        }
      }
      const avgScoreEl = document.getElementById('averageScore');
      if (avgScoreEl) {
        avgScoreEl.textContent = avgScore + '%';
      }

      // Calculate Lessons Completed (topics with 100% progress or completed flag)
      let lessonsCompleted = 0;
      if (topicProgress && topicProgress.length > 0) {
        lessonsCompleted = topicProgress.filter(p => 
          (p.completed === 1 || p.completed === true) || 
          (p.progress_percentage >= 100)
        ).length;
      }
      const lessonsCompletedEl = document.getElementById('lessonsCompleted');
      if (lessonsCompletedEl) {
        lessonsCompletedEl.textContent = lessonsCompleted;
      }

      // Calculate Overall Progress (completed topics / total topics)
      let overallProgress = 0;
      const totalTopics = curriculumTopics ? curriculumTopics.length : 0;
      if (totalTopics > 0 && lessonsCompleted > 0) {
        overallProgress = Math.round((lessonsCompleted / totalTopics) * 100);
      }
      const overallProgressEl = document.getElementById('overallProgress');
      if (overallProgressEl) {
        overallProgressEl.textContent = overallProgress + '%';
      }

      // Calculate Time Spent (from practice sessions - estimate 2.5 minutes per session)
      let timeSpent = 0;
      if (sessions && sessions.length > 0) {
        // Get sessions from this week
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        
        const thisWeekSessions = sessions.filter(s => {
          if (!s.completed_at) return false;
          const sessionDate = new Date(s.completed_at);
          return sessionDate >= oneWeekAgo;
        });
        
        // Estimate 2.5 minutes per session (average time for 10 questions)
        timeSpent = thisWeekSessions.length * 2.5;
      }
      
      // Format time spent
      const timeSpentEl = document.getElementById('timeSpent');
      if (timeSpentEl) {
        if (timeSpent >= 60) {
          const hours = Math.floor(timeSpent / 60);
          const minutes = Math.round(timeSpent % 60);
          timeSpentEl.textContent = minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
        } else if (timeSpent > 0) {
          timeSpentEl.textContent = `${Math.round(timeSpent)}m`;
        } else {
          timeSpentEl.textContent = '0m';
        }
      }
    }

    // Load student data (no page navigation needed)

    // Continue learning
    window.continueLearning = function() {
      startGame();
    };

    // Start game based on student's grade
    async function startGame() {
      if (!currentUser) {
        alert('Please log in to play games.');
        return;
      }

      // Ensure we have the latest user data with grade
      if (currentUser && currentUser.id && (!currentUser.studentGrade || currentUser.studentGrade === null || currentUser.studentGrade === undefined)) {
        try {
          const userResult = await window.electronAPI.invoke('get-user-by-id', currentUser.id);
          if (userResult.success && userResult.user) {
            currentUser.studentGrade = userResult.user.studentGrade;
          }
        } catch (error) {
          console.error('Error fetching user grade:', error);
        }
      }

      if (!currentUser.studentGrade || currentUser.studentGrade === null || currentUser.studentGrade === undefined) {
        showGradeModal();
        return;
      }

      console.log('Starting game for grade:', currentUser.studentGrade);

      try {
        // Get curriculum topics for student's grade
        const topicsResult = await window.electronAPI.invoke('get-curriculum-topics', currentUser.studentGrade);
        
        if (!topicsResult.success || !topicsResult.topics || topicsResult.topics.length === 0) {
          alert('No curriculum topics found for your grade. Please contact your teacher.');
          return;
        }

        // Get student's progress to find next topic
        const progressResult = await window.electronAPI.invoke('get-student-topic-progress', currentUser.id, currentUser.studentGrade);
        const progressMap = {};
        if (progressResult.success && progressResult.progress) {
          progressResult.progress.forEach(p => {
            progressMap[p.topic_id] = p;
          });
        }

        // Find the first uncompleted topic, or the first topic if all are completed
        let selectedTopic = null;
        for (const topic of topicsResult.topics) {
          const progress = progressMap[topic.id];
          if (!progress || !progress.completed) {
            selectedTopic = topic;
            break;
          }
        }

        // If all topics are completed, start with the first one
        if (!selectedTopic) {
          selectedTopic = topicsResult.topics[0];
        }

        // If student has a current lesson, use that instead
        if (studentProgress && studentProgress.current_lesson) {
          // Try to find the current lesson topic
          const currentTopic = topicsResult.topics.find(t => 
            t.topic_title === studentProgress.current_lesson || 
            t.learning_outcome.includes(studentProgress.current_lesson)
          );
          if (currentTopic) {
            selectedTopic = currentTopic;
          }
        }

        // Open game interface with selected topic
        openGameInterface(selectedTopic);

      } catch (error) {
        console.error('Error starting game:', error);
        alert('Error starting game. Please try again.');
      }
    }

    // ==================== ENHANCED GAME FEATURES ====================
    
    // Sound Effects System
    class SoundManager {
      constructor() {
        this.audioContext = null;
        this.enabled = true;
        this.init();
      }
      
      init() {
        try {
          this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
          console.log('Audio not supported');
          this.enabled = false;
        }
      }
      
      playSound(frequency, duration, type = 'sine') {
        if (!this.enabled || !this.audioContext) return;
        
        try {
          const oscillator = this.audioContext.createOscillator();
          const gainNode = this.audioContext.createGain();
          
          oscillator.connect(gainNode);
          gainNode.connect(this.audioContext.destination);
          
          oscillator.frequency.value = frequency;
          oscillator.type = type;
          
          gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);
          
          oscillator.start(this.audioContext.currentTime);
          oscillator.stop(this.audioContext.currentTime + duration);
        } catch (e) {
          console.log('Sound playback error:', e);
        }
      }
      
      playCorrect() {
        // Play a pleasant ascending melody
        this.playSound(523.25, 0.1, 'sine'); // C5
        setTimeout(() => this.playSound(659.25, 0.1, 'sine'), 100); // E5
        setTimeout(() => this.playSound(783.99, 0.2, 'sine'), 200); // G5
      }
      
      playWrong() {
        // Play a gentle descending tone
        this.playSound(392, 0.15, 'sine'); // G4
        setTimeout(() => this.playSound(330, 0.2, 'sine'), 150); // E4
      }
      
      playCelebration() {
        // Play a celebratory melody
        this.playSound(523.25, 0.1, 'sine'); // C5
        setTimeout(() => this.playSound(659.25, 0.1, 'sine'), 100);
        setTimeout(() => this.playSound(783.99, 0.1, 'sine'), 200);
        setTimeout(() => this.playSound(1046.5, 0.3, 'sine'), 300); // C6
      }
      
      toggle() {
        this.enabled = !this.enabled;
        return this.enabled;
      }
    }
    
    const soundManager = new SoundManager();
    
    // Confetti Animation Helper
    function triggerConfetti() {
      if (typeof confetti !== 'undefined') {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#667eea', '#764ba2', '#f093fb', '#4facfe', '#00f2fe']
        });
      }
    }
    
    // Hints System
    class HintsManager {
      generateHint(question, hintLevel = 0) {
        const hints = [];
        
        // Generate hints based on question type and content
        if (question.type === 'multiple-choice') {
          // Hint 1: General guidance
          hints.push(`Hint 1: Read the question carefully. Think about what the question is asking.`);
          
          // Hint 2: Process hint
          if (question.question.includes('+') || question.question.includes('add')) {
            hints.push(`Hint 2: This is an addition problem. Count or add the numbers together.`);
          } else if (question.question.includes('-') || question.question.includes('subtract') || question.question.includes('left')) {
            hints.push(`Hint 2: This is a subtraction problem. Take away the smaller number from the larger one.`);
          } else if (question.question.includes('×') || question.question.includes('times')) {
            hints.push(`Hint 2: This is a multiplication problem. Multiply the numbers together.`);
          } else {
            hints.push(`Hint 2: Work through each step carefully.`);
          }
          
          // Hint 3: Closer hint
          const correctAnswer = question.options[question.correctAnswer];
          hints.push(`Hint 3: The answer is ${correctAnswer}. Try working it out step by step!`);
          
        } else {
          // Number input questions
          hints.push(`Hint 1: Break down the problem into smaller steps.`);
          
          if (question.question.includes('+')) {
            const parts = question.question.match(/\d+/g);
            if (parts && parts.length >= 2) {
              hints.push(`Hint 2: Add ${parts[0]} + ${parts[1]} to find your answer.`);
            }
          } else if (question.question.includes('-')) {
            const parts = question.question.match(/\d+/g);
            if (parts && parts.length >= 2) {
              hints.push(`Hint 2: Subtract ${parts[1]} from ${parts[0]} to find your answer.`);
            }
          }
          
          hints.push(`Hint 3: The correct answer is ${question.correctAnswer}.`);
        }
        
        return hints[hintLevel] || hints[hints.length - 1];
      }
    }
    
    const hintsManager = new HintsManager();
    
    // Achievement System
    class AchievementTracker {
      constructor() {
        this.achievements = {
          perfectScore: false,
          onFire: false, // 5 correct in a row
          speedDemon: false,
          bookworm: false,
          sharpshooter: false
        };
        this.consecutiveCorrect = 0;
        this.startTime = null;
      }
      
      checkAchievements(score, total, isCorrect) {
        const achievements = [];
        const percentage = Math.round((score / total) * 100);
        
        // Track consecutive correct
        if (isCorrect) {
          this.consecutiveCorrect++;
        } else {
          this.consecutiveCorrect = 0;
        }
        
        // Perfect Score
        if (percentage === 100 && !this.achievements.perfectScore) {
          this.achievements.perfectScore = true;
          achievements.push({
            icon: '',
            title: 'Perfect Score!',
            message: 'You got 100%! Outstanding work!'
          });
        }
        
        // On Fire (5 correct in a row)
        if (this.consecutiveCorrect >= 5 && !this.achievements.onFire) {
          this.achievements.onFire = true;
          achievements.push({
            icon: '',
            title: 'On Fire!',
            message: '5 correct answers in a row! You\'re unstoppable!'
          });
        }
        
        // Sharpshooter (90%+ accuracy)
        if (percentage >= 90 && score >= 9 && !this.achievements.sharpshooter) {
          this.achievements.sharpshooter = true;
          achievements.push({
            icon: '',
            title: 'Sharpshooter!',
            message: '90%+ accuracy! Incredible precision!'
          });
        }
        
        return achievements;
      }
      
      reset() {
        this.consecutiveCorrect = 0;
        this.startTime = Date.now();
      }
    }
    
    const achievementTracker = new AchievementTracker();
    
    // ==================== END ENHANCED FEATURES ====================

    // Game state
    let currentGame = {
      topic: null,
      questions: [],
      currentQuestion: 0,
      score: 0,
      totalQuestions: 10,
      nextTopic: null,
      hintsUsed: 0,
      currentHintLevel: 0,
      questionStartTime: null,
      // Feature 1: Adaptive Difficulty
      difficulty: 'medium',
      // Feature 2: Timer
      timeLeft: 0,
      timerInterval: null,
      timerLimit: 45,
      bonusPoints: 0,
      // Feature 3: Review Mode
      wrongAnswers: [],
      // Feature 5: Coins
      coinsEarned: 0
    };

    // Feature 1: Determine difficulty from recent performance
    async function getAdaptiveDifficulty(topic) {
      try {
        if (!currentUser) return 'medium';
        const result = await window.electronAPI.invoke('get-student-topic-progress', currentUser.id, currentUser.studentGrade || 1);
        if (result.success && result.progress && result.progress.length > 0) {
          // Calculate average of recent scores
          const scores = result.progress
            .filter(p => p.best_score > 0)
            .sort((a, b) => (b.last_attempt_at || 0) - (a.last_attempt_at || 0))
            .slice(0, 5)
            .map(p => p.best_score);
          if (scores.length > 0) {
            const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
            if (avg >= 90) return 'hard';
            if (avg < 50) return 'easy';
          }
        }
      } catch (e) {
        console.log('Could not fetch adaptive difficulty, defaulting to medium');
      }
      return 'medium';
    }

    // Feature 2: Get timer limit based on grade
    function getTimerLimit(grade) {
      if (grade <= 2) return 30;
      if (grade <= 4) return 45;
      return 60;
    }

    // Open game interface (full page)
    async function openGameInterface(topic) {
      // Feature 1: Adaptive difficulty
      const difficulty = await getAdaptiveDifficulty(topic);

      const grade = topic.grade || (currentUser && currentUser.studentGrade) || 1;

      currentGame.topic = topic;
      currentGame.currentQuestion = 0;
      currentGame.score = 0;
      currentGame.hintsUsed = 0;
      currentGame.currentHintLevel = 0;
      currentGame.questionStartTime = Date.now();
      currentGame.difficulty = difficulty;
      currentGame.timerLimit = getTimerLimit(grade);
      currentGame.timeLeft = currentGame.timerLimit;
      currentGame.bonusPoints = 0;
      currentGame.wrongAnswers = [];
      currentGame.coinsEarned = 0;
      if (currentGame.timerInterval) { clearInterval(currentGame.timerInterval); currentGame.timerInterval = null; }
      
      // Reset achievement tracker
      achievementTracker.reset();
      
      // Generate questions based on topic and adaptive difficulty
      const questions = await generateGameQuestions(topic, difficulty);
      currentGame.questions = questions;
      currentGame.totalQuestions = currentGame.questions.length;

      // Hide dashboard elements
      const sidebar = document.querySelector('.sidebar');
      const mainContent = document.querySelector('.main-content');
      if (sidebar) sidebar.style.display = 'none';
      if (mainContent) mainContent.style.display = 'none';

      // Create full page game container
      let gameContainer = document.getElementById('gameContainer');
      if (!gameContainer) {
        gameContainer = document.createElement('div');
        gameContainer.id = 'gameContainer';
        gameContainer.style.cssText = `
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: var(--bg-dark);
          z-index: 1000;
          overflow-y: auto;
        `;
        document.body.appendChild(gameContainer);
      }

      await renderGameScreen(gameContainer, topic);
    }

    // Show difficulty selection UI
    function showDifficultySelector(topic) {
      return new Promise((resolve) => {
        const overlay = document.createElement('div');
        overlay.id = 'difficultySelectorModal';
        overlay.style.cssText = `
          position: fixed; top: 0; left: 0; width: 100%; height: 100%;
          background: rgba(15, 23, 42, 0.8); backdrop-filter: blur(5px);
          display: flex; align-items: center; justify-content: center;
          z-index: 2000; animation: fadeIn 0.3s ease-out;
        `;

        const modal = document.createElement('div');
        modal.style.cssText = `
          background: #ffffff;
          border: 1px solid rgba(148, 163, 184, 0.2);
          border-radius: 20px; padding: 40px; width: 90%; max-width: 500px;
          text-align: center; box-shadow: 0 20px 60px rgba(0,0,0,0.5);
          animation: slideInUp 0.4s ease-out;
        `;

        modal.innerHTML = `
          <h2 style="color: var(--text-primary); margin-bottom: 10px; font-family: 'Space Grotesk', sans-serif;">Select Difficulty</h2>
          <p style="color: var(--text-secondary); margin-bottom: 30px;">Choose a difficulty level for <strong>${topic.topic_title}</strong></p>
          <div style="display: flex; flex-direction: column; gap: 15px;">
            <button class="diff-btn" data-diff="easy" style="background: rgba(16, 185, 129, 0.1); border: 2px solid rgba(16, 185, 129, 0.5); color: #10b981; padding: 15px; border-radius: 12px; font-size: 18px; font-weight: bold; cursor: pointer; transition: all 0.2s;">
              <span style="font-size: 24px; margin-right: 10px;">🌟</span> Easy
            </button>
            <button class="diff-btn" data-diff="medium" style="background: rgba(99, 102, 241, 0.1); border: 2px solid rgba(99, 102, 241, 0.5); color: #6366f1; padding: 15px; border-radius: 12px; font-size: 18px; font-weight: bold; cursor: pointer; transition: all 0.2s;">
              <span style="font-size: 24px; margin-right: 10px;">⭐</span> Medium
            </button>
            <button class="diff-btn" data-diff="hard" style="background: rgba(239, 68, 68, 0.1); border: 2px solid rgba(239, 68, 68, 0.5); color: #ef4444; padding: 15px; border-radius: 12px; font-size: 18px; font-weight: bold; cursor: pointer; transition: all 0.2s;">
              <span style="font-size: 24px; margin-right: 10px;">🔥</span> Hard
            </button>
            <button id="cancelDiffBtn" style="margin-top: 15px; background: transparent; border: none; color: var(--text-secondary); padding: 10px; cursor: pointer; font-size: 16px;">
              Cancel
            </button>
          </div>
        `;

        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        const buttons = modal.querySelectorAll('.diff-btn');
        buttons.forEach(btn => {
          btn.onmouseover = () => { btn.style.transform = 'scale(1.02)'; btn.style.background = btn.style.borderColor.replace('0.5', '0.2'); };
          btn.onmouseout = () => { btn.style.transform = 'scale(1)'; btn.style.background = btn.style.borderColor.replace('0.5', '0.1'); };
          btn.onclick = () => {
            document.body.removeChild(overlay);
            resolve(btn.getAttribute('data-diff'));
          };
        });

        document.getElementById('cancelDiffBtn').onclick = () => {
          document.body.removeChild(overlay);
          resolve(null);
        };
      });
    }

    // Text-to-Speech function
    window.readAloud = function(text) {
      if ('speechSynthesis' in window) {
        // Cancel any ongoing speech
        window.speechSynthesis.cancel();
        
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'en-US';
        utterance.rate = 0.9; // Slightly slower for younger kids
        utterance.pitch = 1.1; // Slightly higher/friendlier
        
        window.speechSynthesis.speak(utterance);
      } else {
        showToast('Text-to-speech is not supported in this browser.', 'warning');
      }
    };

    // Render game screen
    async function renderGameScreen(container, topic) {
      if (currentGame.currentQuestion >= currentGame.questions.length) {
        // Game completed - auto save and show results
        // Wait for save to complete so nextTopic is set
        await saveGameProgressAuto(topic);
        showGameResults(container, topic);
        return;
      }

      const question = currentGame.questions[currentGame.currentQuestion];
      const progress = Math.round((currentGame.currentQuestion / currentGame.totalQuestions) * 100);
      currentGame.questionStartTime = Date.now();
      currentGame.currentHintLevel = 0;

      // Add CSS variables to game container if not already present
      const gameContainer = document.getElementById('gameContainer');
      if (gameContainer && !gameContainer.dataset.styled) {
        const style = document.createElement('style');
        style.textContent = `
          #gameContainer {
            --primary: #6366f1;
            --secondary: #8b5cf6;
            --bg-dark: var(--bg);
            --bg-light: var(--surface);
            --bg-card: rgba(255, 255, 255, 0.9);
            --text-primary: var(--text-primary);
            --text-secondary: var(--text-secondary);
            --border-color: var(--border);
            --shadow-sm: 0 2px 8px rgba(0, 0, 0, 0.1);
            --shadow-md: 0 4px 16px rgba(0, 0, 0, 0.2);
          }
        `;
        document.head.appendChild(style);
        gameContainer.dataset.styled = 'true';
      }

      container.innerHTML = `
        <div style="
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          background: var(--bg);
          animation: fadeIn 0.4s ease-out;
          font-family: 'Inter', sans-serif;
        ">
          <!-- Top Navigation Bar -->
          <div style="
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 15px 30px;
            background: #ffffff;
            box-shadow: 0 4px 12px rgba(0,0,0,0.05);
            position: sticky;
            top: 0;
            z-index: 10;
          ">
            <button onclick="closeGameInterface()" style="
              background: transparent;
              border: none;
              color: var(--text-secondary);
              font-size: 28px;
              cursor: pointer;
              transition: color 0.2s;
              padding: 5px;
              line-height: 1;
            " onmouseover="this.style.color='#ef4444'" onmouseout="this.style.color='var(--text-secondary)'">✕</button>
            
            <div style="
              flex: 1;
              max-width: 600px;
              margin: 0 30px;
              display: flex;
              align-items: center;
              gap: 15px;
            ">
              <div style="
                flex: 1;
                background: var(--border);
                height: 16px;
                border-radius: 8px;
                overflow: hidden;
              ">
                <div style="
                  background: var(--success);
                  height: 100%;
                  width: ${progress}%;
                  transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1);
                  position: relative;
                ">
                  <div style="
                    position: absolute; top: 0; left: 0; right: 0; bottom: 0;
                    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent);
                    animation: shimmer 2s infinite;
                  "></div>
                </div>
              </div>
            </div>

            <div style="display: flex; gap: 15px; align-items: center; font-weight: 700; font-size: 16px;">
              <div id="gameTimer" style="
                background: var(--surface-alt);
                border: 2px solid var(--border);
                border-radius: 12px;
                padding: 6px 14px;
                color: var(--text-primary);
                display: flex;
                align-items: center;
                gap: 6px;
                font-family: 'Space Grotesk', sans-serif;
                font-size: 18px;
                font-weight: 800;
                min-width: 70px;
                justify-content: center;
              ">⏱ <span id="timerDisplay">${currentGame.timerLimit}</span>s</div>
              <div style="
                background: ${currentGame.difficulty === 'hard' ? 'rgba(239,68,68,0.15)' : currentGame.difficulty === 'easy' ? 'rgba(16,185,129,0.15)' : 'rgba(99,102,241,0.15)'};
                color: ${currentGame.difficulty === 'hard' ? '#ef4444' : currentGame.difficulty === 'easy' ? '#10b981' : '#6366f1'};
                border-radius: 10px;
                padding: 6px 12px;
                font-size: 13px;
                font-weight: 700;
                text-transform: uppercase;
                letter-spacing: 0.5px;
              ">${currentGame.difficulty === 'hard' ? '🔥 Hard' : currentGame.difficulty === 'easy' ? '🌱 Easy' : '⚡ Medium'}</div>
              <div style="color: var(--warning); display: flex; align-items: center; gap: 5px;">
                <span>⭐</span> ${currentGame.score}
              </div>
              <div style="color: #f59e0b; display: flex; align-items: center; gap: 5px; font-size: 15px;">
                <span>🪙</span> <span id="coinsDisplay">${currentGame.coinsEarned}</span>
              </div>
            </div>
          </div>

          <!-- Main Scrollable Content -->
          <div style="
            flex: 1;
            display: flex;
            flex-direction: column;
            align-items: center;
            padding: 40px 20px;
            overflow-y: auto;
          ">
            <div style="width: 100%; max-width: 800px;">
              
              <!-- Topic Info Context -->
              <div style="text-align: center; margin-bottom: 30px;">
                <h2 style="color: var(--text-primary); margin-bottom: 8px; font-family: 'Space Grotesk', sans-serif; font-size: 24px; font-weight: 700;">
                  ${topic.topic_title}
                </h2>
                ${question.skill ? `<span style="background: rgba(99, 102, 241, 0.1); color: var(--primary); padding: 4px 12px; border-radius: 8px; font-size: 14px; font-weight: 600;">Target: ${question.skill}</span>` : ''}
              </div>

              <!-- Question Container -->
              <div style="text-align: center; margin-bottom: 40px; position: relative; max-width: 600px; margin-left: auto; margin-right: auto;">
                <h3 style="
                  color: var(--text-primary);
                  font-size: 36px;
                  font-family: 'Space Grotesk', sans-serif;
                  font-weight: 700;
                  line-height: 1.4;
                  display: inline-block;
                  position: relative;
                  padding-right: 60px;
                ">
                  ${question.question}
                  <button onclick="readAloud('${question.question.replace(/'/g, "\\'")}')" style="
                    position: absolute;
                    right: 0;
                    top: 50%;
                    transform: translateY(-50%);
                    background: var(--surface-alt);
                    border: 2px solid var(--border);
                    color: var(--primary);
                    width: 44px;
                    height: 44px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    transition: all 0.2s;
                    box-shadow: 0 4px 10px rgba(0,0,0,0.05);
                  " onmouseover="this.style.background='var(--primary)'; this.style.color='white'; this.style.transform='translateY(-50%) scale(1.1)';"
                  onmouseout="this.style.background='var(--surface-alt)'; this.style.color='var(--primary)'; this.style.transform='translateY(-50%) scale(1)';">
                    <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072M18.364 5.636a9 9 0 010 12.728M11 5L6 9H2v6h4l5 4V5z"></path></svg>
                  </button>
                </h3>
              </div>

              <!-- Answer Area -->
              <div id="gameAnswerArea" style="margin-bottom: 30px;">
                ${renderAnswerInput(question)}
              </div>
              
              <!-- Hint Area -->
              <div style="display: flex; flex-direction: column; align-items: center; gap: 15px; margin-top: 40px;">
                <button id="hintButton" onclick="showHint()" style="
                  background: transparent;
                  color: var(--warning);
                  border: 2px solid var(--warning);
                  padding: 10px 24px;
                  border-radius: 20px;
                  font-size: 15px;
                  font-weight: 600;
                  cursor: pointer;
                  transition: all 0.2s;
                  display: inline-flex;
                  align-items: center;
                  gap: 8px;
                " onmouseover="this.style.background='var(--warning)'; this.style.color='white';"
                onmouseout="this.style.background='transparent'; this.style.color='var(--warning)';">
                  <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path></svg>
                  Need a hint? ${currentGame.currentHintLevel < 3 ? `(${2 - currentGame.currentHintLevel} left)` : ''}
                </button>
                <div id="hintDisplay" style="width: 100%;"></div>
              </div>

              <div id="gameFeedback" style="margin-top: 20px;"></div>
            </div>
          </div>
        </div>
      `;

      // Feature 2: Start countdown timer
      if (currentGame.timerInterval) clearInterval(currentGame.timerInterval);
      currentGame.timeLeft = currentGame.timerLimit;
      const timerEl = document.getElementById('timerDisplay');
      const timerContainer = document.getElementById('gameTimer');
      if (timerEl) timerEl.textContent = currentGame.timeLeft;

      currentGame.timerInterval = setInterval(() => {
        currentGame.timeLeft--;
        if (timerEl) timerEl.textContent = currentGame.timeLeft;
        // Visual urgency
        if (timerContainer) {
          if (currentGame.timeLeft <= 5) {
            timerContainer.style.borderColor = '#ef4444';
            timerContainer.style.color = '#ef4444';
            timerContainer.style.animation = 'pulse 0.5s ease-in-out';
          } else if (currentGame.timeLeft <= 10) {
            timerContainer.style.borderColor = '#f59e0b';
            timerContainer.style.color = '#f59e0b';
          }
        }
        // Auto-submit on timeout
        if (currentGame.timeLeft <= 0) {
          clearInterval(currentGame.timerInterval);
          currentGame.timerInterval = null;
          // Submit wrong answer automatically
          checkAnswer(-1); // -1 signals timeout
        }
      }, 1000);
    }

    // Render answer input based on question type
    function renderAnswerInput(question) {
      if (question.type === 'multiple-choice' || question.type === 'true-false') {
        const gridStyle = question.type === 'true-false' 
          ? 'grid-template-columns: 1fr 1fr; gap: 20px;' 
          : 'grid-template-columns: 1fr 1fr; gap: 15px;';
          
        return `
          <div class="game-answer-grid" style="display: grid; ${gridStyle} max-width: 600px; margin: 0 auto;">
            ${question.options.map((opt, idx) => `
              <button onclick="checkAnswer(${idx})" style="
                background: #ffffff;
                border: 2px solid var(--border);
                border-bottom: 6px solid var(--border);
                padding: 24px 20px;
                border-radius: 20px;
                font-size: 20px;
                font-weight: 700;
                cursor: pointer;
                color: var(--text-primary);
                font-family: 'Inter', sans-serif;
                transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
                position: relative;
                display: flex;
                align-items: center;
                justify-content: center;
              " onmousedown="this.style.transform='translateY(4px)'; this.style.borderBottomWidth='2px';"
                onmouseup="this.style.transform='translateY(0)'; this.style.borderBottomWidth='6px';"
                onmouseleave="this.style.transform='translateY(0)'; this.style.borderBottomWidth='6px';"
                onmouseover="this.style.background='var(--surface-alt)'; this.style.borderColor='var(--primary)';"
                onmouseout="this.style.background='#ffffff'; this.style.borderColor='var(--border)';">
                <span style="position: relative; z-index: 1;">${opt}</span>
              </button>
            `).join('')}
          </div>
        `;
      } else {
        const placeholderText = question.type === 'fill-blank' ? 'Fill in the blank...' : 'Enter your answer...';
        return `
          <div style="text-align: center; display: flex; flex-direction: column; align-items: center; gap: 30px;">
            <input type="number" id="gameAnswerInput" step="any" placeholder="${placeholderText}" style="
              padding: 20px;
              font-size: 28px;
              font-weight: 700;
              border: 3px solid var(--border);
              border-radius: 16px;
              width: 100%;
              max-width: 400px;
              text-align: center;
              background: #ffffff;
              color: var(--text-primary);
              font-family: 'Space Grotesk', sans-serif;
              outline: none;
              transition: all 0.2s;
              box-shadow: 0 4px 12px rgba(0,0,0,0.05);
            " 
            onfocus="this.style.borderColor='var(--primary)'; this.style.boxShadow='0 0 0 4px rgba(99, 102, 241, 0.2)';"
            onblur="this.style.borderColor='var(--border)'; this.style.boxShadow='0 4px 12px rgba(0,0,0,0.05)';"
            onkeydown="if (event.key === 'Enter') { event.preventDefault(); checkAnswer(); }"
            />
            <button onclick="checkAnswer()" style="
              background: var(--success);
              color: white;
              border: none;
              border-bottom: 6px solid #059669;
              padding: 18px 50px;
              border-radius: 20px;
              font-size: 20px;
              font-weight: 700;
              cursor: pointer;
              font-family: 'Inter', sans-serif;
              transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
              width: 100%;
              max-width: 400px;
              text-transform: uppercase;
              letter-spacing: 1px;
            " onmousedown="this.style.transform='translateY(4px)'; this.style.borderBottomWidth='2px';"
              onmouseup="this.style.transform='translateY(0)'; this.style.borderBottomWidth='6px';">
              Check Answer
            </button>
          </div>
        `;
      }
    }


    // Show hint function
    window.showHint = async function() {
      if (currentGame.currentHintLevel >= 3) {
        return; // No more hints
      }
      
      const question = currentGame.questions[currentGame.currentQuestion];
      const hint = hintsManager.generateHint(question, currentGame.currentHintLevel);
      currentGame.currentHintLevel++;
      currentGame.hintsUsed++;
      
      // Check if student has enough coins (cost: 1 coin per hint)
      if (studentProgress && studentProgress.coins && studentProgress.coins > 0) {
        // Deduct coin (will be saved later)
        if (studentProgress.coins > 0) {
          studentProgress.coins--;
        }
      }
      
      const hintDiv = document.getElementById('hintDisplay');
      hintDiv.innerHTML = `
        <div style="
          background: rgba(245, 158, 11, 0.15);
          border: 1px solid rgba(245, 158, 11, 0.3);
          color: #fbbf24;
          padding: 20px;
          border-radius: 15px;
          text-align: left;
          font-family: 'Inter', sans-serif;
          font-size: 18px;
          box-shadow: 0 4px 15px rgba(245, 158, 11, 0.2);
          animation: slideInUp 0.4s ease-out;
        ">
          ${hint}
          ${currentGame.currentHintLevel >= 3 ? '<br><small style="opacity: 0.8;">No more hints available for this question.</small>' : ''}
        </div>
      `;
      
      // Update hint button
      const hintButton = document.getElementById('hintButton');
      if (hintButton) {
        if (currentGame.currentHintLevel >= 3) {
          hintButton.disabled = true;
          hintButton.style.opacity = '0.5';
          hintButton.style.cursor = 'not-allowed';
          hintButton.innerHTML = 'No More Hints';
        } else {
          hintButton.innerHTML = `Get Hint (${3 - currentGame.currentHintLevel} left)`;
        }
      }
      
      // Play hint sound
      soundManager.playSound(440, 0.1, 'sine');
    }
    
    // Generate explanation for question
    function generateExplanation(question, userAnswer, correctAnswer) {
      if (question.explanation) {
        return `
          <strong>Here's the step-by-step solution:</strong><br>
          <div style="background: rgba(15, 23, 42, 0.3); padding: 15px; border-radius: 10px; margin-top: 10px; font-family: monospace; font-size: 16px; white-space: pre-line;">${question.explanation}</div><br>
          <strong>Your answer:</strong> <span style="color: #f87171;">${userAnswer}</span><br>
          <strong>Correct answer:</strong> <span style="color: #34d399;">${correctAnswer}</span>
        `;
      }

      let explanation = '';
      
      // Extract numbers from question
      const numbers = question.question.match(/\d+/g) || [];
      
      if (question.question.includes('+') || question.question.includes('add') || question.question.includes('together') || question.question.includes('total')) {
        if (numbers.length >= 2) {
          explanation = `
            <strong>Here's how to solve it:</strong><br>
            • This is an addition problem<br>
            • Add ${numbers[0]} + ${numbers[1]}<br>
            • ${numbers[0]} + ${numbers[1]} = ${correctAnswer}<br>
            <br>
            <strong>Your answer was:</strong> ${userAnswer}<br>
            <strong>Correct answer:</strong> ${correctAnswer}
          `;
        }
      } else if (question.question.includes('-') || question.question.includes('subtract') || question.question.includes('left') || question.question.includes('more')) {
        if (numbers.length >= 2) {
          explanation = `
            <strong>Here's how to solve it:</strong><br>
            • This is a subtraction problem<br>
            • Take away the smaller number from the larger one<br>
            • ${Math.max(...numbers.map(Number))} - ${Math.min(...numbers.map(Number))} = ${correctAnswer}<br>
            <br>
            <strong>Your answer was:</strong> ${userAnswer}<br>
            <strong>Correct answer:</strong> ${correctAnswer}
          `;
        }
      } else if (question.question.includes('×') || question.question.includes('times') || question.question.includes('multiply')) {
        if (numbers.length >= 2) {
          explanation = `
            <strong>Here's how to solve it:</strong><br>
            • This is a multiplication problem<br>
            • Multiply ${numbers[0]} × ${numbers[1]}<br>
            • ${numbers[0]} × ${numbers[1]} = ${correctAnswer}<br>
            <br>
            <strong>Your answer was:</strong> ${userAnswer}<br>
            <strong>Correct answer:</strong> ${correctAnswer}
          `;
        }
      } else {
        explanation = `
          <strong>Think about it step by step:</strong><br>
          • Read the question carefully<br>
          • Work through each step<br>
          • The correct answer is ${correctAnswer}<br>
          <br>
          <strong>Your answer was:</strong> ${userAnswer}
        `;
      }
      
      return explanation || `The correct answer is ${correctAnswer}.`;
    }

    // Check answer - ENHANCED VERSION
    window.checkAnswer = function(selectedIndex = null) {
      // Feature 2: Stop the timer immediately
      if (currentGame.timerInterval) {
        clearInterval(currentGame.timerInterval);
        currentGame.timerInterval = null;
      }
      const timeSpent = currentGame.timerLimit - currentGame.timeLeft;

      const question = currentGame.questions[currentGame.currentQuestion];
      let isCorrect = false;
      let userAnswer = null;
      const isTimeout = (selectedIndex === -1);

      if (isTimeout) {
        // Timeout — automatically wrong
        isCorrect = false;
        userAnswer = null;
      } else if (question.type === 'multiple-choice' || question.type === 'true-false') {
        userAnswer = selectedIndex;
        isCorrect = selectedIndex === question.correctAnswer;
      } else {
        const input = document.getElementById('gameAnswerInput');
        userAnswer = parseFloat(input.value);
        isCorrect = Math.abs(userAnswer - question.correctAnswer) < 0.01;
      }

      const feedbackDiv = document.getElementById('gameFeedback');
      
      // Disable answer buttons
      document.querySelectorAll('#gameAnswerArea button, #gameAnswerInput').forEach(el => {
        el.disabled = true;
        el.style.opacity = '0.6';
        el.style.cursor = 'not-allowed';
      });
      
      // Feature 5: Coin tracking
      if (isCorrect) {
        currentGame.coinsEarned += 10; // Base coins
        if (timeSpent <= 10) {
          currentGame.coinsEarned += 5; // Speed bonus
          currentGame.bonusPoints++;
        }
        // Update coins display
        const coinsEl = document.getElementById('coinsDisplay');
        if (coinsEl) coinsEl.textContent = currentGame.coinsEarned;
      }

      // Feature 3: Track wrong answers for review
      if (!isCorrect) {
        const correctAnswerText = (question.type === 'multiple-choice' || question.type === 'true-false')
          ? question.options[question.correctAnswer]
          : question.correctAnswer;
        const userAnswerText = isTimeout ? '⏱ Time expired'
          : (question.type === 'multiple-choice' || question.type === 'true-false')
            ? (userAnswer !== null && question.options[userAnswer] ? question.options[userAnswer] : 'No answer')
            : (userAnswer !== null ? userAnswer : 'No answer');
        currentGame.wrongAnswers.push({
          questionText: question.question,
          userAnswer: userAnswerText,
          correctAnswer: correctAnswerText,
          explanation: question.explanation || '',
          icon: question.icon || '📝'
        });
      }

      const explanation = generateExplanation(
        question, 
        userAnswer !== null ? ((question.type === 'multiple-choice' || question.type === 'true-false') ? question.options[userAnswer] : userAnswer) : 'No answer',
        (question.type === 'multiple-choice' || question.type === 'true-false') ? question.options[question.correctAnswer] : question.correctAnswer
      );

      if (isCorrect) {
        currentGame.score++;
        
        // Play correct sound
        soundManager.playCorrect();
        
        // Trigger confetti for correct answers
        triggerConfetti();
        
        // Check for achievements
        const achievements = achievementTracker.checkAchievements(
          currentGame.score, 
          currentGame.totalQuestions, 
          true
        );
        
        // Save achievements to backend
        if (achievements.length > 0 && currentUser) {
          achievements.forEach(async achievement => {
            try {
              // Map achievement titles to types for backend
              const achievementTypeMap = {
                'Perfect Score!': 'perfect_score',
                'On Fire!': 'on_fire',
                'Sharpshooter!': 'sharpshooter'
              };
              const achievementType = achievementTypeMap[achievement.title] || achievement.title.toLowerCase().replace(/[^a-z0-9]/g, '_');
              
              // Check if already earned
              const hasResult = await window.electronAPI.invoke('has-achievement', currentUser.id, achievementType);
              if (!hasResult.has) {
                await window.electronAPI.invoke('save-achievement', currentUser.id, {
                  achievementType: achievementType,
                  title: achievement.title,
                  message: achievement.message,
                  topicId: currentGame.topic ? currentGame.topic.id : null
                });
              }
            } catch (error) {
              console.error('Error saving achievement:', error);
            }
          });
        }
        
        let achievementHTML = '';
        if (achievements.length > 0) {
          achievements.forEach(achievement => {
            achievementHTML += `
              <div style="
                background: rgba(245, 158, 11, 0.15);
                border: 1px solid rgba(245, 158, 11, 0.3);
                color: #fbbf24;
                padding: 15px;
                border-radius: 10px;
                margin-top: 10px;
                font-family: 'Inter', sans-serif;
                font-size: 18px;
                font-weight: 600;
                text-align: center;
                box-shadow: 0 4px 15px rgba(245, 158, 11, 0.2);
                animation: pulse 1s ease-in-out infinite;
              ">
                ${achievement.icon} ${achievement.title}! ${achievement.message}
              </div>
            `;
          });
          
          // Extra celebration for achievements
          setTimeout(() => triggerConfetti(), 300);
          soundManager.playCelebration();
        }
        
        feedbackDiv.innerHTML = `
          <div style="
            background: rgba(16, 185, 129, 0.15);
            border: 1px solid rgba(16, 185, 129, 0.3);
            color: #6ee7b7;
            padding: 25px;
            border-radius: 15px;
            text-align: left;
            font-family: 'Inter', sans-serif;
            font-size: 22px;
            font-weight: 600;
            box-shadow: 0 6px 20px rgba(16, 185, 129, 0.2);
            animation: slideInUp 0.4s ease-out;
            position: relative;
            overflow: hidden;
          ">
            <div style="text-align: center; margin-bottom: 15px;">Correct! Great job!</div>
            ${question.explanation ? `<div style="font-size: 16px; line-height: 1.6; background: rgba(15, 23, 42, 0.3); padding: 15px; border-radius: 10px; margin-top: 10px; font-family: monospace; white-space: pre-line;"><strong>Step-by-step solution:</strong>\n${question.explanation}</div>` : ''}
            ${achievementHTML}
          </div>
        `;
      } else {
        // Play wrong sound
        soundManager.playWrong();
        
        // Generate explanation
        // Already generated earlier

        feedbackDiv.innerHTML = `
          <div style="
            background: rgba(239, 68, 68, 0.15);
            border: 1px solid rgba(239, 68, 68, 0.3);
            color: #fca5a5;
            padding: 25px;
            border-radius: 15px;
            text-align: left;
            font-family: 'Inter', sans-serif;
            font-size: 18px;
            box-shadow: 0 6px 20px rgba(239, 68, 68, 0.2);
            animation: slideInUp 0.4s ease-out;
          ">
            <div style="text-align: center; margin-bottom: 15px; font-size: 24px; font-weight: 600;">
              Incorrect
            </div>
            <div style="background: rgba(30, 41, 59, 0.5); padding: 15px; border-radius: 10px; font-size: 16px; line-height: 1.6; color: var(--text-secondary);">
              ${explanation}
            </div>
            <div style="text-align: center; margin-top: 15px; font-size: 16px; font-weight: 600;">
              Don't worry! Keep practicing!
            </div>
          </div>
        `;
        
        // Track incorrect for achievements
        achievementTracker.checkAchievements(currentGame.score, currentGame.totalQuestions, false);
      }

      // After showing feedback/tips, ask the student when to proceed.
      // This keeps the explanation visible until they're ready.
      const existingPrompt = document.getElementById('nextQuestionPrompt');
      if (existingPrompt) {
        existingPrompt.remove();
      }

      const promptDiv = document.createElement('div');
      promptDiv.id = 'nextQuestionPrompt';
      promptDiv.style.position = 'fixed';
      promptDiv.style.bottom = '0';
      promptDiv.style.left = '0';
      promptDiv.style.width = '100%';
      promptDiv.style.zIndex = '1000';
      promptDiv.style.animation = 'slideInUp 0.3s ease-out';
      promptDiv.innerHTML = `
        <div style="
          background: #ffffff;
          border-top: 2px solid var(--border);
          padding: 24px 30px;
          display: flex;
          justify-content: center;
          box-shadow: 0 -10px 40px rgba(0,0,0,0.1);
        ">
          <div style="
            width: 100%;
            max-width: 800px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 20px;
          ">
            <div style="font-family: 'Space Grotesk', sans-serif; font-size: 28px; font-weight: 800; color: ${isCorrect ? 'var(--success)' : 'var(--warning)'}; display: flex; align-items: center; gap: 15px;">
              <div style="background: ${isCorrect ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)'}; border-radius: 50%; width: 50px; height: 50px; display: flex; align-items: center; justify-content: center; font-size: 24px;">
                ${isCorrect ? '✓' : '!'}
              </div>
              <span class="desktop-only" style="display: inline-block;">
                ${isCorrect ? 'Excellent!' : 'Keep Going!'}
              </span>
            </div>
            
            <button id="nextQuestionBtn" onclick="goToNextQuestion()" style="
              background: ${isCorrect ? 'var(--success)' : 'var(--warning)'};
              color: white;
              border: none;
              border-bottom: 6px solid ${isCorrect ? '#059669' : '#d97706'};
              padding: 16px 50px;
              border-radius: 20px;
              font-size: 20px;
              font-weight: 800;
              cursor: pointer;
              font-family: 'Inter', sans-serif;
              transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
              text-transform: uppercase;
              letter-spacing: 1.5px;
            " onmousedown="this.style.transform='translateY(4px)'; this.style.borderBottomWidth='2px';"
            onmouseup="this.style.transform='translateY(0)'; this.style.borderBottomWidth='6px';">
              Continue
            </button>
          </div>
        </div>
        <style>
          @media (max-width: 600px) {
            .desktop-only { display: none !important; }
            #nextQuestionPrompt > div { padding: 20px 15px; }
            #nextQuestionBtn { width: 100%; padding: 16px 20px !important; }
          }
        </style>
      `;

      if (feedbackDiv && feedbackDiv.parentNode) {
        feedbackDiv.parentNode.insertBefore(promptDiv, feedbackDiv.nextSibling);
        
        // Add bottom padding to the scrollable container so the user can scroll past the fixed footer
        const scrollContainer = feedbackDiv.closest('div[style*="overflow-y: auto"]') || document.getElementById('gameContainer').firstElementChild;
        if (scrollContainer) {
          scrollContainer.style.paddingBottom = '140px';
          
          // Auto-scroll slightly to make sure the feedback is visible
          setTimeout(() => {
            scrollContainer.scrollTo({
              top: scrollContainer.scrollHeight,
              behavior: 'smooth'
            });
          }, 100);
        }
      }
    }

    // Called when the student confirms they want to move on to the next question
    window.goToNextQuestion = async function() {
      const btn = document.getElementById('nextQuestionBtn');
      if (btn) {
        btn.disabled = true;
        btn.style.opacity = '0.7';
        btn.style.cursor = 'default';
        btn.textContent = 'Loading...';
      }

      currentGame.currentQuestion++;
      const gameContainer = document.getElementById('gameContainer');
      await renderGameScreen(gameContainer, currentGame.topic);
    }

    // Show game results - ENHANCED VERSION
    async function showGameResults(container, topic) {
      const percentage = Math.round((currentGame.score / currentGame.totalQuestions) * 100);
      const isCompleted = percentage >= 70; // 70% to pass
      const isFullyCompleted = percentage >= 100; // 100% completion
      
      // Final achievement check - get all achievements earned
      const allAchievements = [];
      
      // Check all possible achievements
      if (percentage === 100) {
        allAchievements.push({
          icon: '',
          title: 'Perfect Score!',
          message: 'You got 100%! Outstanding work!',
          type: 'perfect_score'
        });
      }
      
      if (percentage >= 90) {
        allAchievements.push({
          icon: '',
          title: 'Sharpshooter!',
          message: '90%+ accuracy! Incredible precision!',
          type: 'sharpshooter'
        });
      }
      
      // Save achievements to backend
      if (allAchievements.length > 0 && currentUser) {
        allAchievements.forEach(async achievement => {
          try {
            const achievementType = achievement.type || achievement.title.toLowerCase().replace(/[^a-z0-9]/g, '_');
            
            // Check if already earned
            const hasResult = await window.electronAPI.invoke('has-achievement', currentUser.id, achievementType);
            if (!hasResult.has) {
              await window.electronAPI.invoke('save-achievement', currentUser.id, {
                achievementType: achievementType,
                title: achievement.title,
                message: achievement.message,
                topicId: topic ? topic.id : null
              });
            }
          } catch (error) {
            console.error('Error saving achievement:', error);
          }
        });
      }
      
      // Celebrate completion
      if (isFullyCompleted) {
        setTimeout(() => {
          triggerConfetti();
          soundManager.playCelebration();
        }, 300);
      } else if (isCompleted) {
        setTimeout(() => {
          triggerConfetti();
        }, 300);
      }
      
      // Build achievements HTML
      let achievementsHTML = '';
      if (allAchievements.length > 0) {
        achievementsHTML = `
          <div style="
            background: rgba(245, 158, 11, 0.15);
            border: 1px solid rgba(245, 158, 11, 0.3);
            padding: 25px;
            border-radius: 15px;
            margin: 20px 0;
          ">
            <h3 style="color: #fbbf24; margin-bottom: 15px; font-size: 20px; font-family: 'Inter', sans-serif;">Achievements Earned:</h3>
            ${allAchievements.map(ach => `
              <div style="
                background: rgba(30, 41, 59, 0.5);
                padding: 15px;
                border-radius: 10px;
                margin: 10px 0;
                display: flex;
                align-items: center;
                gap: 15px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.2);
              ">
                ${ach.icon ? `<span style="font-size: 32px;">${ach.icon}</span>` : ''}
                <div style="text-align: left;">
                  <div style="font-weight: 600; font-size: 18px; color: var(--text-primary); font-family: 'Inter', sans-serif;">${ach.title}</div>
                  <div style="font-size: 14px; color: var(--text-secondary);">${ach.message}</div>
                </div>
              </div>
            `).join('')}
          </div>
        `;
      }

      // Check if we moved to next topic (after auto-save)
      let nextTopicMessage = '';
      if (isFullyCompleted) {
        const nextTopic = currentGame.nextTopic; // Use stored next topic
        if (nextTopic) {
          nextTopicMessage = `
            <div style="
              background: rgba(16, 185, 129, 0.15);
              border: 1px solid rgba(16, 185, 129, 0.3);
              color: #6ee7b7;
              padding: 20px;
              border-radius: 10px;
              margin-bottom: 20px;
              font-family: 'Inter', sans-serif;
              font-size: 16px;
            ">
              Congratulations! You completed this lesson!<br>
              Next lesson: <strong>${nextTopic.topic_title}</strong>
            </div>
          `;
        } else {
          nextTopicMessage = `
            <div style="
              background: rgba(245, 158, 11, 0.15);
              border: 1px solid rgba(245, 158, 11, 0.3);
              color: #fbbf24;
              padding: 20px;
              border-radius: 10px;
              margin-bottom: 20px;
              font-family: 'Inter', sans-serif;
              font-size: 16px;
            ">
              Amazing! You've completed all lessons for your grade!
            </div>
          `;
        }
      }

      container.innerHTML = `
        <div style="
          min-height: 100vh;
          padding: 60px 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--bg);
        ">
          <div style="
            background: #ffffff;
            border: 2px solid var(--border);
            border-bottom: 8px solid var(--border);
            border-radius: 30px;
            padding: 50px 40px;
            max-width: 600px;
            width: 100%;
            text-align: center;
            position: relative;
          ">
            <button onclick="closeGameInterface()" style="
              position: absolute;
              top: 20px;
              right: 20px;
              background: transparent;
              border: none;
              color: var(--text-secondary);
              font-size: 32px;
              cursor: pointer;
              transition: color 0.2s;
              line-height: 1;
              padding: 5px;
            " onmouseover="this.style.color='#ef4444'" onmouseout="this.style.color='var(--text-secondary)'">
              ✕
            </button>
            
            <h2 style="color: var(--text-primary); margin-bottom: 10px; font-family: 'Space Grotesk', sans-serif; font-size: 36px; font-weight: 800; margin-top: 10px;">
              ${isCompleted ? 'Lesson Complete!' : 'Keep Practicing!'}
            </h2>
            
            <p style="color: var(--text-secondary); margin-bottom: 30px; font-family: 'Inter', sans-serif; font-size: 18px; font-weight: 500;">
              ${topic.topic_title}
            </p>

            ${nextTopicMessage}

            <div style="
              background: var(--surface-alt);
              border: 2px solid var(--border);
              border-radius: 20px;
              padding: 30px;
              margin-bottom: 30px;
              display: flex;
              flex-direction: column;
              align-items: center;
              gap: 10px;
            ">
              <div style="font-size: 72px; font-weight: 800; color: ${isCompleted ? 'var(--success)' : 'var(--warning)'}; line-height: 1; font-family: 'Space Grotesk', sans-serif;">
                ${percentage}%
              </div>
              <div style="color: var(--text-secondary); font-family: 'Inter', sans-serif; font-size: 18px; font-weight: 600;">
                Score: ${currentGame.score} out of ${currentGame.totalQuestions}
              </div>
              <div style="display: flex; gap: 20px; margin-top: 10px; justify-content: center; flex-wrap: wrap;">
                <div style="
                  background: ${currentGame.difficulty === 'hard' ? 'rgba(239,68,68,0.1)' : currentGame.difficulty === 'easy' ? 'rgba(16,185,129,0.1)' : 'rgba(99,102,241,0.1)'};
                  color: ${currentGame.difficulty === 'hard' ? '#ef4444' : currentGame.difficulty === 'easy' ? '#10b981' : '#6366f1'};
                  border-radius: 10px; padding: 6px 14px; font-size: 14px; font-weight: 700;
                ">${currentGame.difficulty === 'hard' ? '🔥 Hard' : currentGame.difficulty === 'easy' ? '🌱 Easy' : '⚡ Medium'}</div>
                <div style="background: rgba(245,158,11,0.1); color: #f59e0b; border-radius: 10px; padding: 6px 14px; font-size: 14px; font-weight: 700;">
                  🪙 ${currentGame.coinsEarned} coins earned
                </div>
                ${currentGame.bonusPoints > 0 ? `<div style="background: rgba(168,85,247,0.1); color: #a855f7; border-radius: 10px; padding: 6px 14px; font-size: 14px; font-weight: 700;">⚡ ${currentGame.bonusPoints} speed bonus</div>` : ''}
              </div>
            </div>
            
            ${achievementsHTML}

            <div style="display: flex; flex-direction: column; gap: 15px; align-items: center; margin-top: 30px;">
              ${currentGame.wrongAnswers.length > 0 ? `
                <button onclick="showReviewMode()" style="
                  background: #f59e0b;
                  color: white;
                  border: none;
                  border-bottom: 6px solid #d97706;
                  padding: 16px 40px;
                  border-radius: 20px;
                  font-size: 18px;
                  font-weight: 700;
                  cursor: pointer;
                  font-family: 'Inter', sans-serif;
                  transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
                  width: 100%;
                  max-width: 400px;
                  text-transform: uppercase;
                  letter-spacing: 1px;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  gap: 10px;
                " onmousedown="this.style.transform='translateY(4px)'; this.style.borderBottomWidth='2px';"
                onmouseup="this.style.transform='translateY(0)'; this.style.borderBottomWidth='6px';">
                  📖 Review Mistakes (${currentGame.wrongAnswers.length})
                </button>
              ` : ''}
              ${isFullyCompleted && currentGame.nextTopic ? `
                <button onclick="proceedToNextQuiz()" style="
                  background: var(--success);
                  color: white;
                  border: none;
                  border-bottom: 6px solid #059669;
                  padding: 16px 40px;
                  border-radius: 20px;
                  font-size: 18px;
                  font-weight: 700;
                  cursor: pointer;
                  font-family: 'Inter', sans-serif;
                  transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
                  width: 100%;
                  max-width: 400px;
                  text-transform: uppercase;
                  letter-spacing: 1px;
                " onmousedown="this.style.transform='translateY(4px)'; this.style.borderBottomWidth='2px';"
                onmouseup="this.style.transform='translateY(0)'; this.style.borderBottomWidth='6px';">
                  Continue to Next Topic
                </button>
              ` : ''}
              
              <button onclick="closeGameInterface()" style="
                background: var(--primary);
                color: white;
                border: none;
                border-bottom: 6px solid #4f46e5;
                padding: 16px 40px;
                border-radius: 20px;
                font-size: 18px;
                font-weight: 700;
                cursor: pointer;
                font-family: 'Inter', sans-serif;
                transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
                width: 100%;
                max-width: 400px;
                text-transform: uppercase;
                letter-spacing: 1px;
              " onmousedown="this.style.transform='translateY(4px)'; this.style.borderBottomWidth='2px';"
              onmouseup="this.style.transform='translateY(0)'; this.style.borderBottomWidth='6px';">
                Return to Dashboard
              </button>
            </div>
          </div>
        </div>
      `;
    }

    // Feature 3: Review Mode — show wrong answers with explanations
    window.showReviewMode = function() {
      const gameContainer = document.getElementById('gameContainer');
      if (!gameContainer) return;

      const wrongAnswers = currentGame.wrongAnswers;
      const cardsHTML = wrongAnswers.map((wa, i) => `
        <div style="
          background: #ffffff;
          border: 2px solid var(--border);
          border-left: 6px solid #ef4444;
          border-radius: 16px;
          padding: 24px;
          margin-bottom: 16px;
        ">
          <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 12px;">
            <span style="font-size: 24px;">${wa.icon}</span>
            <span style="font-family: 'Space Grotesk', sans-serif; font-weight: 700; font-size: 16px; color: var(--text-secondary);">Question ${i + 1}</span>
          </div>
          <div style="font-family: 'Inter', sans-serif; font-size: 18px; font-weight: 600; color: var(--text-primary); margin-bottom: 16px;">
            ${wa.questionText}
          </div>
          <div style="display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 16px;">
            <div style="
              background: rgba(239,68,68,0.1);
              border: 1px solid rgba(239,68,68,0.3);
              color: #ef4444;
              padding: 10px 18px;
              border-radius: 12px;
              font-weight: 600;
              font-size: 15px;
            ">❌ Your answer: ${wa.userAnswer}</div>
            <div style="
              background: rgba(16,185,129,0.1);
              border: 1px solid rgba(16,185,129,0.3);
              color: #10b981;
              padding: 10px 18px;
              border-radius: 12px;
              font-weight: 600;
              font-size: 15px;
            ">✓ Correct: ${wa.correctAnswer}</div>
          </div>
          ${wa.explanation ? `
            <div style="
              background: var(--surface-alt);
              border-radius: 12px;
              padding: 16px;
              font-family: 'Inter', sans-serif;
              font-size: 14px;
              color: var(--text-secondary);
              line-height: 1.6;
              white-space: pre-line;
            ">💡 ${wa.explanation}</div>
          ` : ''}
        </div>
      `).join('');

      gameContainer.innerHTML = `
        <div style="
          min-height: 100vh;
          padding: 30px 20px 60px;
          background: var(--bg);
        ">
          <div style="max-width: 700px; margin: 0 auto;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 30px;">
              <h2 style="font-family: 'Space Grotesk', sans-serif; font-size: 28px; font-weight: 800; color: var(--text-primary); display: flex; align-items: center; gap: 10px;">
                📖 Review Your Mistakes
              </h2>
              <button onclick="closeGameInterface()" style="
                background: var(--primary);
                color: white;
                border: none;
                border-bottom: 4px solid #4f46e5;
                padding: 12px 30px;
                border-radius: 16px;
                font-size: 16px;
                font-weight: 700;
                cursor: pointer;
                font-family: 'Inter', sans-serif;
              " onmousedown="this.style.transform='translateY(3px)'; this.style.borderBottomWidth='1px';"
              onmouseup="this.style.transform='translateY(0)'; this.style.borderBottomWidth='4px';">
                Done
              </button>
            </div>
            <p style="font-family: 'Inter', sans-serif; color: var(--text-secondary); font-size: 16px; margin-bottom: 25px;">
              You got <strong style="color: #ef4444;">${wrongAnswers.length}</strong> question${wrongAnswers.length > 1 ? 's' : ''} wrong. Review them below to learn from your mistakes!
            </p>
            ${cardsHTML}
          </div>
        </div>
      `;
    }

    // Feature 5: Trophy Case — Avatars & Rewards
    function renderTrophyCase() {
      // Avatar definitions with coin unlock thresholds
      const AVATARS = [
        { emoji: '🌱', name: 'Seedling', coins: 0,    desc: 'Starting your journey!' },
        { emoji: '⭐', name: 'Star',      coins: 50,   desc: 'Getting the hang of it!' },
        { emoji: '🦋', name: 'Butterfly', coins: 100,  desc: 'Growing fast!' },
        { emoji: '🦁', name: 'Lion',      coins: 200,  desc: 'Roaring with confidence!' },
        { emoji: '🚀', name: 'Rocket',    coins: 350,  desc: 'Shooting for the stars!' },
        { emoji: '🏆', name: 'Champion',  coins: 500,  desc: 'A true math champion!' },
        { emoji: '🌟', name: 'Superstar', coins: 750,  desc: 'Shining the brightest!' },
        { emoji: '💎', name: 'Diamond',   coins: 1000, desc: 'Rare and brilliant!' },
      ];

      // Calculate total coins from localStorage (persisted across sessions)
      const savedCoins = parseInt(localStorage.getItem('mathify_total_coins') || '0');
      const sessionCoins = currentGame.coinsEarned || 0;
      const totalCoins = savedCoins + sessionCoins;
      localStorage.setItem('mathify_total_coins', totalCoins);

      const mainContent = document.querySelector('.main-content');
      if (!mainContent) return;

      // Show main content
      document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));

      const avatarCards = AVATARS.map(av => {
        const unlocked = totalCoins >= av.coins;
        return `
          <div style="
            background: ${unlocked ? '#ffffff' : 'var(--surface-alt)'};
            border: 2px solid ${unlocked ? 'var(--primary)' : 'var(--border)'};
            border-radius: 20px;
            padding: 24px 16px;
            text-align: center;
            position: relative;
            transition: transform 0.2s;
            ${unlocked ? 'box-shadow: 0 4px 20px rgba(99,102,241,0.15);' : 'opacity: 0.6;'}
          " ${unlocked ? 'onmouseover="this.style.transform=\'translateY(-4px)\'"  onmouseout="this.style.transform=\'none\'"' : ''}>
            ${!unlocked ? `<div style="position:absolute;top:10px;right:10px;font-size:18px;">🔒</div>` : ''}
            <div style="font-size: 52px; margin-bottom: 10px;">${av.emoji}</div>
            <div style="font-family:'Space Grotesk',sans-serif; font-weight:800; font-size:17px; color:var(--text-primary); margin-bottom:4px;">${av.name}</div>
            <div style="font-size:13px; color:var(--text-secondary); margin-bottom:10px;">${av.desc}</div>
            <div style="display:inline-block; background:${unlocked ? 'rgba(245,158,11,0.15)' : 'var(--border)'}; color:${unlocked ? '#f59e0b' : 'var(--text-secondary)'}; border-radius:20px; padding:4px 12px; font-size:13px; font-weight:700;">
              🪙 ${av.coins === 0 ? 'Free' : av.coins + ' coins'}
            </div>
            ${unlocked ? `<div style="margin-top:8px; color:var(--success); font-size:13px; font-weight:700;">✓ Unlocked!</div>` : `<div style="margin-top:8px; color:var(--text-secondary); font-size:12px;">${av.coins - totalCoins} more to unlock</div>`}
          </div>
        `;
      }).join('');

      // Find next locked avatar
      const nextAvatar = AVATARS.find(av => totalCoins < av.coins);
      const progressPct = nextAvatar ? Math.round((totalCoins / nextAvatar.coins) * 100) : 100;

      mainContent.innerHTML = `
        <div id="page-trophycase" class="page active" style="padding: 30px;">
          <div style="max-width: 900px; margin: 0 auto;">
            <h1 style="font-family:'Space Grotesk',sans-serif; font-size:32px; font-weight:800; color:var(--text-primary); margin-bottom:6px;">🏆 Trophy Case</h1>
            <p style="color:var(--text-secondary); font-size:16px; margin-bottom:28px;">Earn coins by answering questions correctly and fast — unlock all avatars!</p>
            
            <div style="
              background: #ffffff;
              border: 2px solid var(--border);
              border-radius: 20px;
              padding: 24px 28px;
              margin-bottom: 28px;
              display: flex;
              align-items: center;
              gap: 24px;
              flex-wrap: wrap;
            ">
              <div style="font-size: 48px;">${AVATARS.filter(av => totalCoins >= av.coins).slice(-1)[0]?.emoji || '🌱'}</div>
              <div style="flex: 1; min-width: 200px;">
                <div style="font-family:'Space Grotesk',sans-serif; font-weight:800; font-size:20px; color:var(--text-primary); margin-bottom:4px;">
                  ${AVATARS.filter(av => totalCoins >= av.coins).slice(-1)[0]?.name || 'Seedling'} — Current Avatar
                </div>
                <div style="color:var(--text-secondary); font-size:15px; margin-bottom:10px;">🪙 Total Coins: <strong style="color:#f59e0b;">${totalCoins.toLocaleString()}</strong></div>
                ${nextAvatar ? `
                  <div style="width:100%; background:var(--border); border-radius:8px; height:12px; overflow:hidden;">
                    <div style="background:linear-gradient(90deg,#f59e0b,#fbbf24); width:${progressPct}%; height:100%; border-radius:8px; transition:width 0.6s;"></div>
                  </div>
                  <div style="font-size:13px; color:var(--text-secondary); margin-top:6px;">${progressPct}% to unlock ${nextAvatar.emoji} ${nextAvatar.name} (${nextAvatar.coins} coins)</div>
                ` : `<div style="color:var(--success);font-weight:700;">🎉 All avatars unlocked!</div>`}
              </div>
              <div style="text-align:center;">
                <div style="font-family:'Space Grotesk',sans-serif; font-size:36px; font-weight:800; color:var(--primary);">${AVATARS.filter(av => totalCoins >= av.coins).length}/${AVATARS.length}</div>
                <div style="font-size:13px; color:var(--text-secondary);">Unlocked</div>
              </div>
            </div>

            <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap:16px;">
              ${avatarCards}
            </div>
          </div>
        </div>
      `;
    }

    // Proceed to next quiz automatically
    window.proceedToNextQuiz = async function() {
      if (!currentGame || !currentGame.nextTopic) {
        closeGameInterface();
        return;
      }

      const nextTopic = currentGame.nextTopic;
      
      // Close current results screen
      const gameContainer = document.getElementById('gameContainer');
      if (gameContainer) {
        gameContainer.remove();
      }

      // Start next quiz immediately
      await openGameInterface(nextTopic);
    }

    // Auto save game progress (called automatically after game completion)
    async function saveGameProgressAuto(topic) {
      if (!topic || !currentUser) return;

      const percentage = Math.round((currentGame.score / currentGame.totalQuestions) * 100);
      const isCompleted = percentage >= 70; // 70% to pass
      const isFullyCompleted = percentage >= 100; // 100% completion

      try {
        // Save practice session for stats tracking
        await window.electronAPI.invoke('save-practice-session', 
          currentUser.id, 
          topic.id, 
          currentGame.score, 
          currentGame.totalQuestions
        );

        const result = await window.electronAPI.invoke('update-student-topic-progress', currentUser.id, topic.id, {
          progressPercentage: percentage,
          completed: isCompleted,
          bestScore: percentage
        });

        if (result.success) {
          // Update student progress (coins, level, lessons completed)
          const coinsEarned = Math.floor(percentage / 10); // 1 coin per 10%
          
          // Count completed topics
          const topicProgressResult = await window.electronAPI.invoke('get-student-topic-progress', currentUser.id, currentUser.studentGrade);
          const completedTopics = (topicProgressResult.progress || []).filter(p => 
            (p.completed === 1 || p.completed === true) || (p.progress_percentage >= 100)
          ).length;
          
          let nextTopic = null;
          let nextTopicTitle = topic.topic_title;
          let nextTopicProgress = percentage;

          // If topic is 100% complete, find and set next topic
          if (isFullyCompleted) {
            nextTopic = await findNextTopic(topic);
            currentGame.nextTopic = nextTopic; // Store for results display
            if (nextTopic) {
              nextTopicTitle = nextTopic.topic_title;
              nextTopicProgress = 0; // Reset progress for new topic
            }
          }

          await window.electronAPI.invoke('update-student-progress', currentUser.id, {
            coins: (studentProgress?.coins || 0) + coinsEarned,
            current_lesson: nextTopicTitle,
            current_lesson_progress: nextTopicProgress,
            total_lessons_completed: completedTopics
          });

          // Reload student data to update stats
          await loadStudentData();
        }
      } catch (error) {
        console.error('Error saving progress:', error);
      }
    }

    // Find next topic after completing current one
    async function findNextTopic(currentTopic) {
      if (!currentUser || !currentUser.studentGrade) return null;

      try {
        // Get all topics for student's grade, ordered by order_index
        const topicsResult = await window.electronAPI.invoke('get-curriculum-topics', currentUser.studentGrade);
        
        if (!topicsResult.success || !topicsResult.topics || topicsResult.topics.length === 0) {
          return null;
        }

        // Find current topic's index
        const currentIndex = topicsResult.topics.findIndex(t => t.id === currentTopic.id);
        
        if (currentIndex === -1) {
          return null;
        }

        // Find next topic that is not completed
        const progressResult = await window.electronAPI.invoke('get-student-topic-progress', currentUser.id, currentUser.studentGrade);
        const progressMap = {};
        if (progressResult.success && progressResult.progress) {
          progressResult.progress.forEach(p => {
            progressMap[p.topic_id] = p;
          });
        }

        // Look for next uncompleted topic
        for (let i = currentIndex + 1; i < topicsResult.topics.length; i++) {
          const nextTopic = topicsResult.topics[i];
          const progress = progressMap[nextTopic.id];
          if (!progress || !progress.completed || progress.progress_percentage < 100) {
            return nextTopic;
          }
        }

        // If all remaining topics are completed, return null (all done!)
        return null;
      } catch (error) {
        console.error('Error finding next topic:', error);
        return null;
      }
    }

    // Close game interface
    window.closeGameInterface = function() {
      // Feature 2: Clear timer
      if (currentGame.timerInterval) { clearInterval(currentGame.timerInterval); currentGame.timerInterval = null; }

      const gameContainer = document.getElementById('gameContainer');
      if (gameContainer) {
        gameContainer.remove();
      }
      
      // Show dashboard elements again (new UI structure)
      const sidebar = document.querySelector('.sidebar');
      const mainContent = document.querySelector('.main-content');
      if (sidebar) sidebar.style.display = 'flex';
      if (mainContent) mainContent.style.display = 'block';
      
      // Reload student data
      loadStudentData();
    }

    // Generate game questions based on topic using curriculum-aware generator
    async function generateGameQuestions(topic) {
      try {
        // Ensure the topic carries the correct grade information for the generator.
        // If the topic from the database doesn't include grade, fall back to the
        // currently logged-in student's grade so Grade 2–6 students don't get Grade 1 questions.
        const effectiveGrade =
          (topic && (topic.grade || topic.grade === 0) ? topic.grade : null) ||
          (currentUser && currentUser.studentGrade) ||
          1;

        const topicForGeneration = {
          ...topic,
          grade: effectiveGrade,
        };

        // Try to use curriculum-based question generator first
        const result = await window.electronAPI.invoke(
          'generate-curriculum-questions',
          topicForGeneration,
          10
        );
        if (result.success && result.questions && result.questions.length > 0) {
          // Ensure no duplicate questions inside a quiz (same text/options/answer)
          const unique = [];
          const signatures = new Set();
          for (const q of result.questions) {
            const sig = `${q.question}|${JSON.stringify(q.options || [])}|${q.correctAnswer}`;
            if (!signatures.has(sig)) {
              signatures.add(sig);
              unique.push(q);
            }
          }

          if (unique.length >= 10) {
            console.log('Generated curriculum-based questions (unique):', unique.length);
            return unique.slice(0, 10);
          }

          if (unique.length > 0) {
            console.log('Generated fewer unique questions than requested:', unique.length);
            return unique;
          }
        }
      } catch (error) {
        console.error('Error generating curriculum questions, using fallback:', error);
      }
      
      // Fallback to original generator if curriculum generator fails
      return generateGameQuestionsFallback(topic);
    }

    // Fallback question generator (original implementation with duplicate prevention)
    function generateGameQuestionsFallback(topic) {
      const questions = [];
      const usedQuestions = new Set(); // Track unique question signatures
      const category = topic.category || 'Operations';
      const grade = topic.grade || 1;
      const code = topic.topic_code || '';
      const maxAttempts = 100; // Prevent infinite loops
      let attempts = 0;

      // Generate 10 unique questions based on topic
      while (questions.length < 10 && attempts < maxAttempts) {
        attempts++;
        let question = null;
        let questionType = '';

        // Number Sense questions
        if (category === 'Number Sense') {
          if (code.includes('Numbers-100') || code.includes('Numbers-1000') || code.includes('Numbers-10000') || code.includes('Numbers-1M')) {
            question = generateNumberRecognitionQuestion(grade, questions.length);
            questionType = 'number-recognition';
          } else if (code.includes('Ordinal')) {
            question = generateOrdinalNumberQuestion(grade, questions.length);
            questionType = 'ordinal';
          } else if (code.includes('Fractions')) {
            question = generateFractionQuestion(grade, questions.length);
            questionType = 'fraction';
          } else if (code.includes('Decimals')) {
            question = generateDecimalQuestion(grade, questions.length);
            questionType = 'decimal';
          } else if (code.includes('Odd-Even')) {
            question = generateOddEvenQuestion(questions.length);
            questionType = 'odd-even';
          } else if (code.includes('Factors') || code.includes('Multiples')) {
            question = generateFactorsMultiplesQuestion(grade, questions.length);
            questionType = 'factors';
          } else {
            question = generateNumberRecognitionQuestion(grade, questions.length);
            questionType = 'number-recognition';
          }
        }
        // Operations questions
        else if (category === 'Operations') {
          // Mix different operation types for variety
          const opTypes = [];
          if (code.includes('Add') || code.includes('Sub')) {
            opTypes.push('add-sub');
          }
          if (code.includes('Mult') || code.includes('Div')) {
            opTypes.push('mult-div');
          }
          if (code.includes('GEMDAS') || code.includes('Exponents')) {
            opTypes.push('gemdas');
          }
          
          // If no specific type, use all
          if (opTypes.length === 0) {
            opTypes.push('add-sub', 'mult-div');
          }
          
          // Rotate through types for variety
          const selectedType = opTypes[questions.length % opTypes.length];
          
          if (selectedType === 'add-sub') {
            question = generateAdditionSubtractionQuestion(grade, questions.length);
            questionType = 'add-sub';
          } else if (selectedType === 'mult-div') {
            question = generateMultiplicationDivisionQuestion(grade, questions.length);
            questionType = 'mult-div';
          } else if (selectedType === 'gemdas') {
            question = generateGEMDASQuestion(grade, questions.length);
            questionType = 'gemdas';
          } else {
            question = generateAdditionSubtractionQuestion(grade, questions.length);
            questionType = 'add-sub';
          }
        }
        // Geometry questions
        else if (category === 'Geometry') {
          const geoTypes = [];
          if (code.includes('Shapes') || code.includes('2D')) {
            geoTypes.push('shape');
          }
          if (code.includes('Area') || code.includes('Perimeter')) {
            geoTypes.push('area-perimeter');
          }
          if (code.includes('Angles')) {
            geoTypes.push('angle');
          }
          if (code.includes('Circle')) {
            geoTypes.push('circle');
          }
          
          if (geoTypes.length === 0) geoTypes.push('shape', 'area-perimeter');
          
          const selectedType = geoTypes[questions.length % geoTypes.length];
          
          if (selectedType === 'shape') {
            question = generateShapeQuestion(grade, questions.length);
            questionType = 'shape';
          } else if (selectedType === 'area-perimeter') {
            question = generateAreaPerimeterQuestion(grade, questions.length);
            questionType = 'area-perimeter';
          } else if (selectedType === 'angle') {
            question = generateAngleQuestion(grade, questions.length);
            questionType = 'angle';
          } else if (selectedType === 'circle') {
            question = generateCircleQuestion(questions.length);
            questionType = 'circle';
          } else {
            question = generateShapeQuestion(grade, questions.length);
            questionType = 'shape';
          }
        }
        // Measurement questions
        else if (category === 'Measurement') {
          const measTypes = [];
          if (code.includes('Money')) measTypes.push('money');
          if (code.includes('Time')) measTypes.push('time');
          if (code.includes('Length') || code.includes('Distance')) measTypes.push('length');
          
          if (measTypes.length === 0) measTypes.push('money', 'time', 'length');
          
          const selectedType = measTypes[questions.length % measTypes.length];
          
          if (selectedType === 'money') {
            question = generateMoneyQuestion(grade, questions.length);
            questionType = 'money';
          } else if (selectedType === 'time') {
            question = generateTimeQuestion(grade, questions.length);
            questionType = 'time';
          } else if (selectedType === 'length') {
            question = generateLengthQuestion(grade, questions.length);
            questionType = 'length';
          } else {
            question = generateMoneyQuestion(grade, questions.length);
            questionType = 'money';
          }
        }
        // Data questions
        else if (category === 'Data') {
          question = generateDataQuestion(grade, questions.length);
          questionType = 'data';
        }
        // Patterns questions
        else if (category === 'Patterns') {
          question = generatePatternQuestion(grade, questions.length);
          questionType = 'pattern';
        }
        // Problem Solving questions
        else if (category === 'Problem Solving') {
          question = generateProblemSolvingQuestion(grade, questions.length);
          questionType = 'problem-solving';
        }
        // Default: Operations
        else {
          question = generateAdditionSubtractionQuestion(grade, questions.length);
          questionType = 'add-sub';
        }

        // Check for duplicates using question signature
        if (question) {
          // Create a unique signature based on question text and answer
          const questionSignature = `${questionType}-${question.question}-${question.correctAnswer}`;
          
          if (!usedQuestions.has(questionSignature)) {
            usedQuestions.add(questionSignature);
            questions.push(question);
            attempts = 0; // Reset attempts counter on success
          } else {
            // If duplicate found, try generating with different seed
            attempts++;
            continue;
          }
        }
      }

      // If we couldn't generate enough unique questions, try generating more variations
      if (questions.length < 10) {
        console.warn(`Generated ${questions.length} unique questions. Attempting to generate more...`);
        // Try a few more times with different approaches
        for (let extraAttempt = 0; extraAttempt < 20 && questions.length < 10; extraAttempt++) {
          // Force different question by using a high index
          const forcedIndex = questions.length + 100 + extraAttempt;
          let question = null;
          
          // Try different question types based on category
          if (category === 'Operations') {
            question = generateAdditionSubtractionQuestion(grade, forcedIndex);
          } else if (category === 'Number Sense') {
            question = generateNumberRecognitionQuestion(grade, forcedIndex);
          } else if (category === 'Geometry') {
            question = generateShapeQuestion(grade, forcedIndex);
          } else {
            question = generateAdditionSubtractionQuestion(grade, forcedIndex);
          }
          
          if (question) {
            const questionSignature = `forced-${question.question}-${question.correctAnswer}`;
            if (!usedQuestions.has(questionSignature)) {
              usedQuestions.add(questionSignature);
              questions.push(question);
            }
          }
        }
      }

      return questions;
    }

    // Question generators for different categories

    function generateNumberRecognitionQuestion(grade, index = 0) {
      const maxNum = grade === 1 ? 100 : grade === 2 ? 1000 : grade === 3 ? 10000 : grade === 4 ? 1000000 : 1000000;
      // Use index and timestamp to ensure variety
      const seed = (Math.floor(Math.random() * 1000000)) + (index * 137) + Math.random() * 1000;
      const num = Math.floor((seed * 7919) % maxNum) + 1; // Prime number for better distribution
      const options = [num];
      let optionAttempts = 0;
      while (options.length < 4 && optionAttempts < 50) {
        optionAttempts++;
        const optSeed = seed + options.length * 1000 + optionAttempts;
        const opt = Math.floor((optSeed * 7919) % maxNum) + 1;
        if (!options.includes(opt)) options.push(opt);
      }
      // Fill remaining if needed
      while (options.length < 4) {
        const opt = Math.floor(Math.random() * maxNum) + 1;
        if (!options.includes(opt)) options.push(opt);
      }
      options.sort(() => Math.random() - 0.5);
      return {
        question: `What number is this: ${num.toLocaleString()}?`,
        type: 'multiple-choice',
        options: options.map(n => n.toLocaleString()),
        correctAnswer: options.indexOf(num),
        icon: '🔢'
      };
    }

    function generateOrdinalNumberQuestion(grade, index = 0) {
      const maxOrd = grade === 1 ? 10 : 20;
      const seed = (Math.floor(Math.random() * 1000000)) + (index * 97);
      const position = (Math.floor(seed * 7919) % maxOrd) + 1;
      const ordinals = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th', 
                        '11th', '12th', '13th', '14th', '15th', '16th', '17th', '18th', '19th', '20th'];
      const options = [ordinals[position - 1]];
      let optionAttempts = 0;
      while (options.length < 4 && optionAttempts < 50) {
        optionAttempts++;
        const optSeed = seed + options.length * 100;
        const optIndex = Math.floor(optSeed * 7919) % maxOrd;
        const opt = ordinals[optIndex];
        if (!options.includes(opt)) options.push(opt);
      }
      // Fill remaining if needed
      while (options.length < 4) {
        const opt = ordinals[Math.floor(Math.random() * maxOrd)];
        if (!options.includes(opt)) options.push(opt);
      }
      options.sort(() => Math.random() - 0.5);
      return {
        question: `What is the ordinal number for position ${position}?`,
        type: 'multiple-choice',
        options: options,
        correctAnswer: options.indexOf(ordinals[position - 1]),
        icon: '📊'
      };
    }

    function generateFractionQuestion(grade, index = 0) {
      if (grade === 1) {
        const fractions = ['1/2', '1/4'];
        const frac = fractions[index % fractions.length];
        return {
          question: `Which shape shows ${frac}?`,
          type: 'multiple-choice',
          options: ['Half shaded', 'Quarter shaded', 'Full shaded', 'Empty'],
          correctAnswer: frac === '1/2' ? 0 : 1,
          icon: '🍕'
        };
      } else {
        const seed = (Math.floor(Math.random() * 1000000)) + (index * 23);
        const num = (Math.floor(seed * 7919) % 3) + 1;
        const denominators = [2, 3, 4, 5, 6, 8];
        const den = denominators[(Math.floor(seed * 7919) + index) % denominators.length];
        return {
          question: `What is ${num}/${den} as a decimal? (Round to 2 decimals)`,
          type: 'number',
          correctAnswer: Math.round((num / den) * 100) / 100,
          icon: '🍰'
        };
      }
    }

    function generateDecimalQuestion(grade, index = 0) {
      const seed = (Math.floor(Math.random() * 1000000)) + (index * 97);
      const whole = Math.floor(seed * 7919) % 100;
      const decimal = Math.floor(seed * 9973) % 100 / 100;
      const num = whole + decimal;
      return {
        question: `What is ${num.toFixed(2)} rounded to the nearest whole number?`,
        type: 'number',
        correctAnswer: Math.round(num),
        icon: '🔢'
      };
    }

    function generateOddEvenQuestion(index = 0) {
      const seed = (Math.floor(Math.random() * 1000000)) + (index * 97);
      const num = (Math.floor(seed * 7919) % 100) + 1;
      return {
        question: `Is ${num} odd or even?`,
        type: 'multiple-choice',
        options: ['Odd', 'Even'],
        correctAnswer: num % 2,
        icon: '🔢'
      };
    }

    function generateFactorsMultiplesQuestion(grade, index = 0) {
      const seed = (Math.floor(Math.random() * 1000000)) + (index * 97);
      const num = (Math.floor(seed * 7919) % 50) + 2;
      const factors = [];
      for (let i = 1; i <= num; i++) {
        if (num % i === 0) factors.push(i);
      }
      const factor = factors[(Math.floor(seed * 9973) + index) % factors.length];
      return {
        question: `What is a factor of ${num}?`,
        type: 'multiple-choice',
        options: [factor, factor + 1, factor + 2, factor + 3].map(n => n.toString()),
        correctAnswer: 0,
        icon: '🔢'
      };
    }

    function generateAdditionSubtractionQuestion(grade, index = 0) {
      const max = grade === 1 ? 100 : grade === 2 ? 1000 : grade === 3 ? 10000 : 1000000;
      const seed = (Math.floor(Math.random() * 1000000)) + (index * 137);
      // Alternate between addition and subtraction for variety
      const isAdd = (index % 2 === 0);
      // Use seed to generate different numbers
      const a = (Math.floor(seed * 7919) % (max / 2)) + 1;
      const b = (Math.floor(seed * 9973) % (max / 2)) + 1;
      const answer = isAdd ? a + b : Math.max(a, b) - Math.min(a, b);
      return {
        question: `What is ${isAdd ? `${a} + ${b}` : `${Math.max(a, b)} - ${Math.min(a, b)}`}?`,
        type: 'number',
        correctAnswer: answer,
        icon: isAdd ? '➕' : '➖'
      };
    }

    function generateMultiplicationDivisionQuestion(grade, index = 0) {
      const tables = grade === 2 ? [2, 3, 4, 5, 10] : [6, 7, 8, 9];
      const seed = (Math.floor(Math.random() * 1000000)) + (index * 97);
      const table = tables[(Math.floor(seed * 7919) + index) % tables.length];
      const multiplier = (Math.floor(seed * 9973) % 12) + 1;
      // Alternate between multiplication and division
      const isMult = (index % 2 === 0);
      
      if (isMult) {
        return {
          question: `What is ${table} × ${multiplier}?`,
          type: 'number',
          correctAnswer: table * multiplier,
          icon: '✖️'
        };
      } else {
        const product = table * multiplier;
        return {
          question: `What is ${product} ÷ ${table}?`,
          type: 'number',
          correctAnswer: multiplier,
          icon: '➗'
        };
      }
    }

    function generateGEMDASQuestion(grade, index = 0) {
      const seed = (Math.floor(Math.random() * 1000000)) + (index * 97);
      const a = (Math.floor(seed * 7919) % 10) + 1;
      const b = (Math.floor(seed * 9973) % 10) + 1;
      const c = (Math.floor(seed * 7919 * 9973) % 10) + 1;
      const expression = `${a} + ${b} × ${c}`;
      return {
        question: `Solve: ${expression} (Follow GEMDAS)`,
        type: 'number',
        correctAnswer: a + (b * c),
        icon: '🧮'
      };
    }

    function generateShapeQuestion(grade, index = 0) {
      const shapes = grade === 1 ? ['Circle', 'Square', 'Triangle', 'Rectangle'] : 
                     ['Circle', 'Square', 'Triangle', 'Rectangle', 'Pentagon', 'Hexagon'];
      const shape = shapes[index % shapes.length];
      return {
        question: `How many sides does a ${shape} have?`,
        type: 'number',
        correctAnswer: shape === 'Circle' ? 0 : shape === 'Triangle' ? 3 : shape === 'Square' || shape === 'Rectangle' ? 4 : shape === 'Pentagon' ? 5 : 6,
        icon: '🔷'
      };
    }

    function generateAreaPerimeterQuestion(grade, index = 0) {
      const seed = (Math.floor(Math.random() * 1000000)) + (index * 97);
      const length = (Math.floor(seed * 7919) % 10) + 1;
      const width = (Math.floor(seed * 9973) % 10) + 1;
      const isArea = (index % 2 === 0);
      return {
        question: `What is the ${isArea ? 'area' : 'perimeter'} of a rectangle with length ${length} and width ${width}?`,
        type: 'number',
        correctAnswer: isArea ? length * width : 2 * (length + width),
        icon: '📐'
      };
    }

    function generateAngleQuestion(grade, index = 0) {
      const angles = [
        { name: 'Right angle', value: 90 },
        { name: 'Acute angle', value: 45 },
        { name: 'Obtuse angle', value: 120 }
      ];
      const angle = angles[index % angles.length];
      return {
        question: `What is the measure of a ${angle.name.toLowerCase()}?`,
        type: 'number',
        correctAnswer: angle.value,
        icon: '📐'
      };
    }

    function generateCircleQuestion(index = 0) {
      const seed = (Math.floor(Math.random() * 1000000)) + (index * 97);
      const radius = (Math.floor(seed * 7919) % 10) + 1;
      return {
        question: `What is the area of a circle with radius ${radius}? (Use π = 3.14, round to nearest whole)`,
        type: 'number',
        correctAnswer: Math.round(3.14 * radius * radius),
        icon: '⭕'
      };
    }

    function generateMoneyQuestion(grade, index = 0) {
      const max = grade === 1 ? 100 : 1000;
      const seed = (Math.floor(Math.random() * 1000000)) + (index * 97);
      const amount1 = Math.floor((seed * 7919) % (max / 2));
      const amount2 = Math.floor((seed * 9973) % (max / 2));
      return {
        question: `If you have ₱${amount1} and spend ₱${amount2}, how much is left?`,
        type: 'number',
        correctAnswer: Math.max(0, amount1 - amount2),
        icon: '🪙'
      };
    }

    function generateTimeQuestion(grade, index = 0) {
      const seed = (Math.floor(Math.random() * 1000000)) + (index * 97);
      const hour1 = (Math.floor(seed * 7919) % 12) + 1;
      const min1 = Math.floor(seed * 9973) % 60;
      const hour2 = (Math.floor(seed * 7919 * 9973) % 12) + 1;
      const min2 = Math.floor((seed * 7919 * 9973 * 7919) % 60);
      const total1 = hour1 * 60 + min1;
      const total2 = hour2 * 60 + min2;
      const diff = Math.abs(total1 - total2);
      return {
        question: `How many minutes are between ${hour1}:${min1.toString().padStart(2, '0')} and ${hour2}:${min2.toString().padStart(2, '0')}?`,
        type: 'number',
        correctAnswer: diff,
        icon: '⏰'
      };
    }

    function generateLengthQuestion(grade, index = 0) {
      const seed = (Math.floor(Math.random() * 1000000)) + (index * 97);
      const length1 = (Math.floor(seed * 7919) % 100) + 1;
      const length2 = (Math.floor(seed * 9973) % 100) + 1;
      return {
        question: `If a rope is ${length1} cm and another is ${length2} cm, what is the total length in meters? (Round to 1 decimal)`,
        type: 'number',
        correctAnswer: Math.round(((length1 + length2) / 100) * 10) / 10,
        icon: '📏'
      };
    }

    function generateDataQuestion(grade, index = 0) {
      const values = [5, 8, 12, 15, 20];
      const value = values[index % values.length];
      return {
        question: `In a bar graph, if one bar shows ${value} and another shows ${value * 2}, what is the difference?`,
        type: 'number',
        correctAnswer: value,
        icon: '📊'
      };
    }

    function generatePatternQuestion(grade, index = 0) {
      const patterns = [
        { seq: [2, 4, 6, 8], next: 10 },
        { seq: [5, 10, 15, 20], next: 25 },
        { seq: [1, 3, 5, 7], next: 9 },
        { seq: [3, 6, 9, 12], next: 15 },
        { seq: [10, 20, 30, 40], next: 50 },
        { seq: [4, 8, 12, 16], next: 20 }
      ];
      const pattern = patterns[index % patterns.length];
      return {
        question: `What comes next in this pattern: ${pattern.seq.join(', ')}?`,
        type: 'number',
        correctAnswer: pattern.next,
        icon: '🔁'
      };
    }

    function generateProblemSolvingQuestion(grade, index = 0) {
      const seed = (Math.floor(Math.random() * 1000000)) + (index * 97);
      const apples = (Math.floor(seed * 7919) % 20) + 5;
      const oranges = (Math.floor(seed * 9973) % 20) + 5;
      // Vary the problem types
      const problemTypes = [
        { type: 'total', question: `Maria has ${apples} apples and ${oranges} oranges. How many fruits does she have in total?`, answer: apples + oranges },
        { type: 'difference', question: `Juan has ${apples} marbles. Ana has ${oranges} marbles. How many more marbles does Juan have?`, answer: Math.max(0, apples - oranges) },
        { type: 'total', question: `There are ${apples} boys and ${oranges} girls in a class. How many students are there?`, answer: apples + oranges }
      ];
      const problem = problemTypes[index % problemTypes.length];
      return {
        question: problem.question,
        type: 'number',
        correctAnswer: problem.answer,
        icon: '🍎'
      };
    }

    // Complete task
    async function completeTask(taskId) {
      try {
        const result = await window.electronAPI.invoke('complete-daily-task', taskId);
        if (result.success) {
          await loadStudentData();
        }
      } catch (error) {
        console.error('Error completing task:', error);
      }
    }

    // Handle logout
    window.handleLogout = async function() {
      try {
        if (window.auth && window.auth.logout) {
          await window.auth.logout();
        }
        window.navigateToAuth();
      } catch (error) {
        console.error('Error logging out:', error);
        window.navigateToAuth();
      }
    }

    // Initialize when page loads
    window.addEventListener('DOMContentLoaded', function() {
      loadCurrentUser();
    });
