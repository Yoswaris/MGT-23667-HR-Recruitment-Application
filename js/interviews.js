/**
 * HR Recruitment App - Interviews Module
 * Handles interview calendar, list view, scheduling, and evaluation.
 */

window.InterviewsModule = (function () {
  'use strict';

  // Internal module state
  let currentViewMode = 'calendar'; // 'calendar' | 'list'
  let currentCalDate = new Date(2026, 9, 1); // Default to Oct 2026 (matches sample data)
  let selectedDateStr = '2026-10-20'; // Default selected date
  let newInterviewTags = [];
  let evalScores = {
    technical: 5,
    communication: 4,
    attitude: 5,
    cultureFit: 4,
    growthPotential: 4
  };
  let evalResult = 'pass';

  // Translation helper with bilingual fallback
  function t(key, fallback) {
    if (window.App && typeof window.App.t === 'function') {
      const val = window.App.t(key);
      if (val && val !== key) return val;
    }
    const isEn = window.App && typeof window.App.getLang === 'function' ? window.App.getLang() === 'en' : false;
    if (fallback) {
      if (typeof fallback === 'object') {
        return isEn ? (fallback.en || fallback.th) : (fallback.th || fallback.en);
      }
      return fallback;
    }
    return key;
  }

  // Helper to format date
  function formatDate(dateStr) {
    if (!dateStr) return '';
    if (window.App && typeof window.App.formatDate === 'function') {
      return window.App.formatDate(dateStr);
    }
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      const isEn = window.App && typeof window.App.getLang === 'function' ? window.App.getLang() === 'en' : false;
      const monthsTh = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
      const monthsEn = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const day = d.getDate();
      const month = isEn ? monthsEn[d.getMonth()] : monthsTh[d.getMonth()];
      const year = isEn ? d.getFullYear() : (d.getFullYear() + 543);
      return `${day} ${month} ${year}`;
    } catch (e) {
      return dateStr;
    }
  }

  // Resolve candidate display info
  function getCandidateInfo(candidateId) {
    if (!candidateId || !window.Data) return { name: 'Unknown Candidate', avatar: '👤', jobTitle: 'N/A', email: '', phone: '' };
    const cand = window.Data.getCandidate ? window.Data.getCandidate(candidateId) : null;
    let name = cand?.name || '';
    let avatar = cand?.avatar || '👤';
    let email = cand?.email || '';
    let phone = cand?.phone || '';
    let jobId = cand?.jobId;

    if (cand?.userId && window.Data.getUser) {
      const u = window.Data.getUser(cand.userId);
      if (u) {
        const isEn = window.App && typeof window.App.getLang === 'function' ? window.App.getLang() === 'en' : false;
        name = isEn ? (u.nameEn || u.name) : (u.name || u.nameEn);
        if (u.avatar) avatar = u.avatar;
        if (u.email) email = u.email;
        if (u.phone) phone = u.phone;
      }
    } else if (cand?.resumeId && window.Data.getResume) {
      const r = window.Data.getResume(cand.resumeId);
      if (r?.personal) {
        const isEn = window.App && typeof window.App.getLang === 'function' ? window.App.getLang() === 'en' : false;
        name = isEn ? (r.personal.nameEn || r.personal.name) : (r.personal.name || r.personal.nameEn);
        if (r.personal.photo) avatar = r.personal.photo;
        if (r.personal.email) email = r.personal.email;
        if (r.personal.phone) phone = r.personal.phone;
      }
    }

    if (!name) name = `Candidate #${candidateId}`;

    let jobTitle = 'N/A';
    if (jobId && window.Data.getJob) {
      const j = window.Data.getJob(jobId);
      if (j) {
        const isEn = window.App && typeof window.App.getLang === 'function' ? window.App.getLang() === 'en' : false;
        jobTitle = isEn ? (j.titleEn || j.title) : (j.title || j.titleEn);
      }
    }

    return { cand, name, avatar, jobTitle, email, phone, jobId };
  }

  // Get type icon and label
  function getTypeMeta(type) {
    switch (type) {
      case 'phone':
        return { icon: 'fa-phone', label: t('interviews.types.phone', { th: 'โทรศัพท์', en: 'Phone Call' }), emoji: '📞', color: '#06B6D4' };
      case 'video':
        return { icon: 'fa-video', label: t('interviews.types.video', { th: 'วิดีโอคอล', en: 'Video Call' }), emoji: '💻', color: '#3B82F6' };
      case 'onsite':
        return { icon: 'fa-building', label: t('interviews.types.onsite', { th: 'สัมภาษณ์ที่บริษัท', en: 'On-site' }), emoji: '🏢', color: '#10B981' };
      case 'panel':
        return { icon: 'fa-users', label: t('interviews.types.panel', { th: 'สัมภาษณ์แบบกลุ่ม', en: 'Panel' }), emoji: '👥', color: '#8B5CF6' };
      default:
        return { icon: 'fa-comments', label: type, emoji: '💬', color: '#64748B' };
    }
  }

  // Get status badge metadata
  function getStatusMeta(status) {
    switch (status) {
      case 'scheduled':
        return {
          label: t('interviews.status.scheduled', { th: 'นัดหมายแล้ว', en: 'Scheduled' }),
          bg: '#FEF3C7',
          color: '#D97706',
          dot: '#F59E0B'
        };
      case 'completed':
        return {
          label: t('interviews.status.completed', { th: 'เสร็จสิ้นแล้ว', en: 'Completed' }),
          bg: '#D1FAE5',
          color: '#059669',
          dot: '#10B981'
        };
      case 'cancelled':
        return {
          label: t('interviews.status.cancelled', { th: 'ยกเลิกแล้ว', en: 'Cancelled' }),
          bg: '#FEE2E2',
          color: '#DC2626',
          dot: '#EF4444'
        };
      default:
        return { label: status, bg: '#F1F5F9', color: '#64748B', dot: '#94A3B8' };
    }
  }

  // Filter interviews accessible to current user
  function getAllowedInterviews() {
    if (!window.Data || !window.Data.getInterviews) return [];
    let list = window.Data.getInterviews();
    if (!Array.isArray(list)) list = [];

    const isApplicant = window.App && typeof window.App.isApplicant === 'function' && window.App.isApplicant();
    if (isApplicant) {
      const curUser = window.App.getCurrentUser ? window.App.getCurrentUser() : null;
      if (!curUser) return [];
      list = list.filter(item => {
        const c = window.Data.getCandidate ? window.Data.getCandidate(item.candidateId) : null;
        return c && c.userId === curUser.id;
      });
    }
    return list;
  }

  /**
   * Main View: Calendar or List View
   */
  function render(params) {
    const isHR = window.App && typeof window.App.isHR === 'function' ? window.App.isHR() : true;
    const isEn = window.App && typeof window.App.getLang === 'function' ? window.App.getLang() === 'en' : false;
    const interviews = getAllowedInterviews();

    const monthNamesTh = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
    const monthNamesEn = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const monthYearStr = isEn
      ? `${monthNamesEn[currentCalDate.getMonth()]} ${currentCalDate.getFullYear()}`
      : `${monthNamesTh[currentCalDate.getMonth()]} ${currentCalDate.getFullYear() + 543}`;

    return `
      <div class="interviews-module animate-fade-in" style="padding-bottom: 80px;">
        <!-- Top Controls Header -->
        <div class="page-top-bar" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
          <div>
            <h2 style="font-size: 1.35rem; font-weight: 700; margin: 0; color: var(--text-primary);">
              ${t('interviews.title', { th: 'การสัมภาษณ์', en: 'Interviews' })}
            </h2>
            <p style="margin: 2px 0 0; font-size: 0.85rem; color: var(--text-secondary);">
              ${interviews.length} ${t('interviews.totalCount', { th: 'รายการทั้งหมด', en: 'total sessions' })}
            </p>
          </div>

          <!-- View Switcher Toggle -->
          <div class="segmented-control" style="display: inline-flex; background: var(--bg-tertiary); padding: 3px; border-radius: 12px; border: 1px solid var(--border);">
            <button id="toggle-view-cal" class="segment-btn ${currentViewMode === 'calendar' ? 'active' : ''}" style="border: none; background: ${currentViewMode === 'calendar' ? 'var(--bg-secondary)' : 'transparent'}; color: ${currentViewMode === 'calendar' ? 'var(--primary)' : 'var(--text-secondary)'}; padding: 6px 14px; border-radius: 9px; font-size: 0.85rem; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 6px; box-shadow: ${currentViewMode === 'calendar' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'}; transition: all 0.2s;">
              <i class="fas fa-calendar-alt"></i>
              <span>${t('interviews.calendar', { th: 'ปฏิทิน', en: 'Calendar' })}</span>
            </button>
            <button id="toggle-view-list" class="segment-btn ${currentViewMode === 'list' ? 'active' : ''}" style="border: none; background: ${currentViewMode === 'list' ? 'var(--bg-secondary)' : 'transparent'}; color: ${currentViewMode === 'list' ? 'var(--primary)' : 'var(--text-secondary)'}; padding: 6px 14px; border-radius: 9px; font-size: 0.85rem; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 6px; box-shadow: ${currentViewMode === 'list' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'}; transition: all 0.2s;">
              <i class="fas fa-list-ul"></i>
              <span>${t('common.list', { th: 'รายการ', en: 'List' })}</span>
            </button>
          </div>
        </div>

        ${currentViewMode === 'calendar' ? renderCalendarView(interviews, monthYearStr, isEn) : renderListView(interviews, isEn)}

        <!-- HR Floating Action Button -->
        ${isHR ? `
          <button id="fab-create-interview" class="app-fab" title="${t('interviews.schedule', { th: 'นัดสัมภาษณ์ใหม่', en: 'Schedule Interview' })}" style="position: fixed; right: 20px; bottom: 84px; width: 56px; height: 56px; border-radius: 50%; background: var(--primary); color: #fff; border: none; box-shadow: 0 4px 14px rgba(37,99,235,0.4); display: flex; align-items: center; justify-content: center; font-size: 1.4rem; cursor: pointer; z-index: 99; transition: transform 0.2s;">
            <i class="fas fa-plus"></i>
          </button>
        ` : ''}
      </div>
    `;
  }

  // Helper: Render Calendar View
  function renderCalendarView(interviews, monthYearStr, isEn) {
    const year = currentCalDate.getFullYear();
    const month = currentCalDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // Map interviews by date string YYYY-MM-DD
    const interviewsByDate = {};
    interviews.forEach(item => {
      if (!interviewsByDate[item.date]) interviewsByDate[item.date] = [];
      interviewsByDate[item.date].push(item);
    });

    const weekDays = isEn
      ? ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
      : ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];

    let cellsHtml = '';
    // Empty cells for offset
    for (let i = 0; i < firstDay; i++) {
      cellsHtml += `<div class="cal-day empty" style="min-height: 44px;"></div>`;
    }

    // Days in current month
    for (let day = 1; day <= daysInMonth; day++) {
      const dayPad = day < 10 ? `0${day}` : day;
      const monthPad = (month + 1) < 10 ? `0${month + 1}` : (month + 1);
      const cellDateStr = `${year}-${monthPad}-${dayPad}`;
      const dayList = interviewsByDate[cellDateStr] || [];
      const isSelected = cellDateStr === selectedDateStr;

      // Dots for interview statuses on this day
      let dotsHtml = '';
      if (dayList.length > 0) {
        dotsHtml = '<div style="display: flex; gap: 3px; justify-content: center; margin-top: 3px;">';
        dayList.slice(0, 3).forEach(it => {
          const s = getStatusMeta(it.status);
          dotsHtml += `<span style="width: 6px; height: 6px; border-radius: 50%; background-color: ${s.dot}; display: inline-block;"></span>`;
        });
        if (dayList.length > 3) {
          dotsHtml += `<span style="font-size: 8px; line-height: 6px; color: var(--text-secondary);">+</span>`;
        }
        dotsHtml += '</div>';
      }

      cellsHtml += `
        <div class="cal-day ${isSelected ? 'selected' : ''}" data-date="${cellDateStr}" style="min-height: 48px; display: flex; flex-direction: column; align-items: center; justify-content: flex-start; padding: 6px 2px; border-radius: 12px; cursor: pointer; transition: all 0.15s; background: ${isSelected ? 'var(--primary)' : 'transparent'}; color: ${isSelected ? '#ffffff' : 'var(--text-primary)'}; border: 1px solid ${isSelected ? 'var(--primary)' : 'transparent'};">
          <span style="font-size: 0.95rem; font-weight: ${isSelected || dayList.length ? '700' : '500'};">${day}</span>
          ${dotsHtml}
        </div>
      `;
    }

    // Day interviews for currently selected date
    const selectedInterviews = interviewsByDate[selectedDateStr] || [];

    return `
      <!-- Calendar Container Card -->
      <div class="card cal-card" style="background: var(--bg-secondary); border-radius: 18px; padding: 18px; border: 1px solid var(--border); box-shadow: 0 2px 10px var(--shadow); margin-bottom: 20px;">
        <!-- Calendar Header Navigation -->
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
          <button id="cal-prev-month" class="btn-icon" style="background: var(--bg-tertiary); border: 1px solid var(--border); border-radius: 10px; width: 36px; height: 36px; cursor: pointer; color: var(--text-primary); display: flex; align-items: center; justify-content: center;">
            <i class="fas fa-chevron-left"></i>
          </button>
          <span style="font-size: 1.1rem; font-weight: 700; color: var(--text-primary);">
            ${monthYearStr}
          </span>
          <button id="cal-next-month" class="btn-icon" style="background: var(--bg-tertiary); border: 1px solid var(--border); border-radius: 10px; width: 36px; height: 36px; cursor: pointer; color: var(--text-primary); display: flex; align-items: center; justify-content: center;">
            <i class="fas fa-chevron-right"></i>
          </button>
        </div>

        <!-- Weekday Headers -->
        <div style="display: grid; grid-template-columns: repeat(7, 1fr); text-align: center; font-size: 0.75rem; font-weight: 600; color: var(--text-secondary); margin-bottom: 8px;">
          ${weekDays.map((d, i) => `<div style="color: ${i === 0 ? 'var(--danger)' : 'var(--text-secondary)'};">${d}</div>`).join('')}
        </div>

        <!-- Days Grid -->
        <div id="cal-grid" style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; text-align: center;">
          ${cellsHtml}
        </div>

        <!-- Dot Legend -->
        <div style="display: flex; gap: 14px; justify-content: center; margin-top: 14px; padding-top: 10px; border-top: 1px dashed var(--border); font-size: 0.75rem; color: var(--text-secondary);">
          <span style="display: flex; align-items: center; gap: 5px;"><span style="width: 8px; height: 8px; border-radius: 50%; background: #F59E0B;"></span> ${t('interviews.status.scheduled', { th: 'นัดหมายแล้ว', en: 'Scheduled' })}</span>
          <span style="display: flex; align-items: center; gap: 5px;"><span style="width: 8px; height: 8px; border-radius: 50%; background: #10B981;"></span> ${t('interviews.status.completed', { th: 'เสร็จสิ้นแล้ว', en: 'Completed' })}</span>
          <span style="display: flex; align-items: center; gap: 5px;"><span style="width: 8px; height: 8px; border-radius: 50%; background: #EF4444;"></span> ${t('interviews.status.cancelled', { th: 'ยกเลิก', en: 'Cancelled' })}</span>
        </div>
      </div>

      <!-- Selected Day Sessions Section -->
      <div class="day-sessions-container">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
          <h3 style="font-size: 1rem; font-weight: 700; color: var(--text-primary); margin: 0; display: flex; align-items: center; gap: 8px;">
            <i class="fas fa-calendar-day" style="color: var(--primary);"></i>
            <span>${formatDate(selectedDateStr)}</span>
          </h3>
          <span class="badge" style="background: var(--bg-tertiary); color: var(--text-secondary); padding: 3px 10px; border-radius: 20px; font-size: 0.75rem; font-weight: 600;">
            ${selectedInterviews.length} ${t('interviews.sessions', { th: 'การนัดหมาย', en: 'Sessions' })}
          </span>
        </div>

        <div id="day-interviews-list" style="display: flex; flex-direction: column; gap: 12px;">
          ${selectedInterviews.length === 0 ? `
            <div style="text-align: center; padding: 32px 16px; background: var(--bg-secondary); border-radius: 16px; border: 1px dashed var(--border); color: var(--text-secondary);">
              <i class="fas fa-calendar-check" style="font-size: 2rem; color: var(--text-tertiary); margin-bottom: 8px;"></i>
              <p style="margin: 0; font-size: 0.9rem;">${t('interviews.noSessionOnDay', { th: 'ไม่มีการนัดสัมภาษณ์ในวันนี้', en: 'No interviews scheduled for this date' })}</p>
            </div>
          ` : selectedInterviews.map(it => renderInterviewCard(it)).join('')}
        </div>
      </div>
    `;
  }

  // Helper: Render List View
  function renderListView(interviews, isEn) {
    if (interviews.length === 0) {
      return `
        <div style="text-align: center; padding: 48px 16px; background: var(--bg-secondary); border-radius: 16px; border: 1px dashed var(--border); color: var(--text-secondary); margin-top: 16px;">
          <i class="fas fa-calendar-times" style="font-size: 2.4rem; color: var(--text-tertiary); margin-bottom: 12px;"></i>
          <h3 style="margin: 0 0 6px; color: var(--text-primary);">${t('interviews.noInterviews', { th: 'ไม่พบรายการสัมภาษณ์', en: 'No interviews found' })}</h3>
          <p style="margin: 0; font-size: 0.85rem;">${t('interviews.noInterviewsSub', { th: 'ยังไม่มีกำหนดการสัมภาษณ์ในระบบ', en: 'There are no interview sessions scheduled yet.' })}</p>
        </div>
      `;
    }

    // Sort by date and time (newest/upcoming first)
    const sorted = [...interviews].sort((a, b) => {
      const dtA = `${a.date}T${a.time || '00:00'}`;
      const dtB = `${b.date}T${b.time || '00:00'}`;
      return dtA.localeCompare(dtB);
    });

    // Group by date
    const groups = {};
    sorted.forEach(it => {
      if (!groups[it.date]) groups[it.date] = [];
      groups[it.date].push(it);
    });

    return `
      <div class="interviews-list-view" style="display: flex; flex-direction: column; gap: 18px;">
        ${Object.keys(groups).map(dateStr => `
          <div class="date-group">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 10px;">
              <span style="display: inline-flex; align-items: center; justify-content: center; width: 26px; height: 26px; border-radius: 8px; background: var(--primary-light); color: #fff; font-size: 0.75rem;">
                <i class="fas fa-calendar"></i>
              </span>
              <h3 style="margin: 0; font-size: 0.95rem; font-weight: 700; color: var(--text-primary);">
                ${formatDate(dateStr)}
              </h3>
            </div>
            <div style="display: flex; flex-direction: column; gap: 10px;">
              ${groups[dateStr].map(it => renderInterviewCard(it)).join('')}
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  // Helper: Render individual interview card
  function renderInterviewCard(item) {
    const cand = getCandidateInfo(item.candidateId);
    const typeMeta = getTypeMeta(item.type);
    const statusMeta = getStatusMeta(item.status);

    return `
      <div class="interview-card card-interactive" data-id="${item.id}" style="background: var(--bg-secondary); border-radius: 16px; padding: 14px 16px; border: 1px solid var(--border); box-shadow: 0 2px 6px var(--shadow); cursor: pointer; transition: transform 0.15s, box-shadow 0.15s; position: relative;">
        <!-- Header row -->
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <span style="font-size: 1.8rem; line-height: 1; width: 42px; height: 42px; background: var(--bg-tertiary); border-radius: 12px; display: flex; align-items: center; justify-content: center;">
              ${cand.avatar}
            </span>
            <div>
              <h4 style="margin: 0; font-size: 0.95rem; font-weight: 700; color: var(--text-primary);">
                ${cand.name}
              </h4>
              <p style="margin: 2px 0 0; font-size: 0.8rem; color: var(--text-secondary);">
                ${cand.jobTitle}
              </p>
            </div>
          </div>

          <!-- Status badge -->
          <span style="font-size: 0.75rem; font-weight: 600; padding: 4px 10px; border-radius: 12px; background: ${statusMeta.bg}; color: ${statusMeta.color}; display: inline-flex; align-items: center; gap: 5px;">
            <span style="width: 6px; height: 6px; border-radius: 50%; background: ${statusMeta.dot};"></span>
            ${statusMeta.label}
          </span>
        </div>

        <!-- Details Row -->
        <div style="display: flex; flex-wrap: wrap; gap: 10px; font-size: 0.8rem; color: var(--text-secondary); padding-top: 8px; border-top: 1px solid var(--border);">
          <div style="display: flex; align-items: center; gap: 5px;">
            <i class="fas fa-clock" style="color: var(--primary);"></i>
            <span>${item.time || '10:00'} (${item.duration || 60} ${t('interviews.mins', { th: 'นาที', en: 'min' })})</span>
          </div>

          <div style="display: flex; align-items: center; gap: 5px;">
            <span style="color: ${typeMeta.color};">${typeMeta.emoji}</span>
            <span>${typeMeta.label}</span>
          </div>

          ${item.location ? `
            <div style="display: flex; align-items: center; gap: 5px; max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
              <i class="fas fa-map-marker-alt" style="color: var(--danger);"></i>
              <span>${item.location}</span>
            </div>
          ` : ''}
        </div>

        <!-- Evaluation summary if completed -->
        ${item.status === 'completed' && item.evaluation ? `
          <div style="margin-top: 10px; padding: 8px 12px; background: var(--bg-tertiary); border-radius: 10px; font-size: 0.78rem; display: flex; justify-content: space-between; align-items: center;">
            <span style="color: var(--text-secondary); display: flex; align-items: center; gap: 6px;">
              <i class="fas fa-clipboard-check" style="color: var(--success);"></i>
              <span>${t('interviews.evaluationScore', { th: 'ผลการประเมิน:', en: 'Result:' })}</span>
            </span>
            <span style="font-weight: 700; color: ${item.evaluation.result === 'pass' ? 'var(--success)' : (item.evaluation.result === 'consider' ? 'var(--warning)' : 'var(--danger)')};">
              ${item.evaluation.result === 'pass' ? '✅ ' + t('interviews.eval.pass', { th: 'ผ่าน', en: 'Pass' }) : (item.evaluation.result === 'consider' ? '⚠️ ' + t('interviews.eval.consider', { th: 'พิจารณาเพิ่มเติม', en: 'Consider' }) : '❌ ' + t('interviews.eval.fail', { th: 'ไม่ผ่าน', en: 'Fail' }))}
            </span>
          </div>
        ` : ''}
      </div>
    `;
  }

  /**
   * Schedule Interview Form (HR Only)
   */
  function renderCreate() {
    const isHR = window.App && typeof window.App.isHR === 'function' ? window.App.isHR() : true;
    if (!isHR) {
      return `
        <div class="card" style="padding: 24px; text-align: center; background: var(--bg-secondary); border-radius: 16px; margin: 20px;">
          <i class="fas fa-shield-alt" style="font-size: 2.5rem; color: var(--danger); margin-bottom: 12px;"></i>
          <h3>${t('common.accessDenied', { th: 'ไม่มีสิทธิ์เข้าถึง', en: 'Access Denied' })}</h3>
          <p>${t('common.hrOnly', { th: 'หน้านี้สำหรับเจ้าหน้าที่ฝ่ายบุคคลเท่านั้น', en: 'This feature is only available for HR personnel.' })}</p>
          <button onclick="window.App.navigate('interviews')" class="btn-primary" style="margin-top: 12px; padding: 8px 20px; border-radius: 10px;">${t('common.back', { th: 'ย้อนกลับ', en: 'Back' })}</button>
        </div>
      `;
    }

    // Candidates list eligible for scheduling
    const allCandidates = window.Data && window.Data.getCandidates ? window.Data.getCandidates() : [];
    const candidates = allCandidates.filter(c => c.status !== 'rejected' && c.status !== 'hired');

    // Default interviewers
    const curUser = window.App && window.App.getCurrentUser ? window.App.getCurrentUser() : null;
    const defaultInterviewer = curUser ? (curUser.name || 'HR Team') : 'HR Team';
    newInterviewTags = [defaultInterviewer];

    // Default to first candidate
    const firstCand = candidates[0];
    const initialJobTitle = firstCand ? getCandidateInfo(firstCand.id).jobTitle : '';
    const initialJobId = firstCand ? firstCand.jobId : '';

    return `
      <div class="interviews-create-module animate-fade-in" style="padding-bottom: 90px;">
        <!-- Top Title Bar -->
        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 18px;">
          <button id="btn-back-interviews" class="btn-icon" style="background: var(--bg-tertiary); border: 1px solid var(--border); border-radius: 10px; width: 38px; height: 38px; cursor: pointer; color: var(--text-primary); display: flex; align-items: center; justify-content: center;">
            <i class="fas fa-arrow-left"></i>
          </button>
          <div>
            <h2 style="font-size: 1.25rem; font-weight: 700; margin: 0; color: var(--text-primary);">
              ${t('interviews.schedule', { th: 'นัดหมายการสัมภาษณ์', en: 'Schedule Interview' })}
            </h2>
            <p style="margin: 2px 0 0; font-size: 0.8rem; color: var(--text-secondary);">
              ${t('interviews.scheduleSub', { th: 'กรอกรายละเอียดเพื่อนัดสัมภาษณ์ผู้สมัคร', en: 'Fill in details to set up an interview' })}
            </p>
          </div>
        </div>

        <!-- Form Card -->
        <form id="form-create-interview" class="card" style="background: var(--bg-secondary); border-radius: 18px; padding: 20px; border: 1px solid var(--border); box-shadow: 0 4px 14px var(--shadow);">
          <!-- Candidate Selector -->
          <div class="form-group" style="margin-bottom: 16px;">
            <label style="display: block; font-size: 0.85rem; font-weight: 600; color: var(--text-primary); margin-bottom: 6px;">
              ${t('interviews.candidate', { th: 'ผู้สมัครงาน *', en: 'Candidate *' })}
            </label>
            <select id="int-candidate-select" required style="width: 100%; padding: 10px 12px; border-radius: 10px; border: 1px solid var(--border); background: var(--bg-primary); color: var(--text-primary); font-size: 0.9rem; outline: none;">
              ${candidates.length === 0 ? `<option value="">-- ${t('interviews.noQualifiedCandidates', { th: 'ไม่มีผู้สมัครที่พร้อมนัดสัมภาษณ์', en: 'No qualified candidates' })} --</option>` : ''}
              ${candidates.map(c => {
                const info = getCandidateInfo(c.id);
                return `<option value="${c.id}" data-jobid="${c.jobId || ''}" data-jobtitle="${info.jobTitle}">${info.avatar} ${info.name} (${info.jobTitle})</option>`;
              }).join('')}
            </select>
          </div>

          <!-- Job Position (Auto-filled) -->
          <div class="form-group" style="margin-bottom: 16px;">
            <label style="display: block; font-size: 0.85rem; font-weight: 600; color: var(--text-primary); margin-bottom: 6px;">
              ${t('interviews.jobTitle', { th: 'ตำแหน่งงาน (ดึงอัตโนมัติ)', en: 'Job Position (Auto-filled)' })}
            </label>
            <input type="text" id="int-job-display" readonly value="${initialJobTitle}" style="width: 100%; padding: 10px 12px; border-radius: 10px; border: 1px solid var(--border); background: var(--bg-tertiary); color: var(--text-secondary); font-size: 0.9rem; cursor: not-allowed;">
            <input type="hidden" id="int-job-id" value="${initialJobId}">
          </div>

          <!-- Interview Type (Radio buttons with icons) -->
          <div class="form-group" style="margin-bottom: 18px;">
            <label style="display: block; font-size: 0.85rem; font-weight: 600; color: var(--text-primary); margin-bottom: 8px;">
              ${t('interviews.type', { th: 'ประเภทการสัมภาษณ์ *', en: 'Interview Type *' })}
            </label>
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px;">
              <label class="type-pill" style="display: flex; align-items: center; gap: 8px; padding: 10px 12px; border-radius: 12px; border: 1px solid var(--border); background: var(--bg-primary); cursor: pointer; font-size: 0.85rem; font-weight: 500; color: var(--text-primary); transition: all 0.15s;">
                <input type="radio" name="interviewType" value="video" checked style="accent-color: var(--primary);">
                <span>💻 ${t('interviews.types.video', { th: 'วิดีโอคอล', en: 'Video Call' })}</span>
              </label>

              <label class="type-pill" style="display: flex; align-items: center; gap: 8px; padding: 10px 12px; border-radius: 12px; border: 1px solid var(--border); background: var(--bg-primary); cursor: pointer; font-size: 0.85rem; font-weight: 500; color: var(--text-primary); transition: all 0.15s;">
                <input type="radio" name="interviewType" value="phone" style="accent-color: var(--primary);">
                <span>📞 ${t('interviews.types.phone', { th: 'โทรศัพท์', en: 'Phone' })}</span>
              </label>

              <label class="type-pill" style="display: flex; align-items: center; gap: 8px; padding: 10px 12px; border-radius: 12px; border: 1px solid var(--border); background: var(--bg-primary); cursor: pointer; font-size: 0.85rem; font-weight: 500; color: var(--text-primary); transition: all 0.15s;">
                <input type="radio" name="interviewType" value="onsite" style="accent-color: var(--primary);">
                <span>🏢 ${t('interviews.types.onsite', { th: 'ที่บริษัท', en: 'On-site' })}</span>
              </label>

              <label class="type-pill" style="display: flex; align-items: center; gap: 8px; padding: 10px 12px; border-radius: 12px; border: 1px solid var(--border); background: var(--bg-primary); cursor: pointer; font-size: 0.85rem; font-weight: 500; color: var(--text-primary); transition: all 0.15s;">
                <input type="radio" name="interviewType" value="panel" style="accent-color: var(--primary);">
                <span>👥 ${t('interviews.types.panel', { th: 'แบบกลุ่ม', en: 'Panel' })}</span>
              </label>
            </div>
          </div>

          <!-- Date & Time Row -->
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px;">
            <div class="form-group">
              <label style="display: block; font-size: 0.85rem; font-weight: 600; color: var(--text-primary); margin-bottom: 6px;">
                ${t('interviews.date', { th: 'วันที่ *', en: 'Date *' })}
              </label>
              <input type="date" id="int-date" required value="2026-10-25" style="width: 100%; padding: 10px 12px; border-radius: 10px; border: 1px solid var(--border); background: var(--bg-primary); color: var(--text-primary); font-size: 0.85rem; outline: none;">
            </div>

            <div class="form-group">
              <label style="display: block; font-size: 0.85rem; font-weight: 600; color: var(--text-primary); margin-bottom: 6px;">
                ${t('interviews.time', { th: 'เวลา *', en: 'Time *' })}
              </label>
              <input type="time" id="int-time" required value="10:00" style="width: 100%; padding: 10px 12px; border-radius: 10px; border: 1px solid var(--border); background: var(--bg-primary); color: var(--text-primary); font-size: 0.85rem; outline: none;">
            </div>
          </div>

          <!-- Duration Pills -->
          <div class="form-group" style="margin-bottom: 16px;">
            <label style="display: block; font-size: 0.85rem; font-weight: 600; color: var(--text-primary); margin-bottom: 8px;">
              ${t('interviews.duration', { th: 'ระยะเวลา *', en: 'Duration *' })}
            </label>
            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px;">
              <label style="display: flex; flex-direction: column; align-items: center; padding: 8px 4px; border-radius: 10px; border: 1px solid var(--border); background: var(--bg-primary); cursor: pointer; font-size: 0.8rem; text-align: center;">
                <input type="radio" name="intDuration" value="30" style="accent-color: var(--primary); margin-bottom: 4px;">
                <span>30 ${t('interviews.mins', { th: 'นาที', en: 'min' })}</span>
              </label>
              <label style="display: flex; flex-direction: column; align-items: center; padding: 8px 4px; border-radius: 10px; border: 1px solid var(--border); background: var(--bg-primary); cursor: pointer; font-size: 0.8rem; text-align: center;">
                <input type="radio" name="intDuration" value="45" style="accent-color: var(--primary); margin-bottom: 4px;">
                <span>45 ${t('interviews.mins', { th: 'นาที', en: 'min' })}</span>
              </label>
              <label style="display: flex; flex-direction: column; align-items: center; padding: 8px 4px; border-radius: 10px; border: 1px solid var(--border); background: var(--bg-primary); cursor: pointer; font-size: 0.8rem; text-align: center;">
                <input type="radio" name="intDuration" value="60" checked style="accent-color: var(--primary); margin-bottom: 4px;">
                <span>1 ${t('interviews.hour', { th: 'ชม.', en: 'hr' })}</span>
              </label>
              <label style="display: flex; flex-direction: column; align-items: center; padding: 8px 4px; border-radius: 10px; border: 1px solid var(--border); background: var(--bg-primary); cursor: pointer; font-size: 0.8rem; text-align: center;">
                <input type="radio" name="intDuration" value="90" style="accent-color: var(--primary); margin-bottom: 4px;">
                <span>1.5 ${t('interviews.hour', { th: 'ชม.', en: 'hr' })}</span>
              </label>
            </div>
          </div>

          <!-- Interviewers (Multiple Tags) -->
          <div class="form-group" style="margin-bottom: 16px;">
            <label style="display: block; font-size: 0.85rem; font-weight: 600; color: var(--text-primary); margin-bottom: 6px;">
              ${t('interviews.interviewers', { th: 'ผู้สัมภาษณ์ (กรรมการ)', en: 'Interviewers' })}
            </label>
            <div style="display: flex; gap: 8px; margin-bottom: 8px;">
              <input type="text" id="int-new-interviewer-input" placeholder="${t('interviews.addInterviewerPlaceholder', { th: 'พิมพ์ชื่อแล้วกดเพิ่ม...', en: 'Enter interviewer name...' })}" style="flex: 1; padding: 9px 12px; border-radius: 10px; border: 1px solid var(--border); background: var(--bg-primary); color: var(--text-primary); font-size: 0.85rem; outline: none;">
              <button type="button" id="btn-add-interviewer" style="background: var(--bg-tertiary); border: 1px solid var(--border); padding: 0 16px; border-radius: 10px; font-weight: 600; font-size: 0.85rem; cursor: pointer; color: var(--primary);">
                + ${t('common.add', { th: 'เพิ่ม', en: 'Add' })}
              </button>
            </div>
            <!-- Tags Container -->
            <div id="interviewers-tags-list" style="display: flex; flex-wrap: wrap; gap: 6px;">
              ${renderInterviewersTags()}
            </div>
          </div>

          <!-- Location / Link -->
          <div class="form-group" style="margin-bottom: 16px;">
            <label style="display: block; font-size: 0.85rem; font-weight: 600; color: var(--text-primary); margin-bottom: 6px;">
              ${t('interviews.location', { th: 'สถานที่ / ลิงก์ห้องสัมภาษณ์ (Zoom, Google Meet) *', en: 'Location / Meeting Link *' })}
            </label>
            <input type="text" id="int-location" required placeholder="https://zoom.us/j/... หรือ ห้องประชุม 302" value="Zoom Meeting" style="width: 100%; padding: 10px 12px; border-radius: 10px; border: 1px solid var(--border); background: var(--bg-primary); color: var(--text-primary); font-size: 0.9rem; outline: none;">
          </div>

          <!-- Notes -->
          <div class="form-group" style="margin-bottom: 22px;">
            <label style="display: block; font-size: 0.85rem; font-weight: 600; color: var(--text-primary); margin-bottom: 6px;">
              ${t('interviews.notes', { th: 'หมายเหตุ / หัวข้อสัมภาษณ์', en: 'Notes / Preparation' })}
            </label>
            <textarea id="int-notes" rows="3" placeholder="${t('interviews.notesPlaceholder', { th: 'เช่น เตรียมคำถามเกี่ยวกับ System Architecture และ Live Coding...', en: 'e.g. Focus on system architecture and code review...' })}" style="width: 100%; padding: 10px 12px; border-radius: 10px; border: 1px solid var(--border); background: var(--bg-primary); color: var(--text-primary); font-size: 0.85rem; outline: none; resize: vertical;"></textarea>
          </div>

          <!-- Action Buttons -->
          <div style="display: flex; gap: 12px;">
            <button type="button" id="btn-cancel-interview-create" style="flex: 1; padding: 12px; border-radius: 12px; border: 1px solid var(--border); background: var(--bg-tertiary); color: var(--text-primary); font-weight: 600; cursor: pointer;">
              ${t('common.cancel', { th: 'ยกเลิก', en: 'Cancel' })}
            </button>
            <button type="submit" style="flex: 2; padding: 12px; border-radius: 12px; border: none; background: var(--primary); color: #fff; font-weight: 600; cursor: pointer; box-shadow: 0 4px 12px rgba(37,99,235,0.3);">
              <i class="fas fa-check" style="margin-right: 6px;"></i>
              ${t('interviews.confirmSchedule', { th: 'บันทึกการนัดหมาย', en: 'Save & Schedule' })}
            </button>
          </div>
        </form>
      </div>
    `;
  }

  // Helper: Render interviewer tags
  function renderInterviewersTags() {
    return newInterviewTags.map((name, idx) => `
      <span class="interviewer-tag" style="display: inline-flex; align-items: center; gap: 6px; background: var(--bg-tertiary); color: var(--text-primary); padding: 4px 10px; border-radius: 20px; font-size: 0.8rem; border: 1px solid var(--border);">
        <i class="fas fa-user-tie" style="color: var(--primary); font-size: 0.75rem;"></i>
        <span>${name}</span>
        <button type="button" class="btn-remove-tag" data-index="${idx}" style="border: none; background: transparent; color: var(--text-tertiary); cursor: pointer; padding: 0; font-size: 0.9rem; line-height: 1;">&times;</button>
      </span>
    `).join('');
  }

  /**
   * Interview Detail View & Evaluation
   */
  function renderView(param) {
    const id = typeof param === 'object' && param ? param.id : param;
    if (!window.Data || !window.Data.getInterview) {
      return `<div style="padding: 20px;">Data not loaded</div>`;
    }

    const interview = window.Data.getInterview(id);
    if (!interview) {
      return `
        <div class="card" style="padding: 32px 16px; text-align: center; background: var(--bg-secondary); border-radius: 16px; margin: 20px;">
          <i class="fas fa-exclamation-triangle" style="font-size: 2.5rem; color: var(--warning); margin-bottom: 12px;"></i>
          <h3>${t('interviews.notFound', { th: 'ไม่พบข้อมูลการสัมภาษณ์', en: 'Interview Not Found' })}</h3>
          <p style="color: var(--text-secondary);">${t('interviews.notFoundSub', { th: 'รายการนี้อาจถูกลบหรือไม่มีอยู่ในระบบ', en: 'This interview record does not exist or has been removed.' })}</p>
          <button onclick="window.App.navigate('interviews')" class="btn-primary" style="margin-top: 14px; padding: 8px 24px; border-radius: 10px;">${t('common.back', { th: 'กลับสู่หน้ารายการ', en: 'Back to List' })}</button>
        </div>
      `;
    }

    const cand = getCandidateInfo(interview.candidateId);
    const typeMeta = getTypeMeta(interview.type);
    const statusMeta = getStatusMeta(interview.status);
    const isHR = window.App && typeof window.App.isHR === 'function' ? window.App.isHR() : true;

    return `
      <div class="interview-view-module animate-fade-in" style="padding-bottom: 80px;">
        <!-- Top Navigation Bar -->
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <button id="btn-back-to-interviews" class="btn-icon" style="background: var(--bg-tertiary); border: 1px solid var(--border); border-radius: 10px; width: 38px; height: 38px; cursor: pointer; color: var(--text-primary); display: flex; align-items: center; justify-content: center;">
              <i class="fas fa-arrow-left"></i>
            </button>
            <h2 style="font-size: 1.25rem; font-weight: 700; margin: 0; color: var(--text-primary);">
              ${t('interviews.detailTitle', { th: 'รายละเอียดการสัมภาษณ์', en: 'Interview Details' })}
            </h2>
          </div>

          <!-- Status badge -->
          <span style="font-size: 0.8rem; font-weight: 600; padding: 5px 12px; border-radius: 14px; background: ${statusMeta.bg}; color: ${statusMeta.color};">
            ${statusMeta.label}
          </span>
        </div>

        <!-- Candidate Overview Card -->
        <div class="card" style="background: var(--bg-secondary); border-radius: 16px; padding: 18px; border: 1px solid var(--border); box-shadow: 0 2px 10px var(--shadow); margin-bottom: 16px; display: flex; align-items: center; gap: 14px;">
          <span style="font-size: 2.4rem; line-height: 1; width: 56px; height: 56px; background: var(--bg-tertiary); border-radius: 16px; display: flex; align-items: center; justify-content: center;">
            ${cand.avatar}
          </span>
          <div style="flex: 1;">
            <h3 style="margin: 0; font-size: 1.1rem; font-weight: 700; color: var(--text-primary);">
              ${cand.name}
            </h3>
            <p style="margin: 3px 0 0; font-size: 0.85rem; color: var(--primary); font-weight: 600;">
              ${cand.jobTitle}
            </p>
            <div style="display: flex; flex-wrap: wrap; gap: 12px; margin-top: 6px; font-size: 0.78rem; color: var(--text-secondary);">
              ${cand.email ? `<span><i class="fas fa-envelope"></i> ${cand.email}</span>` : ''}
              ${cand.phone ? `<span><i class="fas fa-phone"></i> ${cand.phone}</span>` : ''}
            </div>
          </div>
        </div>

        <!-- Session Information Grid -->
        <div class="card" style="background: var(--bg-secondary); border-radius: 16px; padding: 18px; border: 1px solid var(--border); box-shadow: 0 2px 10px var(--shadow); margin-bottom: 16px;">
          <h4 style="margin: 0 0 14px; font-size: 0.95rem; font-weight: 700; color: var(--text-primary); display: flex; align-items: center; gap: 8px;">
            <i class="fas fa-info-circle" style="color: var(--primary);"></i>
            <span>${t('interviews.sessionInfo', { th: 'ข้อมูลการนัดหมาย', en: 'Session Information' })}</span>
          </h4>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 14px;">
            <div>
              <span style="display: block; font-size: 0.75rem; color: var(--text-secondary); margin-bottom: 2px;">${t('interviews.date', { th: 'วันที่', en: 'Date' })}</span>
              <span style="font-size: 0.9rem; font-weight: 600; color: var(--text-primary);">${formatDate(interview.date)}</span>
            </div>
            <div>
              <span style="display: block; font-size: 0.75rem; color: var(--text-secondary); margin-bottom: 2px;">${t('interviews.time', { th: 'เวลา & ระยะเวลา', en: 'Time & Duration' })}</span>
              <span style="font-size: 0.9rem; font-weight: 600; color: var(--text-primary);">${interview.time || '10:00'} (${interview.duration || 60} ${t('interviews.mins', { th: 'นาที', en: 'min' })})</span>
            </div>
            <div>
              <span style="display: block; font-size: 0.75rem; color: var(--text-secondary); margin-bottom: 2px;">${t('interviews.type', { th: 'รูปแบบ', en: 'Type' })}</span>
              <span style="font-size: 0.9rem; font-weight: 600; color: var(--text-primary); display: inline-flex; align-items: center; gap: 5px;">
                ${typeMeta.emoji} ${typeMeta.label}
              </span>
            </div>
            <div>
              <span style="display: block; font-size: 0.75rem; color: var(--text-secondary); margin-bottom: 2px;">${t('interviews.location', { th: 'สถานที่ / ลิงก์', en: 'Location / Link' })}</span>
              <span style="font-size: 0.85rem; font-weight: 600; color: var(--primary); word-break: break-all;">
                ${interview.location && interview.location.startsWith('http') ? `<a href="${interview.location}" target="_blank" style="color: var(--primary);">${interview.location} <i class="fas fa-external-link-alt" style="font-size: 0.7rem;"></i></a>` : (interview.location || 'N/A')}
              </span>
            </div>
          </div>

          <!-- Interviewers List -->
          <div style="border-top: 1px solid var(--border); padding-top: 12px; margin-bottom: 12px;">
            <span style="display: block; font-size: 0.78rem; font-weight: 600; color: var(--text-secondary); margin-bottom: 6px;">
              ${t('interviews.interviewers', { th: 'คณะกรรมการสัมภาษณ์', en: 'Interviewers' })}
            </span>
            <div style="display: flex; flex-wrap: wrap; gap: 6px;">
              ${Array.isArray(interview.interviewers) && interview.interviewers.length > 0 ? interview.interviewers.map(name => `
                <span style="display: inline-flex; align-items: center; gap: 5px; background: var(--bg-tertiary); padding: 4px 10px; border-radius: 12px; font-size: 0.8rem; color: var(--text-primary);">
                  <i class="fas fa-user-check" style="color: var(--primary); font-size: 0.75rem;"></i>
                  ${name}
                </span>
              `).join('') : `<span style="font-size: 0.8rem; color: var(--text-secondary);">${t('common.noData', { th: 'ไม่มีข้อมูล', en: 'None specified' })}</span>`}
            </div>
          </div>

          <!-- Notes -->
          ${interview.notes ? `
            <div style="border-top: 1px solid var(--border); padding-top: 12px;">
              <span style="display: block; font-size: 0.78rem; font-weight: 600; color: var(--text-secondary); margin-bottom: 4px;">
                ${t('interviews.notes', { th: 'หมายเหตุ', en: 'Notes' })}
              </span>
              <p style="margin: 0; font-size: 0.85rem; color: var(--text-primary); line-height: 1.4; background: var(--bg-tertiary); padding: 8px 12px; border-radius: 10px;">
                ${interview.notes}
              </p>
            </div>
          ` : ''}
        </div>

        <!-- STATUS CONDITIONAL SECTIONS -->

        <!-- CASE 1: COMPLETED - Show evaluation results -->
        ${interview.status === 'completed' ? renderCompletedEvaluation(interview.evaluation) : ''}

        <!-- CASE 2: SCHEDULED - Show Start Evaluation / Cancel buttons -->
        ${interview.status === 'scheduled' && isHR ? `
          <div id="scheduled-actions-section" style="margin-top: 18px; display: flex; flex-direction: column; gap: 12px;">
            <button id="btn-start-evaluation" style="width: 100%; padding: 14px; border-radius: 14px; border: none; background: var(--primary); color: #fff; font-weight: 700; font-size: 0.95rem; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; box-shadow: 0 4px 14px rgba(37,99,235,0.35);">
              <i class="fas fa-clipboard-check"></i>
              <span>${t('interviews.startEvaluation', { th: 'เริ่มทำการประเมินผล', en: 'Start Evaluation' })}</span>
            </button>

            <button id="btn-cancel-interview-session" data-id="${interview.id}" style="width: 100%; padding: 11px; border-radius: 12px; border: 1px solid var(--danger); background: transparent; color: var(--danger); font-weight: 600; font-size: 0.85rem; cursor: pointer;">
              <i class="fas fa-times-circle" style="margin-right: 6px;"></i>
              ${t('interviews.cancelSession', { th: 'ยกเลิกการนัดสัมภาษณ์นี้', en: 'Cancel Interview Session' })}
            </button>
          </div>

          <!-- Collapsible Evaluation Form -->
          <div id="evaluation-form-wrapper" style="display: none; margin-top: 20px;">
            ${renderInlineEvaluationForm(interview.id)}
          </div>
        ` : ''}

        <!-- CASE 3: CANCELLED -->
        ${interview.status === 'cancelled' ? `
          <div class="card" style="background: #FEE2E2; border: 1px solid #FCA5A5; border-radius: 14px; padding: 14px 16px; color: #991B1B; display: flex; align-items: center; gap: 10px; margin-top: 14px;">
            <i class="fas fa-info-circle" style="font-size: 1.2rem;"></i>
            <span style="font-size: 0.85rem; font-weight: 600;">${t('interviews.cancelledNotice', { th: 'การนัดสัมภาษณ์นี้ถูกยกเลิกแล้ว', en: 'This interview session has been cancelled.' })}</span>
          </div>
        ` : ''}
      </div>
    `;
  }

  // Helper: Render completed evaluation score card
  function renderCompletedEvaluation(evalData) {
    if (!evalData) {
      return `
        <div class="card" style="background: var(--bg-secondary); border-radius: 16px; padding: 18px; border: 1px solid var(--border); text-align: center; color: var(--text-secondary);">
          <p>${t('interviews.noEvalData', { th: 'ยังไม่มีข้อมูลผลการประเมิน', en: 'No evaluation record available' })}</p>
        </div>
      `;
    }

    const resultBadgeMeta = {
      pass: { label: t('interviews.eval.pass', { th: 'ผ่านการสัมภาษณ์', en: 'Passed' }), color: '#059669', bg: '#D1FAE5', icon: 'fa-check-circle' },
      consider: { label: t('interviews.eval.consider', { th: 'พิจารณาเพิ่มเติม', en: 'Consider' }), color: '#D97706', bg: '#FEF3C7', icon: 'fa-question-circle' },
      fail: { label: t('interviews.eval.fail', { th: 'ไม่ผ่านการสัมภาษณ์', en: 'Failed' }), color: '#DC2626', bg: '#FEE2E2', icon: 'fa-times-circle' }
    }[evalData.result || 'pass'];

    // Render 5 criteria stars
    const criteria = [
      { key: 'technical', label: t('interviews.eval.technical', { th: 'ทักษะทางเทคนิค (Technical Skills)', en: 'Technical Skills' }), val: evalData.technical || 4 },
      { key: 'communication', label: t('interviews.eval.communication', { th: 'ทักษะการสื่อสาร (Communication)', en: 'Communication' }), val: evalData.communication || 4 },
      { key: 'attitude', label: t('interviews.eval.attitude', { th: 'ทัศนคติและบุคลิกภาพ (Attitude)', en: 'Attitude & Personality' }), val: evalData.attitude || 4 },
      { key: 'cultureFit', label: t('interviews.eval.cultureFit', { th: 'ความเข้ากันได้กับองค์กร (Culture Fit)', en: 'Culture Fit' }), val: evalData.cultureFit || 4 },
      { key: 'growthPotential', label: t('interviews.eval.growthPotential', { th: 'ศักยภาพในการเติบโต (Growth Potential)', en: 'Growth Potential' }), val: evalData.growthPotential || 4 }
    ];

    const avgScore = (criteria.reduce((sum, c) => sum + Number(c.val), 0) / criteria.length).toFixed(1);

    return `
      <div class="card" style="background: var(--bg-secondary); border-radius: 16px; padding: 20px; border: 1px solid var(--border); box-shadow: 0 4px 12px var(--shadow); margin-top: 16px;">
        <!-- Header -->
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 1px solid var(--border);">
          <div>
            <h4 style="margin: 0; font-size: 1.05rem; font-weight: 700; color: var(--text-primary); display: flex; align-items: center; gap: 8px;">
              <i class="fas fa-award" style="color: var(--primary);"></i>
              <span>${t('interviews.evaluationResults', { th: 'ผลการประเมินการสัมภาษณ์', en: 'Evaluation Results' })}</span>
            </h4>
            <span style="font-size: 0.8rem; color: var(--text-secondary);">${t('interviews.avgScore', { th: 'คะแนนเฉลี่ย', en: 'Average Score' })}: <strong>${avgScore} / 5.0</strong></span>
          </div>

          <span style="padding: 6px 14px; border-radius: 20px; font-weight: 700; font-size: 0.85rem; background: ${resultBadgeMeta.bg}; color: ${resultBadgeMeta.color}; display: inline-flex; align-items: center; gap: 6px;">
            <i class="fas ${resultBadgeMeta.icon}"></i>
            ${resultBadgeMeta.label}
          </span>
        </div>

        <!-- 5 Criteria Ratings -->
        <div style="display: flex; flex-direction: column; gap: 12px; margin-bottom: 16px;">
          ${criteria.map(c => `
            <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.85rem;">
              <span style="color: var(--text-primary); font-weight: 500;">${c.label}</span>
              <div style="display: flex; align-items: center; gap: 4px;">
                ${renderStarsDisplay(c.val)}
                <span style="font-size: 0.8rem; font-weight: 700; margin-left: 6px; color: var(--text-secondary);">${c.val}/5</span>
              </div>
            </div>
          `).join('')}
        </div>

        <!-- Evaluation Comments -->
        ${evalData.comments ? `
          <div style="border-top: 1px solid var(--border); padding-top: 12px;">
            <span style="display: block; font-size: 0.8rem; font-weight: 600; color: var(--text-secondary); margin-bottom: 4px;">
              ${t('interviews.evalComments', { th: 'ความคิดเห็นและข้อเสนอแนะ:', en: 'Comments & Feedback:' })}
            </span>
            <p style="margin: 0; font-size: 0.85rem; color: var(--text-primary); line-height: 1.5; background: var(--bg-tertiary); padding: 10px 14px; border-radius: 12px;">
              ${evalData.comments}
            </p>
          </div>
        ` : ''}
      </div>
    `;
  }

  // Display-only stars
  function renderStarsDisplay(score) {
    let html = '';
    for (let i = 1; i <= 5; i++) {
      html += `<i class="fa${i <= score ? 's' : 'r'} fa-star" style="color: #F59E0B; font-size: 0.9rem;"></i>`;
    }
    return html;
  }

  // Interactive inline evaluation form
  function renderInlineEvaluationForm(interviewId) {
    const criteria = [
      { key: 'technical', label: t('interviews.eval.technical', { th: 'ทักษะทางเทคนิค (Technical Skills)', en: 'Technical Skills' }) },
      { key: 'communication', label: t('interviews.eval.communication', { th: 'ทักษะการสื่อสาร (Communication)', en: 'Communication' }) },
      { key: 'attitude', label: t('interviews.eval.attitude', { th: 'ทัศนคติและบุคลิกภาพ (Attitude)', en: 'Attitude & Personality' }) },
      { key: 'cultureFit', label: t('interviews.eval.cultureFit', { th: 'ความเข้ากันได้กับองค์กร (Culture Fit)', en: 'Culture Fit' }) },
      { key: 'growthPotential', label: t('interviews.eval.growthPotential', { th: 'ศักยภาพในการเติบโต (Growth Potential)', en: 'Growth Potential' }) }
    ];

    return `
      <form id="form-submit-evaluation" data-id="${interviewId}" class="card" style="background: var(--bg-secondary); border-radius: 18px; padding: 20px; border: 2px solid var(--primary); box-shadow: 0 6px 18px rgba(37,99,235,0.15);">
        <h4 style="margin: 0 0 16px; font-size: 1.05rem; font-weight: 700; color: var(--text-primary); display: flex; align-items: center; gap: 8px;">
          <i class="fas fa-edit" style="color: var(--primary);"></i>
          <span>${t('interviews.evalFormTitle', { th: 'แบบฟอร์มประเมินการสัมภาษณ์', en: 'Interview Evaluation Form' })}</span>
        </h4>

        <!-- 5 Interactive Star Criteria -->
        <div style="display: flex; flex-direction: column; gap: 14px; margin-bottom: 20px;">
          ${criteria.map(c => `
            <div>
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                <label style="font-size: 0.85rem; font-weight: 600; color: var(--text-primary);">${c.label}</label>
                <span id="score-text-${c.key}" style="font-size: 0.8rem; font-weight: 700; color: var(--primary);">5 / 5</span>
              </div>
              <div class="interactive-star-group" data-criterion="${c.key}" style="display: flex; gap: 8px; font-size: 1.4rem; cursor: pointer;">
                <i class="fas fa-star star-btn" data-val="1" style="color: #F59E0B;"></i>
                <i class="fas fa-star star-btn" data-val="2" style="color: #F59E0B;"></i>
                <i class="fas fa-star star-btn" data-val="3" style="color: #F59E0B;"></i>
                <i class="fas fa-star star-btn" data-val="4" style="color: #F59E0B;"></i>
                <i class="fas fa-star star-btn" data-val="5" style="color: #F59E0B;"></i>
              </div>
            </div>
          `).join('')}
        </div>

        <!-- Result Selection (Large tappable cards) -->
        <div style="margin-bottom: 18px;">
          <label style="display: block; font-size: 0.85rem; font-weight: 600; color: var(--text-primary); margin-bottom: 8px;">
            ${t('interviews.eval.result', { th: 'สรุปผลการสัมภาษณ์ *', en: 'Final Result *' })}
          </label>
          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;">
            <label class="result-choice-card" style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 12px 6px; border-radius: 12px; border: 2px solid var(--success); background: #D1FAE5; cursor: pointer; text-align: center;">
              <input type="radio" name="evalResultRadio" value="pass" checked style="accent-color: var(--success); margin-bottom: 4px;">
              <span style="font-size: 1.1rem;">✅</span>
              <span style="font-size: 0.8rem; font-weight: 700; color: #065F46; margin-top: 2px;">${t('interviews.eval.pass', { th: 'ผ่าน (Pass)', en: 'Pass' })}</span>
            </label>

            <label class="result-choice-card" style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 12px 6px; border-radius: 12px; border: 2px solid var(--border); background: var(--bg-primary); cursor: pointer; text-align: center;">
              <input type="radio" name="evalResultRadio" value="consider" style="accent-color: var(--warning); margin-bottom: 4px;">
              <span style="font-size: 1.1rem;">⚠️</span>
              <span style="font-size: 0.8rem; font-weight: 700; color: #92400E; margin-top: 2px;">${t('interviews.eval.consider', { th: 'พิจารณา (Consider)', en: 'Consider' })}</span>
            </label>

            <label class="result-choice-card" style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 12px 6px; border-radius: 12px; border: 2px solid var(--border); background: var(--bg-primary); cursor: pointer; text-align: center;">
              <input type="radio" name="evalResultRadio" value="fail" style="accent-color: var(--danger); margin-bottom: 4px;">
              <span style="font-size: 1.1rem;">❌</span>
              <span style="font-size: 0.8rem; font-weight: 700; color: #991B1B; margin-top: 2px;">${t('interviews.eval.fail', { th: 'ไม่ผ่าน (Fail)', en: 'Fail' })}</span>
            </label>
          </div>
        </div>

        <!-- Comments -->
        <div style="margin-bottom: 18px;">
          <label style="display: block; font-size: 0.85rem; font-weight: 600; color: var(--text-primary); margin-bottom: 6px;">
            ${t('interviews.evalComments', { th: 'ความคิดเห็นประกอบการประเมิน', en: 'Comments & Justification' })}
          </label>
          <textarea id="eval-comments-input" rows="3" placeholder="${t('interviews.evalCommentsPlaceholder', { th: 'ระบุจุดเด่น จุดที่ควรพัฒนา และเหตุผลในการตัดสินใจ...', en: 'Highlight candidate strengths, areas for improvement, etc...' })}" style="width: 100%; padding: 10px 12px; border-radius: 10px; border: 1px solid var(--border); background: var(--bg-primary); color: var(--text-primary); font-size: 0.85rem; outline: none; resize: vertical;"></textarea>
        </div>

        <!-- Form Actions -->
        <div style="display: flex; gap: 10px;">
          <button type="button" id="btn-close-evaluation-form" style="flex: 1; padding: 11px; border-radius: 12px; border: 1px solid var(--border); background: var(--bg-tertiary); color: var(--text-primary); font-weight: 600; cursor: pointer;">
            ${t('common.cancel', { th: 'ยกเลิก', en: 'Cancel' })}
          </button>
          <button type="submit" style="flex: 2; padding: 11px; border-radius: 12px; border: none; background: var(--success); color: #fff; font-weight: 700; cursor: pointer; box-shadow: 0 4px 12px rgba(16,185,129,0.3);">
            <i class="fas fa-check-circle" style="margin-right: 6px;"></i>
            ${t('interviews.submitEvaluation', { th: 'บันทึกผลการประเมิน', en: 'Submit Evaluation' })}
          </button>
        </div>
      </form>
    `;
  }

  // --- EVENT LISTENERS & LIFECYCLE ---

  function afterRender(params) {
    // Toggle view buttons
    const btnCal = document.getElementById('toggle-view-cal');
    const btnList = document.getElementById('toggle-view-list');

    if (btnCal) {
      btnCal.addEventListener('click', () => {
        if (currentViewMode !== 'calendar') {
          currentViewMode = 'calendar';
          if (window.App && window.App.navigate) {
            window.App.navigate('interviews');
          } else {
            const main = document.getElementById('app-content');
            if (main) {
              main.innerHTML = render(params);
              afterRender(params);
            }
          }
        }
      });
    }

    if (btnList) {
      btnList.addEventListener('click', () => {
        if (currentViewMode !== 'list') {
          currentViewMode = 'list';
          if (window.App && window.App.navigate) {
            window.App.navigate('interviews');
          } else {
            const main = document.getElementById('app-content');
            if (main) {
              main.innerHTML = render(params);
              afterRender(params);
            }
          }
        }
      });
    }

    // Calendar navigation: Prev / Next Month
    const btnPrevMonth = document.getElementById('cal-prev-month');
    const btnNextMonth = document.getElementById('cal-next-month');

    if (btnPrevMonth) {
      btnPrevMonth.addEventListener('click', () => {
        currentCalDate = new Date(currentCalDate.getFullYear(), currentCalDate.getMonth() - 1, 1);
        refreshMainView(params);
      });
    }

    if (btnNextMonth) {
      btnNextMonth.addEventListener('click', () => {
        currentCalDate = new Date(currentCalDate.getFullYear(), currentCalDate.getMonth() + 1, 1);
        refreshMainView(params);
      });
    }

    // Calendar day selection
    const dayCells = document.querySelectorAll('.cal-day[data-date]');
    dayCells.forEach(cell => {
      cell.addEventListener('click', () => {
        const dateStr = cell.getAttribute('data-date');
        if (dateStr) {
          selectedDateStr = dateStr;
          refreshMainView(params);
        }
      });
    });

    // Card click: navigate to detail view
    const cards = document.querySelectorAll('.interview-card[data-id]');
    cards.forEach(card => {
      card.addEventListener('click', () => {
        const id = card.getAttribute('data-id');
        if (id) {
          if (window.App && window.App.navigate) {
            window.App.navigate('interviews/' + id);
          } else {
            window.location.hash = `#interviews/${id}`;
          }
        }
      });
    });

    // FAB create interview
    const fab = document.getElementById('fab-create-interview');
    if (fab) {
      fab.addEventListener('click', () => {
        if (window.App && window.App.navigate) {
          window.App.navigate('interviews/new');
        } else {
          window.location.hash = '#interviews/new';
        }
      });
    }
  }

  function refreshMainView(params) {
    const main = document.getElementById('app-content');
    if (main) {
      main.innerHTML = render(params);
      afterRender(params);
    }
  }

  function afterRenderCreate() {
    // Back button
    const backBtn = document.getElementById('btn-back-interviews');
    if (backBtn) {
      backBtn.addEventListener('click', () => {
        if (window.App && window.App.navigate) {
          window.App.navigate('interviews');
        } else {
          window.location.hash = '#interviews';
        }
      });
    }

    // Cancel button
    const cancelBtn = document.getElementById('btn-cancel-interview-create');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => {
        if (window.App && window.App.navigate) {
          window.App.navigate('interviews');
        } else {
          window.location.hash = '#interviews';
        }
      });
    }

    // Candidate selector change: auto-fill Job Title
    const candSelect = document.getElementById('int-candidate-select');
    const jobDisplay = document.getElementById('int-job-display');
    const jobIdHidden = document.getElementById('int-job-id');

    if (candSelect && jobDisplay && jobIdHidden) {
      candSelect.addEventListener('change', () => {
        const selectedOpt = candSelect.options[candSelect.selectedIndex];
        if (selectedOpt) {
          jobDisplay.value = selectedOpt.getAttribute('data-jobtitle') || '';
          jobIdHidden.value = selectedOpt.getAttribute('data-jobid') || '';
        }
      });
    }

    // Interviewer tag management
    const inputInterviewer = document.getElementById('int-new-interviewer-input');
    const btnAddInterviewer = document.getElementById('btn-add-interviewer');
    const tagsContainer = document.getElementById('interviewers-tags-list');

    function updateTagsDom() {
      if (tagsContainer) {
        tagsContainer.innerHTML = renderInterviewersTags();
        bindRemoveTagEvents();
      }
    }

    function addTag() {
      if (!inputInterviewer) return;
      const val = inputInterviewer.value.trim();
      if (val && !newInterviewTags.includes(val)) {
        newInterviewTags.push(val);
        inputInterviewer.value = '';
        updateTagsDom();
      }
    }

    function bindRemoveTagEvents() {
      document.querySelectorAll('.btn-remove-tag').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const idx = parseInt(btn.getAttribute('data-index'), 10);
          if (!isNaN(idx) && idx >= 0 && idx < newInterviewTags.length) {
            newInterviewTags.splice(idx, 1);
            updateTagsDom();
          }
        });
      });
    }

    if (btnAddInterviewer) {
      btnAddInterviewer.addEventListener('click', addTag);
    }
    if (inputInterviewer) {
      inputInterviewer.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          addTag();
        }
      });
    }
    bindRemoveTagEvents();

    // Form submission
    const form = document.getElementById('form-create-interview');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();

        const candidateId = candSelect ? candSelect.value : '';
        const jobId = jobIdHidden ? jobIdHidden.value : '';
        const typeEl = form.querySelector('input[name="interviewType"]:checked');
        const type = typeEl ? typeEl.value : 'video';
        const date = document.getElementById('int-date')?.value;
        const time = document.getElementById('int-time')?.value;
        const durationEl = form.querySelector('input[name="intDuration"]:checked');
        const duration = durationEl ? parseInt(durationEl.value, 10) : 60;
        const location = document.getElementById('int-location')?.value.trim();
        const notes = document.getElementById('int-notes')?.value.trim();

        if (!candidateId) {
          if (window.App && window.App.showToast) {
            window.App.showToast(t('interviews.errorSelectCandidate', { th: 'กรุณาเลือกผู้สมัคร', en: 'Please select a candidate' }), 'error');
          }
          return;
        }

        if (!date || !time) {
          if (window.App && window.App.showToast) {
            window.App.showToast(t('interviews.errorDateTime', { th: 'กรุณาระบุวันและเวลา', en: 'Please specify date and time' }), 'error');
          }
          return;
        }

        const newInterview = {
          id: window.App && window.App.generateId ? window.App.generateId() : `i_${Date.now()}`,
          candidateId,
          jobId,
          type,
          date,
          time,
          duration,
          interviewers: [...newInterviewTags],
          location: location || 'Zoom Meeting',
          notes: notes || '',
          status: 'scheduled',
          evaluation: null,
          createdAt: new Date().toISOString()
        };

        // Save interview
        if (window.Data && window.Data.saveInterview) {
          window.Data.saveInterview(newInterview);
        }

        // Update candidate status to 'interview_scheduled'
        if (window.Data && window.Data.getCandidate && window.Data.saveCandidate) {
          const cand = window.Data.getCandidate(candidateId);
          if (cand) {
            cand.status = 'interview_scheduled';
            if (!Array.isArray(cand.timeline)) cand.timeline = [];
            const curUser = window.App && window.App.getCurrentUser ? window.App.getCurrentUser() : null;
            cand.timeline.push({
              action: 'interview_scheduled',
              at: new Date().toISOString(),
              by: curUser ? curUser.id : 'hr'
            });
            window.Data.saveCandidate(cand);
          }
        }

        if (window.App && window.App.showToast) {
          window.App.showToast(t('interviews.scheduledSuccess', { th: 'นัดหมายการสัมภาษณ์เรียบร้อยแล้ว', en: 'Interview scheduled successfully' }), 'success');
        }

        if (window.App && window.App.navigate) {
          window.App.navigate('interviews');
        } else {
          window.location.hash = '#interviews';
        }
      });
    }
  }

  function afterRenderView(param) {
    const id = typeof param === 'object' && param ? param.id : param;

    // Back button
    const backBtn = document.getElementById('btn-back-to-interviews');
    if (backBtn) {
      backBtn.addEventListener('click', () => {
        if (window.App && window.App.navigate) {
          window.App.navigate('interviews');
        } else {
          window.location.hash = '#interviews';
        }
      });
    }

    // Cancel Interview button
    const btnCancel = document.getElementById('btn-cancel-interview-session');
    if (btnCancel) {
      btnCancel.addEventListener('click', () => {
        const confirmMsg = t('interviews.confirmCancel', { th: 'คุณแน่ใจหรือไม่ว่าต้องการยกเลิกการนัดสัมภาษณ์นี้?', en: 'Are you sure you want to cancel this interview session?' });
        if (confirm(confirmMsg)) {
          if (window.Data && window.Data.getInterview && window.Data.saveInterview) {
            const intv = window.Data.getInterview(id);
            if (intv) {
              intv.status = 'cancelled';
              window.Data.saveInterview(intv);
              if (window.App && window.App.showToast) {
                window.App.showToast(t('interviews.cancelledSuccess', { th: 'ยกเลิกการสัมภาษณ์เรียบร้อยแล้ว', en: 'Interview session cancelled' }), 'info');
              }
              // Refresh view
              const main = document.getElementById('app-content');
              if (main) {
                main.innerHTML = renderView(id);
                afterRenderView(id);
              }
            }
          }
        }
      });
    }

    // Toggle Evaluation Form
    const btnStartEval = document.getElementById('btn-start-evaluation');
    const evalWrapper = document.getElementById('evaluation-form-wrapper');
    const scheduledActions = document.getElementById('scheduled-actions-section');
    const btnCloseEval = document.getElementById('btn-close-evaluation-form');

    if (btnStartEval && evalWrapper) {
      btnStartEval.addEventListener('click', () => {
        evalWrapper.style.display = 'block';
        evalWrapper.scrollIntoView({ behavior: 'smooth' });
        if (scheduledActions) scheduledActions.style.display = 'none';
      });
    }

    if (btnCloseEval && evalWrapper) {
      btnCloseEval.addEventListener('click', () => {
        evalWrapper.style.display = 'none';
        if (scheduledActions) scheduledActions.style.display = 'flex';
      });
    }

    // Interactive Star Clicks
    const starGroups = document.querySelectorAll('.interactive-star-group');
    starGroups.forEach(group => {
      const criterion = group.getAttribute('data-criterion');
      const stars = group.querySelectorAll('.star-btn');
      stars.forEach(star => {
        star.addEventListener('click', () => {
          const val = parseInt(star.getAttribute('data-val'), 10);
          evalScores[criterion] = val;

          // Update display stars in group
          stars.forEach(s => {
            const sVal = parseInt(s.getAttribute('data-val'), 10);
            if (sVal <= val) {
              s.className = 'fas fa-star star-btn';
              s.style.color = '#F59E0B';
            } else {
              s.className = 'far fa-star star-btn';
              s.style.color = '#CBD5E1';
            }
          });

          // Update text score
          const textEl = document.getElementById(`score-text-${criterion}`);
          if (textEl) textEl.textContent = `${val} / 5`;
        });
      });
    });

    // Result Radio Choice Cards styling
    const resultRadios = document.querySelectorAll('input[name="evalResultRadio"]');
    resultRadios.forEach(radio => {
      radio.addEventListener('change', () => {
        evalResult = radio.value;
        document.querySelectorAll('.result-choice-card').forEach(card => {
          card.style.borderColor = 'var(--border)';
          card.style.background = 'var(--bg-primary)';
        });
        const parentCard = radio.closest('.result-choice-card');
        if (parentCard) {
          if (radio.value === 'pass') {
            parentCard.style.borderColor = 'var(--success)';
            parentCard.style.background = '#D1FAE5';
          } else if (radio.value === 'consider') {
            parentCard.style.borderColor = 'var(--warning)';
            parentCard.style.background = '#FEF3C7';
          } else {
            parentCard.style.borderColor = 'var(--danger)';
            parentCard.style.background = '#FEE2E2';
          }
        }
      });
    });

    // Submit Evaluation
    const formEval = document.getElementById('form-submit-evaluation');
    if (formEval) {
      formEval.addEventListener('submit', (e) => {
        e.preventDefault();
        const comments = document.getElementById('eval-comments-input')?.value.trim() || '';

        if (!window.Data || !window.Data.getInterview || !window.Data.saveInterview) return;

        const intv = window.Data.getInterview(id);
        if (!intv) return;

        // Save evaluation onto interview
        intv.status = 'completed';
        intv.evaluation = {
          technical: evalScores.technical || 4,
          communication: evalScores.communication || 4,
          attitude: evalScores.attitude || 4,
          cultureFit: evalScores.cultureFit || 4,
          growthPotential: evalScores.growthPotential || 4,
          result: evalResult,
          comments: comments,
          evaluatedAt: new Date().toISOString()
        };
        window.Data.saveInterview(intv);

        // Update candidate status
        if (window.Data.getCandidate && window.Data.saveCandidate) {
          const cand = window.Data.getCandidate(intv.candidateId);
          if (cand) {
            // pass -> 'interviewed' / 'offered', consider -> 'interviewed', fail -> 'rejected'
            if (evalResult === 'pass') {
              cand.status = 'interviewed';
            } else if (evalResult === 'fail') {
              cand.status = 'rejected';
            } else {
              cand.status = 'interviewed';
            }

            if (!Array.isArray(cand.timeline)) cand.timeline = [];
            const curUser = window.App && window.App.getCurrentUser ? window.App.getCurrentUser() : null;
            cand.timeline.push({
              action: 'interview_evaluated',
              result: evalResult,
              at: new Date().toISOString(),
              by: curUser ? curUser.id : 'hr'
            });

            window.Data.saveCandidate(cand);
          }
        }

        if (window.App && window.App.showToast) {
          window.App.showToast(t('interviews.evalSavedSuccess', { th: 'บันทึกการประเมินเรียบร้อยแล้ว', en: 'Evaluation submitted successfully' }), 'success');
        }

        // Re-render detail view with completed status
        const main = document.getElementById('app-content');
        if (main) {
          main.innerHTML = renderView(id);
          afterRenderView(id);
        }
      });
    }
  }

  // Public module API
  return {
    render,
    afterRender,
    renderCreate,
    afterRenderCreate,
    renderView,
    afterRenderView
  };
})();
