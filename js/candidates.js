/**
 * HR Recruitment App - Candidates Module
 * File: js/candidates.js
 * Handles Candidate screening, List view, Kanban view, Candidate profile,
 * Scoring evaluation, Notes, and Timeline
 * Supports HR and Applicant roles with bilingual (TH/EN) translations
 */

(function () {
  'use strict';

  // Module internal state
  const state = {
    viewMode: 'list', // 'list' | 'kanban'
    selectedJobFilter: 'all',
    selectedStatusFilter: 'all',
    selectedScoreFilter: 'all', // 'all', '4plus', '3plus', 'unrated'
    searchQuery: '',
    activeProfileTab: 'overview' // 'overview', 'scoring', 'notes', 'timeline', 'resume'
  };

  // Translation helper with bilingual fallbacks
  function t(key, fallback) {
    if (window.App && typeof window.App.t === 'function') {
      const val = window.App.t(key);
      if (val && val !== key) return val;
    }
    const isEn = window.App && typeof window.App.getLang === 'function' && window.App.getLang() === 'en';
    if (fallback) {
      if (typeof fallback === 'object') {
        return isEn ? (fallback.en || fallback.th) : (fallback.th || fallback.en);
      }
      return fallback;
    }
    return key;
  }

  // Format date helper
  function formatDate(dateStr) {
    if (!dateStr) return '-';
    if (window.App && typeof window.App.formatDate === 'function') {
      return window.App.formatDate(dateStr);
    }
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString(window.App && window.App.getLang() === 'en' ? 'en-US' : 'th-TH', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (e) {
      return dateStr;
    }
  }

  // Status badge config
  const STATUS_CONFIG = {
    new: {
      color: '#06B6D4',
      bg: 'rgba(6, 182, 212, 0.12)',
      border: 'rgba(6, 182, 212, 0.3)',
      icon: 'fa-envelope-open-text',
      th: 'ใหม่',
      en: 'New'
    },
    screening: {
      color: '#F59E0B',
      bg: 'rgba(245, 158, 11, 0.12)',
      border: 'rgba(245, 158, 11, 0.3)',
      icon: 'fa-magnifying-glass',
      th: 'กำลังคัดกรอง',
      en: 'Screening'
    },
    qualified: {
      color: '#2563EB',
      bg: 'rgba(37, 99, 235, 0.12)',
      border: 'rgba(37, 99, 235, 0.3)',
      icon: 'fa-circle-check',
      th: 'ผ่านเกณฑ์',
      en: 'Qualified'
    },
    interview_scheduled: {
      color: '#8B5CF6',
      bg: 'rgba(139, 92, 246, 0.12)',
      border: 'rgba(139, 92, 246, 0.3)',
      icon: 'fa-calendar-check',
      th: 'นัดสัมภาษณ์',
      en: 'Interview Scheduled'
    },
    interviewed: {
      color: '#1D4ED8',
      bg: 'rgba(29, 78, 216, 0.12)',
      border: 'rgba(29, 78, 216, 0.3)',
      icon: 'fa-comments',
      th: 'สัมภาษณ์แล้ว',
      en: 'Interviewed'
    },
    offered: {
      color: '#059669',
      bg: 'rgba(5, 150, 105, 0.12)',
      border: 'rgba(5, 150, 105, 0.3)',
      icon: 'fa-file-signature',
      th: 'ยื่นข้อเสนอ',
      en: 'Offered'
    },
    hired: {
      color: '#10B981',
      bg: 'rgba(16, 185, 129, 0.15)',
      border: 'rgba(16, 185, 129, 0.35)',
      icon: 'fa-trophy',
      th: 'รับเข้าทำงาน',
      en: 'Hired'
    },
    rejected: {
      color: '#EF4444',
      bg: 'rgba(239, 68, 68, 0.12)',
      border: 'rgba(239, 68, 68, 0.3)',
      icon: 'fa-circle-xmark',
      th: 'ปฏิเสธ',
      en: 'Rejected'
    }
  };

  // Get status badge HTML
  function getCandidateBadge(status) {
    const isEn = window.App && window.App.getLang() === 'en';
    const cfg = STATUS_CONFIG[status] || STATUS_CONFIG['new'];
    const label = isEn ? cfg.en : cfg.th;
    return `
      <span class="badge badge-${status}" style="background: ${cfg.bg}; color: ${cfg.color}; border: 1px solid ${cfg.border}; font-weight: 600; font-size: 0.72rem; padding: 3px 8px; border-radius: 20px; display: inline-flex; align-items: center; gap: 4px; white-space: nowrap;">
        <i class="fa-solid ${cfg.icon}" style="font-size: 0.65rem;"></i>
        <span>${label}</span>
      </span>
    `;
  }

  // Calculate average score helper
  function calculateAverageScore(scores) {
    if (!scores) return 0;
    const vals = [scores.qualification || 0, scores.experience || 0, scores.skills || 0].filter(v => v > 0);
    if (vals.length === 0) return 0;
    const sum = vals.reduce((a, b) => a + b, 0);
    return Math.round((sum / vals.length) * 10) / 10;
  }

  // Render Star Rating HTML
  function renderStarRating(avgScore) {
    const fullStars = Math.floor(avgScore);
    const hasHalf = (avgScore - fullStars) >= 0.5;
    let starsHtml = '';

    for (let i = 1; i <= 5; i++) {
      if (i <= fullStars) {
        starsHtml += '<i class="fa-solid fa-star" style="color: #F59E0B; font-size: 0.75rem;"></i>';
      } else if (i === fullStars + 1 && hasHalf) {
        starsHtml += '<i class="fa-solid fa-star-half-stroke" style="color: #F59E0B; font-size: 0.75rem;"></i>';
      } else {
        starsHtml += '<i class="fa-regular fa-star" style="color: var(--border); font-size: 0.75rem;"></i>';
      }
    }
    return `
      <div style="display: inline-flex; align-items: center; gap: 2px;">
        ${starsHtml}
        ${avgScore > 0 ? `<span style="font-size: 0.75rem; font-weight: 700; color: #F59E0B; margin-left: 4px;">${avgScore}</span>` : ''}
      </div>
    `;
  }

  window.CandidatesModule = {
    /**
     * Render main candidates view
     */
    render: function () {
      const isHR = window.App && typeof window.App.isHR === 'function' ? window.App.isHR() : true;
      if (isHR) {
        return this.renderHR();
      } else {
        return this.renderApplicant();
      }
    },

    /**
     * Render HR Candidates List & Kanban View
     */
    renderHR: function () {
      const isEn = window.App && window.App.getLang() === 'en';

      const allCandidates = (window.Data && typeof window.Data.getCandidates === 'function') ? window.Data.getCandidates() : [];
      const allJobs = (window.Data && typeof window.Data.getJobs === 'function') ? window.Data.getJobs() : [];

      // Filter candidates
      let filtered = allCandidates.filter(c => {
        // Job filter
        if (state.selectedJobFilter !== 'all' && c.jobId !== state.selectedJobFilter) {
          return false;
        }

        // Status filter
        if (state.selectedStatusFilter !== 'all' && c.status !== state.selectedStatusFilter) {
          return false;
        }

        // Score filter
        const avg = calculateAverageScore(c.scores);
        if (state.selectedScoreFilter === '4plus' && avg < 4) return false;
        if (state.selectedScoreFilter === '3plus' && avg < 3) return false;
        if (state.selectedScoreFilter === 'unrated' && avg > 0) return false;

        // Search query
        if (state.searchQuery.trim() !== '') {
          const q = state.searchQuery.toLowerCase();
          const user = window.Data && window.Data.getUser ? window.Data.getUser(c.userId) : null;
          const resume = (c.resumeId && window.Data && window.Data.getResume) ? window.Data.getResume(c.resumeId) : null;
          const job = allJobs.find(j => j.id === c.jobId);

          const name = ((user ? (user.name + ' ' + (user.nameEn || '')) : '') + ' ' +
                        (resume && resume.personal ? (resume.personal.name + ' ' + (resume.personal.nameEn || '')) : '')).toLowerCase();
          const email = ((user ? user.email : '') + ' ' + (resume && resume.personal ? resume.personal.email : '')).toLowerCase();
          const jobTitle = job ? ((job.title || '') + ' ' + (job.titleEn || '')).toLowerCase() : '';

          return name.includes(q) || email.includes(q) || jobTitle.includes(q);
        }

        return true;
      });

      return `
        <div class="candidates-page" style="padding-bottom: 80px;">
          <!-- Header with Title & View Toggle -->
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;">
            <div>
              <h2 style="margin: 0; font-size: 1.35rem; font-weight: 700; color: var(--text-primary);">
                ${t('candidates.title', { th: 'ผู้สมัครทั้งหมด', en: 'Candidates Pool' })}
              </h2>
              <div style="font-size: 0.8rem; color: var(--text-tertiary); margin-top: 2px;">
                ${isEn ? 'Screen, evaluate and move candidates across stages' : 'คัดกรองและประเมินผู้สมัครตามขั้นตอน'}
              </div>
            </div>

            <!-- List vs Kanban View Toggle Buttons -->
            <div style="display: flex; background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 12px; padding: 3px;">
              <button id="btn-toggle-list" class="view-toggle-btn ${state.viewMode === 'list' ? 'active' : ''}" title="${t('candidates.list', { th: 'มุมมองรายการ', en: 'List View' })}" style="border: none; background: ${state.viewMode === 'list' ? 'var(--primary)' : 'transparent'}; color: ${state.viewMode === 'list' ? '#fff' : 'var(--text-secondary)'}; border-radius: 8px; width: 36px; height: 32px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s;">
                <i class="fa-solid fa-list"></i>
              </button>
              <button id="btn-toggle-kanban" class="view-toggle-btn ${state.viewMode === 'kanban' ? 'active' : ''}" title="${t('candidates.kanban', { th: 'มุมมองคัมบัง', en: 'Kanban View' })}" style="border: none; background: ${state.viewMode === 'kanban' ? 'var(--primary)' : 'transparent'}; color: ${state.viewMode === 'kanban' ? '#fff' : 'var(--text-secondary)'}; border-radius: 8px; width: 36px; height: 32px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s;">
                <i class="fa-solid fa-table-columns"></i>
              </button>
            </div>
          </div>

          <!-- Search Bar -->
          <div class="search-box" style="position: relative; margin-bottom: 12px;">
            <i class="fa-solid fa-magnifying-glass" style="position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: var(--text-tertiary); font-size: 0.9rem;"></i>
            <input 
              type="text" 
              id="candidate-search-input" 
              placeholder="${isEn ? 'Search candidate name, email, job title...' : 'ค้นหาชื่อผู้สมัคร, อีเมล, ตำแหน่งงาน...'}" 
              value="${state.searchQuery}"
              style="width: 100%; box-sizing: border-box; background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 12px; padding: 12px 38px 12px 38px; font-size: 0.9rem; color: var(--text-primary); outline: none;"
            />
            ${state.searchQuery ? `
              <button id="btn-clear-cand-search" style="position: absolute; right: 12px; top: 50%; transform: translateY(-50%); background: none; border: none; color: var(--text-tertiary); cursor: pointer; font-size: 0.9rem;">
                <i class="fa-solid fa-circle-xmark"></i>
              </button>
            ` : ''}
          </div>

          <!-- Filters: Job, Status, Score Range -->
          <div class="filters-container" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 16px;">
            <!-- Job Dropdown -->
            <select id="filter-job" style="width: 100%; background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 10px; padding: 8px 10px; font-size: 0.78rem; color: var(--text-primary); outline: none; text-overflow: ellipsis;">
              <option value="all">${isEn ? 'All Jobs' : 'ทุกตำแหน่ง'}</option>
              ${allJobs.map(j => `
                <option value="${j.id}" ${state.selectedJobFilter === j.id ? 'selected' : ''}>
                  ${isEn ? (j.titleEn || j.title) : (j.title || j.titleEn)}
                </option>
              `).join('')}
            </select>

            <!-- Status Dropdown -->
            <select id="filter-status" style="width: 100%; background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 10px; padding: 8px 10px; font-size: 0.78rem; color: var(--text-primary); outline: none;">
              <option value="all">${isEn ? 'All Status' : 'ทุกสถานะ'}</option>
              <option value="new" ${state.selectedStatusFilter === 'new' ? 'selected' : ''}>${isEn ? 'New' : 'ใหม่'}</option>
              <option value="screening" ${state.selectedStatusFilter === 'screening' ? 'selected' : ''}>${isEn ? 'Screening' : 'คัดกรอง'}</option>
              <option value="qualified" ${state.selectedStatusFilter === 'qualified' ? 'selected' : ''}>${isEn ? 'Qualified' : 'ผ่านเกณฑ์'}</option>
              <option value="interview_scheduled" ${state.selectedStatusFilter === 'interview_scheduled' ? 'selected' : ''}>${isEn ? 'Scheduled' : 'นัดสัมภาษณ์'}</option>
              <option value="interviewed" ${state.selectedStatusFilter === 'interviewed' ? 'selected' : ''}>${isEn ? 'Interviewed' : 'สัมภาษณ์แล้ว'}</option>
              <option value="offered" ${state.selectedStatusFilter === 'offered' ? 'selected' : ''}>${isEn ? 'Offered' : 'เสนอข้อเสนอ'}</option>
              <option value="hired" ${state.selectedStatusFilter === 'hired' ? 'selected' : ''}>${isEn ? 'Hired' : 'รับแล้ว'}</option>
              <option value="rejected" ${state.selectedStatusFilter === 'rejected' ? 'selected' : ''}>${isEn ? 'Rejected' : 'ปฏิเสธ'}</option>
            </select>

            <!-- Score Dropdown -->
            <select id="filter-score" style="width: 100%; background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 10px; padding: 8px 10px; font-size: 0.78rem; color: var(--text-primary); outline: none;">
              <option value="all" ${state.selectedScoreFilter === 'all' ? 'selected' : ''}>${isEn ? 'All Scores' : 'ทุกคะแนน'}</option>
              <option value="4plus" ${state.selectedScoreFilter === '4plus' ? 'selected' : ''}>⭐ 4.0+</option>
              <option value="3plus" ${state.selectedScoreFilter === '3plus' ? 'selected' : ''}>⭐ 3.0+</option>
              <option value="unrated" ${state.selectedScoreFilter === 'unrated' ? 'selected' : ''}>${isEn ? 'Unrated' : 'ยังไม่ประเมิน'}</option>
            </select>
          </div>

          <!-- Content: List View OR Kanban View -->
          ${state.viewMode === 'list' 
            ? this.renderListView(filtered, allJobs) 
            : this.renderKanbanView(filtered, allJobs)}
        </div>
      `;
    },

    /**
     * Render List View of candidates
     */
    renderListView: function (candidates, allJobs) {
      const isEn = window.App && window.App.getLang() === 'en';

      if (candidates.length === 0) {
        return `
          <div style="text-align: center; padding: 40px 20px; background: var(--bg-secondary); border-radius: 16px; border: 1px dashed var(--border);">
            <i class="fa-solid fa-user-slash" style="font-size: 2.5rem; color: var(--text-tertiary); opacity: 0.4; margin-bottom: 12px;"></i>
            <h4 style="margin: 0 0 6px 0; color: var(--text-primary); font-size: 1rem;">
              ${t('common.noData', { th: 'ไม่พบข้อมูลผู้สมัคร', en: 'No candidates found' })}
            </h4>
            <p style="margin: 0; font-size: 0.82rem; color: var(--text-secondary);">
              ${isEn ? 'Try adjusting your search query or filters' : 'ลองเปลี่ยนคำค้นหาหรือตัวกรอง'}
            </p>
          </div>
        `;
      }

      return `
        <div class="candidate-cards-list" style="display: flex; flex-direction: column; gap: 12px;">
          ${candidates.map(c => {
            const user = window.Data && window.Data.getUser ? window.Data.getUser(c.userId) : null;
            const resume = (c.resumeId && window.Data && window.Data.getResume) ? window.Data.getResume(c.resumeId) : null;
            const job = allJobs.find(j => j.id === c.jobId);

            const name = (user && (isEn ? (user.nameEn || user.name) : (user.name || user.nameEn))) ||
                         (resume && resume.personal && (isEn ? (resume.personal.nameEn || resume.personal.name) : (resume.personal.name || resume.personal.nameEn))) ||
                         'Candidate';
            const avatar = (user && user.avatar) || (resume && resume.personal && resume.personal.photo) || '👤';
            const jobTitle = job ? (isEn ? (job.titleEn || job.title) : (job.title || job.titleEn)) : (isEn ? 'General Position' : 'ตำแหน่งทั่วไป');
            const avgScore = calculateAverageScore(c.scores);

            return `
              <div class="candidate-card" data-id="${c.id}" style="background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 16px; padding: 16px; box-shadow: 0 2px 8px var(--shadow); cursor: pointer; transition: transform 0.2s, box-shadow 0.2s;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; margin-bottom: 8px;">
                  <!-- Avatar & Name -->
                  <div style="display: flex; align-items: center; gap: 12px;">
                    <div style="width: 44px; height: 44px; border-radius: 50%; background: var(--bg-tertiary); display: flex; align-items: center; justify-content: center; font-size: 1.6rem; flex-shrink: 0; box-shadow: 0 2px 6px rgba(0,0,0,0.06);">
                      ${avatar}
                    </div>
                    <div>
                      <h4 style="margin: 0; font-size: 1rem; font-weight: 700; color: var(--text-primary); line-height: 1.2;">
                        ${name}
                      </h4>
                      <div style="font-size: 0.8rem; color: var(--primary); font-weight: 500; margin-top: 3px;">
                        <i class="fa-solid fa-briefcase" style="font-size: 0.75rem; margin-right: 4px;"></i>${jobTitle}
                      </div>
                    </div>
                  </div>

                  <!-- Status Badge -->
                  ${getCandidateBadge(c.status)}
                </div>

                <!-- Meta & Ratings Row -->
                <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 10px; margin-top: 10px; border-top: 1px solid var(--border);">
                  <div style="display: flex; align-items: center; gap: 10px;">
                    <!-- Star Rating -->
                    ${renderStarRating(avgScore)}
                    
                    <!-- Source Badge -->
                    ${c.source ? `
                      <span style="font-size: 0.7rem; color: var(--text-tertiary); background: var(--bg-tertiary); padding: 2px 6px; border-radius: 4px; text-transform: uppercase;">
                        ${c.source}
                      </span>
                    ` : ''}
                  </div>

                  <div style="display: flex; align-items: center; gap: 6px; font-size: 0.75rem; color: var(--text-tertiary);">
                    <i class="fa-regular fa-clock" style="font-size: 0.7rem;"></i>
                    <span>${formatDate(c.appliedAt)}</span>
                    <i class="fa-solid fa-chevron-right" style="font-size: 0.65rem; margin-left: 2px; color: var(--text-secondary);"></i>
                  </div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `;
    },

    /**
     * Render Kanban Board view of candidates
     */
    renderKanbanView: function (candidates, allJobs) {
      const isEn = window.App && window.App.getLang() === 'en';

      // 6 Kanban Columns as per spec:
      // 1. New, 2. Screening, 3. Qualified, 4. Interview, 5. Hired, 6. Rejected
      const columns = [
        {
          key: 'new',
          title: isEn ? 'New' : 'ใบสมัครใหม่',
          icon: 'fa-envelope-open-text',
          color: '#06B6D4',
          filter: c => c.status === 'new'
        },
        {
          key: 'screening',
          title: isEn ? 'Screening' : 'กำลังคัดกรอง',
          icon: 'fa-magnifying-glass',
          color: '#F59E0B',
          filter: c => c.status === 'screening'
        },
        {
          key: 'qualified',
          title: isEn ? 'Qualified' : 'ผ่านเกณฑ์',
          icon: 'fa-circle-check',
          color: '#2563EB',
          filter: c => c.status === 'qualified'
        },
        {
          key: 'interview',
          title: isEn ? 'Interview' : 'สัมภาษณ์',
          icon: 'fa-comments',
          color: '#8B5CF6',
          filter: c => c.status === 'interview_scheduled' || c.status === 'interviewed'
        },
        {
          key: 'hired',
          title: isEn ? 'Hired / Offer' : 'ได้งาน / ข้อเสนอ',
          icon: 'fa-trophy',
          color: '#10B981',
          filter: c => c.status === 'offered' || c.status === 'hired'
        },
        {
          key: 'rejected',
          title: isEn ? 'Rejected' : 'ปฏิเสธ',
          icon: 'fa-circle-xmark',
          color: '#EF4444',
          filter: c => c.status === 'rejected'
        }
      ];

      return `
        <div class="kanban-board" style="display: flex; gap: 12px; overflow-x: auto; padding-bottom: 14px; scroll-snap-type: x mandatory; scrollbar-width: thin;">
          ${columns.map(col => {
            const colCandidates = candidates.filter(col.filter);
            return `
              <div class="kanban-column" style="flex: 0 0 260px; background: var(--bg-tertiary); border: 1px solid var(--border); border-radius: 16px; padding: 12px; scroll-snap-align: start; display: flex; flex-direction: column; max-height: calc(100vh - 240px);">
                <!-- Column Header -->
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; padding: 0 4px;">
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <i class="fa-solid ${col.icon}" style="color: ${col.color}; font-size: 0.9rem;"></i>
                    <span style="font-size: 0.9rem; font-weight: 700; color: var(--text-primary);">${col.title}</span>
                  </div>
                  <span style="font-size: 0.75rem; font-weight: 700; background: ${col.color}20; color: ${col.color}; padding: 2px 8px; border-radius: 12px;">
                    ${colCandidates.length}
                  </span>
                </div>

                <!-- Column Cards Container -->
                <div class="kanban-cards" style="display: flex; flex-direction: column; gap: 10px; overflow-y: auto; flex: 1; padding: 2px;">
                  ${colCandidates.length > 0 ? colCandidates.map(c => {
                    const user = window.Data && window.Data.getUser ? window.Data.getUser(c.userId) : null;
                    const resume = (c.resumeId && window.Data && window.Data.getResume) ? window.Data.getResume(c.resumeId) : null;
                    const job = allJobs.find(j => j.id === c.jobId);

                    const name = (user && (isEn ? (user.nameEn || user.name) : (user.name || user.nameEn))) ||
                                 (resume && resume.personal && (isEn ? (resume.personal.nameEn || resume.personal.name) : (resume.personal.name || resume.personal.nameEn))) ||
                                 'Candidate';
                    const avatar = (user && user.avatar) || (resume && resume.personal && resume.personal.photo) || '👤';
                    const jobTitle = job ? (isEn ? (job.titleEn || job.title) : (job.title || job.titleEn)) : 'Position';
                    const avgScore = calculateAverageScore(c.scores);

                    return `
                      <div class="kanban-card candidate-card" data-id="${c.id}" style="background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 12px; padding: 12px; cursor: pointer; box-shadow: 0 2px 6px var(--shadow); transition: transform 0.15s;">
                        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
                          <span style="font-size: 1.3rem;">${avatar}</span>
                          <div style="min-width: 0; flex: 1;">
                            <div style="font-size: 0.88rem; font-weight: 700; color: var(--text-primary); line-height: 1.2; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                              ${name}
                            </div>
                            <div style="font-size: 0.75rem; color: var(--primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                              ${jobTitle}
                            </div>
                          </div>
                        </div>

                        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 8px; pt: 6px; border-top: 1px dashed var(--border); padding-top: 6px;">
                          ${renderStarRating(avgScore)}
                          <span style="font-size: 0.7rem; color: var(--text-tertiary);">
                            ${formatDate(c.appliedAt)}
                          </span>
                        </div>
                      </div>
                    `;
                  }).join('') : `
                    <div style="text-align: center; padding: 20px 8px; color: var(--text-tertiary); font-size: 0.78rem;">
                      ${isEn ? 'No candidates' : 'ไม่มีผู้สมัคร'}
                    </div>
                  `}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `;
    },

    /**
     * Render Applicant View: My Applications
     */
    renderApplicant: function () {
      const isEn = window.App && window.App.getLang() === 'en';
      const currentUser = (window.App && typeof window.App.getCurrentUser === 'function') ? window.App.getCurrentUser() : null;
      const userId = currentUser ? currentUser.id : 'u3';

      const allCandidates = (window.Data && typeof window.Data.getCandidates === 'function') ? window.Data.getCandidates() : [];
      const allJobs = (window.Data && typeof window.Data.getJobs === 'function') ? window.Data.getJobs() : [];

      const myApps = allCandidates.filter(c => c.userId === userId);

      return `
        <div class="my-applications-page" style="padding-bottom: 80px;">
          <!-- Header -->
          <div style="margin-bottom: 20px;">
            <h2 style="margin: 0; font-size: 1.35rem; font-weight: 700; color: var(--text-primary);">
              ${t('candidates.myApplications', { th: 'ใบสมัครของฉัน', en: 'My Applications' })}
            </h2>
            <div style="font-size: 0.82rem; color: var(--text-tertiary); margin-top: 2px;">
              ${isEn ? 'Track the progress of your submitted job applications' : 'ติดตามสถานะและความคืบหน้าของตำแหน่งงานที่คุณยื่นสมัคร'}
            </div>
          </div>

          <!-- Applications List -->
          ${myApps.length > 0 ? `
            <div style="display: flex; flex-direction: column; gap: 16px;">
              ${myApps.map(c => {
                const job = allJobs.find(j => j.id === c.jobId);
                const jobTitle = job ? (isEn ? (job.titleEn || job.title) : (job.title || job.titleEn)) : (isEn ? 'Position' : 'ตำแหน่งงาน');
                const jobDept = job ? (isEn ? (job.departmentEn || job.department) : (job.department || job.departmentEn)) : '';
                const jobSalary = job && job.salaryMin && job.salaryMax ? `฿${job.salaryMin.toLocaleString()} - ฿${job.salaryMax.toLocaleString()}` : '';

                // Step progress
                let step = 1;
                if (c.status === 'new') step = 1;
                else if (c.status === 'screening' || c.status === 'qualified') step = 2;
                else if (c.status === 'interview_scheduled' || c.status === 'interviewed') step = 3;
                else if (c.status === 'offered' || c.status === 'hired' || c.status === 'rejected') step = 4;

                return `
                  <div class="card" style="background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 18px; padding: 18px; box-shadow: 0 4px 12px var(--shadow);">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; margin-bottom: 8px;">
                      <div>
                        <h3 style="margin: 0; font-size: 1.05rem; font-weight: 700; color: var(--text-primary);">
                          ${jobTitle}
                        </h3>
                        <div style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 3px;">
                          ${jobDept} ${jobSalary ? `• <span style="color: var(--primary); font-weight: 600;">${jobSalary}</span>` : ''}
                        </div>
                      </div>
                      ${getCandidateBadge(c.status)}
                    </div>

                    <div style="font-size: 0.75rem; color: var(--text-tertiary); margin-bottom: 14px;">
                      <i class="fa-regular fa-calendar" style="margin-right: 4px;"></i>${isEn ? 'Applied on' : 'ยื่นเมื่อ'}: ${formatDate(c.appliedAt)}
                    </div>

                    <!-- Progress Bar / Visual Timeline -->
                    <div style="position: relative; margin: 18px 0 10px 0;">
                      <div style="position: absolute; top: 12px; left: 16px; right: 16px; height: 3px; background: var(--bg-tertiary); z-index: 1;">
                        <div style="height: 100%; width: ${((step - 1) / 3) * 100}%; background: var(--primary); transition: width 0.3s;"></div>
                      </div>

                      <div style="display: flex; justify-content: space-between; position: relative; z-index: 2;">
                        <!-- Step 1 -->
                        <div style="display: flex; flex-direction: column; align-items: center; width: 25%;">
                          <div style="width: 26px; height: 26px; border-radius: 50%; background: ${step >= 1 ? 'var(--primary)' : 'var(--bg-tertiary)'}; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 0.72rem; margin-bottom: 4px;">
                            <i class="fa-solid fa-check"></i>
                          </div>
                          <span style="font-size: 0.7rem; color: ${step >= 1 ? 'var(--text-primary)' : 'var(--text-tertiary)'}; text-align: center;">
                            ${isEn ? 'Applied' : 'ยื่นสมัคร'}
                          </span>
                        </div>

                        <!-- Step 2 -->
                        <div style="display: flex; flex-direction: column; align-items: center; width: 25%;">
                          <div style="width: 26px; height: 26px; border-radius: 50%; background: ${step >= 2 ? 'var(--primary)' : 'var(--bg-tertiary)'}; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 0.72rem; margin-bottom: 4px;">
                            <i class="fa-solid fa-magnifying-glass"></i>
                          </div>
                          <span style="font-size: 0.7rem; color: ${step >= 2 ? 'var(--text-primary)' : 'var(--text-tertiary)'}; text-align: center;">
                            ${isEn ? 'Screening' : 'คัดกรอง'}
                          </span>
                        </div>

                        <!-- Step 3 -->
                        <div style="display: flex; flex-direction: column; align-items: center; width: 25%;">
                          <div style="width: 26px; height: 26px; border-radius: 50%; background: ${step >= 3 ? 'var(--primary)' : 'var(--bg-tertiary)'}; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 0.72rem; margin-bottom: 4px;">
                            <i class="fa-solid fa-comments"></i>
                          </div>
                          <span style="font-size: 0.7rem; color: ${step >= 3 ? 'var(--text-primary)' : 'var(--text-tertiary)'}; text-align: center;">
                            ${isEn ? 'Interview' : 'สัมภาษณ์'}
                          </span>
                        </div>

                        <!-- Step 4 -->
                        <div style="display: flex; flex-direction: column; align-items: center; width: 25%;">
                          <div style="width: 26px; height: 26px; border-radius: 50%; background: ${step >= 4 ? (c.status === 'rejected' ? '#EF4444' : '#10B981') : 'var(--bg-tertiary)'}; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 0.72rem; margin-bottom: 4px;">
                            <i class="fa-solid ${c.status === 'rejected' ? 'fa-xmark' : 'fa-trophy'}"></i>
                          </div>
                          <span style="font-size: 0.7rem; color: ${step >= 4 ? 'var(--text-primary)' : 'var(--text-tertiary)'}; text-align: center;">
                            ${c.status === 'rejected' ? (isEn ? 'Rejected' : 'ปฏิเสธ') : (c.status === 'hired' ? (isEn ? 'Hired' : 'รับแล้ว') : (isEn ? 'Result' : 'ผล'))}
                          </span>
                        </div>
                      </div>
                    </div>

                    ${job ? `
                      <div style="text-align: right; margin-top: 10px;">
                        <button class="btn-goto-job" data-id="${job.id}" style="background: transparent; border: 1px solid var(--border); color: var(--primary); border-radius: 8px; padding: 5px 12px; font-size: 0.78rem; font-weight: 600; cursor: pointer;">
                          ${isEn ? 'View Job Details' : 'ดูประกาศงานนี้'} <i class="fa-solid fa-arrow-right" style="font-size: 0.65rem;"></i>
                        </button>
                      </div>
                    ` : ''}
                  </div>
                `;
              }).join('')}
            </div>
          ` : `
            <div style="text-align: center; padding: 40px 20px; background: var(--bg-secondary); border-radius: 16px; border: 1px dashed var(--border);">
              <i class="fa-solid fa-folder-open" style="font-size: 2.5rem; color: var(--text-tertiary); opacity: 0.4; margin-bottom: 12px;"></i>
              <h4 style="margin: 0 0 6px 0; color: var(--text-primary); font-size: 1rem;">
                ${isEn ? 'No Applications Yet' : 'คุณยังไม่มียื่นใบสมัคร'}
              </h4>
              <p style="margin: 0 0 16px 0; font-size: 0.82rem; color: var(--text-secondary);">
                ${isEn ? 'Explore available openings and submit an application.' : 'ค้นหาตำแหน่งงานว่างและส่งใบสมัครได้เลย'}
              </p>
              <button onclick="window.location.hash='#jobs'" style="background: var(--primary); color: #fff; border: none; border-radius: 10px; padding: 10px 20px; font-weight: 600; cursor: pointer;">
                <i class="fa-solid fa-magnifying-glass" style="margin-right: 6px;"></i>${isEn ? 'Browse Jobs' : 'ค้นหาตำแหน่งงาน'}
              </button>
            </div>
          `}
        </div>
      `;
    },

    /**
     * Render Candidate Profile View (#candidates/:id) - HR Only
     */
    renderView: function (id) {
      const isEn = window.App && window.App.getLang() === 'en';
      const currentUser = (window.App && typeof window.App.getCurrentUser === 'function') ? window.App.getCurrentUser() : null;

      const cand = window.Data && typeof window.Data.getCandidate === 'function' ? window.Data.getCandidate(id) : null;
      if (!cand) {
        return `
          <div style="text-align: center; padding: 50px 20px;">
            <i class="fa-solid fa-triangle-exclamation" style="font-size: 3rem; color: #EF4444; margin-bottom: 14px;"></i>
            <h3 style="color: var(--text-primary);">${isEn ? 'Candidate Not Found' : 'ไม่พบข้อมูลผู้สมัคร'}</h3>
            <button onclick="window.location.hash='#candidates'" class="btn" style="background: var(--primary); color: #fff; border: none; border-radius: 10px; padding: 10px 20px; font-weight: 600; margin-top: 10px; cursor: pointer;">
              ${t('common.back', { th: 'กลับหน้ารายการ', en: 'Back to Candidates' })}
            </button>
          </div>
        `;
      }

      // Load related user, resume, job
      const user = window.Data && window.Data.getUser ? window.Data.getUser(cand.userId) : null;
      const resume = (cand.resumeId && window.Data && window.Data.getResume) 
        ? window.Data.getResume(cand.resumeId) 
        : (window.Data && window.Data.getResumes ? window.Data.getResumes(cand.userId)[0] : null);
      const job = window.Data && window.Data.getJob ? window.Data.getJob(cand.jobId) : null;

      const candName = (user && (isEn ? (user.nameEn || user.name) : (user.name || user.nameEn))) ||
                       (resume && resume.personal && (isEn ? (resume.personal.nameEn || resume.personal.name) : (resume.personal.name || resume.personal.nameEn))) ||
                       'Candidate';
      const avatar = (user && user.avatar) || (resume && resume.personal && resume.personal.photo) || '👤';
      const email = (user && user.email) || (resume && resume.personal && resume.personal.email) || '-';
      const phone = (resume && resume.personal && resume.personal.phone) || '-';
      const address = (resume && resume.personal && resume.personal.address) || '-';
      const jobTitle = job ? (isEn ? (job.titleEn || job.title) : (job.title || job.titleEn)) : (isEn ? 'General Position' : 'ตำแหน่งงาน');
      const jobDept = job ? (isEn ? (job.departmentEn || job.department) : (job.department || job.departmentEn)) : '';

      // Scores
      const scores = cand.scores || { qualification: 0, experience: 0, skills: 0 };
      const avgScore = calculateAverageScore(scores);

      // Notes
      const notes = Array.isArray(cand.notes) ? cand.notes : [];

      // Timeline
      const timeline = Array.isArray(cand.timeline) ? cand.timeline : [];

      return `
        <div class="candidate-profile-page" style="padding-bottom: 95px;">
          <!-- Top Header Back Button -->
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;">
            <button id="btn-cand-profile-back" style="background: var(--bg-secondary); border: 1px solid var(--border); width: 38px; height: 38px; border-radius: 10px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: var(--text-primary);">
              <i class="fa-solid fa-arrow-left"></i>
            </button>
            <div style="font-size: 0.85rem; font-weight: 600; color: var(--text-secondary);">
              ${isEn ? 'Candidate Profile' : 'ประวัติผู้สมัคร'}
            </div>
            <div style="width: 38px;"></div>
          </div>

          <!-- Profile Header Card -->
          <div class="card" style="background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 18px; padding: 20px; margin-bottom: 16px; box-shadow: 0 4px 12px var(--shadow);">
            <div style="display: flex; align-items: flex-start; gap: 14px; margin-bottom: 14px;">
              <div style="width: 60px; height: 60px; border-radius: 50%; background: var(--bg-tertiary); display: flex; align-items: center; justify-content: center; font-size: 2.2rem; flex-shrink: 0; box-shadow: 0 4px 10px rgba(0,0,0,0.08);">
                ${avatar}
              </div>
              <div style="flex: 1; min-width: 0;">
                <h3 style="margin: 0; font-size: 1.25rem; font-weight: 700; color: var(--text-primary); line-height: 1.2;">
                  ${candName}
                </h3>
                <div style="font-size: 0.85rem; color: var(--primary); font-weight: 600; margin-top: 4px;">
                  <i class="fa-solid fa-briefcase" style="font-size: 0.75rem; margin-right: 4px;"></i>${jobTitle}
                </div>
                ${jobDept ? `<div style="font-size: 0.75rem; color: var(--text-tertiary);">${jobDept}</div>` : ''}
              </div>
            </div>

            <!-- Contact info icons -->
            <div style="display: flex; flex-direction: column; gap: 6px; font-size: 0.82rem; color: var(--text-secondary); background: var(--bg-tertiary); border-radius: 10px; padding: 12px; margin-bottom: 14px;">
              <div style="display: flex; align-items: center; gap: 8px;">
                <i class="fa-regular fa-envelope" style="width: 16px; color: var(--primary);"></i>
                <a href="mailto:${email}" style="color: var(--text-primary); text-decoration: none;">${email}</a>
              </div>
              <div style="display: flex; align-items: center; gap: 8px;">
                <i class="fa-solid fa-phone" style="width: 16px; color: #10B981;"></i>
                <a href="tel:${phone}" style="color: var(--text-primary); text-decoration: none;">${phone}</a>
              </div>
              ${address !== '-' ? `
                <div style="display: flex; align-items: center; gap: 8px;">
                  <i class="fa-solid fa-location-dot" style="width: 16px; color: #EF4444;"></i>
                  <span>${address}</span>
                </div>
              ` : ''}
            </div>

            <!-- Status Changer Bar -->
            <div style="display: flex; align-items: center; justify-content: space-between; gap: 10px; padding-top: 10px; border-top: 1px solid var(--border);">
              <div style="display: flex; align-items: center; gap: 6px;">
                <span style="font-size: 0.8rem; font-weight: 600; color: var(--text-secondary);">${isEn ? 'Status:' : 'สถานะ:'}</span>
                ${getCandidateBadge(cand.status)}
              </div>

              <!-- Quick Status Selector -->
              <select id="cand-status-changer" data-id="${cand.id}" style="background: var(--bg-tertiary); border: 1px solid var(--border); border-radius: 10px; padding: 6px 10px; font-size: 0.78rem; font-weight: 600; color: var(--text-primary); outline: none;">
                <option value="new" ${cand.status === 'new' ? 'selected' : ''}>📩 ${isEn ? 'New' : 'ใหม่'}</option>
                <option value="screening" ${cand.status === 'screening' ? 'selected' : ''}>🔍 ${isEn ? 'Screening' : 'กำลังคัดกรอง'}</option>
                <option value="qualified" ${cand.status === 'qualified' ? 'selected' : ''}>✅ ${isEn ? 'Qualified' : 'ผ่านเกณฑ์'}</option>
                <option value="interview_scheduled" ${cand.status === 'interview_scheduled' ? 'selected' : ''}>📞 ${isEn ? 'Interview Scheduled' : 'นัดสัมภาษณ์'}</option>
                <option value="interviewed" ${cand.status === 'interviewed' ? 'selected' : ''}>💬 ${isEn ? 'Interviewed' : 'สัมภาษณ์แล้ว'}</option>
                <option value="offered" ${cand.status === 'offered' ? 'selected' : ''}>📄 ${isEn ? 'Offered' : 'ยื่นข้อเสนอ'}</option>
                <option value="hired" ${cand.status === 'hired' ? 'selected' : ''}>🎉 ${isEn ? 'Hired' : 'รับเข้าทำงาน'}</option>
                <option value="rejected" ${cand.status === 'rejected' ? 'selected' : ''}>❌ ${isEn ? 'Rejected' : 'ปฏิเสธ'}</option>
              </select>
            </div>
          </div>

          <!-- Navigation Tabs Bar -->
          <div class="tabs-nav" style="display: flex; gap: 6px; overflow-x: auto; margin-bottom: 16px; padding-bottom: 4px; scrollbar-width: none;">
            <button class="tab-btn ${state.activeProfileTab === 'overview' ? 'active' : ''}" data-tab="overview" style="flex: 1; min-width: 70px; padding: 8px 10px; border-radius: 10px; font-size: 0.78rem; font-weight: 600; cursor: pointer; border: 1px solid ${state.activeProfileTab === 'overview' ? 'var(--primary)' : 'var(--border)'}; background: ${state.activeProfileTab === 'overview' ? 'var(--primary)' : 'var(--bg-secondary)'}; color: ${state.activeProfileTab === 'overview' ? '#fff' : 'var(--text-secondary)'}; transition: all 0.2s; white-space: nowrap;">
              <i class="fa-solid fa-id-card" style="margin-right: 4px;"></i>${isEn ? 'Overview' : 'ภาพรวม'}
            </button>
            <button class="tab-btn ${state.activeProfileTab === 'scoring' ? 'active' : ''}" data-tab="scoring" style="flex: 1; min-width: 70px; padding: 8px 10px; border-radius: 10px; font-size: 0.78rem; font-weight: 600; cursor: pointer; border: 1px solid ${state.activeProfileTab === 'scoring' ? 'var(--primary)' : 'var(--border)'}; background: ${state.activeProfileTab === 'scoring' ? 'var(--primary)' : 'var(--bg-secondary)'}; color: ${state.activeProfileTab === 'scoring' ? '#fff' : 'var(--text-secondary)'}; transition: all 0.2s; white-space: nowrap;">
              <i class="fa-solid fa-star" style="margin-right: 4px;"></i>${isEn ? 'Scoring' : 'ประเมิน'}
            </button>
            <button class="tab-btn ${state.activeProfileTab === 'notes' ? 'active' : ''}" data-tab="notes" style="flex: 1; min-width: 70px; padding: 8px 10px; border-radius: 10px; font-size: 0.78rem; font-weight: 600; cursor: pointer; border: 1px solid ${state.activeProfileTab === 'notes' ? 'var(--primary)' : 'var(--border)'}; background: ${state.activeProfileTab === 'notes' ? 'var(--primary)' : 'var(--bg-secondary)'}; color: ${state.activeProfileTab === 'notes' ? '#fff' : 'var(--text-secondary)'}; transition: all 0.2s; white-space: nowrap;">
              <i class="fa-solid fa-note-sticky" style="margin-right: 4px;"></i>${isEn ? 'Notes' : 'โน้ต'} (${notes.length})
            </button>
            <button class="tab-btn ${state.activeProfileTab === 'timeline' ? 'active' : ''}" data-tab="timeline" style="flex: 1; min-width: 70px; padding: 8px 10px; border-radius: 10px; font-size: 0.78rem; font-weight: 600; cursor: pointer; border: 1px solid ${state.activeProfileTab === 'timeline' ? 'var(--primary)' : 'var(--border)'}; background: ${state.activeProfileTab === 'timeline' ? 'var(--primary)' : 'var(--bg-secondary)'}; color: ${state.activeProfileTab === 'timeline' ? '#fff' : 'var(--text-secondary)'}; transition: all 0.2s; white-space: nowrap;">
              <i class="fa-solid fa-clock-rotate-left" style="margin-right: 4px;"></i>${isEn ? 'Timeline' : 'ไทม์ไลน์'}
            </button>
            <button class="tab-btn ${state.activeProfileTab === 'resume' ? 'active' : ''}" data-tab="resume" style="flex: 1; min-width: 70px; padding: 8px 10px; border-radius: 10px; font-size: 0.78rem; font-weight: 600; cursor: pointer; border: 1px solid ${state.activeProfileTab === 'resume' ? 'var(--primary)' : 'var(--border)'}; background: ${state.activeProfileTab === 'resume' ? 'var(--primary)' : 'var(--bg-secondary)'}; color: ${state.activeProfileTab === 'resume' ? '#fff' : 'var(--text-secondary)'}; transition: all 0.2s; white-space: nowrap;">
              <i class="fa-solid fa-file-lines" style="margin-right: 4px;"></i>${isEn ? 'Resume' : 'เรซูเม่'}
            </button>
          </div>

          <!-- TAB CONTENT CONTAINERS -->
          <div id="tab-content-container">
            <!-- 1. OVERVIEW TAB -->
            <div id="tab-overview" class="tab-pane" style="display: ${state.activeProfileTab === 'overview' ? 'block' : 'none'};">
              ${this.renderOverviewTab(cand, resume, job)}
            </div>

            <!-- 2. SCORING TAB -->
            <div id="tab-scoring" class="tab-pane" style="display: ${state.activeProfileTab === 'scoring' ? 'block' : 'none'};">
              ${this.renderScoringTab(cand)}
            </div>

            <!-- 3. NOTES TAB -->
            <div id="tab-notes" class="tab-pane" style="display: ${state.activeProfileTab === 'notes' ? 'block' : 'none'};">
              ${this.renderNotesTab(cand)}
            </div>

            <!-- 4. TIMELINE TAB -->
            <div id="tab-timeline" class="tab-pane" style="display: ${state.activeProfileTab === 'timeline' ? 'block' : 'none'};">
              ${this.renderTimelineTab(cand)}
            </div>

            <!-- 5. RESUME TAB -->
            <div id="tab-resume" class="tab-pane" style="display: ${state.activeProfileTab === 'resume' ? 'block' : 'none'};">
              ${this.renderResumeTab(cand, resume)}
            </div>
          </div>

          <!-- Sticky Bottom Action Bar -->
          <div class="candidate-view-footer" style="position: fixed; bottom: 0; left: 0; right: 0; max-width: 480px; margin: 0 auto; background: var(--bg-secondary); border-top: 1px solid var(--border); padding: 12px 18px; display: flex; gap: 8px; z-index: 98; box-shadow: 0 -4px 12px var(--shadow);">
            <!-- Schedule Interview Button -->
            <button id="btn-schedule-cand" data-cand-id="${cand.id}" data-job-id="${cand.jobId}" style="flex: 2; background: #8B5CF6; color: #fff; border: none; border-radius: 12px; padding: 12px; font-size: 0.85rem; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px;">
              <i class="fa-solid fa-calendar-plus"></i>
              <span>${t('interviews.schedule', { th: 'นัดสัมภาษณ์', en: 'Interview' })}</span>
            </button>

            <!-- Quick Note button -->
            <button id="btn-quick-note" style="flex: 1; background: var(--bg-tertiary); color: var(--text-primary); border: 1px solid var(--border); border-radius: 12px; padding: 12px; font-size: 0.85rem; font-weight: 600; cursor: pointer;">
              <i class="fa-solid fa-comment-dots"></i>
            </button>

            <!-- Reject Button -->
            <button id="btn-reject-cand" data-id="${cand.id}" style="flex: 1; background: rgba(239, 68, 68, 0.12); color: #EF4444; border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 12px; padding: 12px; font-size: 0.85rem; font-weight: 600; cursor: pointer;" title="${isEn ? 'Reject' : 'ปฏิเสธ'}">
              <i class="fa-solid fa-xmark"></i>
            </button>
          </div>
        </div>
      `;
    },

    /**
     * Tab 1: Overview
     */
    renderOverviewTab: function (cand, resume, job) {
      const isEn = window.App && window.App.getLang() === 'en';

      const summary = resume && resume.personal 
        ? (isEn ? (resume.personal.summaryEn || resume.personal.summary) : (resume.personal.summary || resume.personal.summaryEn))
        : null;

      const education = resume && Array.isArray(resume.education) ? resume.education : [];
      const experience = resume && Array.isArray(resume.experience) ? resume.experience : [];
      const skills = resume && Array.isArray(resume.skills) ? resume.skills : [];

      return `
        <div style="display: flex; flex-direction: column; gap: 14px;">
          <!-- Professional Summary -->
          <div class="card" style="background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 16px; padding: 16px;">
            <div style="font-weight: 700; font-size: 0.95rem; color: var(--text-primary); margin-bottom: 8px;">
              <i class="fa-solid fa-user-tie" style="color: var(--primary); margin-right: 6px;"></i>${isEn ? 'Professional Summary' : 'สรุปประวัติโดยย่อ'}
            </div>
            <div style="font-size: 0.85rem; color: var(--text-secondary); line-height: 1.5;">
              ${summary || (isEn ? 'No professional summary provided.' : 'ไม่มีข้อมูลสรุปประวัติ')}
            </div>
          </div>

          <!-- Key Preferences: Salary, Availability, Relocate -->
          <div class="card" style="background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 16px; padding: 16px;">
            <div style="font-weight: 700; font-size: 0.95rem; color: var(--text-primary); margin-bottom: 12px;">
              <i class="fa-solid fa-sliders" style="color: var(--primary); margin-right: 6px;"></i>${isEn ? 'Candidate Preferences' : 'ข้อมูลความต้องการ'}
            </div>
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; font-size: 0.82rem;">
              <div style="background: var(--bg-tertiary); border-radius: 10px; padding: 10px;">
                <div style="color: var(--text-tertiary); font-size: 0.72rem;">${t('resumes.expectedSalary', { th: 'เงินเดือนที่คาดหวัง', en: 'Expected Salary' })}</div>
                <div style="font-weight: 700; color: var(--primary); font-size: 0.95rem; margin-top: 2px;">
                  ${resume && resume.expectedSalary ? `฿${resume.expectedSalary.toLocaleString()}` : (isEn ? 'Negotiable' : 'ตามตกลง')}
                </div>
              </div>
              <div style="background: var(--bg-tertiary); border-radius: 10px; padding: 10px;">
                <div style="color: var(--text-tertiary); font-size: 0.72rem;">${t('resumes.availableDate', { th: 'วันที่เริ่มงานได้', en: 'Availability' })}</div>
                <div style="font-weight: 600; color: var(--text-primary); font-size: 0.9rem; margin-top: 2px;">
                  ${resume && resume.availableDate ? formatDate(resume.availableDate) : (isEn ? 'Immediately' : 'ทันที')}
                </div>
              </div>
            </div>
          </div>

          <!-- Skills Highlights -->
          <div class="card" style="background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 16px; padding: 16px;">
            <div style="font-weight: 700; font-size: 0.95rem; color: var(--text-primary); margin-bottom: 10px;">
              <i class="fa-solid fa-wand-magic-sparkles" style="color: var(--primary); margin-right: 6px;"></i>${t('resumes.skills', { th: 'ทักษะและความสามารถ', en: 'Skills' })}
            </div>
            ${skills.length > 0 ? `
              <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                ${skills.map(s => {
                  const sName = typeof s === 'string' ? s : s.name;
                  const sLevel = typeof s === 'object' && s.level ? `(${s.level})` : '';
                  return `
                    <span style="font-size: 0.78rem; font-weight: 600; color: var(--primary); background: rgba(37, 99, 235, 0.1); border: 1px solid rgba(37, 99, 235, 0.2); padding: 4px 10px; border-radius: 16px;">
                      ${sName} <span style="font-size: 0.68rem; opacity: 0.8;">${sLevel}</span>
                    </span>
                  `;
                }).join('')}
              </div>
            ` : `
              <div style="font-size: 0.8rem; color: var(--text-tertiary);">${isEn ? 'No skills listed' : 'ไม่มีทักษะระบุ'}</div>
            `}
          </div>

          <!-- Experience Highlights -->
          <div class="card" style="background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 16px; padding: 16px;">
            <div style="font-weight: 700; font-size: 0.95rem; color: var(--text-primary); margin-bottom: 12px;">
              <i class="fa-solid fa-briefcase" style="color: var(--primary); margin-right: 6px;"></i>${t('resumes.experience', { th: 'ประสบการณ์ทำงาน', en: 'Work Experience' })}
            </div>
            ${experience.length > 0 ? `
              <div style="display: flex; flex-direction: column; gap: 12px;">
                ${experience.map(exp => `
                  <div style="border-left: 2px solid var(--primary); padding-left: 12px;">
                    <div style="font-size: 0.9rem; font-weight: 700; color: var(--text-primary);">
                      ${exp.title}
                    </div>
                    <div style="font-size: 0.8rem; color: var(--text-secondary);">
                      ${isEn ? (exp.companyEn || exp.company) : (exp.company || exp.companyEn)} • <span style="color: var(--text-tertiary);">${exp.startDate} - ${exp.current ? (isEn ? 'Present' : 'ปัจจุบัน') : (exp.endDate || '')}</span>
                    </div>
                    ${exp.description ? `
                      <div style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 4px; line-height: 1.4;">
                        ${isEn ? (exp.descriptionEn || exp.description) : (exp.description || exp.descriptionEn)}
                      </div>
                    ` : ''}
                  </div>
                `).join('')}
              </div>
            ` : `
              <div style="font-size: 0.8rem; color: var(--text-tertiary);">${isEn ? 'No work experience listed' : 'ไม่มีข้อมูลประสบการณ์'}</div>
            `}
          </div>

          <!-- Education Highlights -->
          <div class="card" style="background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 16px; padding: 16px;">
            <div style="font-weight: 700; font-size: 0.95rem; color: var(--text-primary); margin-bottom: 12px;">
              <i class="fa-solid fa-graduation-cap" style="color: var(--primary); margin-right: 6px;"></i>${t('resumes.education', { th: 'การศึกษา', en: 'Education' })}
            </div>
            ${education.length > 0 ? `
              <div style="display: flex; flex-direction: column; gap: 10px;">
                ${education.map(edu => `
                  <div style="background: var(--bg-tertiary); border-radius: 10px; padding: 10px 12px;">
                    <div style="font-size: 0.88rem; font-weight: 700; color: var(--text-primary);">
                      ${isEn ? (edu.degreeEn || edu.degree) : (edu.degree || edu.degreeEn)} - ${isEn ? (edu.fieldEn || edu.field) : (edu.field || edu.fieldEn)}
                    </div>
                    <div style="font-size: 0.78rem; color: var(--text-secondary); margin-top: 2px;">
                      ${isEn ? (edu.institutionEn || edu.institution) : (edu.institution || edu.institutionEn)} (${edu.year || ''})
                      ${edu.gpa ? ` • GPA: <span style="font-weight: 600; color: var(--primary);">${edu.gpa}</span>` : ''}
                    </div>
                  </div>
                `).join('')}
              </div>
            ` : `
              <div style="font-size: 0.8rem; color: var(--text-tertiary);">${isEn ? 'No education listed' : 'ไม่มีข้อมูลการศึกษา'}</div>
            `}
          </div>
        </div>
      `;
    },

    /**
     * Tab 2: Scoring
     */
    renderScoringTab: function (cand) {
      const isEn = window.App && window.App.getLang() === 'en';
      const scores = cand.scores || { qualification: 0, experience: 0, skills: 0 };
      const avg = calculateAverageScore(scores);

      const criteria = [
        {
          key: 'qualification',
          titleTh: 'คุณสมบัติตามเกณฑ์',
          titleEn: 'Qualifications Match',
          descTh: 'วุฒิการศึกษาและเกณฑ์พื้นฐานตรงตามที่กำหนด',
          descEn: 'Education and base criteria match job requirements',
          val: scores.qualification || 0
        },
        {
          key: 'experience',
          titleTh: 'ประสบการณ์การทำงาน',
          titleEn: 'Work Experience',
          descTh: 'ความเกี่ยวข้องและความลึกของประสบการณ์ที่ผ่านมา',
          descEn: 'Relevance and depth of past working experience',
          val: scores.experience || 0
        },
        {
          key: 'skills',
          titleTh: 'ทักษะและความสามารถ',
          titleEn: 'Skills & Competencies',
          descTh: 'ทักษะทางเทคนิคและความสามารถในการปฏิบัติงาน',
          descEn: 'Technical and operational capabilities',
          val: scores.skills || 0
        }
      ];

      return `
        <div style="display: flex; flex-direction: column; gap: 16px;">
          <!-- Total Score Summary Card -->
          <div class="card" style="background: linear-gradient(135deg, #1E293B 0%, #0F172A 100%); color: #fff; border-radius: 16px; padding: 18px; text-align: center;">
            <div style="font-size: 0.8rem; color: #94A3B8; text-transform: uppercase; letter-spacing: 1px;">
              ${isEn ? 'Overall Candidate Rating' : 'คะแนนการประเมินโดยรวม'}
            </div>
            <div style="font-size: 2.8rem; font-weight: 800; color: #F59E0B; line-height: 1.2; margin: 6px 0;">
              ${avg > 0 ? avg : '-'}<span style="font-size: 1.2rem; color: #94A3B8; font-weight: 400;">/5</span>
            </div>
            <div>
              ${renderStarRating(avg)}
            </div>
          </div>

          <!-- 3 Scoring Criteria -->
          <div class="card" style="background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 16px; padding: 18px;">
            <div style="font-weight: 700; font-size: 0.95rem; color: var(--text-primary); margin-bottom: 16px;">
              <i class="fa-solid fa-star-half-stroke" style="color: #F59E0B; margin-right: 6px;"></i>${t('candidates.scores', { th: 'เกณฑ์การประเมิน', en: 'Evaluation Criteria' })}
            </div>

            <div style="display: flex; flex-direction: column; gap: 18px;">
              ${criteria.map(crit => `
                <div class="score-criterion-item" data-key="${crit.key}">
                  <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 4px;">
                    <div>
                      <div style="font-size: 0.9rem; font-weight: 700; color: var(--text-primary);">
                        ${isEn ? crit.titleEn : crit.titleTh}
                      </div>
                      <div style="font-size: 0.75rem; color: var(--text-tertiary);">
                        ${isEn ? crit.descEn : crit.descTh}
                      </div>
                    </div>
                    <span class="criterion-score-display" style="font-size: 0.95rem; font-weight: 700; color: #F59E0B;">
                      ${crit.val > 0 ? crit.val + '/5' : '-'}
                    </span>
                  </div>

                  <!-- 5 Clickable Stars -->
                  <div class="interactive-stars" data-key="${crit.key}" data-current="${crit.val}" style="display: flex; gap: 8px; font-size: 1.4rem; cursor: pointer; padding: 6px 0;">
                    ${[1, 2, 3, 4, 5].map(starNum => `
                      <i class="star-clickable ${starNum <= crit.val ? 'fa-solid' : 'fa-regular'} fa-star" data-rating="${starNum}" style="color: ${starNum <= crit.val ? '#F59E0B' : 'var(--border)'}; transition: transform 0.1s;"></i>
                    `).join('')}
                  </div>
                </div>
              `).join('')}
            </div>

            <button id="btn-save-scores" data-id="${cand.id}" style="width: 100%; background: var(--primary); color: #fff; border: none; border-radius: 12px; padding: 12px; font-size: 0.9rem; font-weight: 600; cursor: pointer; margin-top: 18px; box-shadow: 0 4px 10px rgba(37, 99, 235, 0.25);">
              <i class="fa-solid fa-check" style="margin-right: 6px;"></i>${t('common.save', { th: 'บันทึกคะแนนการประเมิน', en: 'Save Ratings' })}
            </button>
          </div>
        </div>
      `;
    },

    /**
     * Tab 3: Notes
     */
    renderNotesTab: function (cand) {
      const isEn = window.App && window.App.getLang() === 'en';
      const notes = Array.isArray(cand.notes) ? cand.notes : [];

      return `
        <div style="display: flex; flex-direction: column; gap: 16px;">
          <!-- Add Note Form Card -->
          <div class="card" style="background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 16px; padding: 16px;">
            <div style="font-weight: 700; font-size: 0.95rem; color: var(--text-primary); margin-bottom: 10px;">
              <i class="fa-solid fa-pen" style="color: var(--primary); margin-right: 6px;"></i>${isEn ? 'Add HR Note' : 'เพิ่มบันทึกความเห็น HR'}
            </div>
            <textarea id="new-cand-note-input" rows="3" placeholder="${isEn ? 'Add evaluation notes, impressions, interview remarks...' : 'บันทึกความเห็นการสัมภาษณ์ ความประทับใจ หรือข้อสังเกต...'}" style="width: 100%; box-sizing: border-box; background: var(--bg-tertiary); border: 1px solid var(--border); border-radius: 10px; padding: 10px; font-size: 0.85rem; color: var(--text-primary); outline: none; resize: vertical;"></textarea>
            <button id="btn-submit-note" data-id="${cand.id}" style="width: 100%; background: var(--primary); color: #fff; border: none; border-radius: 10px; padding: 10px; font-size: 0.85rem; font-weight: 600; cursor: pointer; margin-top: 10px;">
              <i class="fa-solid fa-plus" style="margin-right: 6px;"></i>${isEn ? 'Add Note' : 'บันทึกโน้ต'}
            </button>
          </div>

          <!-- Notes History List -->
          <div class="card" style="background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 16px; padding: 16px;">
            <div style="font-weight: 700; font-size: 0.95rem; color: var(--text-primary); margin-bottom: 12px;">
              <i class="fa-solid fa-comments" style="color: var(--primary); margin-right: 6px;"></i>${t('candidates.notes', { th: 'บันทึกที่ผ่านมา', en: 'Notes History' })} (${notes.length})
            </div>

            <div id="notes-list-container" style="display: flex; flex-direction: column; gap: 12px;">
              ${notes.length > 0 ? notes.map(n => {
                const noteUser = window.Data && window.Data.getUser ? window.Data.getUser(n.by) : null;
                const authorName = noteUser ? (isEn ? (noteUser.nameEn || noteUser.name) : (noteUser.name || noteUser.nameEn)) : (n.by || 'HR');
                const authorAvatar = (noteUser && noteUser.avatar) || '👩‍💼';

                return `
                  <div class="note-card" style="background: var(--bg-tertiary); border-radius: 12px; padding: 12px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                      <div style="display: flex; align-items: center; gap: 6px;">
                        <span>${authorAvatar}</span>
                        <span style="font-size: 0.8rem; font-weight: 700; color: var(--text-primary);">${authorName}</span>
                      </div>
                      <span style="font-size: 0.7rem; color: var(--text-tertiary);">${formatDate(n.at)}</span>
                    </div>
                    <div style="font-size: 0.85rem; color: var(--text-secondary); line-height: 1.4; white-space: pre-wrap;">
                      ${n.text}
                    </div>
                  </div>
                `;
              }).join('') : `
                <div style="text-align: center; padding: 20px 0; color: var(--text-tertiary); font-size: 0.82rem;">
                  ${isEn ? 'No notes added yet' : 'ยังไม่มีการบันทึกโน้ต'}
                </div>
              `}
            </div>
          </div>
        </div>
      `;
    },

    /**
     * Tab 4: Timeline
     */
    renderTimelineTab: function (cand) {
      const isEn = window.App && window.App.getLang() === 'en';
      const timeline = Array.isArray(cand.timeline) ? [...cand.timeline] : [];

      // Sort timeline ascending or descending
      timeline.sort((a, b) => new Date(a.at || 0) - new Date(b.at || 0));

      return `
        <div class="card" style="background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 16px; padding: 18px;">
          <div style="font-weight: 700; font-size: 0.95rem; color: var(--text-primary); margin-bottom: 16px;">
            <i class="fa-solid fa-timeline" style="color: var(--primary); margin-right: 6px;"></i>${t('candidates.timeline', { th: 'ประวัติขั้นตอนการสรรหา', en: 'Application History' })}
          </div>

          ${timeline.length > 0 ? `
            <div class="timeline-v-list" style="position: relative; padding-left: 20px; display: flex; flex-direction: column; gap: 18px;">
              <!-- Timeline vertical line -->
              <div style="position: absolute; left: 6px; top: 8px; bottom: 8px; width: 2px; background: var(--border);"></div>

              ${timeline.map(item => {
                let icon = 'fa-check';
                let iconColor = 'var(--primary)';
                let actionText = item.action;

                if (item.action === 'applied') {
                  icon = 'fa-paper-plane';
                  iconColor = '#06B6D4';
                  actionText = isEn ? 'Application Submitted' : 'ยื่นใบสมัครเรียบร้อย';
                } else if (item.action === 'screening') {
                  icon = 'fa-magnifying-glass';
                  iconColor = '#F59E0B';
                  actionText = isEn ? 'Application Under Screening' : 'เข้าสู่ขั้นตอนคัดกรอง';
                } else if (item.action === 'qualified') {
                  icon = 'fa-circle-check';
                  iconColor = '#2563EB';
                  actionText = isEn ? 'Passed Screening Criteria' : 'ผ่านเกณฑ์การคัดกรอง';
                } else if (item.action === 'interview_scheduled' || item.action === 'interview') {
                  icon = 'fa-calendar-check';
                  iconColor = '#8B5CF6';
                  actionText = isEn ? 'Interview Scheduled' : 'นัดหมายสัมภาษณ์';
                } else if (item.action === 'interviewed') {
                  icon = 'fa-comments';
                  iconColor = '#1D4ED8';
                  actionText = isEn ? 'Interview Completed' : 'สัมภาษณ์เสร็จสิ้น';
                } else if (item.action === 'offered') {
                  icon = 'fa-file-signature';
                  iconColor = '#059669';
                  actionText = isEn ? 'Job Offer Extended' : 'ยื่นข้อเสนอรับเข้าทำงาน';
                } else if (item.action === 'hired') {
                  icon = 'fa-trophy';
                  iconColor = '#10B981';
                  actionText = isEn ? 'Officially Hired' : 'ตอบรับเข้าทำงานเรียบร้อย';
                } else if (item.action === 'rejected') {
                  icon = 'fa-circle-xmark';
                  iconColor = '#EF4444';
                  actionText = isEn ? 'Application Rejected' : 'ไม่ผ่านการคัดเลือก';
                }

                return `
                  <div class="timeline-v-item" style="position: relative;">
                    <!-- Circle node -->
                    <div style="position: absolute; left: -20px; top: 2px; width: 14px; height: 14px; border-radius: 50%; background: ${iconColor}; border: 3px solid var(--bg-secondary); box-shadow: 0 0 0 1px ${iconColor};"></div>
                    
                    <div style="font-size: 0.88rem; font-weight: 700; color: var(--text-primary); line-height: 1.2;">
                      ${actionText}
                    </div>
                    <div style="font-size: 0.75rem; color: var(--text-tertiary); margin-top: 2px;">
                      ${formatDate(item.at)} • ${item.by || (isEn ? 'System' : 'ระบบ')}
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          ` : `
            <div style="text-align: center; padding: 20px 0; color: var(--text-tertiary); font-size: 0.82rem;">
              ${isEn ? 'No timeline records' : 'ไม่มีประวัติบันทึก'}
            </div>
          `}
        </div>
      `;
    },

    /**
     * Tab 5: Resume Preview
     */
    renderResumeTab: function (cand, resume) {
      const isEn = window.App && window.App.getLang() === 'en';

      if (!resume) {
        return `
          <div class="card" style="background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 16px; padding: 30px 20px; text-align: center;">
            <i class="fa-solid fa-file-excel" style="font-size: 2.5rem; color: var(--text-tertiary); opacity: 0.4; margin-bottom: 10px;"></i>
            <div style="font-size: 0.95rem; font-weight: 600; color: var(--text-primary);">
              ${isEn ? 'No Resume Attached' : 'ไม่มีไฟล์เรซูเม่แนบ'}
            </div>
          </div>
        `;
      }

      const p = resume.personal || {};

      return `
        <div class="card" style="background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 16px; padding: 20px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; pb: 12px; border-bottom: 1px solid var(--border); padding-bottom: 12px;">
            <div>
              <h3 style="margin: 0; font-size: 1.15rem; font-weight: 700; color: var(--text-primary);">
                ${isEn ? (p.nameEn || p.name) : (p.name || p.nameEn)}
              </h3>
              <div style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 2px;">
                ${p.email || ''} • ${p.phone || ''}
              </div>
            </div>
            <button id="btn-open-full-resume" data-id="${resume.id}" style="background: var(--primary); color: #fff; border: none; border-radius: 8px; padding: 6px 12px; font-size: 0.78rem; font-weight: 600; cursor: pointer;">
              <i class="fa-solid fa-arrow-up-right-from-square" style="margin-right: 4px;"></i>${isEn ? 'Full View' : 'ดูฉบับเต็ม'}
            </button>
          </div>

          <!-- Summary -->
          <div style="margin-bottom: 16px;">
            <div style="font-size: 0.85rem; font-weight: 700; color: var(--text-primary); margin-bottom: 4px;">
              ${isEn ? 'Summary' : 'สรุปประวัติ'}
            </div>
            <div style="font-size: 0.82rem; color: var(--text-secondary); line-height: 1.5;">
              ${isEn ? (p.summaryEn || p.summary) : (p.summary || p.summaryEn)}
            </div>
          </div>

          <!-- Education -->
          <div style="margin-bottom: 16px;">
            <div style="font-size: 0.85rem; font-weight: 700; color: var(--text-primary); margin-bottom: 6px;">
              ${isEn ? 'Education' : 'การศึกษา'}
            </div>
            ${(resume.education || []).map(e => `
              <div style="font-size: 0.8rem; margin-bottom: 4px;">
                <strong>${isEn ? (e.degreeEn || e.degree) : (e.degree || e.degreeEn)}</strong> - ${isEn ? (e.institutionEn || e.institution) : (e.institution || e.institutionEn)} (${e.year})
              </div>
            `).join('')}
          </div>

          <!-- Experience -->
          <div style="margin-bottom: 16px;">
            <div style="font-size: 0.85rem; font-weight: 700; color: var(--text-primary); margin-bottom: 6px;">
              ${isEn ? 'Experience' : 'ประสบการณ์ทำงาน'}
            </div>
            ${(resume.experience || []).map(e => `
              <div style="font-size: 0.8rem; margin-bottom: 6px;">
                <strong>${e.title}</strong> at ${isEn ? (e.companyEn || e.company) : (e.company || e.companyEn)} (${e.startDate} - ${e.current ? 'Current' : e.endDate})
              </div>
            `).join('')}
          </div>

          <!-- Skills -->
          <div>
            <div style="font-size: 0.85rem; font-weight: 700; color: var(--text-primary); margin-bottom: 6px;">
              ${isEn ? 'Key Skills' : 'ทักษะ'}
            </div>
            <div style="display: flex; flex-wrap: wrap; gap: 6px;">
              ${(resume.skills || []).map(s => `
                <span style="font-size: 0.75rem; background: var(--bg-tertiary); padding: 3px 8px; border-radius: 6px;">${typeof s === 'string' ? s : s.name}</span>
              `).join('')}
            </div>
          </div>
        </div>
      `;
    },

    /**
     * DOM listeners after rendering list view (#candidates)
     */
    afterRender: function () {
      // 1. Search input
      const searchInput = document.getElementById('candidate-search-input');
      if (searchInput) {
        searchInput.addEventListener('input', function (e) {
          state.searchQuery = e.target.value;
          window.CandidatesModule.refresh();
        });
      }

      const clearBtn = document.getElementById('btn-clear-cand-search');
      if (clearBtn) {
        clearBtn.addEventListener('click', function () {
          state.searchQuery = '';
          window.CandidatesModule.refresh();
        });
      }

      // 2. View Toggle (List vs Kanban)
      const listBtn = document.getElementById('btn-toggle-list');
      const kanbanBtn = document.getElementById('btn-toggle-kanban');

      if (listBtn) {
        listBtn.addEventListener('click', function () {
          state.viewMode = 'list';
          window.CandidatesModule.refresh();
        });
      }

      if (kanbanBtn) {
        kanbanBtn.addEventListener('click', function () {
          state.viewMode = 'kanban';
          window.CandidatesModule.refresh();
        });
      }

      // 3. Filter dropdowns
      const filterJob = document.getElementById('filter-job');
      if (filterJob) {
        filterJob.addEventListener('change', function () {
          state.selectedJobFilter = this.value;
          window.CandidatesModule.refresh();
        });
      }

      const filterStatus = document.getElementById('filter-status');
      if (filterStatus) {
        filterStatus.addEventListener('change', function () {
          state.selectedStatusFilter = this.value;
          window.CandidatesModule.refresh();
        });
      }

      const filterScore = document.getElementById('filter-score');
      if (filterScore) {
        filterScore.addEventListener('change', function () {
          state.selectedScoreFilter = this.value;
          window.CandidatesModule.refresh();
        });
      }

      // 4. Candidate card click -> profile
      document.querySelectorAll('.candidate-card').forEach(card => {
        card.addEventListener('click', function () {
          const candId = this.getAttribute('data-id');
          if (candId) {
            if (window.App && typeof window.App.navigate === 'function') {
              window.App.navigate('candidates/' + candId);
            } else {
              window.location.hash = '#candidates/' + candId;
            }
          }
        });
      });

      // 5. Applicant Go to Job button
      document.querySelectorAll('.btn-goto-job').forEach(btn => {
        btn.addEventListener('click', function (e) {
          e.stopPropagation();
          const jobId = this.getAttribute('data-id');
          if (jobId) {
            if (window.App && typeof window.App.navigate === 'function') {
              window.App.navigate('jobs/view', { id: jobId });
            } else {
              window.location.hash = '#jobs/view/' + jobId;
            }
          }
        });
      });
    },

    /**
     * Refresh Candidates view container
     */
    refresh: function () {
      const container = document.getElementById('app-content');
      if (container) {
        container.innerHTML = window.CandidatesModule.render();
        window.CandidatesModule.afterRender();
      }
    },

    /**
     * DOM listeners after rendering Profile View (#candidates/:id)
     */
    afterRenderView: function (id) {
      const isEn = window.App && window.App.getLang() === 'en';

      // Back button
      const backBtn = document.getElementById('btn-cand-profile-back');
      if (backBtn) {
        backBtn.addEventListener('click', function () {
          if (window.App && typeof window.App.navigate === 'function') {
            window.App.navigate('candidates');
          } else {
            window.location.hash = '#candidates';
          }
        });
      }

      // Tabs switching
      document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', function () {
          const targetTab = this.getAttribute('data-tab');
          state.activeProfileTab = targetTab;

          // Update active class on tab buttons
          document.querySelectorAll('.tab-btn').forEach(b => {
            const isActive = b.getAttribute('data-tab') === targetTab;
            b.style.background = isActive ? 'var(--primary)' : 'var(--bg-secondary)';
            b.style.color = isActive ? '#fff' : 'var(--text-secondary)';
            b.style.borderColor = isActive ? 'var(--primary)' : 'var(--border)';
          });

          // Show selected tab pane
          document.querySelectorAll('.tab-pane').forEach(pane => {
            pane.style.display = 'none';
          });
          const activePane = document.getElementById('tab-' + targetTab);
          if (activePane) activePane.style.display = 'block';
        });
      });

      // Status changer dropdown
      const statusSelect = document.getElementById('cand-status-changer');
      if (statusSelect) {
        statusSelect.addEventListener('change', function () {
          const candId = this.getAttribute('data-id') || id;
          const newStatus = this.value;

          const cand = window.Data && window.Data.getCandidate ? window.Data.getCandidate(candId) : null;
          if (cand) {
            cand.status = newStatus;
            cand.timeline = cand.timeline || [];
            cand.timeline.push({
              action: newStatus,
              at: new Date().toISOString(),
              by: (window.App && window.App.getCurrentUser && window.App.getCurrentUser()) ? window.App.getCurrentUser().name : 'HR'
            });

            if (window.Data && typeof window.Data.saveCandidate === 'function') {
              window.Data.saveCandidate(cand);
            }

            if (window.App && window.App.showToast) {
              window.App.showToast(isEn ? `Status updated to: ${newStatus}` : `อัปเดตสถานะเป็น: ${newStatus}`, 'success');
            }

            // Re-render profile view
            const container = document.getElementById('app-content');
            if (container) {
              container.innerHTML = window.CandidatesModule.renderView(candId);
              window.CandidatesModule.afterRenderView(candId);
            }
          }
        });
      }

      // Interactive Star Rating Clicks (Tab 2)
      document.querySelectorAll('.interactive-stars').forEach(group => {
        const critKey = group.getAttribute('data-key');
        const stars = group.querySelectorAll('.star-clickable');

        stars.forEach(star => {
          star.addEventListener('click', function () {
            const rating = parseInt(this.getAttribute('data-rating'), 10);
            group.setAttribute('data-current', rating);

            // Update star icons in this group
            stars.forEach((s, idx) => {
              if (idx < rating) {
                s.className = 'star-clickable fa-solid fa-star';
                s.style.color = '#F59E0B';
              } else {
                s.className = 'star-clickable fa-regular fa-star';
                s.style.color = 'var(--border)';
              }
            });

            // Update display text
            const parent = group.closest('.score-criterion-item');
            if (parent) {
              const display = parent.querySelector('.criterion-score-display');
              if (display) display.textContent = rating + '/5';
            }
          });
        });
      });

      // Save Ratings Button
      const saveScoresBtn = document.getElementById('btn-save-scores');
      if (saveScoresBtn) {
        saveScoresBtn.addEventListener('click', function () {
          const candId = this.getAttribute('data-id') || id;
          const cand = window.Data && window.Data.getCandidate ? window.Data.getCandidate(candId) : null;
          if (cand) {
            cand.scores = cand.scores || {};

            document.querySelectorAll('.interactive-stars').forEach(group => {
              const critKey = group.getAttribute('data-key');
              const val = parseInt(group.getAttribute('data-current'), 10) || 0;
              cand.scores[critKey] = val;
            });

            if (window.Data && typeof window.Data.saveCandidate === 'function') {
              window.Data.saveCandidate(cand);
            }

            if (window.App && window.App.showToast) {
              window.App.showToast(isEn ? 'Evaluation ratings saved successfully!' : 'บันทึกคะแนนการประเมินสำเร็จแล้ว!', 'success');
            }

            // Refresh view
            const container = document.getElementById('app-content');
            if (container) {
              container.innerHTML = window.CandidatesModule.renderView(candId);
              window.CandidatesModule.afterRenderView(candId);
            }
          }
        });
      }

      // Add Note Submit Button (Tab 3)
      const submitNoteBtn = document.getElementById('btn-submit-note');
      if (submitNoteBtn) {
        submitNoteBtn.addEventListener('click', function () {
          const candId = this.getAttribute('data-id') || id;
          const noteInput = document.getElementById('new-cand-note-input');
          const noteText = noteInput ? noteInput.value.trim() : '';

          if (!noteText) {
            if (window.App && window.App.showToast) {
              window.App.showToast(isEn ? 'Please type a note first.' : 'กรุณากรอกข้อความโน้ตก่อน', 'warning');
            }
            return;
          }

          const cand = window.Data && window.Data.getCandidate ? window.Data.getCandidate(candId) : null;
          const user = window.App && window.App.getCurrentUser ? window.App.getCurrentUser() : null;

          if (cand) {
            cand.notes = cand.notes || [];
            cand.notes.unshift({
              text: noteText,
              by: user ? user.id : 'u1',
              at: new Date().toISOString()
            });

            if (window.Data && typeof window.Data.saveCandidate === 'function') {
              window.Data.saveCandidate(cand);
            }

            if (window.App && window.App.showToast) {
              window.App.showToast(isEn ? 'Note added successfully!' : 'บันทึกโน้ตเรียบร้อยแล้ว!', 'success');
            }

            // Refresh view
            const container = document.getElementById('app-content');
            if (container) {
              container.innerHTML = window.CandidatesModule.renderView(candId);
              window.CandidatesModule.afterRenderView(candId);
            }
          }
        });
      }

      // Schedule Interview Button (Footer)
      const scheduleBtn = document.getElementById('btn-schedule-cand');
      if (scheduleBtn) {
        scheduleBtn.addEventListener('click', function () {
          const candId = this.getAttribute('data-cand-id') || id;
          const jobId = this.getAttribute('data-job-id');

          if (window.App && typeof window.App.navigate === 'function') {
            window.App.navigate('interviews/new', { candidateId: candId, jobId: jobId });
          } else {
            window.location.hash = `#interviews/new?candidateId=${candId}&jobId=${jobId}`;
          }
        });
      }

      // Quick Note Button (Footer)
      const quickNoteBtn = document.getElementById('btn-quick-note');
      if (quickNoteBtn) {
        quickNoteBtn.addEventListener('click', function () {
          // Switch to notes tab
          state.activeProfileTab = 'notes';
          const tabBtn = document.querySelector('.tab-btn[data-tab="notes"]');
          if (tabBtn) tabBtn.click();
          const noteInput = document.getElementById('new-cand-note-input');
          if (noteInput) noteInput.focus();
        });
      }

      // Reject Button (Footer)
      const rejectBtn = document.getElementById('btn-reject-cand');
      if (rejectBtn) {
        rejectBtn.addEventListener('click', function () {
          const candId = this.getAttribute('data-id') || id;
          const confirmed = confirm(isEn ? 'Are you sure you want to reject this candidate application?' : 'คุณแน่ใจหรือไม่ที่จะปฏิเสธใบสมัครของผู้สมัครท่านนี้?');
          if (confirmed) {
            const cand = window.Data && window.Data.getCandidate ? window.Data.getCandidate(candId) : null;
            if (cand) {
              cand.status = 'rejected';
              cand.timeline = cand.timeline || [];
              cand.timeline.push({
                action: 'rejected',
                at: new Date().toISOString(),
                by: (window.App && window.App.getCurrentUser && window.App.getCurrentUser()) ? window.App.getCurrentUser().name : 'HR'
              });

              if (window.Data && typeof window.Data.saveCandidate === 'function') {
                window.Data.saveCandidate(cand);
              }

              if (window.App && window.App.showToast) {
                window.App.showToast(isEn ? 'Candidate marked as Rejected.' : 'ปฏิเสธใบสมัครเรียบร้อยแล้ว', 'info');
              }

              // Refresh view
              const container = document.getElementById('app-content');
              if (container) {
                container.innerHTML = window.CandidatesModule.renderView(candId);
                window.CandidatesModule.afterRenderView(candId);
              }
            }
          }
        });
      }

      // Full Resume View Button
      const openFullResumeBtn = document.getElementById('btn-open-full-resume');
      if (openFullResumeBtn) {
        openFullResumeBtn.addEventListener('click', function () {
          const resumeId = this.getAttribute('data-id');
          if (resumeId) {
            if (window.App && typeof window.App.navigate === 'function') {
              window.App.navigate('resumes/' + resumeId);
            } else {
              window.location.hash = '#resumes/' + resumeId;
            }
          }
        });
      }
    }
  };
})();
