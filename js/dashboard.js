/**
 * HR Recruitment App - Dashboard Module
 * File: js/dashboard.js
 * Supports both HR Admin and Job Applicant views with bilingual support (TH/EN)
 */

(function () {
  'use strict';

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

  // Relative time helper
  function formatRelativeTime(dateStr) {
    if (!dateStr) return '';
    try {
      const isEn = window.App && window.App.getLang() === 'en';
      const now = new Date();
      const past = new Date(dateStr);
      const diffMs = now - past;
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffMins < 1) return isEn ? 'Just now' : 'เมื่อสักครู่';
      if (diffMins < 60) return isEn ? `${diffMins}m ago` : `${diffMins} นาทีที่แล้ว`;
      if (diffHours < 24) return isEn ? `${diffHours}h ago` : `${diffHours} ชม. ที่แล้ว`;
      if (diffDays < 7) return isEn ? `${diffDays}d ago` : `${diffDays} วันที่แล้ว`;
      return formatDate(dateStr);
    } catch (e) {
      return formatDate(dateStr);
    }
  }

  window.DashboardModule = {
    /**
     * Render main dashboard view
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
     * Render HR Admin Dashboard
     */
    renderHR: function () {
      const user = (window.App && typeof window.App.getCurrentUser === 'function') ? window.App.getCurrentUser() : null;
      const isEn = window.App && typeof window.App.getLang === 'function' && window.App.getLang() === 'en';
      const userName = (user && (isEn ? (user.nameEn || user.name) : (user.name || user.nameEn))) || (isEn ? 'HR Administrator' : 'ผู้ดูแลระบบ HR');
      const userAvatar = (user && user.avatar) || '👩‍💼';

      // Load data
      const stats = (window.Data && typeof window.Data.getStats === 'function') ? window.Data.getStats() : {};
      const jobs = (window.Data && typeof window.Data.getJobs === 'function') ? window.Data.getJobs() : [];
      const candidates = (window.Data && typeof window.Data.getCandidates === 'function') ? window.Data.getCandidates() : [];
      const interviews = (window.Data && typeof window.Data.getInterviews === 'function') ? window.Data.getInterviews() : [];

      // Calculate stats counts
      const openJobsCount = stats.openJobs !== undefined ? stats.openJobs : jobs.filter(j => j.status === 'open').length;
      const totalCandidatesCount = stats.totalCandidates !== undefined ? stats.totalCandidates : candidates.length;
      
      const todayStr = new Date().toISOString().split('T')[0];
      const todayInterviewsCount = interviews.filter(i => {
        return (i.date && i.date.startsWith(todayStr)) || i.status === 'scheduled';
      }).length;
      
      const hiredCount = stats.hired !== undefined ? stats.hired : candidates.filter(c => c.status === 'hired').length;

      // Pipeline stages calculation
      const pipelineStages = [
        {
          key: 'new',
          label: t('candidates.statuses.new', { th: 'ยื่นใบสมัครใหม่', en: 'New Applied' }),
          color: '#06B6D4',
          icon: 'fa-envelope-open-text',
          count: candidates.filter(c => c.status === 'new').length
        },
        {
          key: 'screening',
          label: t('candidates.statuses.screening', { th: 'กำลังคัดกรอง', en: 'Screening' }),
          color: '#F59E0B',
          icon: 'fa-magnifying-glass',
          count: candidates.filter(c => c.status === 'screening' || c.status === 'qualified').length
        },
        {
          key: 'interview',
          label: t('dashboard.interviews', { th: 'นัดสัมภาษณ์', en: 'Interview' }),
          color: '#8B5CF6',
          icon: 'fa-comments',
          count: candidates.filter(c => c.status === 'interview_scheduled' || c.status === 'interviewed').length
        },
        {
          key: 'offered',
          label: t('candidates.statuses.offered', { th: 'เสนอรับเข้าทำงาน', en: 'Offered' }),
          color: '#3B82F6',
          icon: 'fa-file-signature',
          count: candidates.filter(c => c.status === 'offered').length
        },
        {
          key: 'hired',
          label: t('candidates.statuses.hired', { th: 'รับเข้าทำงานสำเร็จ', en: 'Hired' }),
          color: '#10B981',
          icon: 'fa-trophy',
          count: candidates.filter(c => c.status === 'hired').length
        }
      ];

      const maxCount = Math.max(...pipelineStages.map(s => s.count), 1);
      const totalInPipeline = candidates.length || 1;

      // Build Recent Activities list (last 5)
      const activities = [];

      // 1. Candidate Applications
      candidates.forEach(c => {
        const job = jobs.find(j => j.id === c.jobId);
        const jobTitle = job ? (isEn ? (job.titleEn || job.title) : (job.title || job.titleEn)) : (isEn ? 'Position' : 'ตำแหน่งงาน');
        const cUser = window.Data && window.Data.getUser ? window.Data.getUser(c.userId) : null;
        const cResume = (c.resumeId && window.Data && window.Data.getResume) ? window.Data.getResume(c.resumeId) : null;
        const cName = (cUser && (isEn ? (cUser.nameEn || cUser.name) : (cUser.name || cUser.nameEn))) ||
                      (cResume && cResume.personal && (isEn ? (cResume.personal.nameEn || cResume.personal.name) : (cResume.personal.name || cResume.personal.nameEn))) ||
                      (isEn ? 'Applicant' : 'ผู้สมัคร');

        if (c.appliedAt) {
          activities.push({
            type: 'applied',
            timestamp: new Date(c.appliedAt).getTime(),
            dateStr: c.appliedAt,
            icon: 'fa-user-plus',
            iconColor: '#06B6D4',
            title: isEn ? `${cName} applied for ${jobTitle}` : `${cName} สมัครตำแหน่ง ${jobTitle}`,
            subtitle: isEn ? 'New Candidate Application' : 'ยื่นใบสมัครใหม่',
            nav: `candidates/${c.id}`
          });
        }

        // Timeline actions
        if (Array.isArray(c.timeline)) {
          c.timeline.forEach(item => {
            if (item.action !== 'applied' && item.at) {
              let actionTitle = isEn ? `Candidate status updated to: ${item.action}` : `อัปเดตสถานะผู้สมัครเป็น: ${item.action}`;
              let actionIcon = 'fa-arrow-right-arrow-left';
              let iconColor = '#F59E0B';

              if (item.action === 'screening') {
                actionTitle = isEn ? `Started screening ${cName}` : `เริ่มคัดกรองใบสมัครของ ${cName}`;
                actionIcon = 'fa-magnifying-glass';
                iconColor = '#F59E0B';
              } else if (item.action === 'qualified') {
                actionTitle = isEn ? `${cName} marked as Qualified` : `${cName} ผ่านการคัดกรองเบื้องต้น`;
                actionIcon = 'fa-circle-check';
                iconColor = '#10B981';
              } else if (item.action === 'interview_scheduled' || item.action === 'interview') {
                actionTitle = isEn ? `Interview scheduled with ${cName}` : `นัดสัมภาษณ์งานกับ ${cName}`;
                actionIcon = 'fa-calendar-check';
                iconColor = '#8B5CF6';
              } else if (item.action === 'hired') {
                actionTitle = isEn ? `Hired ${cName}!` : `รับ ${cName} เข้าทำงานเรียบร้อย!`;
                actionIcon = 'fa-trophy';
                iconColor = '#10B981';
              } else if (item.action === 'rejected') {
                actionTitle = isEn ? `Application rejected for ${cName}` : `ปฏิเสธใบสมัครของ ${cName}`;
                actionIcon = 'fa-circle-xmark';
                iconColor = '#EF4444';
              }

              activities.push({
                type: 'status_change',
                timestamp: new Date(item.at).getTime(),
                dateStr: item.at,
                icon: actionIcon,
                iconColor: iconColor,
                title: actionTitle,
                subtitle: jobTitle,
                nav: `candidates/${c.id}`
              });
            }
          });
        }
      });

      // 2. Scheduled Interviews
      interviews.forEach(inv => {
        const job = jobs.find(j => j.id === inv.jobId);
        const jobTitle = job ? (isEn ? (job.titleEn || job.title) : (job.title || job.titleEn)) : '';
        const cand = candidates.find(c => c.id === inv.candidateId);
        const cUser = cand && window.Data && window.Data.getUser ? window.Data.getUser(cand.userId) : null;
        const cName = cUser ? (isEn ? (cUser.nameEn || cUser.name) : (cUser.name || cUser.nameEn)) : (isEn ? 'Candidate' : 'ผู้สมัคร');
        
        activities.push({
          type: 'interview',
          timestamp: new Date(inv.date + 'T' + (inv.time || '10:00')).getTime() || Date.now(),
          dateStr: inv.date + 'T' + (inv.time || '10:00'),
          icon: 'fa-video',
          iconColor: '#8B5CF6',
          title: isEn ? `Interview: ${cName} (${inv.type || 'Video'})` : `นัดสัมภาษณ์: ${cName} (${inv.type || 'วิดีโอ'})`,
          subtitle: jobTitle || (inv.location || ''),
          nav: `interviews/${inv.id}`
        });
      });

      // Sort descending and take top 5
      activities.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
      const recentActivities = activities.slice(0, 5);

      return `
        <div class="dashboard-page dashboard-hr">
          <!-- Welcome Banner -->
          <div class="card welcome-banner" style="background: linear-gradient(135deg, #1E293B 0%, #0F172A 100%); color: #fff; padding: 20px; border-radius: 18px; margin-bottom: 20px; box-shadow: 0 10px 25px rgba(0,0,0,0.15); display: flex; align-items: center; justify-content: space-between;">
            <div>
              <div style="font-size: 0.85rem; color: #94A3B8; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px;">
                ${t('dashboard.title', { th: 'ภาพรวมระบบสรรหาบุคลากร', en: 'Recruitment Overview' })}
              </div>
              <h2 style="margin: 0; font-size: 1.45rem; font-weight: 700; color: #F8FAFC;">
                ${isEn ? 'Welcome back, ' : 'ยินดีต้อนรับ, '}${userName}
              </h2>
              <p style="margin: 6px 0 0 0; font-size: 0.9rem; color: #CBD5E1;">
                ${isEn ? 'Monitor and streamline hiring processes seamlessly.' : 'จัดการและติดตามกระบวนการสรรหาบุคลากรอย่างมีประสิทธิภาพ'}
              </p>
            </div>
            <div style="font-size: 2.75rem; line-height: 1; padding-left: 12px;">${userAvatar}</div>
          </div>

          <!-- Quick Action Buttons -->
          <div class="dashboard-section" style="margin-bottom: 24px;">
            <div style="font-weight: 600; font-size: 1rem; color: var(--text-primary); margin-bottom: 12px; display: flex; align-items: center; justify-content: space-between;">
              <span><i class="fa-solid fa-bolt" style="color: #F59E0B; margin-right: 8px;"></i>${t('dashboard.quickActions', { th: 'เมนูด่วน', en: 'Quick Actions' })}</span>
            </div>
            <div class="quick-actions-grid" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;">
              <button class="quick-action-btn" data-action="new-job" style="background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 14px; padding: 14px 8px; display: flex; flex-direction: column; align-items: center; text-align: center; cursor: pointer; transition: all 0.2s; box-shadow: 0 2px 6px var(--shadow);">
                <div style="width: 42px; height: 42px; border-radius: 12px; background: rgba(37, 99, 235, 0.12); color: #2563EB; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; margin-bottom: 8px;">
                  <i class="fa-solid fa-plus-circle"></i>
                </div>
                <span style="font-size: 0.8rem; font-weight: 600; color: var(--text-primary); line-height: 1.2;">
                  ${t('jobs.create', { th: 'สร้างประกาศงาน', en: 'Post Job' })}
                </span>
              </button>

              <button class="quick-action-btn" data-action="view-candidates" style="background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 14px; padding: 14px 8px; display: flex; flex-direction: column; align-items: center; text-align: center; cursor: pointer; transition: all 0.2s; box-shadow: 0 2px 6px var(--shadow);">
                <div style="width: 42px; height: 42px; border-radius: 12px; background: rgba(16, 185, 129, 0.12); color: #10B981; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; margin-bottom: 8px;">
                  <i class="fa-solid fa-user-clock"></i>
                </div>
                <span style="font-size: 0.8rem; font-weight: 600; color: var(--text-primary); line-height: 1.2;">
                  ${t('candidates.title', { th: 'ผู้สมัครใหม่', en: 'New Applicants' })}
                </span>
              </button>

              <button class="quick-action-btn" data-action="new-interview" style="background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 14px; padding: 14px 8px; display: flex; flex-direction: column; align-items: center; text-align: center; cursor: pointer; transition: all 0.2s; box-shadow: 0 2px 6px var(--shadow);">
                <div style="width: 42px; height: 42px; border-radius: 12px; background: rgba(139, 92, 246, 0.12); color: #8B5CF6; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; margin-bottom: 8px;">
                  <i class="fa-solid fa-calendar-plus"></i>
                </div>
                <span style="font-size: 0.8rem; font-weight: 600; color: var(--text-primary); line-height: 1.2;">
                  ${t('interviews.schedule', { th: 'นัดสัมภาษณ์', en: 'Interview' })}
                </span>
              </button>
            </div>
          </div>

          <!-- 4 Stat Cards in 2x2 Grid -->
          <div class="dashboard-section" style="margin-bottom: 24px;">
            <div class="stats-grid" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px;">
              <!-- 1. Open Jobs (Blue) -->
              <div class="stat-card" data-nav="jobs" style="background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 16px; padding: 16px; cursor: pointer; transition: transform 0.2s, box-shadow 0.2s; box-shadow: 0 4px 12px var(--shadow); position: relative; overflow: hidden;">
                <div style="position: absolute; right: -8px; bottom: -8px; font-size: 3.5rem; color: rgba(37, 99, 235, 0.08); pointer-events: none;">
                  <i class="fa-solid fa-briefcase"></i>
                </div>
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px;">
                  <div style="width: 40px; height: 40px; border-radius: 10px; background: rgba(37, 99, 235, 0.15); color: #2563EB; display: flex; align-items: center; justify-content: center; font-size: 1.15rem;">
                    <i class="fa-solid fa-briefcase"></i>
                  </div>
                  <span style="font-size: 0.75rem; color: #2563EB; font-weight: 600; background: rgba(37, 99, 235, 0.1); padding: 2px 8px; border-radius: 20px;">
                    ${isEn ? 'Active' : 'เปิดรับ'}
                  </span>
                </div>
                <div style="font-size: 1.85rem; font-weight: 700; color: var(--text-primary); line-height: 1.1;">
                  ${openJobsCount}
                </div>
                <div style="font-size: 0.85rem; color: var(--text-secondary); margin-top: 4px; font-weight: 500;">
                  ${t('dashboard.openJobs', { th: 'ตำแหน่งที่เปิดรับ', en: 'Open Jobs' })}
                </div>
              </div>

              <!-- 2. Total Candidates (Green) -->
              <div class="stat-card" data-nav="candidates" style="background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 16px; padding: 16px; cursor: pointer; transition: transform 0.2s, box-shadow 0.2s; box-shadow: 0 4px 12px var(--shadow); position: relative; overflow: hidden;">
                <div style="position: absolute; right: -8px; bottom: -8px; font-size: 3.5rem; color: rgba(16, 185, 129, 0.08); pointer-events: none;">
                  <i class="fa-solid fa-users"></i>
                </div>
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px;">
                  <div style="width: 40px; height: 40px; border-radius: 10px; background: rgba(16, 185, 129, 0.15); color: #10B981; display: flex; align-items: center; justify-content: center; font-size: 1.15rem;">
                    <i class="fa-solid fa-users"></i>
                  </div>
                  <span style="font-size: 0.75rem; color: #10B981; font-weight: 600; background: rgba(16, 185, 129, 0.1); padding: 2px 8px; border-radius: 20px;">
                    ${isEn ? 'Pool' : 'ประวัติ'}
                  </span>
                </div>
                <div style="font-size: 1.85rem; font-weight: 700; color: var(--text-primary); line-height: 1.1;">
                  ${totalCandidatesCount}
                </div>
                <div style="font-size: 0.85rem; color: var(--text-secondary); margin-top: 4px; font-weight: 500;">
                  ${t('dashboard.totalCandidates', { th: 'ผู้สมัครทั้งหมด', en: 'Total Candidates' })}
                </div>
              </div>

              <!-- 3. Interviews Today (Purple) -->
              <div class="stat-card" data-nav="interviews" style="background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 16px; padding: 16px; cursor: pointer; transition: transform 0.2s, box-shadow 0.2s; box-shadow: 0 4px 12px var(--shadow); position: relative; overflow: hidden;">
                <div style="position: absolute; right: -8px; bottom: -8px; font-size: 3.5rem; color: rgba(139, 92, 246, 0.08); pointer-events: none;">
                  <i class="fa-solid fa-calendar-check"></i>
                </div>
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px;">
                  <div style="width: 40px; height: 40px; border-radius: 10px; background: rgba(139, 92, 246, 0.15); color: #8B5CF6; display: flex; align-items: center; justify-content: center; font-size: 1.15rem;">
                    <i class="fa-solid fa-calendar-check"></i>
                  </div>
                  <span style="font-size: 0.75rem; color: #8B5CF6; font-weight: 600; background: rgba(139, 92, 246, 0.1); padding: 2px 8px; border-radius: 20px;">
                    ${isEn ? 'Today' : 'วันนี้'}
                  </span>
                </div>
                <div style="font-size: 1.85rem; font-weight: 700; color: var(--text-primary); line-height: 1.1;">
                  ${todayInterviewsCount}
                </div>
                <div style="font-size: 0.85rem; color: var(--text-secondary); margin-top: 4px; font-weight: 500;">
                  ${t('dashboard.interviews', { th: 'นัดสัมภาษณ์วันนี้', en: 'Interviews Today' })}
                </div>
              </div>

              <!-- 4. Hired This Month (Amber) -->
              <div class="stat-card" data-nav="candidates" style="background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 16px; padding: 16px; cursor: pointer; transition: transform 0.2s, box-shadow 0.2s; box-shadow: 0 4px 12px var(--shadow); position: relative; overflow: hidden;">
                <div style="position: absolute; right: -8px; bottom: -8px; font-size: 3.5rem; color: rgba(245, 158, 11, 0.08); pointer-events: none;">
                  <i class="fa-solid fa-trophy"></i>
                </div>
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px;">
                  <div style="width: 40px; height: 40px; border-radius: 10px; background: rgba(245, 158, 11, 0.15); color: #F59E0B; display: flex; align-items: center; justify-content: center; font-size: 1.15rem;">
                    <i class="fa-solid fa-trophy"></i>
                  </div>
                  <span style="font-size: 0.75rem; color: #F59E0B; font-weight: 600; background: rgba(245, 158, 11, 0.1); padding: 2px 8px; border-radius: 20px;">
                    ${isEn ? 'Month' : 'เดือนนี้'}
                  </span>
                </div>
                <div style="font-size: 1.85rem; font-weight: 700; color: var(--text-primary); line-height: 1.1;">
                  ${hiredCount}
                </div>
                <div style="font-size: 0.85rem; color: var(--text-secondary); margin-top: 4px; font-weight: 500;">
                  ${t('dashboard.hired', { th: 'รับเข้าทำงาน', en: 'Hired This Month' })}
                </div>
              </div>
            </div>
          </div>

          <!-- Recruitment Pipeline Funnel Section -->
          <div class="card dashboard-section" style="background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 18px; padding: 20px; margin-bottom: 24px; box-shadow: 0 4px 12px var(--shadow);">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;">
              <div>
                <h3 style="margin: 0; font-size: 1.05rem; font-weight: 700; color: var(--text-primary);">
                  <i class="fa-solid fa-filter-circle-dollar" style="color: var(--primary); margin-right: 8px;"></i>
                  ${t('dashboard.pipeline', { th: 'ขั้นตอนการสรรหาบุคลากร', en: 'Recruitment Pipeline' })}
                </h3>
                <div style="font-size: 0.8rem; color: var(--text-tertiary); margin-top: 2px;">
                  ${isEn ? 'Visual applicant funnel conversion' : 'อัตราการเปลี่ยนผ่านในแต่ละขั้นตอน'}
                </div>
              </div>
              <span style="font-size: 0.85rem; font-weight: 600; color: var(--primary); background: rgba(37, 99, 235, 0.1); padding: 4px 10px; border-radius: 20px;">
                ${totalCandidatesCount} ${isEn ? 'Total' : 'คน'}
              </span>
            </div>

            <div class="pipeline-bars" style="display: flex; flex-direction: column; gap: 14px;">
              ${pipelineStages.map(stage => {
                const percentage = totalCandidatesCount > 0 ? Math.round((stage.count / totalCandidatesCount) * 100) : 0;
                const barWidth = Math.max(percentage, stage.count > 0 ? 8 : 2);
                return `
                  <div class="pipeline-item" data-status="${stage.key}" style="cursor: pointer;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; font-size: 0.85rem;">
                      <span style="font-weight: 600; color: var(--text-primary); display: flex; align-items: center; gap: 6px;">
                        <i class="fa-solid ${stage.icon}" style="color: ${stage.color}; width: 16px;"></i>
                        ${stage.label}
                      </span>
                      <div style="display: flex; align-items: center; gap: 8px;">
                        <span style="font-weight: 700; color: var(--text-primary);">${stage.count} <span style="font-size: 0.75rem; color: var(--text-secondary); font-weight: 400;">(${percentage}%)</span></span>
                      </div>
                    </div>
                    <div style="width: 100%; height: 10px; background: var(--bg-tertiary); border-radius: 10px; overflow: hidden;">
                      <div style="height: 100%; width: ${barWidth}%; background: ${stage.color}; border-radius: 10px; transition: width 0.5s ease;"></div>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>

          <!-- Recent Activity Section -->
          <div class="card dashboard-section" style="background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 18px; padding: 20px; margin-bottom: 24px; box-shadow: 0 4px 12px var(--shadow);">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;">
              <h3 style="margin: 0; font-size: 1.05rem; font-weight: 700; color: var(--text-primary);">
                <i class="fa-solid fa-clock-rotate-left" style="color: #06B6D4; margin-right: 8px;"></i>
                ${t('dashboard.recentActivity', { th: 'กิจกรรมล่าสุด', en: 'Recent Activity' })}
              </h3>
              <a href="#candidates" style="font-size: 0.8rem; font-weight: 600; color: var(--primary); text-decoration: none;">
                ${t('common.viewAll', { th: 'ดูทั้งหมด', en: 'View All' })} <i class="fa-solid fa-chevron-right" style="font-size: 0.7rem;"></i>
              </a>
            </div>

            ${recentActivities.length > 0 ? `
              <div class="activity-list" style="display: flex; flex-direction: column; gap: 12px;">
                ${recentActivities.map(act => `
                  <div class="activity-item" data-nav="${act.nav || 'candidates'}" style="display: flex; align-items: flex-start; gap: 12px; padding: 10px 0; border-bottom: 1px solid var(--border); cursor: pointer; transition: background 0.2s;">
                    <div style="width: 36px; height: 36px; border-radius: 50%; background: ${act.iconColor}18; color: ${act.iconColor}; display: flex; align-items: center; justify-content: center; font-size: 0.95rem; flex-shrink: 0; margin-top: 2px;">
                      <i class="fa-solid ${act.icon}"></i>
                    </div>
                    <div style="flex: 1; min-width: 0;">
                      <div style="font-size: 0.9rem; font-weight: 600; color: var(--text-primary); line-height: 1.3; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                        ${act.title}
                      </div>
                      ${act.subtitle ? `
                        <div style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 2px;">
                          ${act.subtitle}
                        </div>
                      ` : ''}
                    </div>
                    <div style="font-size: 0.75rem; color: var(--text-tertiary); white-space: nowrap; margin-left: 6px;">
                      ${formatRelativeTime(act.dateStr)}
                    </div>
                  </div>
                `).join('')}
              </div>
            ` : `
              <div style="text-align: center; padding: 24px 0; color: var(--text-tertiary);">
                <i class="fa-solid fa-bell-slash" style="font-size: 2rem; margin-bottom: 8px; opacity: 0.4;"></i>
                <div style="font-size: 0.85rem;">${t('common.noData', { th: 'ไม่มีกิจกรรมล่าสุด', en: 'No recent activity yet' })}</div>
              </div>
            `}
          </div>
        </div>
      `;
    },

    /**
     * Render Applicant Dashboard
     */
    renderApplicant: function () {
      const user = (window.App && typeof window.App.getCurrentUser === 'function') ? window.App.getCurrentUser() : null;
      const isEn = window.App && typeof window.App.getLang === 'function' && window.App.getLang() === 'en';
      const userName = (user && (isEn ? (user.nameEn || user.name) : (user.name || user.nameEn))) || (isEn ? 'Applicant' : 'ผู้สมัครงาน');
      const userAvatar = (user && user.avatar) || '👨‍💻';

      const userId = user ? user.id : 'u3';
      const allJobs = (window.Data && typeof window.Data.getJobs === 'function') ? window.Data.getJobs() : [];
      const allCandidates = (window.Data && typeof window.Data.getCandidates === 'function') ? window.Data.getCandidates() : [];

      // Filter applicant's applications
      const myApplications = allCandidates.filter(c => c.userId === userId);
      const appliedJobIds = myApplications.map(c => c.jobId);

      // Summary counts
      const totalApplied = myApplications.length;
      const inProgress = myApplications.filter(c => c.status === 'screening' || c.status === 'qualified' || c.status === 'new').length;
      const interviewCount = myApplications.filter(c => c.status === 'interview_scheduled' || c.status === 'interviewed').length;
      const offerOrHiredCount = myApplications.filter(c => c.status === 'offered' || c.status === 'hired').length;

      // Recommended Jobs (open jobs not applied to yet)
      const recommendedJobs = allJobs
        .filter(j => j.status === 'open' && !appliedJobIds.includes(j.id))
        .slice(0, 3);

      // Most recent application
      const sortedMyApps = [...myApplications].sort((a, b) => new Date(b.appliedAt || 0) - new Date(a.appliedAt || 0));
      const latestApp = sortedMyApps[0] || null;
      const latestJob = latestApp ? allJobs.find(j => j.id === latestApp.jobId) : null;

      // Determine step in timeline for latestApp
      let currentStep = 1; // 1: Applied, 2: Screening, 3: Interview, 4: Result
      if (latestApp) {
        if (latestApp.status === 'new') currentStep = 1;
        else if (latestApp.status === 'screening' || latestApp.status === 'qualified') currentStep = 2;
        else if (latestApp.status === 'interview_scheduled' || latestApp.status === 'interviewed') currentStep = 3;
        else if (latestApp.status === 'offered' || latestApp.status === 'hired' || latestApp.status === 'rejected') currentStep = 4;
      }

      return `
        <div class="dashboard-page dashboard-applicant">
          <!-- Welcome Banner -->
          <div class="card welcome-banner" style="background: linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%); color: #fff; padding: 20px; border-radius: 18px; margin-bottom: 20px; box-shadow: 0 10px 25px rgba(37, 99, 235, 0.25); display: flex; align-items: center; justify-content: space-between;">
            <div>
              <div style="font-size: 0.8rem; color: #BFDBFE; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px;">
                ${isEn ? 'Job Seeker Portal' : 'ระบบค้นหาและติดตามงาน'}
              </div>
              <h2 style="margin: 0; font-size: 1.45rem; font-weight: 700; color: #FFFFFF;">
                ${isEn ? 'Hello, ' : 'สวัสดี, '}${userName}
              </h2>
              <p style="margin: 6px 0 0 0; font-size: 0.85rem; color: #DBEAFE;">
                ${isEn ? 'Track your application status & discover opportunities' : 'ติดตามสถานะการสมัครและค้นหาตำแหน่งงานที่ใช่สำหรับคุณ'}
              </p>
            </div>
            <div style="font-size: 2.75rem; line-height: 1; padding-left: 12px;">${userAvatar}</div>
          </div>

          <!-- My Applications Summary Cards (2x2 Grid) -->
          <div class="dashboard-section" style="margin-bottom: 24px;">
            <div style="font-weight: 600; font-size: 1rem; color: var(--text-primary); margin-bottom: 12px; display: flex; align-items: center; justify-content: space-between;">
              <span><i class="fa-solid fa-chart-pie" style="color: var(--primary); margin-right: 8px;"></i>${isEn ? 'My Applications Summary' : 'สรุปสถานะการสมัครงาน'}</span>
              <a href="#candidates" style="font-size: 0.8rem; font-weight: 600; color: var(--primary); text-decoration: none;">
                ${t('common.viewAll', { th: 'ดูทั้งหมด', en: 'View All' })} (${totalApplied})
              </a>
            </div>
            <div class="stats-grid" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px;">
              <div class="stat-card" data-nav="candidates" style="background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 16px; padding: 14px; box-shadow: 0 2px 8px var(--shadow); cursor: pointer;">
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
                  <span style="font-size: 0.8rem; color: var(--text-secondary); font-weight: 500;">${isEn ? 'Total Applied' : 'สมัครทั้งหมด'}</span>
                  <div style="width: 32px; height: 32px; border-radius: 8px; background: rgba(37, 99, 235, 0.1); color: #2563EB; display: flex; align-items: center; justify-content: center; font-size: 0.95rem;">
                    <i class="fa-solid fa-paper-plane"></i>
                  </div>
                </div>
                <div style="font-size: 1.6rem; font-weight: 700; color: var(--text-primary);">${totalApplied}</div>
              </div>

              <div class="stat-card" data-nav="candidates" style="background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 16px; padding: 14px; box-shadow: 0 2px 8px var(--shadow); cursor: pointer;">
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
                  <span style="font-size: 0.8rem; color: var(--text-secondary); font-weight: 500;">${isEn ? 'In Screening' : 'กำลังพิจารณา'}</span>
                  <div style="width: 32px; height: 32px; border-radius: 8px; background: rgba(245, 158, 11, 0.1); color: #F59E0B; display: flex; align-items: center; justify-content: center; font-size: 0.95rem;">
                    <i class="fa-solid fa-magnifying-glass"></i>
                  </div>
                </div>
                <div style="font-size: 1.6rem; font-weight: 700; color: var(--text-primary);">${inProgress}</div>
              </div>

              <div class="stat-card" data-nav="candidates" style="background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 16px; padding: 14px; box-shadow: 0 2px 8px var(--shadow); cursor: pointer;">
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
                  <span style="font-size: 0.8rem; color: var(--text-secondary); font-weight: 500;">${isEn ? 'Interviews' : 'สัมภาษณ์'}</span>
                  <div style="width: 32px; height: 32px; border-radius: 8px; background: rgba(139, 92, 246, 0.1); color: #8B5CF6; display: flex; align-items: center; justify-content: center; font-size: 0.95rem;">
                    <i class="fa-solid fa-comments"></i>
                  </div>
                </div>
                <div style="font-size: 1.6rem; font-weight: 700; color: var(--text-primary);">${interviewCount}</div>
              </div>

              <div class="stat-card" data-nav="candidates" style="background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 16px; padding: 14px; box-shadow: 0 2px 8px var(--shadow); cursor: pointer;">
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
                  <span style="font-size: 0.8rem; color: var(--text-secondary); font-weight: 500;">${isEn ? 'Offers / Hired' : 'ข้อเสนอ / ได้งาน'}</span>
                  <div style="width: 32px; height: 32px; border-radius: 8px; background: rgba(16, 185, 129, 0.1); color: #10B981; display: flex; align-items: center; justify-content: center; font-size: 0.95rem;">
                    <i class="fa-solid fa-trophy"></i>
                  </div>
                </div>
                <div style="font-size: 1.6rem; font-weight: 700; color: var(--text-primary);">${offerOrHiredCount}</div>
              </div>
            </div>
          </div>

          <!-- Application Status Timeline for Most Recent Application -->
          <div class="card dashboard-section" style="background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 18px; padding: 20px; margin-bottom: 24px; box-shadow: 0 4px 12px var(--shadow);">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px;">
              <h3 style="margin: 0; font-size: 1.05rem; font-weight: 700; color: var(--text-primary);">
                <i class="fa-solid fa-timeline" style="color: var(--primary); margin-right: 8px;"></i>
                ${isEn ? 'Latest Application Timeline' : 'สถานะการสมัครงานล่าสุด'}
              </h3>
              ${latestApp ? `
                <span class="badge" style="background: rgba(37, 99, 235, 0.1); color: var(--primary); font-size: 0.75rem; font-weight: 600; padding: 3px 10px; border-radius: 12px;">
                  ${formatDate(latestApp.appliedAt)}
                </span>
              ` : ''}
            </div>

            ${latestApp && latestJob ? `
              <div style="background: var(--bg-tertiary); border-radius: 12px; padding: 14px; margin-bottom: 16px;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                  <div>
                    <h4 style="margin: 0 0 4px 0; font-size: 1rem; font-weight: 700; color: var(--text-primary);">
                      ${isEn ? (latestJob.titleEn || latestJob.title) : (latestJob.title || latestJob.titleEn)}
                    </h4>
                    <div style="font-size: 0.8rem; color: var(--text-secondary);">
                      <i class="fa-solid fa-building" style="margin-right: 4px;"></i>
                      ${isEn ? (latestJob.departmentEn || latestJob.department) : (latestJob.department || latestJob.departmentEn)}
                    </div>
                  </div>
                  <button class="btn-view-job" data-id="${latestJob.id}" style="background: transparent; border: 1px solid var(--primary); color: var(--primary); border-radius: 8px; padding: 4px 10px; font-size: 0.75rem; font-weight: 600; cursor: pointer;">
                    ${isEn ? 'View Job' : 'ดูรายละเอียด'}
                  </button>
                </div>
              </div>

              <!-- 4-Step Visual Timeline -->
              <div class="timeline-steps" style="display: flex; justify-content: space-between; position: relative; margin: 24px 0 10px 0;">
                <!-- Timeline track line -->
                <div style="position: absolute; top: 16px; left: 24px; right: 24px; height: 3px; background: var(--border); z-index: 1;">
                  <div style="height: 100%; width: ${((currentStep - 1) / 3) * 100}%; background: var(--primary); transition: width 0.3s;"></div>
                </div>

                <!-- Step 1: Applied -->
                <div style="display: flex; flex-direction: column; align-items: center; z-index: 2; width: 25%;">
                  <div style="width: 32px; height: 32px; border-radius: 50%; background: ${currentStep >= 1 ? 'var(--primary)' : 'var(--bg-tertiary)'}; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 0.85rem; margin-bottom: 6px; box-shadow: 0 2px 6px rgba(0,0,0,0.1);">
                    <i class="fa-solid fa-check"></i>
                  </div>
                  <span style="font-size: 0.72rem; font-weight: ${currentStep === 1 ? '700' : '500'}; color: ${currentStep >= 1 ? 'var(--text-primary)' : 'var(--text-tertiary)'}; text-align: center;">
                    ${isEn ? 'Applied' : 'ยื่นใบสมัคร'}
                  </span>
                </div>

                <!-- Step 2: Screening -->
                <div style="display: flex; flex-direction: column; align-items: center; z-index: 2; width: 25%;">
                  <div style="width: 32px; height: 32px; border-radius: 50%; background: ${currentStep >= 2 ? 'var(--primary)' : 'var(--bg-tertiary)'}; color: ${currentStep >= 2 ? '#fff' : 'var(--text-tertiary)'}; display: flex; align-items: center; justify-content: center; font-size: 0.85rem; margin-bottom: 6px; box-shadow: 0 2px 6px rgba(0,0,0,0.1);">
                    <i class="fa-solid fa-magnifying-glass"></i>
                  </div>
                  <span style="font-size: 0.72rem; font-weight: ${currentStep === 2 ? '700' : '500'}; color: ${currentStep >= 2 ? 'var(--text-primary)' : 'var(--text-tertiary)'}; text-align: center;">
                    ${isEn ? 'Screening' : 'คัดกรอง'}
                  </span>
                </div>

                <!-- Step 3: Interview -->
                <div style="display: flex; flex-direction: column; align-items: center; z-index: 2; width: 25%;">
                  <div style="width: 32px; height: 32px; border-radius: 50%; background: ${currentStep >= 3 ? 'var(--primary)' : 'var(--bg-tertiary)'}; color: ${currentStep >= 3 ? '#fff' : 'var(--text-tertiary)'}; display: flex; align-items: center; justify-content: center; font-size: 0.85rem; margin-bottom: 6px; box-shadow: 0 2px 6px rgba(0,0,0,0.1);">
                    <i class="fa-solid fa-comments"></i>
                  </div>
                  <span style="font-size: 0.72rem; font-weight: ${currentStep === 3 ? '700' : '500'}; color: ${currentStep >= 3 ? 'var(--text-primary)' : 'var(--text-tertiary)'}; text-align: center;">
                    ${isEn ? 'Interview' : 'สัมภาษณ์'}
                  </span>
                </div>

                <!-- Step 4: Decision -->
                <div style="display: flex; flex-direction: column; align-items: center; z-index: 2; width: 25%;">
                  <div style="width: 32px; height: 32px; border-radius: 50%; background: ${currentStep >= 4 ? (latestApp.status === 'rejected' ? '#EF4444' : '#10B981') : 'var(--bg-tertiary)'}; color: ${currentStep >= 4 ? '#fff' : 'var(--text-tertiary)'}; display: flex; align-items: center; justify-content: center; font-size: 0.85rem; margin-bottom: 6px; box-shadow: 0 2px 6px rgba(0,0,0,0.1);">
                    <i class="fa-solid ${latestApp.status === 'rejected' ? 'fa-xmark' : 'fa-trophy'}"></i>
                  </div>
                  <span style="font-size: 0.72rem; font-weight: ${currentStep === 4 ? '700' : '500'}; color: ${currentStep >= 4 ? 'var(--text-primary)' : 'var(--text-tertiary)'}; text-align: center;">
                    ${latestApp.status === 'rejected' ? (isEn ? 'Rejected' : 'ไม่ผ่านการคัดเลือก') : (latestApp.status === 'hired' ? (isEn ? 'Hired' : 'รับเข้าทำงาน') : (isEn ? 'Decision' : 'ผลการพิจารณา'))}
                  </span>
                </div>
              </div>
            ` : `
              <div style="text-align: center; padding: 24px 0;">
                <i class="fa-solid fa-folder-open" style="font-size: 2.2rem; color: var(--text-tertiary); opacity: 0.5; margin-bottom: 10px;"></i>
                <div style="font-size: 0.9rem; font-weight: 600; color: var(--text-primary);">
                  ${isEn ? 'No Applications Submitted Yet' : 'คุณยังไม่ได้ยื่นใบสมัครตำแหน่งใด'}
                </div>
                <p style="font-size: 0.8rem; color: var(--text-secondary); margin: 6px 0 14px 0;">
                  ${isEn ? 'Browse through our open positions and find your dream job.' : 'ค้นหาตำแหน่งงานที่เปิดรับและเริ่มต้นยื่นใบสมัครวันนี้'}
                </p>
                <a href="#jobs" class="btn" style="display: inline-block; background: var(--primary); color: #fff; text-decoration: none; padding: 8px 16px; border-radius: 10px; font-size: 0.85rem; font-weight: 600;">
                  <i class="fa-solid fa-magnifying-glass" style="margin-right: 6px;"></i>
                  ${isEn ? 'Browse Jobs' : 'ค้นหาตำแหน่งงาน'}
                </a>
              </div>
            `}
          </div>

          <!-- Recommended Jobs List -->
          <div class="card dashboard-section" style="background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 18px; padding: 20px; margin-bottom: 24px; box-shadow: 0 4px 12px var(--shadow);">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;">
              <h3 style="margin: 0; font-size: 1.05rem; font-weight: 700; color: var(--text-primary);">
                <i class="fa-solid fa-sparkles" style="color: #F59E0B; margin-right: 8px;"></i>
                ${isEn ? 'Recommended Jobs For You' : 'ตำแหน่งงานแนะนำสำหรับคุณ'}
              </h3>
              <a href="#jobs" style="font-size: 0.8rem; font-weight: 600; color: var(--primary); text-decoration: none;">
                ${t('common.viewAll', { th: 'ดูทั้งหมด', en: 'View All' })} <i class="fa-solid fa-chevron-right" style="font-size: 0.7rem;"></i>
              </a>
            </div>

            ${recommendedJobs.length > 0 ? `
              <div class="recommended-jobs-list" style="display: flex; flex-direction: column; gap: 12px;">
                ${recommendedJobs.map(job => {
                  const jobTitle = isEn ? (job.titleEn || job.title) : (job.title || job.titleEn);
                  const jobDept = isEn ? (job.departmentEn || job.department) : (job.department || job.departmentEn);
                  const salaryText = (job.salaryMin && job.salaryMax) 
                    ? `฿${job.salaryMin.toLocaleString()} - ฿${job.salaryMax.toLocaleString()}`
                    : (isEn ? 'Negotiable' : 'ตามตกลง');
                  const workModeIcon = job.workMode === 'remote' ? 'fa-house-laptop' : (job.workMode === 'hybrid' ? 'fa-arrows-rotate' : 'fa-building');
                  const workModeLabel = job.workMode === 'remote' ? (isEn ? 'Remote' : 'ทำงานจากที่บ้าน') : (job.workMode === 'hybrid' ? (isEn ? 'Hybrid' : 'ไฮบริด') : (isEn ? 'On-site' : 'ทำงานที่สำนักงาน'));

                  return `
                    <div class="job-card-compact" data-id="${job.id}" style="background: var(--bg-tertiary); border: 1px solid var(--border); border-radius: 14px; padding: 14px; cursor: pointer; transition: transform 0.2s, box-shadow 0.2s;">
                      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 6px;">
                        <h4 style="margin: 0; font-size: 0.95rem; font-weight: 700; color: var(--text-primary); line-height: 1.3;">
                          ${jobTitle}
                        </h4>
                        <span style="font-size: 0.7rem; font-weight: 600; color: #10B981; background: rgba(16, 185, 129, 0.12); padding: 2px 8px; border-radius: 12px; white-space: nowrap;">
                          <i class="fa-solid ${workModeIcon}" style="margin-right: 4px;"></i>${workModeLabel}
                        </span>
                      </div>
                      
                      <div style="font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 10px;">
                        <i class="fa-solid fa-briefcase" style="margin-right: 4px; font-size: 0.75rem;"></i>${jobDept}
                      </div>

                      <div style="display: flex; justify-content: space-between; align-items: center; pt: 8px; border-top: 1px dashed var(--border); padding-top: 8px;">
                        <div style="font-size: 0.85rem; font-weight: 600; color: var(--primary);">
                          ${salaryText}
                        </div>
                        <button class="btn-quick-view" data-id="${job.id}" style="background: var(--primary); color: #fff; border: none; border-radius: 8px; padding: 5px 12px; font-size: 0.75rem; font-weight: 600; cursor: pointer;">
                          ${isEn ? 'Details' : 'รายละเอียด'} <i class="fa-solid fa-arrow-right" style="font-size: 0.65rem; margin-left: 2px;"></i>
                        </button>
                      </div>
                    </div>
                  `;
                }).join('')}
              </div>
            ` : `
              <div style="text-align: center; padding: 20px 0; color: var(--text-tertiary); font-size: 0.85rem;">
                ${isEn ? 'No new recommended jobs available.' : 'ไม่มีตำแหน่งงานแนะนำเพิ่มเติมในขณะนี้'}
              </div>
            `}
          </div>
        </div>
      `;
    },

    /**
     * Attach DOM event listeners after rendering
     */
    afterRender: function () {
      // 1. Stat cards navigation
      document.querySelectorAll('.stat-card[data-nav]').forEach(card => {
        card.addEventListener('click', function () {
          const navTarget = this.getAttribute('data-nav');
          if (window.App && typeof window.App.navigate === 'function') {
            window.App.navigate(navTarget);
          } else {
            window.location.hash = '#' + navTarget;
          }
        });
      });

      // 2. Quick action buttons
      document.querySelectorAll('.quick-action-btn').forEach(btn => {
        btn.addEventListener('click', function () {
          const action = this.getAttribute('data-action');
          if (action === 'new-job') {
            if (window.App && typeof window.App.navigate === 'function') {
              window.App.navigate('jobs/new');
            } else {
              window.location.hash = '#jobs/new';
            }
          } else if (action === 'view-candidates') {
            if (window.App && typeof window.App.navigate === 'function') {
              window.App.navigate('candidates');
            } else {
              window.location.hash = '#candidates';
            }
          } else if (action === 'new-interview') {
            if (window.App && typeof window.App.navigate === 'function') {
              window.App.navigate('interviews/new');
            } else {
              window.location.hash = '#interviews/new';
            }
          }
        });
      });

      // 3. Pipeline stage filter clicks
      document.querySelectorAll('.pipeline-item[data-status]').forEach(item => {
        item.addEventListener('click', function () {
          const status = this.getAttribute('data-status');
          if (window.App && typeof window.App.navigate === 'function') {
            window.App.navigate('candidates', { status: status });
          } else {
            window.location.hash = '#candidates';
          }
        });
      });

      // 4. Activity list navigation
      document.querySelectorAll('.activity-item[data-nav]').forEach(item => {
        item.addEventListener('click', function () {
          const navTarget = this.getAttribute('data-nav');
          if (window.App && typeof window.App.navigate === 'function') {
            window.App.navigate(navTarget);
          } else {
            window.location.hash = '#' + navTarget;
          }
        });
      });

      // 5. Recommended jobs navigation
      document.querySelectorAll('.job-card-compact, .btn-quick-view, .btn-view-job').forEach(elem => {
        elem.addEventListener('click', function (e) {
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
    }
  };
})();
