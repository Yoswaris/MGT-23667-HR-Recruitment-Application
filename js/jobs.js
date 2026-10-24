/**
 * HR Recruitment App - Jobs Module
 * File: js/jobs.js
 * Handles Job Listing, Create Job, View Job Details, and Edit Job
 * Supports HR and Applicant roles with bilingual (TH/EN) translations
 */

(function () {
  'use strict';

  // Module internal state
  const state = {
    searchQuery: '',
    selectedFilter: 'all', // 'all', 'open', 'draft', 'closed'
    formRequirements: [],
    formRequirementsEn: []
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

  // Status badge style helper
  function getStatusBadge(status) {
    const isEn = window.App && window.App.getLang() === 'en';
    switch (status) {
      case 'open':
        return `<span class="badge badge-open" style="background: rgba(16, 185, 129, 0.15); color: #10B981; border: 1px solid rgba(16, 185, 129, 0.3); font-weight: 600; font-size: 0.72rem; padding: 2px 8px; border-radius: 20px;">
          <i class="fa-solid fa-circle" style="font-size: 0.45rem; vertical-align: middle; margin-right: 4px;"></i>${t('jobs.open', { th: 'เปิดรับสมัคร', en: 'Open' })}
        </span>`;
      case 'draft':
        return `<span class="badge badge-draft" style="background: rgba(148, 163, 184, 0.15); color: #64748B; border: 1px solid rgba(148, 163, 184, 0.3); font-weight: 600; font-size: 0.72rem; padding: 2px 8px; border-radius: 20px;">
          <i class="fa-solid fa-file-lines" style="font-size: 0.55rem; vertical-align: middle; margin-right: 4px;"></i>${t('jobs.draft', { th: 'แบบร่าง', en: 'Draft' })}
        </span>`;
      case 'closed':
        return `<span class="badge badge-closed" style="background: rgba(239, 68, 68, 0.15); color: #EF4444; border: 1px solid rgba(239, 68, 68, 0.3); font-weight: 600; font-size: 0.72rem; padding: 2px 8px; border-radius: 20px;">
          <i class="fa-solid fa-circle-xmark" style="font-size: 0.55rem; vertical-align: middle; margin-right: 4px;"></i>${t('jobs.closed', { th: 'ปิดรับแล้ว', en: 'Closed' })}
        </span>`;
      default:
        return `<span class="badge" style="background: var(--bg-tertiary); color: var(--text-secondary); font-size: 0.72rem; padding: 2px 8px; border-radius: 20px;">${status}</span>`;
    }
  }

  // Common benefits list preset
  const PRESET_BENEFITS = [
    { id: 'b_social', th: 'ประกันสังคม', en: 'Social Security', icon: 'fa-shield-heart' },
    { id: 'b_bonus', th: 'โบนัสประจำปี', en: 'Annual Bonus', icon: 'fa-gift' },
    { id: 'b_insurance', th: 'ประกันสุขภาพและอุบัติเหตุกลุ่ม', en: 'Health & Accident Insurance', icon: 'fa-hand-holding-medical' },
    { id: 'b_wfh', th: 'ทำงานที่บ้านได้ (WFH)', en: 'Work from Home', icon: 'fa-house-laptop' },
    { id: 'b_flex', th: 'เวลาทำงานยืดหยุ่น', en: 'Flexible Working Hours', icon: 'fa-clock' },
    { id: 'b_leave', th: 'วันลาพักร้อน 15 วัน/ปี', en: 'Annual Leave 15+ Days', icon: 'fa-umbrella-beach' },
    { id: 'b_train', th: 'งบฝึกอบรมและสอบใบรับรอง', en: 'Training & Cert Budget', icon: 'fa-graduation-cap' },
    { id: 'b_provident', th: 'กองทุนสำรองเลี้ยงชีพ', en: 'Provident Fund', icon: 'fa-piggy-bank' },
    { id: 'b_snacks', th: 'ของว่างและเครื่องดื่มฟรี', en: 'Free Snacks & Drinks', icon: 'fa-mug-hot' }
  ];

  window.JobsModule = {
    /**
     * Render Job Listing Page (#jobs)
     */
    render: function () {
      const isHR = window.App && typeof window.App.isHR === 'function' ? window.App.isHR() : true;
      const isEn = window.App && typeof window.App.getLang === 'function' && window.App.getLang() === 'en';
      const currentUser = (window.App && typeof window.App.getCurrentUser === 'function') ? window.App.getCurrentUser() : null;

      // Fetch all jobs and candidates
      const allJobs = (window.Data && typeof window.Data.getJobs === 'function') ? window.Data.getJobs() : [];
      const allCandidates = (window.Data && typeof window.Data.getCandidates === 'function') ? window.Data.getCandidates() : [];

      // Find jobs already applied to by applicant
      const appliedJobIds = (currentUser && !isHR)
        ? allCandidates.filter(c => c.userId === currentUser.id).map(c => c.jobId)
        : [];

      // Filter jobs
      let filteredJobs = allJobs.filter(job => {
        // Applicant only sees 'open' jobs
        if (!isHR && job.status !== 'open') {
          return false;
        }

        // Status filter
        if (state.selectedFilter !== 'all' && job.status !== state.selectedFilter) {
          return false;
        }

        // Search query
        if (state.searchQuery.trim() !== '') {
          const q = state.searchQuery.toLowerCase();
          const title = ((job.title || '') + ' ' + (job.titleEn || '')).toLowerCase();
          const dept = ((job.department || '') + ' ' + (job.departmentEn || '')).toLowerCase();
          const reqs = ((job.requirements || []).join(' ') + ' ' + (job.requirementsEn || []).join(' ')).toLowerCase();
          const loc = ((job.location || '') + ' ' + (job.locationEn || '')).toLowerCase();
          return title.includes(q) || dept.includes(q) || reqs.includes(q) || loc.includes(q);
        }

        return true;
      });

      return `
        <div class="jobs-page" style="padding-bottom: 80px;">
          <!-- Header & Title -->
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;">
            <div>
              <h2 style="margin: 0; font-size: 1.35rem; font-weight: 700; color: var(--text-primary);">
                ${t('jobs.title', { th: 'ตำแหน่งงาน', en: 'Job Postings' })}
              </h2>
              <div style="font-size: 0.8rem; color: var(--text-tertiary); margin-top: 2px;">
                ${isHR 
                  ? (isEn ? 'Manage and publish company vacancies' : 'จัดการและประกาศตำแหน่งงานที่เปิดรับ') 
                  : (isEn ? 'Find your next career opportunity' : 'ค้นหาโอกาสและร่วมงานกับเรา')}
              </div>
            </div>

            ${isHR ? `
              <button id="btn-create-job-top" class="btn btn-primary" style="background: var(--primary); color: #fff; border: none; border-radius: 12px; padding: 8px 14px; font-size: 0.85rem; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 6px; box-shadow: 0 4px 10px rgba(37, 99, 235, 0.25);">
                <i class="fa-solid fa-plus"></i>
                <span>${t('jobs.create', { th: 'สร้างประกาศงาน', en: 'New Job' })}</span>
              </button>
            ` : ''}
          </div>

          <!-- Search Bar -->
          <div class="search-box" style="position: relative; margin-bottom: 14px;">
            <i class="fa-solid fa-magnifying-glass" style="position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: var(--text-tertiary); font-size: 0.9rem;"></i>
            <input 
              type="text" 
              id="job-search-input" 
              placeholder="${isEn ? 'Search position, department, skills...' : 'ค้นหาตำแหน่งงาน, แผนก, ทักษะ...'}" 
              value="${state.searchQuery}"
              style="width: 100%; box-sizing: border-box; background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 12px; padding: 12px 38px 12px 38px; font-size: 0.9rem; color: var(--text-primary); outline: none; transition: border-color 0.2s;"
            />
            ${state.searchQuery ? `
              <button id="btn-clear-search" style="position: absolute; right: 12px; top: 50%; transform: translateY(-50%); background: none; border: none; color: var(--text-tertiary); cursor: pointer; font-size: 0.9rem;">
                <i class="fa-solid fa-circle-xmark"></i>
              </button>
            ` : ''}
          </div>

          <!-- Filter Chips -->
          <div class="filter-chips" style="display: flex; gap: 8px; overflow-x: auto; padding-bottom: 8px; margin-bottom: 16px; scrollbar-width: none;">
            <button class="filter-chip ${state.selectedFilter === 'all' ? 'active' : ''}" data-filter="all" style="flex-shrink: 0; padding: 6px 14px; border-radius: 20px; font-size: 0.8rem; font-weight: 600; cursor: pointer; border: 1px solid ${state.selectedFilter === 'all' ? 'var(--primary)' : 'var(--border)'}; background: ${state.selectedFilter === 'all' ? 'var(--primary)' : 'var(--bg-secondary)'}; color: ${state.selectedFilter === 'all' ? '#fff' : 'var(--text-secondary)'}; transition: all 0.2s;">
              ${t('common.all', { th: 'ทั้งหมด', en: 'All' })} (${isHR ? allJobs.length : allJobs.filter(j => j.status === 'open').length})
            </button>

            <button class="filter-chip ${state.selectedFilter === 'open' ? 'active' : ''}" data-filter="open" style="flex-shrink: 0; padding: 6px 14px; border-radius: 20px; font-size: 0.8rem; font-weight: 600; cursor: pointer; border: 1px solid ${state.selectedFilter === 'open' ? '#10B981' : 'var(--border)'}; background: ${state.selectedFilter === 'open' ? '#10B981' : 'var(--bg-secondary)'}; color: ${state.selectedFilter === 'open' ? '#fff' : 'var(--text-secondary)'}; transition: all 0.2s;">
              ${t('jobs.open', { th: 'เปิดรับสมัคร', en: 'Open' })} (${allJobs.filter(j => j.status === 'open').length})
            </button>

            ${isHR ? `
              <button class="filter-chip ${state.selectedFilter === 'draft' ? 'active' : ''}" data-filter="draft" style="flex-shrink: 0; padding: 6px 14px; border-radius: 20px; font-size: 0.8rem; font-weight: 600; cursor: pointer; border: 1px solid ${state.selectedFilter === 'draft' ? '#64748B' : 'var(--border)'}; background: ${state.selectedFilter === 'draft' ? '#64748B' : 'var(--bg-secondary)'}; color: ${state.selectedFilter === 'draft' ? '#fff' : 'var(--text-secondary)'}; transition: all 0.2s;">
                ${t('jobs.draft', { th: 'แบบร่าง', en: 'Draft' })} (${allJobs.filter(j => j.status === 'draft').length})
              </button>

              <button class="filter-chip ${state.selectedFilter === 'closed' ? 'active' : ''}" data-filter="closed" style="flex-shrink: 0; padding: 6px 14px; border-radius: 20px; font-size: 0.8rem; font-weight: 600; cursor: pointer; border: 1px solid ${state.selectedFilter === 'closed' ? '#EF4444' : 'var(--border)'}; background: ${state.selectedFilter === 'closed' ? '#EF4444' : 'var(--bg-secondary)'}; color: ${state.selectedFilter === 'closed' ? '#fff' : 'var(--text-secondary)'}; transition: all 0.2s;">
                ${t('jobs.closed', { th: 'ปิดรับแล้ว', en: 'Closed' })} (${allJobs.filter(j => j.status === 'closed').length})
              </button>
            ` : ''}
          </div>

          <!-- Jobs List -->
          <div class="jobs-list" style="display: flex; flex-direction: column; gap: 14px;">
            ${filteredJobs.length > 0 ? filteredJobs.map(job => {
              const jobTitle = isEn ? (job.titleEn || job.title) : (job.title || job.titleEn);
              const jobDept = isEn ? (job.departmentEn || job.department) : (job.department || job.departmentEn);
              const jobLocation = isEn ? (job.locationEn || job.location) : (job.location || job.locationEn);
              
              const salaryText = (job.salaryMin && job.salaryMax)
                ? `฿${job.salaryMin.toLocaleString()} - ฿${job.salaryMax.toLocaleString()}`
                : (isEn ? 'Negotiable' : 'ตามตกลง');

              // Work mode icon & label
              let workModeIcon = 'fa-building';
              let workModeLabel = isEn ? 'On-site' : 'ทำงานที่สำนักงาน';
              if (job.workMode === 'remote') {
                workModeIcon = 'fa-house-laptop';
                workModeLabel = isEn ? 'Remote' : 'ทำงานจากที่บ้าน';
              } else if (job.workMode === 'hybrid') {
                workModeIcon = 'fa-arrows-rotate';
                workModeLabel = isEn ? 'Hybrid' : 'ไฮบริด';
              }

              // Employment type label
              let empTypeLabel = job.employmentType;
              if (job.employmentType === 'fulltime') empTypeLabel = isEn ? 'Full-time' : 'งานประจำ';
              else if (job.employmentType === 'parttime') empTypeLabel = isEn ? 'Part-time' : 'พาร์ทไทม์';
              else if (job.employmentType === 'contract') empTypeLabel = isEn ? 'Contract' : 'สัญญาจ้าง';
              else if (job.employmentType === 'internship') empTypeLabel = isEn ? 'Internship' : 'ฝึกงาน';

              // Applicant count for this job
              const jobCandidatesCount = allCandidates.filter(c => c.jobId === job.id).length;
              const isApplied = appliedJobIds.includes(job.id);

              return `
                <div class="job-card" data-id="${job.id}" style="background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 16px; padding: 18px; box-shadow: 0 4px 12px var(--shadow); cursor: pointer; transition: transform 0.2s, box-shadow 0.2s;">
                  <!-- Top Row: Title & Status -->
                  <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; margin-bottom: 8px;">
                    <h3 style="margin: 0; font-size: 1.1rem; font-weight: 700; color: var(--text-primary); line-height: 1.3;">
                      ${jobTitle}
                    </h3>
                    ${getStatusBadge(job.status)}
                  </div>

                  <!-- Badges: Department, Level, Employment Type -->
                  <div style="display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 12px;">
                    <span style="font-size: 0.72rem; font-weight: 600; color: var(--primary); background: rgba(37, 99, 235, 0.1); padding: 3px 8px; border-radius: 6px;">
                      <i class="fa-solid fa-briefcase" style="margin-right: 4px;"></i>${jobDept}
                    </span>
                    <span style="font-size: 0.72rem; font-weight: 600; color: #8B5CF6; background: rgba(139, 92, 246, 0.1); padding: 3px 8px; border-radius: 6px;">
                      ${job.level ? job.level.toUpperCase() : ''}
                    </span>
                    <span style="font-size: 0.72rem; font-weight: 500; color: var(--text-secondary); background: var(--bg-tertiary); padding: 3px 8px; border-radius: 6px;">
                      ${empTypeLabel}
                    </span>
                  </div>

                  <!-- Meta Row: Salary, Location, Mode -->
                  <div style="display: flex; flex-wrap: wrap; align-items: center; gap: 14px; font-size: 0.82rem; color: var(--text-secondary); margin-bottom: 14px;">
                    <div style="font-weight: 700; color: var(--primary); font-size: 0.95rem;">
                      ${salaryText}
                    </div>
                    <div style="display: flex; align-items: center; gap: 4px;">
                      <i class="fa-solid fa-location-dot" style="color: #EF4444; font-size: 0.8rem;"></i>
                      <span>${jobLocation}</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 4px;">
                      <i class="fa-solid ${workModeIcon}" style="color: #10B981; font-size: 0.8rem;"></i>
                      <span>${workModeLabel}</span>
                    </div>
                  </div>

                  <!-- Bottom Row: Applicants, Deadline, and Action -->
                  <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 12px; border-top: 1px solid var(--border);">
                    <div style="display: flex; align-items: center; gap: 12px; font-size: 0.75rem; color: var(--text-tertiary);">
                      <span><i class="fa-solid fa-users" style="margin-right: 4px;"></i>${jobCandidatesCount} ${isEn ? 'applicants' : 'ผู้สมัคร'}</span>
                      <span><i class="fa-regular fa-calendar" style="margin-right: 4px;"></i>${formatDate(job.deadline)}</span>
                    </div>

                    ${!isHR ? (
                      isApplied ? `
                        <span style="font-size: 0.78rem; font-weight: 600; color: #10B981; background: rgba(16, 185, 129, 0.12); padding: 4px 12px; border-radius: 8px;">
                          <i class="fa-solid fa-check" style="margin-right: 4px;"></i>${isEn ? 'Applied' : 'สมัครแล้ว'}
                        </span>
                      ` : `
                        <button class="btn-apply-card" data-id="${job.id}" style="background: var(--primary); color: #fff; border: none; border-radius: 8px; padding: 6px 14px; font-size: 0.8rem; font-weight: 600; cursor: pointer; transition: background 0.2s;">
                          ${isEn ? 'Apply' : 'สมัครงาน'}
                        </button>
                      `
                    ) : `
                      <div style="font-size: 0.8rem; font-weight: 600; color: var(--primary); display: flex; align-items: center; gap: 4px;">
                        <span>${isEn ? 'Manage' : 'จัดการ'}</span>
                        <i class="fa-solid fa-chevron-right" style="font-size: 0.7rem;"></i>
                      </div>
                    `}
                  </div>
                </div>
              `;
            }).join('') : `
              <div style="text-align: center; padding: 40px 20px; background: var(--bg-secondary); border-radius: 16px; border: 1px dashed var(--border);">
                <i class="fa-solid fa-briefcase" style="font-size: 2.5rem; color: var(--text-tertiary); opacity: 0.4; margin-bottom: 12px;"></i>
                <h4 style="margin: 0 0 6px 0; color: var(--text-primary); font-size: 1rem;">
                  ${t('common.noData', { th: 'ไม่พบตำแหน่งงาน', en: 'No jobs found' })}
                </h4>
                <p style="margin: 0; font-size: 0.82rem; color: var(--text-secondary);">
                  ${isEn ? 'Try adjusting your search criteria or filters.' : 'ลองเปลี่ยนคำค้นหาหรือตัวกรองใหม่อีกครั้ง'}
                </p>
              </div>
            `}
          </div>

          <!-- HR Floating Action Button (FAB) -->
          ${isHR ? `
            <button id="jobs-page-fab" style="position: fixed; right: 20px; bottom: 84px; width: 56px; height: 56px; border-radius: 28px; background: var(--primary); color: #fff; border: none; font-size: 1.3rem; box-shadow: 0 6px 18px rgba(37, 99, 235, 0.4); display: flex; align-items: center; justify-content: center; cursor: pointer; z-index: 99; transition: transform 0.2s;">
              <i class="fa-solid fa-plus"></i>
            </button>
          ` : ''}
        </div>
      `;
    },

    /**
     * Render Create Job Form (#jobs/new) - HR Only
     */
    renderCreate: function () {
      const isEn = window.App && typeof window.App.getLang === 'function' && window.App.getLang() === 'en';
      state.formRequirements = [];
      state.formRequirementsEn = [];

      return `
        <div class="jobs-form-page" style="padding-bottom: 90px;">
          <!-- Top Header with Back button -->
          <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 20px;">
            <button id="btn-form-back" style="background: var(--bg-secondary); border: 1px solid var(--border); width: 38px; height: 38px; border-radius: 10px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: var(--text-primary);">
              <i class="fa-solid fa-arrow-left"></i>
            </button>
            <div>
              <h2 style="margin: 0; font-size: 1.25rem; font-weight: 700; color: var(--text-primary);">
                ${t('jobs.create', { th: 'สร้างประกาศรับสมัครงาน', en: 'Create Job Posting' })}
              </h2>
              <div style="font-size: 0.8rem; color: var(--text-tertiary);">
                ${isEn ? 'Fill in details to post a new position' : 'กรอกรายละเอียดเพื่อเปิดรับสมัครงาน'}
              </div>
            </div>
          </div>

          <!-- Job Form -->
          <form id="job-create-form" style="display: flex; flex-direction: column; gap: 18px;">
            <!-- Titles (Thai & English) -->
            <div class="card" style="background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 16px; padding: 18px;">
              <div style="font-weight: 700; font-size: 0.95rem; color: var(--text-primary); margin-bottom: 14px;">
                <i class="fa-solid fa-heading" style="color: var(--primary); margin-right: 6px;"></i>${isEn ? 'Job Title' : 'ชื่อตำแหน่งงาน'} *
              </div>
              <div style="display: flex; flex-direction: column; gap: 12px;">
                <div>
                  <label style="display: block; font-size: 0.8rem; font-weight: 600; color: var(--text-secondary); margin-bottom: 6px;">
                    ${isEn ? 'Job Title (Thai)' : 'ชื่อตำแหน่งงาน (ภาษาไทย)'} *
                  </label>
                  <input type="text" id="job-title-th" required placeholder="เช่น นักพัฒนาซอฟต์แวร์อาวุโส" style="width: 100%; box-sizing: border-box; background: var(--bg-tertiary); border: 1px solid var(--border); border-radius: 10px; padding: 10px 14px; font-size: 0.9rem; color: var(--text-primary); outline: none;" />
                </div>
                <div>
                  <label style="display: block; font-size: 0.8rem; font-weight: 600; color: var(--text-secondary); margin-bottom: 6px;">
                    ${isEn ? 'Job Title (English)' : 'ชื่อตำแหน่งงาน (ภาษาอังกฤษ)'}
                  </label>
                  <input type="text" id="job-title-en" placeholder="e.g. Senior Software Developer" style="width: 100%; box-sizing: border-box; background: var(--bg-tertiary); border: 1px solid var(--border); border-radius: 10px; padding: 10px 14px; font-size: 0.9rem; color: var(--text-primary); outline: none;" />
                </div>
              </div>
            </div>

            <!-- Department, Level, Employment Type -->
            <div class="card" style="background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 16px; padding: 18px;">
              <div style="font-weight: 700; font-size: 0.95rem; color: var(--text-primary); margin-bottom: 14px;">
                <i class="fa-solid fa-sitemap" style="color: var(--primary); margin-right: 6px;"></i>${isEn ? 'Category & Classification' : 'หมวดหมู่และระดับตำแหน่ง'}
              </div>
              <div style="display: flex; flex-direction: column; gap: 14px;">
                <!-- Department Dropdown -->
                <div>
                  <label style="display: block; font-size: 0.8rem; font-weight: 600; color: var(--text-secondary); margin-bottom: 6px;">
                    ${t('jobs.department', { th: 'แผนก / ฝ่าย', en: 'Department' })} *
                  </label>
                  <select id="job-dept" required style="width: 100%; box-sizing: border-box; background: var(--bg-tertiary); border: 1px solid var(--border); border-radius: 10px; padding: 10px 14px; font-size: 0.9rem; color: var(--text-primary); outline: none;">
                    <option value="IT" data-th="เทคโนโลยีสารสนเทศ" data-en="Information Technology">IT / เทคโนโลยีสารสนเทศ</option>
                    <option value="HR" data-th="ฝ่ายทรัพยากรบุคคล" data-en="Human Resources">HR / ฝ่ายทรัพยากรบุคคล</option>
                    <option value="Marketing" data-th="ฝ่ายการตลาด" data-en="Marketing">Marketing / ฝ่ายการตลาด</option>
                    <option value="Finance" data-th="ฝ่ายการเงินและบัญชี" data-en="Finance & Accounting">Finance / ฝ่ายการเงินและบัญชี</option>
                    <option value="Sales" data-th="ฝ่ายขาย" data-en="Sales">Sales / ฝ่ายขาย</option>
                    <option value="Operations" data-th="ฝ่ายปฏิบัติการ" data-en="Operations">Operations / ฝ่ายปฏิบัติการ</option>
                  </select>
                </div>

                <!-- Level Dropdown -->
                <div>
                  <label style="display: block; font-size: 0.8rem; font-weight: 600; color: var(--text-secondary); margin-bottom: 6px;">
                    ${t('jobs.level', { th: 'ระดับตำแหน่ง', en: 'Experience Level' })}
                  </label>
                  <select id="job-level" style="width: 100%; box-sizing: border-box; background: var(--bg-tertiary); border: 1px solid var(--border); border-radius: 10px; padding: 10px 14px; font-size: 0.9rem; color: var(--text-primary); outline: none;">
                    <option value="junior">Junior (ระดับเริ่มต้น)</option>
                    <option value="mid">Mid (ระดับกลาง)</option>
                    <option value="senior" selected>Senior (ระดับอาวุโส)</option>
                    <option value="lead">Lead (หัวหน้าทีม)</option>
                    <option value="manager">Manager (ผู้จัดการ)</option>
                  </select>
                </div>

                <!-- Employment Type (Pill Radios) -->
                <div>
                  <label style="display: block; font-size: 0.8rem; font-weight: 600; color: var(--text-secondary); margin-bottom: 8px;">
                    ${t('jobs.type', { th: 'ประเภทการจ้างงาน', en: 'Employment Type' })}
                  </label>
                  <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px;">
                    <label style="display: flex; align-items: center; gap: 8px; background: var(--bg-tertiary); border: 1px solid var(--border); border-radius: 10px; padding: 8px 12px; cursor: pointer; font-size: 0.85rem; color: var(--text-primary);">
                      <input type="radio" name="job-emp-type" value="fulltime" checked />
                      <span>${isEn ? 'Full-time' : 'งานประจำ'}</span>
                    </label>
                    <label style="display: flex; align-items: center; gap: 8px; background: var(--bg-tertiary); border: 1px solid var(--border); border-radius: 10px; padding: 8px 12px; cursor: pointer; font-size: 0.85rem; color: var(--text-primary);">
                      <input type="radio" name="job-emp-type" value="parttime" />
                      <span>${isEn ? 'Part-time' : 'พาร์ทไทม์'}</span>
                    </label>
                    <label style="display: flex; align-items: center; gap: 8px; background: var(--bg-tertiary); border: 1px solid var(--border); border-radius: 10px; padding: 8px 12px; cursor: pointer; font-size: 0.85rem; color: var(--text-primary);">
                      <input type="radio" name="job-emp-type" value="contract" />
                      <span>${isEn ? 'Contract' : 'สัญญาจ้าง'}</span>
                    </label>
                    <label style="display: flex; align-items: center; gap: 8px; background: var(--bg-tertiary); border: 1px solid var(--border); border-radius: 10px; padding: 8px 12px; cursor: pointer; font-size: 0.85rem; color: var(--text-primary);">
                      <input type="radio" name="job-emp-type" value="internship" />
                      <span>${isEn ? 'Internship' : 'ฝึกงาน'}</span>
                    </label>
                  </div>
                </div>

                <!-- Vacancies -->
                <div>
                  <label style="display: block; font-size: 0.8rem; font-weight: 600; color: var(--text-secondary); margin-bottom: 6px;">
                    ${t('jobs.vacancies', { th: 'จำนวนที่เปิดรับ (อัตรา)', en: 'Vacancies' })}
                  </label>
                  <input type="number" id="job-vacancies" min="1" value="1" style="width: 100%; box-sizing: border-box; background: var(--bg-tertiary); border: 1px solid var(--border); border-radius: 10px; padding: 10px 14px; font-size: 0.9rem; color: var(--text-primary); outline: none;" />
                </div>
              </div>
            </div>

            <!-- Work Mode, Salary, Location & Deadline -->
            <div class="card" style="background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 16px; padding: 18px;">
              <div style="font-weight: 700; font-size: 0.95rem; color: var(--text-primary); margin-bottom: 14px;">
                <i class="fa-solid fa-location-crosshairs" style="color: var(--primary); margin-right: 6px;"></i>${isEn ? 'Work Mode, Compensation & Dates' : 'รูปแบบงาน เงินเดือน และกำหนดเวลา'}
              </div>
              <div style="display: flex; flex-direction: column; gap: 14px;">
                <!-- Work Mode -->
                <div>
                  <label style="display: block; font-size: 0.8rem; font-weight: 600; color: var(--text-secondary); margin-bottom: 8px;">
                    ${t('jobs.workMode', { th: 'รูปแบบการทำงาน', en: 'Work Mode' })}
                  </label>
                  <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px;">
                    <label style="display: flex; flex-direction: column; align-items: center; gap: 4px; background: var(--bg-tertiary); border: 1px solid var(--border); border-radius: 10px; padding: 10px 6px; cursor: pointer; font-size: 0.78rem; color: var(--text-primary); text-align: center;">
                      <input type="radio" name="job-work-mode" value="onsite" />
                      <span>${isEn ? 'On-site' : 'สำนักงาน'}</span>
                    </label>
                    <label style="display: flex; flex-direction: column; align-items: center; gap: 4px; background: var(--bg-tertiary); border: 1px solid var(--border); border-radius: 10px; padding: 10px 6px; cursor: pointer; font-size: 0.78rem; color: var(--text-primary); text-align: center;">
                      <input type="radio" name="job-work-mode" value="hybrid" checked />
                      <span>${isEn ? 'Hybrid' : 'ไฮบริด'}</span>
                    </label>
                    <label style="display: flex; flex-direction: column; align-items: center; gap: 4px; background: var(--bg-tertiary); border: 1px solid var(--border); border-radius: 10px; padding: 10px 6px; cursor: pointer; font-size: 0.78rem; color: var(--text-primary); text-align: center;">
                      <input type="radio" name="job-work-mode" value="remote" />
                      <span>${isEn ? 'Remote' : 'จากที่บ้าน'}</span>
                    </label>
                  </div>
                </div>

                <!-- Salary Range -->
                <div>
                  <label style="display: block; font-size: 0.8rem; font-weight: 600; color: var(--text-secondary); margin-bottom: 6px;">
                    ${t('jobs.salary', { th: 'อัตราเงินเดือน (บาท)', en: 'Salary Range (THB)' })}
                  </label>
                  <div style="display: flex; align-items: center; gap: 10px;">
                    <input type="number" id="job-salary-min" placeholder="ต่ำสุด เช่น 40000" style="flex: 1; box-sizing: border-box; background: var(--bg-tertiary); border: 1px solid var(--border); border-radius: 10px; padding: 10px 12px; font-size: 0.9rem; color: var(--text-primary); outline: none;" />
                    <span style="color: var(--text-tertiary);">-</span>
                    <input type="number" id="job-salary-max" placeholder="สูงสุด เช่น 70000" style="flex: 1; box-sizing: border-box; background: var(--bg-tertiary); border: 1px solid var(--border); border-radius: 10px; padding: 10px 12px; font-size: 0.9rem; color: var(--text-primary); outline: none;" />
                  </div>
                </div>

                <!-- Location -->
                <div>
                  <label style="display: block; font-size: 0.8rem; font-weight: 600; color: var(--text-secondary); margin-bottom: 6px;">
                    ${t('jobs.location', { th: 'สถานที่ปฏิบัติงาน', en: 'Location' })}
                  </label>
                  <input type="text" id="job-location" value="กรุงเทพมหานคร" placeholder="เช่น กรุงเทพมหานคร / Bangkok" style="width: 100%; box-sizing: border-box; background: var(--bg-tertiary); border: 1px solid var(--border); border-radius: 10px; padding: 10px 14px; font-size: 0.9rem; color: var(--text-primary); outline: none;" />
                </div>

                <!-- Deadline -->
                <div>
                  <label style="display: block; font-size: 0.8rem; font-weight: 600; color: var(--text-secondary); margin-bottom: 6px;">
                    ${t('jobs.deadline', { th: 'วันปิดรับสมัคร', en: 'Application Deadline' })}
                  </label>
                  <input type="date" id="job-deadline" style="width: 100%; box-sizing: border-box; background: var(--bg-tertiary); border: 1px solid var(--border); border-radius: 10px; padding: 10px 14px; font-size: 0.9rem; color: var(--text-primary); outline: none;" />
                </div>
              </div>
            </div>

            <!-- Description -->
            <div class="card" style="background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 16px; padding: 18px;">
              <div style="font-weight: 700; font-size: 0.95rem; color: var(--text-primary); margin-bottom: 14px;">
                <i class="fa-solid fa-align-left" style="color: var(--primary); margin-right: 6px;"></i>${t('jobs.description', { th: 'รายละเอียดและหน้าที่รับผิดชอบ', en: 'Job Description' })}
              </div>
              <textarea id="job-desc" rows="5" placeholder="${isEn ? 'Detail the responsibilities and scope of work...' : 'ระบุหน้าที่ความรับผิดชอบและขอบเขตงาน...'}" style="width: 100%; box-sizing: border-box; background: var(--bg-tertiary); border: 1px solid var(--border); border-radius: 10px; padding: 12px; font-size: 0.88rem; color: var(--text-primary); outline: none; resize: vertical;"></textarea>
            </div>

            <!-- Requirements (Interactive Tags Input) -->
            <div class="card" style="background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 16px; padding: 18px;">
              <div style="font-weight: 700; font-size: 0.95rem; color: var(--text-primary); margin-bottom: 6px;">
                <i class="fa-solid fa-list-check" style="color: var(--primary); margin-right: 6px;"></i>${t('jobs.requirements', { th: 'คุณสมบัติที่ต้องการ', en: 'Requirements' })}
              </div>
              <div style="font-size: 0.8rem; color: var(--text-tertiary); margin-bottom: 12px;">
                ${isEn ? 'Type a requirement and press Enter or tap Add' : 'พิมพ์คุณสมบัติแล้วกด Enter หรือปุ่มเพิ่ม'}
              </div>

              <!-- Tag Input Box -->
              <div style="display: flex; gap: 8px; margin-bottom: 12px;">
                <input type="text" id="tag-input-req" placeholder="${isEn ? 'e.g. JavaScript 3+ years' : 'เช่น ประสบการณ์ React 2 ปีขึ้นไป'}" style="flex: 1; box-sizing: border-box; background: var(--bg-tertiary); border: 1px solid var(--border); border-radius: 10px; padding: 10px 12px; font-size: 0.88rem; color: var(--text-primary); outline: none;" />
                <button type="button" id="btn-add-tag-req" style="background: var(--primary); color: #fff; border: none; border-radius: 10px; padding: 0 16px; font-size: 0.85rem; font-weight: 600; cursor: pointer;">
                  <i class="fa-solid fa-plus"></i>
                </button>
              </div>

              <!-- Tags Container -->
              <div id="tags-container-req" style="display: flex; flex-wrap: wrap; gap: 8px; min-height: 36px; padding: 8px; background: var(--bg-tertiary); border-radius: 10px; border: 1px dashed var(--border);">
                <!-- Dynamic Tags populated via JS -->
              </div>
            </div>

            <!-- Benefits (Checkboxes) -->
            <div class="card" style="background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 16px; padding: 18px;">
              <div style="font-weight: 700; font-size: 0.95rem; color: var(--text-primary); margin-bottom: 6px;">
                <i class="fa-solid fa-gift" style="color: var(--primary); margin-right: 6px;"></i>${t('jobs.benefits', { th: 'สวัสดิการและสิทธิประโยชน์', en: 'Benefits' })}
              </div>
              <div style="font-size: 0.8rem; color: var(--text-tertiary); margin-bottom: 12px;">
                ${isEn ? 'Select company perks offered for this job' : 'เลือกสวัสดิการที่เสนอสำหรับตำแหน่งนี้'}
              </div>

              <div style="display: flex; flex-direction: column; gap: 10px;">
                ${PRESET_BENEFITS.map(b => `
                  <label style="display: flex; align-items: center; gap: 10px; background: var(--bg-tertiary); border-radius: 10px; padding: 10px 12px; cursor: pointer; font-size: 0.85rem; color: var(--text-primary);">
                    <input type="checkbox" name="job-benefit" value="${b.th}" data-en="${b.en}" style="width: 16px; height: 16px; accent-color: var(--primary);" />
                    <i class="fa-solid ${b.icon}" style="color: var(--primary); width: 18px;"></i>
                    <span>${isEn ? b.en : b.th}</span>
                  </label>
                `).join('')}
              </div>
            </div>

            <!-- Status Toggle: Draft / Open -->
            <div class="card" style="background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 16px; padding: 18px;">
              <div style="font-weight: 700; font-size: 0.95rem; color: var(--text-primary); margin-bottom: 12px;">
                <i class="fa-solid fa-toggle-on" style="color: var(--primary); margin-right: 6px;"></i>${t('jobs.status', { th: 'สถานะประกาศ', en: 'Publication Status' })}
              </div>
              <div style="display: flex; gap: 12px;">
                <label style="flex: 1; display: flex; align-items: center; justify-content: center; gap: 8px; background: var(--bg-tertiary); border: 1px solid var(--border); border-radius: 10px; padding: 12px; cursor: pointer; font-size: 0.88rem; color: var(--text-primary); font-weight: 600;">
                  <input type="radio" name="job-status" value="open" checked />
                  <span style="color: #10B981;"><i class="fa-solid fa-circle-check" style="margin-right: 4px;"></i>${t('jobs.open', { th: 'เปิดรับทันที', en: 'Open' })}</span>
                </label>
                <label style="flex: 1; display: flex; align-items: center; justify-content: center; gap: 8px; background: var(--bg-tertiary); border: 1px solid var(--border); border-radius: 10px; padding: 12px; cursor: pointer; font-size: 0.88rem; color: var(--text-primary); font-weight: 600;">
                  <input type="radio" name="job-status" value="draft" />
                  <span style="color: #64748B;"><i class="fa-solid fa-file-pen" style="margin-right: 4px;"></i>${t('jobs.draft', { th: 'บันทึกแบบร่าง', en: 'Draft' })}</span>
                </label>
              </div>
            </div>

            <!-- Bottom Action Buttons -->
            <div style="display: flex; gap: 12px; margin-top: 10px;">
              <button type="button" id="btn-cancel-job" style="flex: 1; background: var(--bg-tertiary); border: 1px solid var(--border); border-radius: 12px; padding: 14px; font-size: 0.95rem; font-weight: 600; color: var(--text-secondary); cursor: pointer;">
                ${t('common.cancel', { th: 'ยกเลิก', en: 'Cancel' })}
              </button>
              <button type="submit" id="btn-save-job" style="flex: 2; background: var(--primary); border: none; border-radius: 12px; padding: 14px; font-size: 0.95rem; font-weight: 600; color: #fff; cursor: pointer; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);">
                <i class="fa-solid fa-check" style="margin-right: 6px;"></i>${t('common.save', { th: 'บันทึกประกาศงาน', en: 'Publish Job' })}
              </button>
            </div>
          </form>
        </div>
      `;
    },

    /**
     * Render View Job Details Page (#jobs/view/:id)
     */
    renderView: function (id) {
      const isHR = window.App && typeof window.App.isHR === 'function' ? window.App.isHR() : true;
      const isEn = window.App && typeof window.App.getLang === 'function' && window.App.getLang() === 'en';
      const currentUser = (window.App && typeof window.App.getCurrentUser === 'function') ? window.App.getCurrentUser() : null;

      const job = window.Data && typeof window.Data.getJob === 'function' ? window.Data.getJob(id) : null;
      if (!job) {
        return `
          <div style="text-align: center; padding: 50px 20px;">
            <i class="fa-solid fa-triangle-exclamation" style="font-size: 3rem; color: #EF4444; margin-bottom: 14px;"></i>
            <h3 style="color: var(--text-primary);">${isEn ? 'Job Not Found' : 'ไม่พบข้อมูลตำแหน่งงาน'}</h3>
            <p style="color: var(--text-secondary); font-size: 0.9rem;">${isEn ? 'This job posting may have been removed or does not exist.' : 'ตำแหน่งงานนี้อาจถูกลบหรือไม่มีอยู่ในระบบ'}</p>
            <button onclick="window.location.hash='#jobs'" class="btn" style="background: var(--primary); color: #fff; border: none; border-radius: 10px; padding: 10px 20px; font-weight: 600; margin-top: 10px; cursor: pointer;">
              ${t('common.back', { th: 'กลับหน้ารายการ', en: 'Back to Jobs' })}
            </button>
          </div>
        `;
      }

      const jobTitle = isEn ? (job.titleEn || job.title) : (job.title || job.titleEn);
      const jobDept = isEn ? (job.departmentEn || job.department) : (job.department || job.departmentEn);
      const jobLocation = isEn ? (job.locationEn || job.location) : (job.location || job.locationEn);
      const jobDesc = isEn ? (job.descriptionEn || job.description) : (job.description || job.descriptionEn);
      const requirements = (isEn && job.requirementsEn && job.requirementsEn.length > 0) ? job.requirementsEn : (job.requirements || []);
      const benefits = (isEn && job.benefitsEn && job.benefitsEn.length > 0) ? job.benefitsEn : (job.benefits || []);

      const salaryText = (job.salaryMin && job.salaryMax)
        ? `฿${job.salaryMin.toLocaleString()} - ฿${job.salaryMax.toLocaleString()}`
        : (isEn ? 'Negotiable' : 'ตามตกลง');

      // Work mode label
      let workModeIcon = 'fa-building';
      let workModeLabel = isEn ? 'On-site' : 'ทำงานที่สำนักงาน';
      if (job.workMode === 'remote') {
        workModeIcon = 'fa-house-laptop';
        workModeLabel = isEn ? 'Remote' : 'ทำงานจากที่บ้าน';
      } else if (job.workMode === 'hybrid') {
        workModeIcon = 'fa-arrows-rotate';
        workModeLabel = isEn ? 'Hybrid' : 'ไฮบริด';
      }

      // Employment type label
      let empTypeLabel = job.employmentType;
      if (job.employmentType === 'fulltime') empTypeLabel = isEn ? 'Full-time' : 'งานประจำ';
      else if (job.employmentType === 'parttime') empTypeLabel = isEn ? 'Part-time' : 'พาร์ทไทม์';
      else if (job.employmentType === 'contract') empTypeLabel = isEn ? 'Contract' : 'สัญญาจ้าง';
      else if (job.employmentType === 'internship') empTypeLabel = isEn ? 'Internship' : 'ฝึกงาน';

      // Applicants for this job
      const allCandidates = (window.Data && typeof window.Data.getCandidates === 'function') ? window.Data.getCandidates(job.id) : [];
      const totalCandidates = allCandidates.length;
      const screenedCandidates = allCandidates.filter(c => c.status === 'screening' || c.status === 'qualified').length;
      const interviewedCandidates = allCandidates.filter(c => c.status === 'interview_scheduled' || c.status === 'interviewed').length;
      const hiredCandidates = allCandidates.filter(c => c.status === 'hired').length;

      // Check if current applicant applied
      const myCandidateRecord = (currentUser && !isHR)
        ? allCandidates.find(c => c.userId === currentUser.id)
        : null;

      // Last 5 applicants preview
      const previewCandidates = allCandidates.slice(0, 5);

      return `
        <div class="job-detail-page" style="padding-bottom: 90px;">
          <!-- Top Bar -->
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 18px;">
            <button id="btn-view-back" style="background: var(--bg-secondary); border: 1px solid var(--border); width: 38px; height: 38px; border-radius: 10px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: var(--text-primary);">
              <i class="fa-solid fa-arrow-left"></i>
            </button>
            
            ${isHR ? `
              <div style="display: flex; gap: 8px;">
                <button id="btn-duplicate-job" data-id="${job.id}" title="${isEn ? 'Duplicate' : 'คัดลอก'}" style="background: var(--bg-secondary); border: 1px solid var(--border); width: 38px; height: 38px; border-radius: 10px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: var(--text-secondary);">
                  <i class="fa-regular fa-copy"></i>
                </button>
                <button id="btn-edit-job" data-id="${job.id}" title="${isEn ? 'Edit' : 'แก้ไข'}" style="background: var(--bg-secondary); border: 1px solid var(--border); width: 38px; height: 38px; border-radius: 10px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: var(--primary);">
                  <i class="fa-solid fa-pen-to-square"></i>
                </button>
                <button id="btn-delete-job" data-id="${job.id}" title="${isEn ? 'Delete' : 'ลบ'}" style="background: var(--bg-secondary); border: 1px solid var(--border); width: 38px; height: 38px; border-radius: 10px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: #EF4444;">
                  <i class="fa-regular fa-trash-can"></i>
                </button>
              </div>
            ` : ''}
          </div>

          <!-- Main Info Card -->
          <div class="card" style="background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 18px; padding: 20px; margin-bottom: 18px; box-shadow: 0 4px 14px var(--shadow);">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; margin-bottom: 10px;">
              <h2 style="margin: 0; font-size: 1.35rem; font-weight: 700; color: var(--text-primary); line-height: 1.3;">
                ${jobTitle}
              </h2>
              ${getStatusBadge(job.status)}
            </div>

            <!-- Badges -->
            <div style="display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 16px;">
              <span style="font-size: 0.8rem; font-weight: 600; color: var(--primary); background: rgba(37, 99, 235, 0.1); padding: 4px 10px; border-radius: 8px;">
                <i class="fa-solid fa-briefcase" style="margin-right: 4px;"></i>${jobDept}
              </span>
              <span style="font-size: 0.8rem; font-weight: 600; color: #8B5CF6; background: rgba(139, 92, 246, 0.1); padding: 4px 10px; border-radius: 8px;">
                ${job.level ? job.level.toUpperCase() : ''}
              </span>
              <span style="font-size: 0.8rem; font-weight: 500; color: var(--text-secondary); background: var(--bg-tertiary); padding: 4px 10px; border-radius: 8px;">
                ${empTypeLabel}
              </span>
            </div>

            <!-- Key Info 2x2 Grid -->
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; background: var(--bg-tertiary); border-radius: 12px; padding: 14px;">
              <div>
                <div style="font-size: 0.72rem; color: var(--text-tertiary); text-transform: uppercase;">${t('jobs.salary', { th: 'เงินเดือน', en: 'Salary' })}</div>
                <div style="font-size: 0.95rem; font-weight: 700; color: var(--primary); margin-top: 2px;">${salaryText}</div>
              </div>
              <div>
                <div style="font-size: 0.72rem; color: var(--text-tertiary); text-transform: uppercase;">${t('jobs.workMode', { th: 'รูปแบบ', en: 'Work Mode' })}</div>
                <div style="font-size: 0.88rem; font-weight: 600; color: var(--text-primary); margin-top: 2px;">
                  <i class="fa-solid ${workModeIcon}" style="color: #10B981; margin-right: 4px;"></i>${workModeLabel}
                </div>
              </div>
              <div>
                <div style="font-size: 0.72rem; color: var(--text-tertiary); text-transform: uppercase;">${t('jobs.location', { th: 'สถานที่', en: 'Location' })}</div>
                <div style="font-size: 0.88rem; font-weight: 600; color: var(--text-primary); margin-top: 2px;">${jobLocation}</div>
              </div>
              <div>
                <div style="font-size: 0.72rem; color: var(--text-tertiary); text-transform: uppercase;">${t('jobs.deadline', { th: 'ปิดรับสมัคร', en: 'Deadline' })}</div>
                <div style="font-size: 0.88rem; font-weight: 600; color: var(--text-primary); margin-top: 2px;">${formatDate(job.deadline)}</div>
              </div>
            </div>
          </div>

          <!-- HR Stats Section (HR Only) -->
          ${isHR ? `
            <div class="card" style="background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 18px; padding: 18px; margin-bottom: 18px;">
              <div style="font-weight: 700; font-size: 0.95rem; color: var(--text-primary); margin-bottom: 14px; display: flex; align-items: center; justify-content: space-between;">
                <span><i class="fa-solid fa-chart-simple" style="color: var(--primary); margin-right: 6px;"></i>${isEn ? 'Applicant Pipeline for This Job' : 'สถิติผู้สมัครสำหรับตำแหน่งนี้'}</span>
                <span style="font-size: 0.8rem; color: var(--text-tertiary);">${totalCandidates} ${isEn ? 'Total' : 'คน'}</span>
              </div>

              <!-- 4-Stat Mini Bar -->
              <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; text-align: center; margin-bottom: 16px;">
                <div style="background: var(--bg-tertiary); border-radius: 10px; padding: 10px 4px;">
                  <div style="font-size: 1.25rem; font-weight: 700; color: #2563EB;">${totalCandidates}</div>
                  <div style="font-size: 0.7rem; color: var(--text-secondary); margin-top: 2px;">${isEn ? 'Total' : 'ทั้งหมด'}</div>
                </div>
                <div style="background: var(--bg-tertiary); border-radius: 10px; padding: 10px 4px;">
                  <div style="font-size: 1.25rem; font-weight: 700; color: #F59E0B;">${screenedCandidates}</div>
                  <div style="font-size: 0.7rem; color: var(--text-secondary); margin-top: 2px;">${isEn ? 'Screening' : 'คัดกรอง'}</div>
                </div>
                <div style="background: var(--bg-tertiary); border-radius: 10px; padding: 10px 4px;">
                  <div style="font-size: 1.25rem; font-weight: 700; color: #8B5CF6;">${interviewedCandidates}</div>
                  <div style="font-size: 0.7rem; color: var(--text-secondary); margin-top: 2px;">${isEn ? 'Interview' : 'สัมภาษณ์'}</div>
                </div>
                <div style="background: var(--bg-tertiary); border-radius: 10px; padding: 10px 4px;">
                  <div style="font-size: 1.25rem; font-weight: 700; color: #10B981;">${hiredCandidates}</div>
                  <div style="font-size: 0.7rem; color: var(--text-secondary); margin-top: 2px;">${isEn ? 'Hired' : 'รับแล้ว'}</div>
                </div>
              </div>

              <!-- Applicant Preview List -->
              <div style="font-size: 0.85rem; font-weight: 600; color: var(--text-secondary); margin-bottom: 10px;">
                ${isEn ? 'Recent Applicants Preview' : 'รายชื่อผู้สมัครล่าสุด'}
              </div>

              ${previewCandidates.length > 0 ? `
                <div style="display: flex; flex-direction: column; gap: 8px;">
                  ${previewCandidates.map(c => {
                    const cUser = window.Data && window.Data.getUser ? window.Data.getUser(c.userId) : null;
                    const cName = cUser ? (isEn ? (cUser.nameEn || cUser.name) : (cUser.name || cUser.nameEn)) : 'Candidate';
                    const cAvatar = cUser ? (cUser.avatar || '👤') : '👤';

                    return `
                      <div class="candidate-item-preview" data-id="${c.id}" style="display: flex; align-items: center; justify-content: space-between; background: var(--bg-tertiary); border-radius: 10px; padding: 8px 12px; cursor: pointer;">
                        <div style="display: flex; align-items: center; gap: 10px;">
                          <span style="font-size: 1.3rem;">${cAvatar}</span>
                          <div>
                            <div style="font-size: 0.85rem; font-weight: 600; color: var(--text-primary);">${cName}</div>
                            <div style="font-size: 0.72rem; color: var(--text-tertiary);">${formatDate(c.appliedAt)}</div>
                          </div>
                        </div>
                        <div style="display: flex; align-items: center; gap: 8px;">
                          <span class="badge" style="font-size: 0.72rem; padding: 2px 8px; border-radius: 12px; background: rgba(37, 99, 235, 0.1); color: var(--primary); font-weight: 600;">
                            ${c.status}
                          </span>
                          <i class="fa-solid fa-chevron-right" style="font-size: 0.7rem; color: var(--text-tertiary);"></i>
                        </div>
                      </div>
                    `;
                  }).join('')}
                </div>
              ` : `
                <div style="text-align: center; padding: 14px 0; color: var(--text-tertiary); font-size: 0.8rem;">
                  ${isEn ? 'No candidates have applied yet' : 'ยังไม่มีผู้สมัครในตำแหน่งนี้'}
                </div>
              `}
            </div>
          ` : ''}

          <!-- Job Description -->
          <div class="card" style="background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 18px; padding: 18px; margin-bottom: 18px;">
            <div style="font-weight: 700; font-size: 0.95rem; color: var(--text-primary); margin-bottom: 10px;">
              <i class="fa-solid fa-align-left" style="color: var(--primary); margin-right: 6px;"></i>${t('jobs.description', { th: 'รายละเอียดงาน', en: 'Job Description' })}
            </div>
            <div style="font-size: 0.88rem; color: var(--text-secondary); line-height: 1.6; white-space: pre-line;">
              ${jobDesc || (isEn ? 'No description provided.' : 'ไม่มีรายละเอียดระบุ')}
            </div>
          </div>

          <!-- Requirements -->
          <div class="card" style="background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 18px; padding: 18px; margin-bottom: 18px;">
            <div style="font-weight: 700; font-size: 0.95rem; color: var(--text-primary); margin-bottom: 12px;">
              <i class="fa-solid fa-list-check" style="color: var(--primary); margin-right: 6px;"></i>${t('jobs.requirements', { th: 'คุณสมบัติผู้สมัคร', en: 'Requirements' })}
            </div>
            ${requirements.length > 0 ? `
              <ul style="margin: 0; padding-left: 20px; display: flex; flex-direction: column; gap: 8px;">
                ${requirements.map(req => `
                  <li style="font-size: 0.88rem; color: var(--text-secondary); line-height: 1.4;">
                    ${req}
                  </li>
                `).join('')}
              </ul>
            ` : `
              <div style="font-size: 0.85rem; color: var(--text-tertiary);">${isEn ? 'No specific requirements listed' : 'ไม่ได้ระบุคุณสมบัติเฉพาะ'}</div>
            `}
          </div>

          <!-- Benefits -->
          <div class="card" style="background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 18px; padding: 18px; margin-bottom: 18px;">
            <div style="font-weight: 700; font-size: 0.95rem; color: var(--text-primary); margin-bottom: 12px;">
              <i class="fa-solid fa-gift" style="color: var(--primary); margin-right: 6px;"></i>${t('jobs.benefits', { th: 'สวัสดิการ', en: 'Benefits' })}
            </div>
            ${benefits.length > 0 ? `
              <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                ${benefits.map(b => `
                  <span style="font-size: 0.8rem; font-weight: 500; color: #10B981; background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.2); padding: 5px 12px; border-radius: 20px; display: flex; align-items: center; gap: 6px;">
                    <i class="fa-solid fa-circle-check" style="font-size: 0.75rem;"></i>${b}
                  </span>
                `).join('')}
              </div>
            ` : `
              <div style="font-size: 0.85rem; color: var(--text-tertiary);">${isEn ? 'Standard company benefits' : 'สวัสดิการตามมาตรฐานบริษัท'}</div>
            `}
          </div>

          <!-- Bottom Action Bar -->
          <div class="job-view-footer" style="position: fixed; bottom: 0; left: 0; right: 0; max-width: 480px; margin: 0 auto; background: var(--bg-secondary); border-top: 1px solid var(--border); padding: 12px 18px; display: flex; gap: 10px; z-index: 98; box-shadow: 0 -4px 12px var(--shadow);">
            ${isHR ? `
              <button id="btn-toggle-status" data-id="${job.id}" data-current="${job.status}" style="flex: 1; background: ${job.status === 'open' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)'}; color: ${job.status === 'open' ? '#EF4444' : '#10B981'}; border: 1px solid ${job.status === 'open' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.3)'}; border-radius: 12px; padding: 12px; font-size: 0.88rem; font-weight: 600; cursor: pointer;">
                ${job.status === 'open' ? (isEn ? 'Close Job' : 'ปิดรับสมัคร') : (isEn ? 'Reopen Job' : 'เปิดรับสมัคร')}
              </button>
              <button id="btn-edit-job-footer" data-id="${job.id}" style="flex: 2; background: var(--primary); color: #fff; border: none; border-radius: 12px; padding: 12px; font-size: 0.88rem; font-weight: 600; cursor: pointer;">
                <i class="fa-solid fa-pen-to-square" style="margin-right: 6px;"></i>${t('jobs.edit', { th: 'แก้ไขประกาศ', en: 'Edit Job' })}
              </button>
            ` : (
              myCandidateRecord ? `
                <div style="width: 100%; text-align: center; background: rgba(16, 185, 129, 0.12); color: #10B981; border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 12px; padding: 14px; font-size: 0.9rem; font-weight: 600;">
                  <i class="fa-solid fa-circle-check" style="margin-right: 6px;"></i>${isEn ? 'You already applied for this job' : 'คุณได้สมัครตำแหน่งนี้แล้ว'} (${formatDate(myCandidateRecord.appliedAt)})
                </div>
              ` : `
                <button id="btn-apply-job-main" data-id="${job.id}" style="width: 100%; background: var(--primary); color: #fff; border: none; border-radius: 12px; padding: 14px; font-size: 1rem; font-weight: 700; cursor: pointer; box-shadow: 0 4px 14px rgba(37, 99, 235, 0.35);">
                  <i class="fa-solid fa-paper-plane" style="margin-right: 8px;"></i>${isEn ? 'Apply for this Job' : 'สมัครตำแหน่งนี้'}
                </button>
              `
            )}
          </div>
        </div>
      `;
    },

    /**
     * Render Edit Job Form (#jobs/edit/:id) - HR Only
     */
    renderEdit: function (id) {
      const isEn = window.App && typeof window.App.getLang === 'function' && window.App.getLang() === 'en';
      const job = window.Data && typeof window.Data.getJob === 'function' ? window.Data.getJob(id) : null;
      if (!job) {
        return `<div style="text-align: center; padding: 40px;">${isEn ? 'Job not found' : 'ไม่พบข้อมูลงาน'}</div>`;
      }

      state.formRequirements = Array.isArray(job.requirements) ? [...job.requirements] : [];
      state.formRequirementsEn = Array.isArray(job.requirementsEn) ? [...job.requirementsEn] : [];

      const currentBenefits = Array.isArray(job.benefits) ? job.benefits : [];

      return `
        <div class="jobs-form-page" style="padding-bottom: 90px;">
          <!-- Top Header with Back button -->
          <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 20px;">
            <button id="btn-edit-back" data-id="${job.id}" style="background: var(--bg-secondary); border: 1px solid var(--border); width: 38px; height: 38px; border-radius: 10px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: var(--text-primary);">
              <i class="fa-solid fa-arrow-left"></i>
            </button>
            <div>
              <h2 style="margin: 0; font-size: 1.25rem; font-weight: 700; color: var(--text-primary);">
                ${t('jobs.edit', { th: 'แก้ไขประกาศรับสมัครงาน', en: 'Edit Job Posting' })}
              </h2>
              <div style="font-size: 0.8rem; color: var(--text-tertiary);">
                ID: ${job.id}
              </div>
            </div>
          </div>

          <!-- Job Edit Form -->
          <form id="job-edit-form" data-id="${job.id}" style="display: flex; flex-direction: column; gap: 18px;">
            <!-- Titles (Thai & English) -->
            <div class="card" style="background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 16px; padding: 18px;">
              <div style="font-weight: 700; font-size: 0.95rem; color: var(--text-primary); margin-bottom: 14px;">
                <i class="fa-solid fa-heading" style="color: var(--primary); margin-right: 6px;"></i>${isEn ? 'Job Title' : 'ชื่อตำแหน่งงาน'} *
              </div>
              <div style="display: flex; flex-direction: column; gap: 12px;">
                <div>
                  <label style="display: block; font-size: 0.8rem; font-weight: 600; color: var(--text-secondary); margin-bottom: 6px;">
                    ${isEn ? 'Job Title (Thai)' : 'ชื่อตำแหน่งงาน (ภาษาไทย)'} *
                  </label>
                  <input type="text" id="job-title-th" required value="${job.title || ''}" style="width: 100%; box-sizing: border-box; background: var(--bg-tertiary); border: 1px solid var(--border); border-radius: 10px; padding: 10px 14px; font-size: 0.9rem; color: var(--text-primary); outline: none;" />
                </div>
                <div>
                  <label style="display: block; font-size: 0.8rem; font-weight: 600; color: var(--text-secondary); margin-bottom: 6px;">
                    ${isEn ? 'Job Title (English)' : 'ชื่อตำแหน่งงาน (ภาษาอังกฤษ)'}
                  </label>
                  <input type="text" id="job-title-en" value="${job.titleEn || ''}" style="width: 100%; box-sizing: border-box; background: var(--bg-tertiary); border: 1px solid var(--border); border-radius: 10px; padding: 10px 14px; font-size: 0.9rem; color: var(--text-primary); outline: none;" />
                </div>
              </div>
            </div>

            <!-- Department, Level, Employment Type -->
            <div class="card" style="background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 16px; padding: 18px;">
              <div style="font-weight: 700; font-size: 0.95rem; color: var(--text-primary); margin-bottom: 14px;">
                <i class="fa-solid fa-sitemap" style="color: var(--primary); margin-right: 6px;"></i>${isEn ? 'Category & Classification' : 'หมวดหมู่และระดับตำแหน่ง'}
              </div>
              <div style="display: flex; flex-direction: column; gap: 14px;">
                <!-- Department Dropdown -->
                <div>
                  <label style="display: block; font-size: 0.8rem; font-weight: 600; color: var(--text-secondary); margin-bottom: 6px;">
                    ${t('jobs.department', { th: 'แผนก / ฝ่าย', en: 'Department' })} *
                  </label>
                  <select id="job-dept" required style="width: 100%; box-sizing: border-box; background: var(--bg-tertiary); border: 1px solid var(--border); border-radius: 10px; padding: 10px 14px; font-size: 0.9rem; color: var(--text-primary); outline: none;">
                    <option value="IT" ${job.department === 'เทคโนโลยีสารสนเทศ' || job.department === 'IT' ? 'selected' : ''}>IT / เทคโนโลยีสารสนเทศ</option>
                    <option value="HR" ${job.department === 'ฝ่ายทรัพยากรบุคคล' || job.department === 'HR' ? 'selected' : ''}>HR / ฝ่ายทรัพยากรบุคคล</option>
                    <option value="Marketing" ${job.department === 'ฝ่ายการตลาด' || job.department === 'Marketing' ? 'selected' : ''}>Marketing / ฝ่ายการตลาด</option>
                    <option value="Finance" ${job.department === 'ฝ่ายการเงินและบัญชี' || job.department === 'Finance' ? 'selected' : ''}>Finance / ฝ่ายการเงินและบัญชี</option>
                    <option value="Sales" ${job.department === 'ฝ่ายขาย' || job.department === 'Sales' ? 'selected' : ''}>Sales / ฝ่ายขาย</option>
                    <option value="Operations" ${job.department === 'ฝ่ายปฏิบัติการ' || job.department === 'Operations' ? 'selected' : ''}>Operations / ฝ่ายปฏิบัติการ</option>
                  </select>
                </div>

                <!-- Level Dropdown -->
                <div>
                  <label style="display: block; font-size: 0.8rem; font-weight: 600; color: var(--text-secondary); margin-bottom: 6px;">
                    ${t('jobs.level', { th: 'ระดับตำแหน่ง', en: 'Experience Level' })}
                  </label>
                  <select id="job-level" style="width: 100%; box-sizing: border-box; background: var(--bg-tertiary); border: 1px solid var(--border); border-radius: 10px; padding: 10px 14px; font-size: 0.9rem; color: var(--text-primary); outline: none;">
                    <option value="junior" ${job.level === 'junior' ? 'selected' : ''}>Junior (ระดับเริ่มต้น)</option>
                    <option value="mid" ${job.level === 'mid' ? 'selected' : ''}>Mid (ระดับกลาง)</option>
                    <option value="senior" ${job.level === 'senior' ? 'selected' : ''}>Senior (ระดับอาวุโส)</option>
                    <option value="lead" ${job.level === 'lead' ? 'selected' : ''}>Lead (หัวหน้าทีม)</option>
                    <option value="manager" ${job.level === 'manager' ? 'selected' : ''}>Manager (ผู้จัดการ)</option>
                  </select>
                </div>

                <!-- Employment Type (Pill Radios) -->
                <div>
                  <label style="display: block; font-size: 0.8rem; font-weight: 600; color: var(--text-secondary); margin-bottom: 8px;">
                    ${t('jobs.type', { th: 'ประเภทการจ้างงาน', en: 'Employment Type' })}
                  </label>
                  <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px;">
                    <label style="display: flex; align-items: center; gap: 8px; background: var(--bg-tertiary); border: 1px solid var(--border); border-radius: 10px; padding: 8px 12px; cursor: pointer; font-size: 0.85rem; color: var(--text-primary);">
                      <input type="radio" name="job-emp-type" value="fulltime" ${job.employmentType === 'fulltime' ? 'checked' : ''} />
                      <span>${isEn ? 'Full-time' : 'งานประจำ'}</span>
                    </label>
                    <label style="display: flex; align-items: center; gap: 8px; background: var(--bg-tertiary); border: 1px solid var(--border); border-radius: 10px; padding: 8px 12px; cursor: pointer; font-size: 0.85rem; color: var(--text-primary);">
                      <input type="radio" name="job-emp-type" value="parttime" ${job.employmentType === 'parttime' ? 'checked' : ''} />
                      <span>${isEn ? 'Part-time' : 'พาร์ทไทม์'}</span>
                    </label>
                    <label style="display: flex; align-items: center; gap: 8px; background: var(--bg-tertiary); border: 1px solid var(--border); border-radius: 10px; padding: 8px 12px; cursor: pointer; font-size: 0.85rem; color: var(--text-primary);">
                      <input type="radio" name="job-emp-type" value="contract" ${job.employmentType === 'contract' ? 'checked' : ''} />
                      <span>${isEn ? 'Contract' : 'สัญญาจ้าง'}</span>
                    </label>
                    <label style="display: flex; align-items: center; gap: 8px; background: var(--bg-tertiary); border: 1px solid var(--border); border-radius: 10px; padding: 8px 12px; cursor: pointer; font-size: 0.85rem; color: var(--text-primary);">
                      <input type="radio" name="job-emp-type" value="internship" ${job.employmentType === 'internship' ? 'checked' : ''} />
                      <span>${isEn ? 'Internship' : 'ฝึกงาน'}</span>
                    </label>
                  </div>
                </div>

                <!-- Vacancies -->
                <div>
                  <label style="display: block; font-size: 0.8rem; font-weight: 600; color: var(--text-secondary); margin-bottom: 6px;">
                    ${t('jobs.vacancies', { th: 'จำนวนที่เปิดรับ (อัตรา)', en: 'Vacancies' })}
                  </label>
                  <input type="number" id="job-vacancies" min="1" value="${job.vacancies || 1}" style="width: 100%; box-sizing: border-box; background: var(--bg-tertiary); border: 1px solid var(--border); border-radius: 10px; padding: 10px 14px; font-size: 0.9rem; color: var(--text-primary); outline: none;" />
                </div>
              </div>
            </div>

            <!-- Work Mode, Salary, Location & Deadline -->
            <div class="card" style="background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 16px; padding: 18px;">
              <div style="font-weight: 700; font-size: 0.95rem; color: var(--text-primary); margin-bottom: 14px;">
                <i class="fa-solid fa-location-crosshairs" style="color: var(--primary); margin-right: 6px;"></i>${isEn ? 'Work Mode, Compensation & Dates' : 'รูปแบบงาน เงินเดือน และกำหนดเวลา'}
              </div>
              <div style="display: flex; flex-direction: column; gap: 14px;">
                <!-- Work Mode -->
                <div>
                  <label style="display: block; font-size: 0.8rem; font-weight: 600; color: var(--text-secondary); margin-bottom: 8px;">
                    ${t('jobs.workMode', { th: 'รูปแบบการทำงาน', en: 'Work Mode' })}
                  </label>
                  <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px;">
                    <label style="display: flex; flex-direction: column; align-items: center; gap: 4px; background: var(--bg-tertiary); border: 1px solid var(--border); border-radius: 10px; padding: 10px 6px; cursor: pointer; font-size: 0.78rem; color: var(--text-primary); text-align: center;">
                      <input type="radio" name="job-work-mode" value="onsite" ${job.workMode === 'onsite' ? 'checked' : ''} />
                      <span>${isEn ? 'On-site' : 'สำนักงาน'}</span>
                    </label>
                    <label style="display: flex; flex-direction: column; align-items: center; gap: 4px; background: var(--bg-tertiary); border: 1px solid var(--border); border-radius: 10px; padding: 10px 6px; cursor: pointer; font-size: 0.78rem; color: var(--text-primary); text-align: center;">
                      <input type="radio" name="job-work-mode" value="hybrid" ${job.workMode === 'hybrid' ? 'checked' : ''} />
                      <span>${isEn ? 'Hybrid' : 'ไฮบริด'}</span>
                    </label>
                    <label style="display: flex; flex-direction: column; align-items: center; gap: 4px; background: var(--bg-tertiary); border: 1px solid var(--border); border-radius: 10px; padding: 10px 6px; cursor: pointer; font-size: 0.78rem; color: var(--text-primary); text-align: center;">
                      <input type="radio" name="job-work-mode" value="remote" ${job.workMode === 'remote' ? 'checked' : ''} />
                      <span>${isEn ? 'Remote' : 'จากที่บ้าน'}</span>
                    </label>
                  </div>
                </div>

                <!-- Salary Range -->
                <div>
                  <label style="display: block; font-size: 0.8rem; font-weight: 600; color: var(--text-secondary); margin-bottom: 6px;">
                    ${t('jobs.salary', { th: 'อัตราเงินเดือน (บาท)', en: 'Salary Range (THB)' })}
                  </label>
                  <div style="display: flex; align-items: center; gap: 10px;">
                    <input type="number" id="job-salary-min" value="${job.salaryMin || ''}" placeholder="ต่ำสุด เช่น 40000" style="flex: 1; box-sizing: border-box; background: var(--bg-tertiary); border: 1px solid var(--border); border-radius: 10px; padding: 10px 12px; font-size: 0.9rem; color: var(--text-primary); outline: none;" />
                    <span style="color: var(--text-tertiary);">-</span>
                    <input type="number" id="job-salary-max" value="${job.salaryMax || ''}" placeholder="สูงสุด เช่น 70000" style="flex: 1; box-sizing: border-box; background: var(--bg-tertiary); border: 1px solid var(--border); border-radius: 10px; padding: 10px 12px; font-size: 0.9rem; color: var(--text-primary); outline: none;" />
                  </div>
                </div>

                <!-- Location -->
                <div>
                  <label style="display: block; font-size: 0.8rem; font-weight: 600; color: var(--text-secondary); margin-bottom: 6px;">
                    ${t('jobs.location', { th: 'สถานที่ปฏิบัติงาน', en: 'Location' })}
                  </label>
                  <input type="text" id="job-location" value="${job.location || 'กรุงเทพมหานคร'}" style="width: 100%; box-sizing: border-box; background: var(--bg-tertiary); border: 1px solid var(--border); border-radius: 10px; padding: 10px 14px; font-size: 0.9rem; color: var(--text-primary); outline: none;" />
                </div>

                <!-- Deadline -->
                <div>
                  <label style="display: block; font-size: 0.8rem; font-weight: 600; color: var(--text-secondary); margin-bottom: 6px;">
                    ${t('jobs.deadline', { th: 'วันปิดรับสมัคร', en: 'Application Deadline' })}
                  </label>
                  <input type="date" id="job-deadline" value="${job.deadline ? job.deadline.split('T')[0] : ''}" style="width: 100%; box-sizing: border-box; background: var(--bg-tertiary); border: 1px solid var(--border); border-radius: 10px; padding: 10px 14px; font-size: 0.9rem; color: var(--text-primary); outline: none;" />
                </div>
              </div>
            </div>

            <!-- Description -->
            <div class="card" style="background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 16px; padding: 18px;">
              <div style="font-weight: 700; font-size: 0.95rem; color: var(--text-primary); margin-bottom: 14px;">
                <i class="fa-solid fa-align-left" style="color: var(--primary); margin-right: 6px;"></i>${t('jobs.description', { th: 'รายละเอียดและหน้าที่รับผิดชอบ', en: 'Job Description' })}
              </div>
              <textarea id="job-desc" rows="5" style="width: 100%; box-sizing: border-box; background: var(--bg-tertiary); border: 1px solid var(--border); border-radius: 10px; padding: 12px; font-size: 0.88rem; color: var(--text-primary); outline: none; resize: vertical;">${job.description || ''}</textarea>
            </div>

            <!-- Requirements (Interactive Tags Input) -->
            <div class="card" style="background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 16px; padding: 18px;">
              <div style="font-weight: 700; font-size: 0.95rem; color: var(--text-primary); margin-bottom: 6px;">
                <i class="fa-solid fa-list-check" style="color: var(--primary); margin-right: 6px;"></i>${t('jobs.requirements', { th: 'คุณสมบัติที่ต้องการ', en: 'Requirements' })}
              </div>

              <!-- Tag Input Box -->
              <div style="display: flex; gap: 8px; margin-bottom: 12px;">
                <input type="text" id="tag-input-req" placeholder="${isEn ? 'Add requirement tag' : 'เพิ่มคุณสมบัติ'}" style="flex: 1; box-sizing: border-box; background: var(--bg-tertiary); border: 1px solid var(--border); border-radius: 10px; padding: 10px 12px; font-size: 0.88rem; color: var(--text-primary); outline: none;" />
                <button type="button" id="btn-add-tag-req" style="background: var(--primary); color: #fff; border: none; border-radius: 10px; padding: 0 16px; font-size: 0.85rem; font-weight: 600; cursor: pointer;">
                  <i class="fa-solid fa-plus"></i>
                </button>
              </div>

              <!-- Tags Container -->
              <div id="tags-container-req" style="display: flex; flex-wrap: wrap; gap: 8px; min-height: 36px; padding: 8px; background: var(--bg-tertiary); border-radius: 10px; border: 1px dashed var(--border);">
                <!-- Dynamic Tags populated via JS -->
              </div>
            </div>

            <!-- Benefits (Checkboxes) -->
            <div class="card" style="background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 16px; padding: 18px;">
              <div style="font-weight: 700; font-size: 0.95rem; color: var(--text-primary); margin-bottom: 12px;">
                <i class="fa-solid fa-gift" style="color: var(--primary); margin-right: 6px;"></i>${t('jobs.benefits', { th: 'สวัสดิการและสิทธิประโยชน์', en: 'Benefits' })}
              </div>
              <div style="display: flex; flex-direction: column; gap: 10px;">
                ${PRESET_BENEFITS.map(b => {
                  const isChecked = currentBenefits.includes(b.th) || currentBenefits.includes(b.en);
                  return `
                    <label style="display: flex; align-items: center; gap: 10px; background: var(--bg-tertiary); border-radius: 10px; padding: 10px 12px; cursor: pointer; font-size: 0.85rem; color: var(--text-primary);">
                      <input type="checkbox" name="job-benefit" value="${b.th}" data-en="${b.en}" ${isChecked ? 'checked' : ''} style="width: 16px; height: 16px; accent-color: var(--primary);" />
                      <i class="fa-solid ${b.icon}" style="color: var(--primary); width: 18px;"></i>
                      <span>${isEn ? b.en : b.th}</span>
                    </label>
                  `;
                }).join('')}
              </div>
            </div>

            <!-- Status Toggle: Open / Draft / Closed -->
            <div class="card" style="background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 16px; padding: 18px;">
              <div style="font-weight: 700; font-size: 0.95rem; color: var(--text-primary); margin-bottom: 12px;">
                <i class="fa-solid fa-toggle-on" style="color: var(--primary); margin-right: 6px;"></i>${t('jobs.status', { th: 'สถานะประกาศ', en: 'Publication Status' })}
              </div>
              <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px;">
                <label style="display: flex; align-items: center; justify-content: center; gap: 6px; background: var(--bg-tertiary); border: 1px solid var(--border); border-radius: 10px; padding: 10px 4px; cursor: pointer; font-size: 0.8rem; color: #10B981; font-weight: 600; text-align: center;">
                  <input type="radio" name="job-status" value="open" ${job.status === 'open' ? 'checked' : ''} />
                  <span>${t('jobs.open', { th: 'เปิดรับ', en: 'Open' })}</span>
                </label>
                <label style="display: flex; align-items: center; justify-content: center; gap: 6px; background: var(--bg-tertiary); border: 1px solid var(--border); border-radius: 10px; padding: 10px 4px; cursor: pointer; font-size: 0.8rem; color: #64748B; font-weight: 600; text-align: center;">
                  <input type="radio" name="job-status" value="draft" ${job.status === 'draft' ? 'checked' : ''} />
                  <span>${t('jobs.draft', { th: 'แบบร่าง', en: 'Draft' })}</span>
                </label>
                <label style="display: flex; align-items: center; justify-content: center; gap: 6px; background: var(--bg-tertiary); border: 1px solid var(--border); border-radius: 10px; padding: 10px 4px; cursor: pointer; font-size: 0.8rem; color: #EF4444; font-weight: 600; text-align: center;">
                  <input type="radio" name="job-status" value="closed" ${job.status === 'closed' ? 'checked' : ''} />
                  <span>${t('jobs.closed', { th: 'ปิดรับ', en: 'Closed' })}</span>
                </label>
              </div>
            </div>

            <!-- Bottom Action Buttons -->
            <div style="display: flex; gap: 12px; margin-top: 10px;">
              <button type="button" id="btn-cancel-edit" data-id="${job.id}" style="flex: 1; background: var(--bg-tertiary); border: 1px solid var(--border); border-radius: 12px; padding: 14px; font-size: 0.95rem; font-weight: 600; color: var(--text-secondary); cursor: pointer;">
                ${t('common.cancel', { th: 'ยกเลิก', en: 'Cancel' })}
              </button>
              <button type="submit" id="btn-update-job" style="flex: 2; background: var(--primary); border: none; border-radius: 12px; padding: 14px; font-size: 0.95rem; font-weight: 600; color: #fff; cursor: pointer; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);">
                <i class="fa-solid fa-check" style="margin-right: 6px;"></i>${t('common.save', { th: 'บันทึกการแก้ไข', en: 'Save Changes' })}
              </button>
            </div>
          </form>
        </div>
      `;
    },

    /**
     * DOM listeners after rendering list view (#jobs)
     */
    afterRender: function () {
      const isEn = window.App && window.App.getLang() === 'en';

      // 1. Search input
      const searchInput = document.getElementById('job-search-input');
      if (searchInput) {
        searchInput.addEventListener('input', function (e) {
          state.searchQuery = e.target.value;
          window.JobsModule.refreshList();
        });
      }

      // Clear search button
      const clearBtn = document.getElementById('btn-clear-search');
      if (clearBtn) {
        clearBtn.addEventListener('click', function () {
          state.searchQuery = '';
          window.JobsModule.refreshList();
        });
      }

      // 2. Filter chips
      document.querySelectorAll('.filter-chip').forEach(btn => {
        btn.addEventListener('click', function () {
          state.selectedFilter = this.getAttribute('data-filter') || 'all';
          window.JobsModule.refreshList();
        });
      });

      // 3. Card click -> View Job
      document.querySelectorAll('.job-card').forEach(card => {
        card.addEventListener('click', function (e) {
          // If clicked on an apply button inside card, don't trigger card navigation
          if (e.target.closest('.btn-apply-card')) return;
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

      // 4. Apply button inside card
      document.querySelectorAll('.btn-apply-card').forEach(btn => {
        btn.addEventListener('click', function (e) {
          e.stopPropagation();
          const jobId = this.getAttribute('data-id');
          window.JobsModule.handleApply(jobId);
        });
      });

      // 5. Create Job FAB & Top button
      const fabBtn = document.getElementById('jobs-page-fab');
      if (fabBtn) {
        fabBtn.addEventListener('click', function () {
          if (window.App && typeof window.App.navigate === 'function') {
            window.App.navigate('jobs/new');
          } else {
            window.location.hash = '#jobs/new';
          }
        });
      }

      const topCreateBtn = document.getElementById('btn-create-job-top');
      if (topCreateBtn) {
        topCreateBtn.addEventListener('click', function () {
          if (window.App && typeof window.App.navigate === 'function') {
            window.App.navigate('jobs/new');
          } else {
            window.location.hash = '#jobs/new';
          }
        });
      }
    },

    /**
     * Re-render content within the container without full reload
     */
    refreshList: function () {
      const container = document.getElementById('app-content');
      if (container) {
        container.innerHTML = window.JobsModule.render();
        window.JobsModule.afterRender();
      }
    },

    /**
     * DOM listeners after rendering Create Job form (#jobs/new)
     */
    afterRenderCreate: function () {
      const isEn = window.App && window.App.getLang() === 'en';

      // Back & Cancel
      const goBack = () => {
        if (window.App && typeof window.App.navigate === 'function') {
          window.App.navigate('jobs');
        } else {
          window.location.hash = '#jobs';
        }
      };

      const backBtn = document.getElementById('btn-form-back');
      if (backBtn) backBtn.addEventListener('click', goBack);

      const cancelBtn = document.getElementById('btn-cancel-job');
      if (cancelBtn) cancelBtn.addEventListener('click', goBack);

      // Requirement tags setup
      this.initRequirementTags();

      // Form submission
      const form = document.getElementById('job-create-form');
      if (form) {
        form.addEventListener('submit', function (e) {
          e.preventDefault();

          const titleTh = document.getElementById('job-title-th').value.trim();
          const titleEn = document.getElementById('job-title-en').value.trim();
          const deptSelect = document.getElementById('job-dept');
          const selectedDeptOption = deptSelect.options[deptSelect.selectedIndex];
          const deptTh = selectedDeptOption.getAttribute('data-th') || selectedDeptOption.text;
          const deptEn = selectedDeptOption.getAttribute('data-en') || selectedDeptOption.value;

          const level = document.getElementById('job-level').value;
          const empTypeInput = document.querySelector('input[name="job-emp-type"]:checked');
          const empType = empTypeInput ? empTypeInput.value : 'fulltime';
          const vacancies = parseInt(document.getElementById('job-vacancies').value, 10) || 1;

          const workModeInput = document.querySelector('input[name="job-work-mode"]:checked');
          const workMode = workModeInput ? workModeInput.value : 'hybrid';

          const salaryMin = parseInt(document.getElementById('job-salary-min').value, 10) || 0;
          const salaryMax = parseInt(document.getElementById('job-salary-max').value, 10) || 0;

          const location = document.getElementById('job-location').value.trim() || 'กรุงเทพมหานคร';
          const deadline = document.getElementById('job-deadline').value || '';
          const desc = document.getElementById('job-desc').value.trim();

          const statusInput = document.querySelector('input[name="job-status"]:checked');
          const status = statusInput ? statusInput.value : 'open';

          // Collect benefits
          const selectedBenefits = [];
          const selectedBenefitsEn = [];
          document.querySelectorAll('input[name="job-benefit"]:checked').forEach(cb => {
            selectedBenefits.push(cb.value);
            const enText = cb.getAttribute('data-en');
            if (enText) selectedBenefitsEn.push(enText);
          });

          // Validation
          if (!titleTh) {
            if (window.App && window.App.showToast) {
              window.App.showToast(isEn ? 'Job title is required.' : 'กรุณาระบุชื่อตำแหน่งงาน', 'error');
            }
            return;
          }

          const user = (window.App && typeof window.App.getCurrentUser === 'function') ? window.App.getCurrentUser() : null;
          const newId = (window.App && typeof window.App.generateId === 'function') ? window.App.generateId() : ('j_' + Date.now());

          const newJob = {
            id: newId,
            title: titleTh,
            titleEn: titleEn || titleTh,
            department: deptTh,
            departmentEn: deptEn,
            level: level,
            employmentType: empType,
            vacancies: vacancies,
            salaryMin: salaryMin,
            salaryMax: salaryMax,
            location: location,
            locationEn: location,
            workMode: workMode,
            description: desc,
            descriptionEn: desc,
            requirements: state.formRequirements.length > 0 ? state.formRequirements : ['ตรงตามที่ระบุในประกาศ'],
            requirementsEn: state.formRequirements.length > 0 ? state.formRequirements : ['As specified in posting'],
            benefits: selectedBenefits,
            benefitsEn: selectedBenefitsEn,
            deadline: deadline || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            status: status,
            createdAt: new Date().toISOString(),
            createdBy: user ? user.id : 'u1'
          };

          if (window.Data && typeof window.Data.saveJob === 'function') {
            window.Data.saveJob(newJob);
          }

          if (window.App && window.App.showToast) {
            window.App.showToast(isEn ? 'Job posting created successfully!' : 'สร้างประกาศรับสมัครงานเรียบร้อยแล้ว!', 'success');
          }

          goBack();
        });
      }
    },

    /**
     * DOM listeners after rendering View Job Details (#jobs/view/:id)
     */
    afterRenderView: function (id) {
      const isEn = window.App && window.App.getLang === 'en';

      // Back button
      const backBtn = document.getElementById('btn-view-back');
      if (backBtn) {
        backBtn.addEventListener('click', function () {
          if (window.App && typeof window.App.navigate === 'function') {
            window.App.navigate('jobs');
          } else {
            window.location.hash = '#jobs';
          }
        });
      }

      // Edit button (Header and Footer)
      const editHandler = function () {
        const jobId = this.getAttribute('data-id') || id;
        if (window.App && typeof window.App.navigate === 'function') {
          window.App.navigate('jobs/edit', { id: jobId });
        } else {
          window.location.hash = '#jobs/edit/' + jobId;
        }
      };

      const editBtn = document.getElementById('btn-edit-job');
      if (editBtn) editBtn.addEventListener('click', editHandler);

      const editFooterBtn = document.getElementById('btn-edit-job-footer');
      if (editFooterBtn) editFooterBtn.addEventListener('click', editHandler);

      // Duplicate button
      const dupBtn = document.getElementById('btn-duplicate-job');
      if (dupBtn) {
        dupBtn.addEventListener('click', function () {
          const jobId = this.getAttribute('data-id') || id;
          const orig = window.Data && window.Data.getJob ? window.Data.getJob(jobId) : null;
          if (orig) {
            const copy = JSON.parse(JSON.stringify(orig));
            copy.id = (window.App && typeof window.App.generateId === 'function') ? window.App.generateId() : ('j_' + Date.now());
            copy.title = copy.title + ' (คัดลอก)';
            copy.titleEn = (copy.titleEn || copy.title) + ' (Copy)';
            copy.status = 'draft';
            copy.createdAt = new Date().toISOString();

            if (window.Data && typeof window.Data.saveJob === 'function') {
              window.Data.saveJob(copy);
            }

            if (window.App && window.App.showToast) {
              window.App.showToast(isEn ? 'Job duplicated as Draft.' : 'คัดลอกประกาศงานเป็นแบบร่างแล้ว', 'success');
            }

            if (window.App && typeof window.App.navigate === 'function') {
              window.App.navigate('jobs/view', { id: copy.id });
            } else {
              window.location.hash = '#jobs/view/' + copy.id;
            }
          }
        });
      }

      // Delete button
      const delBtn = document.getElementById('btn-delete-job');
      if (delBtn) {
        delBtn.addEventListener('click', function () {
          const jobId = this.getAttribute('data-id') || id;
          const confirmed = confirm(isEn ? 'Are you sure you want to delete this job posting?' : 'คุณแน่ใจหรือไม่ว่าต้องการลบประกาศงานนี้?');
          if (confirmed) {
            if (window.Data && typeof window.Data.deleteJob === 'function') {
              window.Data.deleteJob(jobId);
            }
            if (window.App && window.App.showToast) {
              window.App.showToast(isEn ? 'Job posting deleted.' : 'ลบประกาศงานเรียบร้อยแล้ว', 'info');
            }
            if (window.App && typeof window.App.navigate === 'function') {
              window.App.navigate('jobs');
            } else {
              window.location.hash = '#jobs';
            }
          }
        });
      }

      // Toggle Open/Close status button
      const toggleStatusBtn = document.getElementById('btn-toggle-status');
      if (toggleStatusBtn) {
        toggleStatusBtn.addEventListener('click', function () {
          const jobId = this.getAttribute('data-id') || id;
          const currentStatus = this.getAttribute('data-current');
          const newStatus = currentStatus === 'open' ? 'closed' : 'open';

          const job = window.Data && window.Data.getJob ? window.Data.getJob(jobId) : null;
          if (job) {
            job.status = newStatus;
            if (window.Data && typeof window.Data.saveJob === 'function') {
              window.Data.saveJob(job);
            }
            if (window.App && window.App.showToast) {
              const msg = newStatus === 'open'
                ? (isEn ? 'Job reopened.' : 'เปิดรับสมัครอีกครั้งแล้ว')
                : (isEn ? 'Job closed.' : 'ปิดรับสมัครงานแล้ว');
              window.App.showToast(msg, 'success');
            }
            // Re-render view
            const container = document.getElementById('app-content');
            if (container) {
              container.innerHTML = window.JobsModule.renderView(jobId);
              window.JobsModule.afterRenderView(jobId);
            }
          }
        });
      }

      // Candidate preview item click
      document.querySelectorAll('.candidate-item-preview').forEach(item => {
        item.addEventListener('click', function () {
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

      // Applicant Apply button
      const applyMainBtn = document.getElementById('btn-apply-job-main');
      if (applyMainBtn) {
        applyMainBtn.addEventListener('click', function () {
          const jobId = this.getAttribute('data-id') || id;
          window.JobsModule.handleApply(jobId, function () {
            // Re-render view to reflect applied state
            const container = document.getElementById('app-content');
            if (container) {
              container.innerHTML = window.JobsModule.renderView(jobId);
              window.JobsModule.afterRenderView(jobId);
            }
          });
        });
      }
    },

    /**
     * DOM listeners after rendering Edit Job form (#jobs/edit/:id)
     */
    afterRenderEdit: function (id) {
      const isEn = window.App && window.App.getLang === 'en';

      const goBack = () => {
        if (window.App && typeof window.App.navigate === 'function') {
          window.App.navigate('jobs/view', { id: id });
        } else {
          window.location.hash = '#jobs/view/' + id;
        }
      };

      const backBtn = document.getElementById('btn-edit-back');
      if (backBtn) backBtn.addEventListener('click', goBack);

      const cancelBtn = document.getElementById('btn-cancel-edit');
      if (cancelBtn) cancelBtn.addEventListener('click', goBack);

      // Initialize requirement tags
      this.initRequirementTags();

      // Form submission
      const form = document.getElementById('job-edit-form');
      if (form) {
        form.addEventListener('submit', function (e) {
          e.preventDefault();

          const jobId = this.getAttribute('data-id') || id;
          const orig = window.Data && window.Data.getJob ? window.Data.getJob(jobId) : {};

          const titleTh = document.getElementById('job-title-th').value.trim();
          const titleEn = document.getElementById('job-title-en').value.trim();
          const deptSelect = document.getElementById('job-dept');
          const selectedDeptOption = deptSelect.options[deptSelect.selectedIndex];
          const deptTh = selectedDeptOption.getAttribute('data-th') || selectedDeptOption.text;
          const deptEn = selectedDeptOption.getAttribute('data-en') || selectedDeptOption.value;

          const level = document.getElementById('job-level').value;
          const empTypeInput = document.querySelector('input[name="job-emp-type"]:checked');
          const empType = empTypeInput ? empTypeInput.value : 'fulltime';
          const vacancies = parseInt(document.getElementById('job-vacancies').value, 10) || 1;

          const workModeInput = document.querySelector('input[name="job-work-mode"]:checked');
          const workMode = workModeInput ? workModeInput.value : 'hybrid';

          const salaryMin = parseInt(document.getElementById('job-salary-min').value, 10) || 0;
          const salaryMax = parseInt(document.getElementById('job-salary-max').value, 10) || 0;

          const location = document.getElementById('job-location').value.trim() || 'กรุงเทพมหานคร';
          const deadline = document.getElementById('job-deadline').value || '';
          const desc = document.getElementById('job-desc').value.trim();

          const statusInput = document.querySelector('input[name="job-status"]:checked');
          const status = statusInput ? statusInput.value : 'open';

          // Collect benefits
          const selectedBenefits = [];
          const selectedBenefitsEn = [];
          document.querySelectorAll('input[name="job-benefit"]:checked').forEach(cb => {
            selectedBenefits.push(cb.value);
            const enText = cb.getAttribute('data-en');
            if (enText) selectedBenefitsEn.push(enText);
          });

          const updatedJob = Object.assign({}, orig, {
            id: jobId,
            title: titleTh,
            titleEn: titleEn || titleTh,
            department: deptTh,
            departmentEn: deptEn,
            level: level,
            employmentType: empType,
            vacancies: vacancies,
            salaryMin: salaryMin,
            salaryMax: salaryMax,
            location: location,
            locationEn: location,
            workMode: workMode,
            description: desc,
            descriptionEn: desc,
            requirements: state.formRequirements,
            requirementsEn: state.formRequirements,
            benefits: selectedBenefits,
            benefitsEn: selectedBenefitsEn,
            deadline: deadline,
            status: status,
            updatedAt: new Date().toISOString()
          });

          if (window.Data && typeof window.Data.saveJob === 'function') {
            window.Data.saveJob(updatedJob);
          }

          if (window.App && window.App.showToast) {
            window.App.showToast(isEn ? 'Job posting updated successfully!' : 'แก้ไขประกาศรับสมัครงานเรียบร้อยแล้ว!', 'success');
          }

          goBack();
        });
      }
    },

    /**
     * Helper for interactive tags input
     */
    initRequirementTags: function () {
      const container = document.getElementById('tags-container-req');
      const input = document.getElementById('tag-input-req');
      const addBtn = document.getElementById('btn-add-tag-req');
      if (!container || !input) return;

      const renderTags = () => {
        container.innerHTML = state.formRequirements.map((tag, idx) => `
          <span style="display: inline-flex; align-items: center; gap: 6px; background: rgba(37, 99, 235, 0.12); color: var(--primary); font-size: 0.8rem; font-weight: 600; padding: 4px 10px; border-radius: 20px;">
            <span>${tag}</span>
            <button type="button" data-index="${idx}" class="btn-remove-tag" style="background: none; border: none; color: var(--primary); font-size: 0.85rem; cursor: pointer; padding: 0; line-height: 1;">&times;</button>
          </span>
        `).join('');

        // Attach remove listeners
        container.querySelectorAll('.btn-remove-tag').forEach(b => {
          b.addEventListener('click', function () {
            const index = parseInt(this.getAttribute('data-index'), 10);
            state.formRequirements.splice(index, 1);
            renderTags();
          });
        });
      };

      const addCurrentTag = () => {
        const val = input.value.trim();
        if (val && !state.formRequirements.includes(val)) {
          state.formRequirements.push(val);
          input.value = '';
          renderTags();
        }
      };

      if (addBtn) addBtn.addEventListener('click', addCurrentTag);

      input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
          e.preventDefault();
          addCurrentTag();
        }
      });

      renderTags();
    },

    /**
     * Handle applicant job application action
     */
    handleApply: function (jobId, callback) {
      const isEn = window.App && window.App.getLang() === 'en';
      const currentUser = (window.App && typeof window.App.getCurrentUser === 'function') ? window.App.getCurrentUser() : null;

      if (!currentUser) {
        if (window.App && window.App.showToast) {
          window.App.showToast(isEn ? 'Please log in to apply.' : 'กรุณาเข้าสู่ระบบก่อนสมัครงาน', 'warning');
        }
        return;
      }

      // Check if already applied
      const allCandidates = (window.Data && typeof window.Data.getCandidates === 'function') ? window.Data.getCandidates(jobId) : [];
      const alreadyApplied = allCandidates.some(c => c.userId === currentUser.id);

      if (alreadyApplied) {
        if (window.App && window.App.showToast) {
          window.App.showToast(isEn ? 'You have already applied for this job.' : 'คุณได้ยื่นใบสมัครตำแหน่งนี้ไปแล้ว', 'info');
        }
        return;
      }

      // Get applicant resume if any
      const resumes = (window.Data && typeof window.Data.getResumes === 'function') ? window.Data.getResumes(currentUser.id) : [];
      const resumeId = (resumes && resumes[0]) ? resumes[0].id : 'r1';

      const newCandidate = {
        id: (window.App && typeof window.App.generateId === 'function') ? window.App.generateId() : ('c_' + Date.now()),
        userId: currentUser.id,
        jobId: jobId,
        status: 'new',
        appliedAt: new Date().toISOString(),
        resumeId: resumeId,
        scores: { qualification: 0, experience: 0, skills: 0 },
        notes: [],
        timeline: [
          { action: 'applied', at: new Date().toISOString(), by: currentUser.id }
        ],
        source: 'direct'
      };

      if (window.Data && typeof window.Data.saveCandidate === 'function') {
        window.Data.saveCandidate(newCandidate);
      }

      if (window.App && window.App.showToast) {
        window.App.showToast(isEn ? 'Application submitted successfully! Good luck!' : 'ยื่นใบสมัครงานสำเร็จแล้ว! ขอให้โชคดี', 'success');
      }

      if (typeof callback === 'function') {
        callback();
      } else {
        window.JobsModule.refreshList();
      }
    }
  };
})();
