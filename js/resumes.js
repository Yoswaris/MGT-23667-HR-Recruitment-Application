/**
 * HR Recruitment App - Resumes Module
 * Handles resume list, 5-step interactive resume builder wizard, and A4 resume preview with themes.
 */

window.ResumesModule = (function () {
  'use strict';

  // Module state
  let currentTheme = 'blue'; // 'blue' | 'green' | 'dark'
  let wizardStep = 1; // 1 to 5
  let wizardResumeId = null; // null for new, string for edit
  let wizardData = null; // Active resume object being created or edited
  let searchKeyword = ''; // For HR search filter

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

  // Format date helper
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
      return `${d.getDate()} ${isEn ? monthsEn[d.getMonth()] : monthsTh[d.getMonth()]} ${isEn ? d.getFullYear() : d.getFullYear() + 543}`;
    } catch (e) {
      return dateStr;
    }
  }

  // Calculate resume completeness percentage
  function getCompleteness(resume) {
    if (!resume) return 0;
    let score = 0;
    // Personal info
    if (resume.personal?.name && resume.personal?.email && resume.personal?.phone) score += 20;
    else if (resume.personal?.name) score += 10;
    // Summary
    if (resume.personal?.summary || resume.personal?.summaryEn) score += 10;
    // Education
    if (Array.isArray(resume.education) && resume.education.length > 0) score += 20;
    // Experience
    if (Array.isArray(resume.experience) && resume.experience.length > 0) score += 20;
    // Skills
    if (Array.isArray(resume.skills) && resume.skills.length > 0) score += 15;
    // Languages & Extras
    if (Array.isArray(resume.languages) && resume.languages.length > 0) score += 10;
    if (resume.expectedSalary > 0) score += 5;

    return Math.min(100, score);
  }

  // Blank resume structure factory
  function createBlankResume(userId) {
    const curUser = window.App && window.App.getCurrentUser ? window.App.getCurrentUser() : null;
    const isEn = window.App && typeof window.App.getLang === 'function' ? window.App.getLang() === 'en' : false;

    return {
      id: window.App && window.App.generateId ? window.App.generateId() : `r_${Date.now()}`,
      userId: userId || curUser?.id || 'u3',
      title: isEn ? 'Standard Resume' : 'เรซูเม่ฉบับมาตรฐาน',
      personal: {
        name: curUser ? (curUser.name || '') : '',
        nameEn: curUser ? (curUser.nameEn || '') : '',
        email: curUser ? (curUser.email || '') : '',
        phone: curUser ? (curUser.phone || '081-234-5678') : '',
        address: isEn ? 'Bangkok, Thailand' : 'กรุงเทพมหานคร',
        photo: curUser?.avatar || '👨‍💻',
        linkedin: '',
        portfolio: '',
        summary: '',
        summaryEn: ''
      },
      education: [],
      experience: [],
      skills: [],
      languages: [
        { name: 'ไทย', nameEn: 'Thai', level: 'native' }
      ],
      certificates: [],
      expectedSalary: 45000,
      availableDate: '2026-11-01',
      relocate: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  /**
   * 1. RENDER RESUME LIST PAGE
   */
  function render(params) {
    const isHR = window.App && typeof window.App.isHR === 'function' ? window.App.isHR() : true;
    const isEn = window.App && typeof window.App.getLang === 'function' ? window.App.getLang() === 'en' : false;
    const curUser = window.App && window.App.getCurrentUser ? window.App.getCurrentUser() : null;

    let allResumes = window.Data && window.Data.getResumes ? window.Data.getResumes() : [];
    if (!Array.isArray(allResumes)) allResumes = [];

    if (isHR) {
      // HR sees all resumes with search
      let filtered = allResumes;
      if (searchKeyword.trim()) {
        const kw = searchKeyword.toLowerCase().trim();
        filtered = allResumes.filter(r => {
          const nameTh = (r.personal?.name || '').toLowerCase();
          const nameEn = (r.personal?.nameEn || '').toLowerCase();
          const title = (r.title || '').toLowerCase();
          const skillsStr = Array.isArray(r.skills) ? r.skills.map(s => (s.name || '').toLowerCase()).join(' ') : '';
          return nameTh.includes(kw) || nameEn.includes(kw) || title.includes(kw) || skillsStr.includes(kw);
        });
      }

      return `
        <div class="resumes-module animate-fade-in" style="padding-bottom: 80px;">
          <!-- Header -->
          <div style="margin-bottom: 16px;">
            <h2 style="font-size: 1.35rem; font-weight: 700; margin: 0; color: var(--text-primary);">
              ${t('resumes.hrTitle', { th: 'คลังเรซูเม่ผู้สมัคร', en: 'Candidate Resume Database' })}
            </h2>
            <p style="margin: 3px 0 0; font-size: 0.85rem; color: var(--text-secondary);">
              ${filtered.length} ${t('resumes.candidatesFound', { th: 'เรซูเม่พร้อมคัดกรอง', en: 'candidate resumes available' })}
            </p>
          </div>

          <!-- Search Bar -->
          <div style="position: relative; margin-bottom: 18px;">
            <i class="fas fa-search" style="position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: var(--text-tertiary);"></i>
            <input type="text" id="hr-resume-search-input" value="${searchKeyword}" placeholder="${t('resumes.searchPlaceholder', { th: 'ค้นหาด้วยชื่อ, ทักษะ เช่น React, Python...', en: 'Search candidate name, skills like React, Python...' })}" style="width: 100%; padding: 12px 14px 12px 42px; border-radius: 14px; border: 1px solid var(--border); background: var(--bg-secondary); color: var(--text-primary); font-size: 0.9rem; outline: none; box-shadow: 0 2px 6px var(--shadow);">
            ${searchKeyword ? `
              <button id="btn-clear-resume-search" style="position: absolute; right: 12px; top: 50%; transform: translateY(-50%); border: none; background: transparent; color: var(--text-tertiary); cursor: pointer; font-size: 1rem;">&times;</button>
            ` : ''}
          </div>

          <!-- List of candidate resumes -->
          <div style="display: flex; flex-direction: column; gap: 12px;">
            ${filtered.length === 0 ? `
              <div style="text-align: center; padding: 48px 16px; background: var(--bg-secondary); border-radius: 16px; border: 1px dashed var(--border); color: var(--text-secondary);">
                <i class="fas fa-file-search" style="font-size: 2.2rem; color: var(--text-tertiary); margin-bottom: 10px;"></i>
                <p style="margin: 0; font-size: 0.9rem;">${t('resumes.noResumesFound', { th: 'ไม่พบเรซูเม่ที่ตรงกับเงื่อนไขการค้นหา', en: 'No resumes matching your criteria' })}</p>
              </div>
            ` : filtered.map(r => renderHRResumeCard(r, isEn)).join('')}
          </div>
        </div>
      `;
    }

    // APPLICANT VIEW: My Resumes
    const myResumes = allResumes.filter(r => r.userId === curUser?.id || (curUser && r.personal?.email === curUser?.email));

    return `
      <div class="resumes-module animate-fade-in" style="padding-bottom: 84px;">
        <!-- Header -->
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 18px;">
          <div>
            <h2 style="font-size: 1.35rem; font-weight: 700; margin: 0; color: var(--text-primary);">
              ${t('resumes.myResumes', { th: 'เรซูเม่ของฉัน', en: 'My Resumes' })}
            </h2>
            <p style="margin: 3px 0 0; font-size: 0.85rem; color: var(--text-secondary);">
              ${t('resumes.myResumesSub', { th: 'จัดการและสร้างเรซูเม่สำหรับสมัครงาน', en: 'Create and manage your job application resumes' })}
            </p>
          </div>

          <button id="btn-create-resume-header" class="btn-primary" style="padding: 9px 16px; border-radius: 12px; font-size: 0.85rem; font-weight: 600; background: var(--primary); color: #fff; border: none; cursor: pointer; display: flex; align-items: center; gap: 6px; box-shadow: 0 2px 8px rgba(37,99,235,0.3);">
            <i class="fas fa-plus"></i>
            <span>${t('resumes.create', { th: 'สร้างเรซูเม่', en: 'New Resume' })}</span>
          </button>
        </div>

        <!-- Resumes list -->
        <div style="display: flex; flex-direction: column; gap: 14px;">
          ${myResumes.length === 0 ? `
            <div style="text-align: center; padding: 48px 16px; background: var(--bg-secondary); border-radius: 18px; border: 1px dashed var(--border); color: var(--text-secondary);">
              <div style="font-size: 3rem; margin-bottom: 10px;">📄</div>
              <h3 style="margin: 0 0 6px; color: var(--text-primary); font-size: 1.1rem;">${t('resumes.emptyTitle', { th: 'คุณยังไม่มีเรซูเม่', en: 'No resumes created yet' })}</h3>
              <p style="margin: 0 0 18px; font-size: 0.85rem; max-width: 280px; margin-inline: auto;">${t('resumes.emptyDesc', { th: 'สร้างเรซูเม่มืออาชีพใน 5 ขั้นตอนเพื่อเพิ่มโอกาสการได้งาน', en: 'Build your professional resume in 5 simple steps to get noticed by recruiters.' })}</p>
              <button id="btn-create-first-resume" class="btn-primary" style="padding: 10px 24px; border-radius: 12px; font-weight: 600; font-size: 0.9rem; background: var(--primary); color: #fff; border: none; cursor: pointer;">
                <i class="fas fa-magic" style="margin-right: 6px;"></i>
                ${t('resumes.createFirst', { th: 'สร้างเรซูเม่ฉบับแรก', en: 'Create Your First Resume' })}
              </button>
            </div>
          ` : myResumes.map(r => renderApplicantResumeCard(r, isEn)).join('')}
        </div>

        <!-- FAB Create for applicant -->
        <button id="fab-create-resume" class="app-fab" title="${t('resumes.create', { th: 'สร้างเรซูเม่ใหม่', en: 'Create Resume' })}" style="position: fixed; right: 20px; bottom: 84px; width: 56px; height: 56px; border-radius: 50%; background: var(--primary); color: #fff; border: none; box-shadow: 0 4px 14px rgba(37,99,235,0.4); display: flex; align-items: center; justify-content: center; font-size: 1.4rem; cursor: pointer; z-index: 99;">
          <i class="fas fa-plus"></i>
        </button>
      </div>
    `;
  }

  // Card for HR
  function renderHRResumeCard(resume, isEn) {
    const p = resume.personal || {};
    const name = isEn ? (p.nameEn || p.name) : (p.name || p.nameEn);
    const photo = p.photo || '👨‍💻';
    const title = resume.title || (Array.isArray(resume.experience) && resume.experience[0]?.title) || (isEn ? 'Candidate' : 'ผู้สมัครงาน');
    const skills = Array.isArray(resume.skills) ? resume.skills.slice(0, 4) : [];
    const expCount = Array.isArray(resume.experience) ? resume.experience.length : 0;

    return `
      <div class="resume-card card-interactive" data-id="${resume.id}" style="background: var(--bg-secondary); border-radius: 16px; padding: 16px; border: 1px solid var(--border); box-shadow: 0 2px 8px var(--shadow); cursor: pointer; transition: transform 0.15s, box-shadow 0.15s;">
        <div style="display: flex; gap: 14px; align-items: flex-start;">
          <span style="font-size: 2rem; line-height: 1; width: 48px; height: 48px; background: var(--bg-tertiary); border-radius: 14px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
            ${photo}
          </span>
          <div style="flex: 1; min-width: 0;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <h4 style="margin: 0; font-size: 1rem; font-weight: 700; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                ${name}
              </h4>
              <span style="font-size: 0.72rem; color: var(--text-tertiary); flex-shrink: 0;">
                ${formatDate(resume.updatedAt || resume.createdAt)}
              </span>
            </div>
            <p style="margin: 3px 0 6px; font-size: 0.82rem; color: var(--primary); font-weight: 600;">
              ${title} &bull; ${expCount} ${t('resumes.expCount', { th: 'ประสบการณ์', en: 'experiences' })}
            </p>

            <!-- Skills Preview -->
            <div style="display: flex; flex-wrap: wrap; gap: 5px; margin-top: 6px;">
              ${skills.map(s => `
                <span style="font-size: 0.72rem; background: var(--bg-tertiary); color: var(--text-primary); padding: 3px 8px; border-radius: 8px; border: 1px solid var(--border);">
                  ${s.name}
                </span>
              `).join('')}
              ${Array.isArray(resume.skills) && resume.skills.length > 4 ? `
                <span style="font-size: 0.72rem; color: var(--text-tertiary); padding: 3px 6px;">
                  +${resume.skills.length - 4}
                </span>
              ` : ''}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // Card for Applicant
  function renderApplicantResumeCard(resume, isEn) {
    const completeness = getCompleteness(resume);
    const p = resume.personal || {};
    const name = isEn ? (p.nameEn || p.name) : (p.name || p.nameEn);
    const title = resume.title || (isEn ? 'My Resume' : 'เรซูเม่ของฉัน');

    return `
      <div class="resume-card" style="background: var(--bg-secondary); border-radius: 18px; padding: 18px; border: 1px solid var(--border); box-shadow: 0 3px 10px var(--shadow);">
        <!-- Top info -->
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
          <div style="display: flex; align-items: center; gap: 12px;">
            <span style="font-size: 2.2rem; line-height: 1; width: 48px; height: 48px; background: var(--bg-tertiary); border-radius: 14px; display: flex; align-items: center; justify-content: center;">
              ${p.photo || '👨‍💻'}
            </span>
            <div>
              <h4 style="margin: 0; font-size: 1.05rem; font-weight: 700; color: var(--text-primary);">
                ${title}
              </h4>
              <p style="margin: 2px 0 0; font-size: 0.8rem; color: var(--text-secondary);">
                ${name} &bull; ${t('resumes.updated', { th: 'อัปเดตเมื่อ', en: 'Updated' })} ${formatDate(resume.updatedAt || resume.createdAt)}
              </p>
            </div>
          </div>
        </div>

        <!-- Completeness bar -->
        <div style="margin-bottom: 14px;">
          <div style="display: flex; justify-content: space-between; font-size: 0.78rem; font-weight: 600; margin-bottom: 5px;">
            <span style="color: var(--text-secondary);">${t('resumes.completeness', { th: 'ความสมบูรณ์ของเรซูเม่', en: 'Resume Completeness' })}</span>
            <span style="color: ${completeness >= 80 ? 'var(--success)' : (completeness >= 50 ? 'var(--warning)' : 'var(--danger)')};">${completeness}%</span>
          </div>
          <div style="width: 100%; height: 8px; border-radius: 4px; background: var(--bg-tertiary); overflow: hidden;">
            <div style="width: ${completeness}%; height: 100%; border-radius: 4px; background: ${completeness >= 80 ? 'var(--success)' : (completeness >= 50 ? 'var(--warning)' : 'var(--primary)')}; transition: width 0.3s ease;"></div>
          </div>
        </div>

        <!-- Actions -->
        <div style="display: flex; gap: 8px; border-top: 1px solid var(--border); padding-top: 12px;">
          <button class="btn-view-resume" data-id="${resume.id}" style="flex: 1; padding: 9px; border-radius: 10px; border: 1px solid var(--border); background: var(--bg-primary); color: var(--text-primary); font-size: 0.85rem; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px;">
            <i class="fas fa-eye" style="color: var(--primary);"></i>
            <span>${t('common.view', { th: 'ดูเรซูเม่', en: 'View' })}</span>
          </button>

          <button class="btn-edit-resume" data-id="${resume.id}" style="flex: 1; padding: 9px; border-radius: 10px; border: 1px solid var(--border); background: var(--bg-primary); color: var(--text-primary); font-size: 0.85rem; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px;">
            <i class="fas fa-edit" style="color: var(--warning);"></i>
            <span>${t('common.edit', { th: 'แก้ไข', en: 'Edit' })}</span>
          </button>

          <button class="btn-delete-resume" data-id="${resume.id}" style="width: 40px; padding: 9px; border-radius: 10px; border: 1px solid #FCA5A5; background: #FEE2E2; color: #DC2626; font-size: 0.85rem; cursor: pointer; display: flex; align-items: center; justify-content: center;">
            <i class="fas fa-trash-alt"></i>
          </button>
        </div>
      </div>
    `;
  }

  /**
   * 2. RESUME BUILDER WIZARD: renderCreate & renderEdit
   */
  function renderCreate() {
    wizardResumeId = null;
    wizardStep = 1;
    const curUser = window.App && window.App.getCurrentUser ? window.App.getCurrentUser() : null;
    wizardData = createBlankResume(curUser?.id);
    return renderWizard();
  }

  function renderEdit(param) {
    const id = typeof param === 'object' && param ? param.id : param;
    wizardResumeId = id;
    wizardStep = 1;

    if (window.Data && window.Data.getResume) {
      const existing = window.Data.getResume(id);
      if (existing) {
        wizardData = JSON.parse(JSON.stringify(existing));
      } else {
        wizardData = createBlankResume();
      }
    } else {
      wizardData = createBlankResume();
    }

    return renderWizard();
  }

  function renderWizard() {
    const stepsMeta = [
      { num: 1, label: t('resumes.step1', { th: 'ข้อมูลส่วนตัว', en: 'Personal' }), icon: 'fa-user' },
      { num: 2, label: t('resumes.step2', { th: 'การศึกษา', en: 'Education' }), icon: 'fa-graduation-cap' },
      { num: 3, label: t('resumes.step3', { th: 'ประสบการณ์', en: 'Experience' }), icon: 'fa-briefcase' },
      { num: 4, label: t('resumes.step4', { th: 'ทักษะและภาษา', en: 'Skills & Lang' }), icon: 'fa-certificate' },
      { num: 5, label: t('resumes.step5', { th: 'ตรวจสอบและบันทึก', en: 'Review & Submit' }), icon: 'fa-check-circle' }
    ];

    return `
      <div class="resume-wizard-module animate-fade-in" style="padding-bottom: 90px;">
        <!-- Top wizard bar -->
        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px;">
          <button id="btn-cancel-wizard" class="btn-icon" style="background: var(--bg-tertiary); border: 1px solid var(--border); border-radius: 10px; width: 38px; height: 38px; cursor: pointer; color: var(--text-primary); display: flex; align-items: center; justify-content: center;">
            <i class="fas fa-times"></i>
          </button>
          <div>
            <h2 style="font-size: 1.2rem; font-weight: 700; margin: 0; color: var(--text-primary);">
              ${wizardResumeId ? t('resumes.editTitle', { th: 'แก้ไขเรซูเม่', en: 'Edit Resume' }) : t('resumes.createTitle', { th: 'สร้างเรซูเม่ใหม่', en: 'Create Resume Wizard' })}
            </h2>
            <span style="font-size: 0.8rem; color: var(--primary); font-weight: 600;">
              ${t('resumes.stepIndicator', { th: 'ขั้นตอนที่', en: 'Step' })} ${wizardStep} / 5: ${stepsMeta[wizardStep - 1].label}
            </span>
          </div>
        </div>

        <!-- 5-Step Visual Stepper Bar -->
        <div class="stepper-bar" style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; position: relative; padding: 0 10px;">
          <div style="position: absolute; left: 20px; right: 20px; top: 16px; height: 3px; background: var(--bg-tertiary); z-index: 1;"></div>
          <div style="position: absolute; left: 20px; width: ${(wizardStep - 1) * 25}%; top: 16px; height: 3px; background: var(--primary); z-index: 1; transition: width 0.3s ease;"></div>

          ${stepsMeta.map(s => {
            const isCompleted = s.num < wizardStep;
            const isCurrent = s.num === wizardStep;
            return `
              <div style="position: relative; z-index: 2; display: flex; flex-direction: column; align-items: center;">
                <div style="width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.85rem; font-weight: 700; background: ${isCurrent ? 'var(--primary)' : (isCompleted ? 'var(--success)' : 'var(--bg-secondary)')}; color: ${isCurrent || isCompleted ? '#ffffff' : 'var(--text-tertiary)'}; border: 2px solid ${isCurrent ? 'var(--primary)' : (isCompleted ? 'var(--success)' : 'var(--border)')}; box-shadow: 0 2px 6px rgba(0,0,0,0.08);">
                  ${isCompleted ? '<i class="fas fa-check" style="font-size: 0.8rem;"></i>' : s.num}
                </div>
              </div>
            `;
          }).join('')}
        </div>

        <!-- Active Step Content Form -->
        <div class="card" style="background: var(--bg-secondary); border-radius: 18px; padding: 20px; border: 1px solid var(--border); box-shadow: 0 4px 14px var(--shadow);">
          ${renderWizardStepContent()}
        </div>
      </div>
    `;
  }

  // Render individual step contents
  function renderWizardStepContent() {
    switch (wizardStep) {
      case 1:
        return renderStep1Personal();
      case 2:
        return renderStep2Education();
      case 3:
        return renderStep3Experience();
      case 4:
        return renderStep4Skills();
      case 5:
        return renderStep5Review();
      default:
        return renderStep1Personal();
    }
  }

  // STEP 1: Personal Information
  function renderStep1Personal() {
    const p = wizardData?.personal || {};
    const emojis = ['👨‍💻', '👩‍💻', '👨‍💼', '👩‍💼', '👨‍🎓', '👩‍🎓', '👨‍🔬', '👩‍🔬', '👨‍🎨', '👩‍🎨', '🧑‍💻', '🧑‍💼'];

    return `
      <form id="wizard-form-step-1">
        <h3 style="font-size: 1.05rem; font-weight: 700; margin: 0 0 16px; color: var(--text-primary); display: flex; align-items: center; gap: 8px;">
          <i class="fas fa-user-circle" style="color: var(--primary);"></i>
          <span>${t('resumes.step1Title', { th: 'ขั้นตอนที่ 1: ข้อมูลส่วนตัว', en: 'Step 1: Personal Information' })}</span>
        </h3>

        <!-- Avatar Emoji Picker -->
        <div style="margin-bottom: 18px;">
          <label style="display: block; font-size: 0.85rem; font-weight: 600; color: var(--text-primary); margin-bottom: 8px;">
            ${t('resumes.chooseAvatar', { th: 'เลือกรูปแทนตัว (Avatar Emoji)', en: 'Choose Avatar Emoji' })}
          </label>
          <div style="display: grid; grid-template-columns: repeat(6, 1fr); gap: 8px;">
            ${emojis.map(em => `
              <div class="avatar-option ${p.photo === em ? 'selected' : ''}" data-emoji="${em}" style="font-size: 1.6rem; height: 46px; border-radius: 12px; display: flex; align-items: center; justify-content: center; cursor: pointer; background: ${p.photo === em ? 'var(--primary-light)' : 'var(--bg-primary)'}; border: 2px solid ${p.photo === em ? 'var(--primary)' : 'var(--border)'}; transition: transform 0.15s;">
                ${em}
              </div>
            `).join('')}
          </div>
          <input type="hidden" id="wiz-photo" value="${p.photo || '👨‍💻'}">
        </div>

        <!-- Resume Title -->
        <div class="form-group" style="margin-bottom: 14px;">
          <label style="display: block; font-size: 0.85rem; font-weight: 600; color: var(--text-primary); margin-bottom: 5px;">
            ${t('resumes.resumeTitleLabel', { th: 'ชื่อเรซูเม่ (เช่น Full-Stack Developer)', en: 'Resume Target Title *' })}
          </label>
          <input type="text" id="wiz-resume-title" required value="${wizardData?.title || ''}" placeholder="e.g. Senior Software Developer" style="width: 100%; padding: 10px 12px; border-radius: 10px; border: 1px solid var(--border); background: var(--bg-primary); color: var(--text-primary); font-size: 0.9rem; outline: none;">
        </div>

        <!-- Name TH & EN -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 14px;">
          <div class="form-group">
            <label style="display: block; font-size: 0.85rem; font-weight: 600; color: var(--text-primary); margin-bottom: 5px;">
              ${t('resumes.nameTh', { th: 'ชื่อ-นามสกุล (ภาษาไทย) *', en: 'Name (Thai) *' })}
            </label>
            <input type="text" id="wiz-name-th" required value="${p.name || ''}" placeholder="สมชาย ใจดี" style="width: 100%; padding: 10px 12px; border-radius: 10px; border: 1px solid var(--border); background: var(--bg-primary); color: var(--text-primary); font-size: 0.9rem; outline: none;">
          </div>
          <div class="form-group">
            <label style="display: block; font-size: 0.85rem; font-weight: 600; color: var(--text-primary); margin-bottom: 5px;">
              ${t('resumes.nameEn', { th: 'ชื่อ-นามสกุล (English) *', en: 'Name (English) *' })}
            </label>
            <input type="text" id="wiz-name-en" required value="${p.nameEn || ''}" placeholder="Somchai Jaidee" style="width: 100%; padding: 10px 12px; border-radius: 10px; border: 1px solid var(--border); background: var(--bg-primary); color: var(--text-primary); font-size: 0.9rem; outline: none;">
          </div>
        </div>

        <!-- Email & Phone -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 14px;">
          <div class="form-group">
            <label style="display: block; font-size: 0.85rem; font-weight: 600; color: var(--text-primary); margin-bottom: 5px;">
              ${t('common.email', { th: 'อีเมล *', en: 'Email *' })}
            </label>
            <input type="email" id="wiz-email" required value="${p.email || ''}" placeholder="somchai@email.com" style="width: 100%; padding: 10px 12px; border-radius: 10px; border: 1px solid var(--border); background: var(--bg-primary); color: var(--text-primary); font-size: 0.9rem; outline: none;">
          </div>
          <div class="form-group">
            <label style="display: block; font-size: 0.85rem; font-weight: 600; color: var(--text-primary); margin-bottom: 5px;">
              ${t('common.phone', { th: 'เบอร์โทรศัพท์ *', en: 'Phone *' })}
            </label>
            <input type="tel" id="wiz-phone" required value="${p.phone || ''}" placeholder="081-234-5678" style="width: 100%; padding: 10px 12px; border-radius: 10px; border: 1px solid var(--border); background: var(--bg-primary); color: var(--text-primary); font-size: 0.9rem; outline: none;">
          </div>
        </div>

        <!-- Address -->
        <div class="form-group" style="margin-bottom: 14px;">
          <label style="display: block; font-size: 0.85rem; font-weight: 600; color: var(--text-primary); margin-bottom: 5px;">
            ${t('resumes.address', { th: 'ที่อยู่ / จังหวัด', en: 'Address / Province' })}
          </label>
          <input type="text" id="wiz-address" value="${p.address || ''}" placeholder="กรุงเทพมหานคร" style="width: 100%; padding: 10px 12px; border-radius: 10px; border: 1px solid var(--border); background: var(--bg-primary); color: var(--text-primary); font-size: 0.9rem; outline: none;">
        </div>

        <!-- LinkedIn & Portfolio Links -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 14px;">
          <div class="form-group">
            <label style="display: block; font-size: 0.85rem; font-weight: 600; color: var(--text-primary); margin-bottom: 5px;">
              LinkedIn URL
            </label>
            <input type="url" id="wiz-linkedin" value="${p.linkedin || ''}" placeholder="https://linkedin.com/in/..." style="width: 100%; padding: 10px 12px; border-radius: 10px; border: 1px solid var(--border); background: var(--bg-primary); color: var(--text-primary); font-size: 0.85rem; outline: none;">
          </div>
          <div class="form-group">
            <label style="display: block; font-size: 0.85rem; font-weight: 600; color: var(--text-primary); margin-bottom: 5px;">
              Portfolio URL
            </label>
            <input type="url" id="wiz-portfolio" value="${p.portfolio || ''}" placeholder="https://github.com/..." style="width: 100%; padding: 10px 12px; border-radius: 10px; border: 1px solid var(--border); background: var(--bg-primary); color: var(--text-primary); font-size: 0.85rem; outline: none;">
          </div>
        </div>

        <!-- Professional Summary TH & EN -->
        <div class="form-group" style="margin-bottom: 14px;">
          <label style="display: block; font-size: 0.85rem; font-weight: 600; color: var(--text-primary); margin-bottom: 5px;">
            ${t('resumes.summaryTh', { th: 'สรุปประวัติโดยย่อ (ภาษาไทย)', en: 'Professional Summary (Thai)' })}
          </label>
          <textarea id="wiz-summary-th" rows="3" placeholder="นักพัฒนาซอฟต์แวร์ผู้มีความเชี่ยวชาญด้าน..." style="width: 100%; padding: 10px 12px; border-radius: 10px; border: 1px solid var(--border); background: var(--bg-primary); color: var(--text-primary); font-size: 0.85rem; outline: none; resize: vertical;">${p.summary || ''}</textarea>
        </div>

        <div class="form-group" style="margin-bottom: 22px;">
          <label style="display: block; font-size: 0.85rem; font-weight: 600; color: var(--text-primary); margin-bottom: 5px;">
            ${t('resumes.summaryEn', { th: 'สรุปประวัติโดยย่อ (English)', en: 'Professional Summary (English)' })}
          </label>
          <textarea id="wiz-summary-en" rows="3" placeholder="Experienced software developer specializing in..." style="width: 100%; padding: 10px 12px; border-radius: 10px; border: 1px solid var(--border); background: var(--bg-primary); color: var(--text-primary); font-size: 0.85rem; outline: none; resize: vertical;">${p.summaryEn || ''}</textarea>
        </div>

        <!-- Next button -->
        <div style="display: flex; justify-content: flex-end;">
          <button type="submit" class="btn-primary" style="padding: 12px 28px; border-radius: 12px; font-weight: 600; font-size: 0.95rem; background: var(--primary); color: #fff; border: none; cursor: pointer; display: flex; align-items: center; gap: 8px;">
            <span>${t('common.next', { th: 'ถัดไป', en: 'Next' })}</span>
            <i class="fas fa-arrow-right"></i>
          </button>
        </div>
      </form>
    `;
  }

  // STEP 2: Education
  function renderStep2Education() {
    const list = Array.isArray(wizardData?.education) ? wizardData.education : [];

    return `
      <div id="wizard-step-2">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
          <h3 style="font-size: 1.05rem; font-weight: 700; margin: 0; color: var(--text-primary); display: flex; align-items: center; gap: 8px;">
            <i class="fas fa-graduation-cap" style="color: var(--primary);"></i>
            <span>${t('resumes.step2Title', { th: 'ขั้นตอนที่ 2: ประวัติการศึกษา', en: 'Step 2: Education' })}</span>
          </h3>
          <button type="button" id="btn-show-add-edu" style="padding: 6px 14px; border-radius: 10px; border: 1px solid var(--primary); background: var(--bg-primary); color: var(--primary); font-weight: 600; font-size: 0.82rem; cursor: pointer;">
            + ${t('resumes.addEducation', { th: 'เพิ่มการศึกษา', en: 'Add Education' })}
          </button>
        </div>

        <!-- Inline Add Education Form (Hidden by default unless empty) -->
        <div id="add-edu-form-container" style="display: ${list.length === 0 ? 'block' : 'none'}; background: var(--bg-tertiary); padding: 16px; border-radius: 14px; margin-bottom: 18px; border: 1px dashed var(--border);">
          <h4 style="margin: 0 0 12px; font-size: 0.9rem; font-weight: 700; color: var(--text-primary);">
            ${t('resumes.newEduTitle', { th: 'ระบุข้อมูลการศึกษาใหม่', en: 'New Education Entry' })}
          </h4>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 10px;">
            <div>
              <label style="display: block; font-size: 0.8rem; font-weight: 600; color: var(--text-secondary); margin-bottom: 4px;">
                ${t('resumes.degree', { th: 'ระดับการศึกษา *', en: 'Degree *' })}
              </label>
              <select id="edu-degree" style="width: 100%; padding: 8px 10px; border-radius: 8px; border: 1px solid var(--border); background: var(--bg-secondary); color: var(--text-primary); font-size: 0.85rem;">
                <option value="ปริญญาตรี" data-en="Bachelor">ปริญญาตรี (Bachelor)</option>
                <option value="ปริญญาโท" data-en="Master">ปริญญาโท (Master)</option>
                <option value="ปริญญาเอก" data-en="PhD">ปริญญาเอก (PhD)</option>
                <option value="ปวช./ปวส." data-en="Diploma">ปวช./ปวส. (Diploma)</option>
                <option value="มัธยมศึกษา" data-en="High School">มัธยมศึกษา (High School)</option>
              </select>
            </div>
            <div>
              <label style="display: block; font-size: 0.8rem; font-weight: 600; color: var(--text-secondary); margin-bottom: 4px;">
                ${t('resumes.field', { th: 'สาขาวิชา *', en: 'Field of Study *' })}
              </label>
              <input type="text" id="edu-field" placeholder="วิทยาการคอมพิวเตอร์" style="width: 100%; padding: 8px 10px; border-radius: 8px; border: 1px solid var(--border); background: var(--bg-secondary); color: var(--text-primary); font-size: 0.85rem;">
            </div>
          </div>

          <div class="form-group" style="margin-bottom: 10px;">
            <label style="display: block; font-size: 0.8rem; font-weight: 600; color: var(--text-secondary); margin-bottom: 4px;">
              ${t('resumes.institution', { th: 'สถาบันการศึกษา *', en: 'Institution *' })}
            </label>
            <input type="text" id="edu-institution" placeholder="จุฬาลงกรณ์มหาวิทยาลัย" style="width: 100%; padding: 8px 10px; border-radius: 8px; border: 1px solid var(--border); background: var(--bg-secondary); color: var(--text-primary); font-size: 0.85rem;">
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 14px;">
            <div>
              <label style="display: block; font-size: 0.8rem; font-weight: 600; color: var(--text-secondary); margin-bottom: 4px;">
                ${t('resumes.gradYear', { th: 'ปีที่สำเร็จการศึกษา', en: 'Graduation Year' })}
              </label>
              <input type="number" id="edu-year" placeholder="2022" value="2022" style="width: 100%; padding: 8px 10px; border-radius: 8px; border: 1px solid var(--border); background: var(--bg-secondary); color: var(--text-primary); font-size: 0.85rem;">
            </div>
            <div>
              <label style="display: block; font-size: 0.8rem; font-weight: 600; color: var(--text-secondary); margin-bottom: 4px;">
                ${t('resumes.gpa', { th: 'เกรดเฉลี่ย (GPA)', en: 'GPA' })}
              </label>
              <input type="number" step="0.01" id="edu-gpa" placeholder="3.50" value="3.50" style="width: 100%; padding: 8px 10px; border-radius: 8px; border: 1px solid var(--border); background: var(--bg-secondary); color: var(--text-primary); font-size: 0.85rem;">
            </div>
          </div>

          <div style="display: flex; justify-content: flex-end; gap: 8px;">
            <button type="button" id="btn-cancel-add-edu" style="padding: 7px 16px; border-radius: 8px; border: 1px solid var(--border); background: var(--bg-secondary); color: var(--text-secondary); font-size: 0.82rem; cursor: pointer;">
              ${t('common.cancel', { th: 'ยกเลิก', en: 'Cancel' })}
            </button>
            <button type="button" id="btn-save-edu-entry" style="padding: 7px 18px; border-radius: 8px; border: none; background: var(--primary); color: #fff; font-size: 0.82rem; font-weight: 600; cursor: pointer;">
              ${t('common.add', { th: 'บันทึกรายการนี้', en: 'Save Entry' })}
            </button>
          </div>
        </div>

        <!-- Education Entries List -->
        <div id="edu-items-list" style="display: flex; flex-direction: column; gap: 10px; margin-bottom: 24px;">
          ${list.length === 0 ? `
            <p style="text-align: center; color: var(--text-tertiary); font-size: 0.85rem; margin: 12px 0;">
              ${t('resumes.noEduYet', { th: 'ยังไม่มีรายการการศึกษา กรุณากดปุ่มเพิ่มด้านบน', en: 'No education entries added yet' })}
            </p>
          ` : list.map((item, idx) => `
            <div style="display: flex; justify-content: space-between; align-items: center; background: var(--bg-primary); padding: 12px 14px; border-radius: 12px; border: 1px solid var(--border);">
              <div>
                <h5 style="margin: 0; font-size: 0.9rem; font-weight: 700; color: var(--text-primary);">
                  ${item.degree || ''} - ${item.field || ''}
                </h5>
                <p style="margin: 2px 0 0; font-size: 0.8rem; color: var(--text-secondary);">
                  ${item.institution || ''} &bull; ${item.year || ''} ${item.gpa ? `(GPA: ${item.gpa})` : ''}
                </p>
              </div>
              <button type="button" class="btn-remove-edu" data-index="${idx}" style="border: none; background: transparent; color: var(--danger); cursor: pointer; padding: 6px;">
                <i class="fas fa-trash-alt"></i>
              </button>
            </div>
          `).join('')}
        </div>

        <!-- Navigation Buttons -->
        <div style="display: flex; justify-content: space-between;">
          <button type="button" id="btn-step2-back" class="btn-secondary" style="padding: 12px 24px; border-radius: 12px; font-weight: 600; font-size: 0.95rem; background: var(--bg-tertiary); color: var(--text-primary); border: 1px solid var(--border); cursor: pointer; display: flex; align-items: center; gap: 8px;">
            <i class="fas fa-arrow-left"></i>
            <span>${t('common.back', { th: 'ย้อนกลับ', en: 'Back' })}</span>
          </button>
          <button type="button" id="btn-step2-next" class="btn-primary" style="padding: 12px 28px; border-radius: 12px; font-weight: 600; font-size: 0.95rem; background: var(--primary); color: #fff; border: none; cursor: pointer; display: flex; align-items: center; gap: 8px;">
            <span>${t('common.next', { th: 'ถัดไป', en: 'Next' })}</span>
            <i class="fas fa-arrow-right"></i>
          </button>
        </div>
      </div>
    `;
  }

  // STEP 3: Work Experience
  function renderStep3Experience() {
    const list = Array.isArray(wizardData?.experience) ? wizardData.experience : [];

    return `
      <div id="wizard-step-3">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
          <h3 style="font-size: 1.05rem; font-weight: 700; margin: 0; color: var(--text-primary); display: flex; align-items: center; gap: 8px;">
            <i class="fas fa-briefcase" style="color: var(--primary);"></i>
            <span>${t('resumes.step3Title', { th: 'ขั้นตอนที่ 3: ประสบการณ์ทำงาน', en: 'Step 3: Work Experience' })}</span>
          </h3>
          <button type="button" id="btn-show-add-exp" style="padding: 6px 14px; border-radius: 10px; border: 1px solid var(--primary); background: var(--bg-primary); color: var(--primary); font-weight: 600; font-size: 0.82rem; cursor: pointer;">
            + ${t('resumes.addExperience', { th: 'เพิ่มประสบการณ์', en: 'Add Experience' })}
          </button>
        </div>

        <!-- Inline Add Experience Form -->
        <div id="add-exp-form-container" style="display: ${list.length === 0 ? 'block' : 'none'}; background: var(--bg-tertiary); padding: 16px; border-radius: 14px; margin-bottom: 18px; border: 1px dashed var(--border);">
          <h4 style="margin: 0 0 12px; font-size: 0.9rem; font-weight: 700; color: var(--text-primary);">
            ${t('resumes.newExpTitle', { th: 'ระบุข้อมูลประสบการณ์ทำงานใหม่', en: 'New Work Experience Entry' })}
          </h4>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 10px;">
            <div>
              <label style="display: block; font-size: 0.8rem; font-weight: 600; color: var(--text-secondary); margin-bottom: 4px;">
                ${t('resumes.jobTitleField', { th: 'ตำแหน่งงาน *', en: 'Job Title *' })}
              </label>
              <input type="text" id="exp-title" placeholder="Frontend Developer" style="width: 100%; padding: 8px 10px; border-radius: 8px; border: 1px solid var(--border); background: var(--bg-secondary); color: var(--text-primary); font-size: 0.85rem;">
            </div>
            <div>
              <label style="display: block; font-size: 0.8rem; font-weight: 600; color: var(--text-secondary); margin-bottom: 4px;">
                ${t('resumes.companyField', { th: 'ชื่อบริษัท / องค์กร *', en: 'Company *' })}
              </label>
              <input type="text" id="exp-company" placeholder="Tech Co., Ltd." style="width: 100%; padding: 8px 10px; border-radius: 8px; border: 1px solid var(--border); background: var(--bg-secondary); color: var(--text-primary); font-size: 0.85rem;">
            </div>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 10px;">
            <div>
              <label style="display: block; font-size: 0.8rem; font-weight: 600; color: var(--text-secondary); margin-bottom: 4px;">
                ${t('resumes.startDate', { th: 'เดือน/ปี เริ่มงาน', en: 'Start Date (YYYY-MM)' })}
              </label>
              <input type="month" id="exp-start" value="2022-01" style="width: 100%; padding: 8px 10px; border-radius: 8px; border: 1px solid var(--border); background: var(--bg-secondary); color: var(--text-primary); font-size: 0.85rem;">
            </div>
            <div>
              <label style="display: block; font-size: 0.8rem; font-weight: 600; color: var(--text-secondary); margin-bottom: 4px;">
                ${t('resumes.endDate', { th: 'เดือน/ปี สิ้นสุด', en: 'End Date' })}
              </label>
              <input type="month" id="exp-end" value="2024-05" style="width: 100%; padding: 8px 10px; border-radius: 8px; border: 1px solid var(--border); background: var(--bg-secondary); color: var(--text-primary); font-size: 0.85rem;">
            </div>
          </div>

          <!-- Currently working here toggle -->
          <div style="margin-bottom: 10px;">
            <label style="display: inline-flex; align-items: center; gap: 8px; font-size: 0.82rem; color: var(--text-primary); cursor: pointer;">
              <input type="checkbox" id="exp-current" style="accent-color: var(--primary);">
              <span>${t('resumes.currentJob', { th: 'ปัจจุบันยังคงทำงานที่นี่', en: 'Currently working here' })}</span>
            </label>
          </div>

          <div class="form-group" style="margin-bottom: 14px;">
            <label style="display: block; font-size: 0.8rem; font-weight: 600; color: var(--text-secondary); margin-bottom: 4px;">
              ${t('resumes.expDescription', { th: 'รายละเอียดความรับผิดชอบและผลงาน', en: 'Responsibilities & Achievements' })}
            </label>
            <textarea id="exp-desc" rows="3" placeholder="พัฒนาระบบเว็บด้วย React, จัดการ API และปรับปรุง Performance..." style="width: 100%; padding: 8px 10px; border-radius: 8px; border: 1px solid var(--border); background: var(--bg-secondary); color: var(--text-primary); font-size: 0.85rem; outline: none; resize: vertical;"></textarea>
          </div>

          <div style="display: flex; justify-content: flex-end; gap: 8px;">
            <button type="button" id="btn-cancel-add-exp" style="padding: 7px 16px; border-radius: 8px; border: 1px solid var(--border); background: var(--bg-secondary); color: var(--text-secondary); font-size: 0.82rem; cursor: pointer;">
              ${t('common.cancel', { th: 'ยกเลิก', en: 'Cancel' })}
            </button>
            <button type="button" id="btn-save-exp-entry" style="padding: 7px 18px; border-radius: 8px; border: none; background: var(--primary); color: #fff; font-size: 0.82rem; font-weight: 600; cursor: pointer;">
              ${t('common.add', { th: 'บันทึกรายการนี้', en: 'Save Entry' })}
            </button>
          </div>
        </div>

        <!-- Experiences List -->
        <div id="exp-items-list" style="display: flex; flex-direction: column; gap: 10px; margin-bottom: 24px;">
          ${list.length === 0 ? `
            <p style="text-align: center; color: var(--text-tertiary); font-size: 0.85rem; margin: 12px 0;">
              ${t('resumes.noExpYet', { th: 'ยังไม่มีรายการประสบการณ์ กรุณากดปุ่มเพิ่มด้านบน', en: 'No work experience added yet' })}
            </p>
          ` : list.map((item, idx) => `
            <div style="display: flex; justify-content: space-between; align-items: center; background: var(--bg-primary); padding: 12px 14px; border-radius: 12px; border: 1px solid var(--border);">
              <div>
                <h5 style="margin: 0; font-size: 0.9rem; font-weight: 700; color: var(--text-primary);">
                  ${item.title || ''} @ ${item.company || ''}
                </h5>
                <p style="margin: 2px 0 0; font-size: 0.8rem; color: var(--text-secondary);">
                  ${item.startDate || ''} - ${item.current ? (t('resumes.present', { th: 'ปัจจุบัน', en: 'Present' })) : (item.endDate || '')}
                </p>
              </div>
              <button type="button" class="btn-remove-exp" data-index="${idx}" style="border: none; background: transparent; color: var(--danger); cursor: pointer; padding: 6px;">
                <i class="fas fa-trash-alt"></i>
              </button>
            </div>
          `).join('')}
        </div>

        <!-- Navigation Buttons -->
        <div style="display: flex; justify-content: space-between;">
          <button type="button" id="btn-step3-back" class="btn-secondary" style="padding: 12px 24px; border-radius: 12px; font-weight: 600; font-size: 0.95rem; background: var(--bg-tertiary); color: var(--text-primary); border: 1px solid var(--border); cursor: pointer; display: flex; align-items: center; gap: 8px;">
            <i class="fas fa-arrow-left"></i>
            <span>${t('common.back', { th: 'ย้อนกลับ', en: 'Back' })}</span>
          </button>
          <button type="button" id="btn-step3-next" class="btn-primary" style="padding: 12px 28px; border-radius: 12px; font-weight: 600; font-size: 0.95rem; background: var(--primary); color: #fff; border: none; cursor: pointer; display: flex; align-items: center; gap: 8px;">
            <span>${t('common.next', { th: 'ถัดไป', en: 'Next' })}</span>
            <i class="fas fa-arrow-right"></i>
          </button>
        </div>
      </div>
    `;
  }

  // STEP 4: Skills, Languages & Certificates
  function renderStep4Skills() {
    const skills = Array.isArray(wizardData?.skills) ? wizardData.skills : [];
    const languages = Array.isArray(wizardData?.languages) ? wizardData.languages : [];
    const certs = Array.isArray(wizardData?.certificates) ? wizardData.certificates : [];

    return `
      <div id="wizard-step-4">
        <h3 style="font-size: 1.05rem; font-weight: 700; margin: 0 0 16px; color: var(--text-primary); display: flex; align-items: center; gap: 8px;">
          <i class="fas fa-certificate" style="color: var(--primary);"></i>
          <span>${t('resumes.step4Title', { th: 'ขั้นตอนที่ 4: ทักษะ ภาษา และประกาศนียบัตร', en: 'Step 4: Skills, Languages & Certs' })}</span>
        </h3>

        <!-- Section 1: Skills -->
        <div style="background: var(--bg-primary); padding: 14px; border-radius: 14px; border: 1px solid var(--border); margin-bottom: 16px;">
          <h4 style="margin: 0 0 10px; font-size: 0.9rem; font-weight: 700; color: var(--text-primary);">
            ${t('resumes.skills', { th: 'ทักษะความสามารถ (Skills)', en: 'Skills' })}
          </h4>
          <div style="display: flex; gap: 8px; margin-bottom: 10px;">
            <input type="text" id="wiz-skill-name" placeholder="JavaScript, React, Node.js..." style="flex: 2; padding: 8px 10px; border-radius: 8px; border: 1px solid var(--border); background: var(--bg-secondary); color: var(--text-primary); font-size: 0.85rem; outline: none;">
            <select id="wiz-skill-level" style="flex: 1; padding: 8px 6px; border-radius: 8px; border: 1px solid var(--border); background: var(--bg-secondary); color: var(--text-primary); font-size: 0.82rem;">
              <option value="expert">${t('resumes.expert', { th: 'เชี่ยวชาญ (Expert)', en: 'Expert' })}</option>
              <option value="intermediate" selected>${t('resumes.intermediate', { th: 'ปานกลาง (Intermediate)', en: 'Intermediate' })}</option>
              <option value="beginner">${t('resumes.beginner', { th: 'เริ่มต้น (Beginner)', en: 'Beginner' })}</option>
            </select>
            <button type="button" id="btn-add-skill" style="padding: 0 14px; border-radius: 8px; border: none; background: var(--primary); color: #fff; font-weight: 600; font-size: 0.85rem; cursor: pointer;">
              + ${t('common.add', { th: 'เพิ่ม', en: 'Add' })}
            </button>
          </div>
          <!-- Skills tags list -->
          <div id="skills-tags-container" style="display: flex; flex-wrap: wrap; gap: 6px;">
            ${skills.map((s, idx) => `
              <span class="skill-tag" style="display: inline-flex; align-items: center; gap: 6px; background: var(--bg-secondary); color: var(--text-primary); padding: 4px 10px; border-radius: 20px; font-size: 0.8rem; border: 1px solid var(--border);">
                <strong>${s.name}</strong>
                <span style="font-size: 0.7rem; color: ${s.level === 'expert' ? 'var(--success)' : (s.level === 'intermediate' ? 'var(--primary)' : 'var(--warning)')}; font-weight: 600;">
                  (${s.level})
                </span>
                <button type="button" class="btn-remove-skill" data-index="${idx}" style="border: none; background: transparent; color: var(--text-tertiary); cursor: pointer; padding: 0; font-size: 0.9rem;">&times;</button>
              </span>
            `).join('')}
          </div>
        </div>

        <!-- Section 2: Languages -->
        <div style="background: var(--bg-primary); padding: 14px; border-radius: 14px; border: 1px solid var(--border); margin-bottom: 16px;">
          <h4 style="margin: 0 0 10px; font-size: 0.9rem; font-weight: 700; color: var(--text-primary);">
            ${t('resumes.languages', { th: 'ภาษาที่ใช้สื่อสาร (Languages)', en: 'Languages' })}
          </h4>
          <div style="display: flex; gap: 8px; margin-bottom: 10px;">
            <input type="text" id="wiz-lang-name" placeholder="อังกฤษ, ญี่ปุ่น..." style="flex: 2; padding: 8px 10px; border-radius: 8px; border: 1px solid var(--border); background: var(--bg-secondary); color: var(--text-primary); font-size: 0.85rem; outline: none;">
            <select id="wiz-lang-level" style="flex: 1; padding: 8px 6px; border-radius: 8px; border: 1px solid var(--border); background: var(--bg-secondary); color: var(--text-primary); font-size: 0.82rem;">
              <option value="native">${t('resumes.native', { th: 'เจ้าของภาษา (Native)', en: 'Native' })}</option>
              <option value="excellent">${t('resumes.excellent', { th: 'ดีเยี่ยม (Fluent)', en: 'Fluent' })}</option>
              <option value="good" selected>${t('resumes.good', { th: 'ดี (Good)', en: 'Good' })}</option>
              <option value="basic">${t('resumes.basic', { th: 'พอใช้ (Basic)', en: 'Basic' })}</option>
            </select>
            <button type="button" id="btn-add-lang" style="padding: 0 14px; border-radius: 8px; border: none; background: var(--primary); color: #fff; font-weight: 600; font-size: 0.85rem; cursor: pointer;">
              + ${t('common.add', { th: 'เพิ่ม', en: 'Add' })}
            </button>
          </div>
          <!-- Languages list -->
          <div id="langs-tags-container" style="display: flex; flex-wrap: wrap; gap: 6px;">
            ${languages.map((l, idx) => `
              <span style="display: inline-flex; align-items: center; gap: 6px; background: var(--bg-secondary); color: var(--text-primary); padding: 4px 10px; border-radius: 20px; font-size: 0.8rem; border: 1px solid var(--border);">
                <span>${l.name}</span>
                <span style="font-size: 0.72rem; color: var(--text-secondary);">(${l.level})</span>
                <button type="button" class="btn-remove-lang" data-index="${idx}" style="border: none; background: transparent; color: var(--text-tertiary); cursor: pointer; padding: 0; font-size: 0.9rem;">&times;</button>
              </span>
            `).join('')}
          </div>
        </div>

        <!-- Section 3: Certificates -->
        <div style="background: var(--bg-primary); padding: 14px; border-radius: 14px; border: 1px solid var(--border); margin-bottom: 22px;">
          <h4 style="margin: 0 0 10px; font-size: 0.9rem; font-weight: 700; color: var(--text-primary);">
            ${t('resumes.certificates', { th: 'ใบรับรอง / ประกาศนียบัตร (Certificates)', en: 'Certificates' })}
          </h4>
          <div style="display: grid; grid-template-columns: 2fr 1fr 1fr auto; gap: 6px; margin-bottom: 10px;">
            <input type="text" id="wiz-cert-name" placeholder="AWS Certified Architect" style="padding: 8px 10px; border-radius: 8px; border: 1px solid var(--border); background: var(--bg-secondary); color: var(--text-primary); font-size: 0.85rem;">
            <input type="text" id="wiz-cert-issuer" placeholder="Amazon" style="padding: 8px 10px; border-radius: 8px; border: 1px solid var(--border); background: var(--bg-secondary); color: var(--text-primary); font-size: 0.85rem;">
            <input type="number" id="wiz-cert-year" placeholder="2024" value="2024" style="padding: 8px 10px; border-radius: 8px; border: 1px solid var(--border); background: var(--bg-secondary); color: var(--text-primary); font-size: 0.85rem;">
            <button type="button" id="btn-add-cert" style="padding: 0 12px; border-radius: 8px; border: none; background: var(--primary); color: #fff; font-weight: 600; font-size: 0.85rem; cursor: pointer;">
              + ${t('common.add', { th: 'เพิ่ม', en: 'Add' })}
            </button>
          </div>
          <!-- Certs list -->
          <div id="certs-tags-container" style="display: flex; flex-direction: column; gap: 6px;">
            ${certs.map((c, idx) => `
              <div style="display: flex; justify-content: space-between; align-items: center; background: var(--bg-secondary); padding: 6px 12px; border-radius: 10px; border: 1px solid var(--border); font-size: 0.82rem;">
                <span><strong>${c.name}</strong> - ${c.issuer} (${c.year})</span>
                <button type="button" class="btn-remove-cert" data-index="${idx}" style="border: none; background: transparent; color: var(--danger); cursor: pointer; padding: 2px;">&times;</button>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Navigation Buttons -->
        <div style="display: flex; justify-content: space-between;">
          <button type="button" id="btn-step4-back" class="btn-secondary" style="padding: 12px 24px; border-radius: 12px; font-weight: 600; font-size: 0.95rem; background: var(--bg-tertiary); color: var(--text-primary); border: 1px solid var(--border); cursor: pointer; display: flex; align-items: center; gap: 8px;">
            <i class="fas fa-arrow-left"></i>
            <span>${t('common.back', { th: 'ย้อนกลับ', en: 'Back' })}</span>
          </button>
          <button type="button" id="btn-step4-next" class="btn-primary" style="padding: 12px 28px; border-radius: 12px; font-weight: 600; font-size: 0.95rem; background: var(--primary); color: #fff; border: none; cursor: pointer; display: flex; align-items: center; gap: 8px;">
            <span>${t('common.next', { th: 'ถัดไป', en: 'Next' })}</span>
            <i class="fas fa-arrow-right"></i>
          </button>
        </div>
      </div>
    `;
  }

  // STEP 5: Additional Info & Review
  function renderStep5Review() {
    const p = wizardData?.personal || {};
    const completeness = getCompleteness(wizardData);

    return `
      <form id="wizard-form-step-5">
        <h3 style="font-size: 1.05rem; font-weight: 700; margin: 0 0 16px; color: var(--text-primary); display: flex; align-items: center; gap: 8px;">
          <i class="fas fa-check-circle" style="color: var(--primary);"></i>
          <span>${t('resumes.step5Title', { th: 'ขั้นตอนที่ 5: ข้อมูลเพิ่มเติมและการตรวจสอบ', en: 'Step 5: Additional Info & Review' })}</span>
        </h3>

        <!-- Expected Salary -->
        <div class="form-group" style="margin-bottom: 14px;">
          <label style="display: block; font-size: 0.85rem; font-weight: 600; color: var(--text-primary); margin-bottom: 5px;">
            ${t('resumes.expectedSalary', { th: 'เงินเดือนที่คาดหวัง (บาท/เดือน) *', en: 'Expected Salary (THB/month) *' })}
          </label>
          <div style="position: relative;">
            <span style="position: absolute; left: 12px; top: 50%; transform: translateY(-50%); font-weight: 700; color: var(--text-secondary);">฿</span>
            <input type="number" id="wiz-salary" required value="${wizardData?.expectedSalary || 45000}" style="width: 100%; padding: 10px 12px 10px 32px; border-radius: 10px; border: 1px solid var(--border); background: var(--bg-primary); color: var(--text-primary); font-size: 0.95rem; font-weight: 600; outline: none;">
          </div>
        </div>

        <!-- Available Date -->
        <div class="form-group" style="margin-bottom: 14px;">
          <label style="display: block; font-size: 0.85rem; font-weight: 600; color: var(--text-primary); margin-bottom: 5px;">
            ${t('resumes.availableDate', { th: 'วันที่พร้อมเริ่มงาน *', en: 'Available Start Date *' })}
          </label>
          <input type="date" id="wiz-available-date" required value="${wizardData?.availableDate || '2026-11-01'}" style="width: 100%; padding: 10px 12px; border-radius: 10px; border: 1px solid var(--border); background: var(--bg-primary); color: var(--text-primary); font-size: 0.9rem; outline: none;">
        </div>

        <!-- Willing to Relocate Toggle -->
        <div style="margin-bottom: 20px; background: var(--bg-primary); padding: 12px 14px; border-radius: 12px; border: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center;">
          <div>
            <span style="display: block; font-size: 0.85rem; font-weight: 600; color: var(--text-primary);">${t('resumes.relocate', { th: 'สามารถปฏิบัติงานต่างจังหวัด/ย้ายที่อยู่ได้', en: 'Willing to Relocate' })}</span>
            <span style="font-size: 0.75rem; color: var(--text-secondary);">${t('resumes.relocateSub', { th: 'เปิดรับตำแหน่งงานที่ต้องเดินทางหรือย้ายสถานที่', en: 'Open to travel or location transfer' })}</span>
          </div>
          <input type="checkbox" id="wiz-relocate" ${wizardData?.relocate ? 'checked' : ''} style="width: 20px; height: 20px; accent-color: var(--primary); cursor: pointer;">
        </div>

        <!-- Summary Preview Box -->
        <div style="background: var(--bg-tertiary); border-radius: 14px; padding: 16px; margin-bottom: 24px; border: 1px solid var(--border);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
            <h4 style="margin: 0; font-size: 0.95rem; font-weight: 700; color: var(--text-primary);">
              ${t('resumes.summaryOverview', { th: 'สรุปภาพรวมเรซูเม่', en: 'Resume Overview Summary' })}
            </h4>
            <span style="font-size: 0.8rem; font-weight: 700; color: var(--success); background: #D1FAE5; padding: 3px 8px; border-radius: 10px;">
              ${completeness}% Complete
            </span>
          </div>

          <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
            <span style="font-size: 2.2rem;">${p.photo || '👨‍💻'}</span>
            <div>
              <h5 style="margin: 0; font-size: 0.95rem; font-weight: 700; color: var(--text-primary);">${p.name || ''} (${p.nameEn || ''})</h5>
              <p style="margin: 2px 0 0; font-size: 0.8rem; color: var(--text-secondary);">${wizardData?.title || ''} &bull; ${p.email || ''}</p>
            </div>
          </div>

          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; text-align: center; font-size: 0.78rem;">
            <div style="background: var(--bg-secondary); padding: 8px; border-radius: 10px; border: 1px solid var(--border);">
              <span style="display: block; font-size: 1.1rem; font-weight: 700; color: var(--primary);">${wizardData?.education?.length || 0}</span>
              <span style="color: var(--text-secondary);">${t('resumes.education', { th: 'การศึกษา', en: 'Education' })}</span>
            </div>
            <div style="background: var(--bg-secondary); padding: 8px; border-radius: 10px; border: 1px solid var(--border);">
              <span style="display: block; font-size: 1.1rem; font-weight: 700; color: var(--primary);">${wizardData?.experience?.length || 0}</span>
              <span style="color: var(--text-secondary);">${t('resumes.experience', { th: 'ประสบการณ์', en: 'Experience' })}</span>
            </div>
            <div style="background: var(--bg-secondary); padding: 8px; border-radius: 10px; border: 1px solid var(--border);">
              <span style="display: block; font-size: 1.1rem; font-weight: 700; color: var(--primary);">${wizardData?.skills?.length || 0}</span>
              <span style="color: var(--text-secondary);">${t('resumes.skills', { th: 'ทักษะ', en: 'Skills' })}</span>
            </div>
          </div>
        </div>

        <!-- Navigation Buttons -->
        <div style="display: flex; justify-content: space-between;">
          <button type="button" id="btn-step5-back" class="btn-secondary" style="padding: 12px 24px; border-radius: 12px; font-weight: 600; font-size: 0.95rem; background: var(--bg-tertiary); color: var(--text-primary); border: 1px solid var(--border); cursor: pointer; display: flex; align-items: center; gap: 8px;">
            <i class="fas fa-arrow-left"></i>
            <span>${t('common.back', { th: 'ย้อนกลับ', en: 'Back' })}</span>
          </button>
          <button type="submit" class="btn-primary" style="padding: 12px 32px; border-radius: 12px; font-weight: 700; font-size: 0.95rem; background: var(--success); color: #fff; border: none; cursor: pointer; display: flex; align-items: center; gap: 8px; box-shadow: 0 4px 12px rgba(16,185,129,0.35);">
            <i class="fas fa-check"></i>
            <span>${wizardResumeId ? t('common.save', { th: 'บันทึกการแก้ไข', en: 'Save Changes' }) : t('resumes.submitResume', { th: 'สร้างเรซูเม่เรียบร้อย', en: 'Complete & Save' })}</span>
          </button>
        </div>
      </form>
    `;
  }

  /**
   * 3. RESUME PREVIEW PAGE (A4 Display with Themes & Print)
   */
  function renderView(param) {
    const id = typeof param === 'object' && param ? param.id : param;
    let resume = null;

    if (window.Data && window.Data.getResume) {
      resume = window.Data.getResume(id);
    }

    if (!resume) {
      return `
        <div class="card" style="padding: 32px 16px; text-align: center; background: var(--bg-secondary); border-radius: 16px; margin: 20px;">
          <i class="fas fa-file-excel" style="font-size: 2.5rem; color: var(--danger); margin-bottom: 12px;"></i>
          <h3>${t('resumes.notFound', { th: 'ไม่พบข้อมูลเรซูเม่', en: 'Resume Not Found' })}</h3>
          <p style="color: var(--text-secondary);">${t('resumes.notFoundSub', { th: 'เรซูเม่นี้อาจถูกลบหรือไม่มีอยู่ในระบบ', en: 'This resume record does not exist or has been removed.' })}</p>
          <button onclick="window.App.navigate('resumes')" class="btn-primary" style="margin-top: 14px; padding: 8px 24px; border-radius: 10px;">${t('common.back', { th: 'กลับสู่หน้ารายการ', en: 'Back to List' })}</button>
        </div>
      `;
    }

    const p = resume.personal || {};
    const isEn = window.App && typeof window.App.getLang === 'function' ? window.App.getLang() === 'en' : false;
    const name = isEn ? (p.nameEn || p.name) : (p.name || p.nameEn);
    const summary = isEn ? (p.summaryEn || p.summary) : (p.summary || p.summaryEn);
    const curUser = window.App && window.App.getCurrentUser ? window.App.getCurrentUser() : null;
    const canEdit = (curUser && (curUser.role === 'hr' || curUser.id === resume.userId || curUser.email === p.email));

    // Theme color palettes
    const themeStyles = {
      blue: { primary: '#2563EB', light: '#EFF6FF', headerBg: '#1E3A8A', badgeBg: '#DBEAFE' },
      green: { primary: '#059669', light: '#ECFDF5', headerBg: '#064E3B', badgeBg: '#D1FAE5' },
      dark: { primary: '#1E293B', light: '#F1F5F9', headerBg: '#0F172A', badgeBg: '#E2E8F0' }
    }[currentTheme || 'blue'];

    return `
      <!-- Print styles -->
      <style>
        @media print {
          body * { visibility: hidden !important; }
          #resume-a4-preview-container, #resume-a4-preview-container * { visibility: visible !important; }
          #resume-a4-preview-container {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 20px !important;
            box-shadow: none !important;
            border: none !important;
            background: #ffffff !important;
            color: #000000 !important;
          }
          .no-print { display: none !important; }
        }
      </style>

      <div class="resume-preview-module animate-fade-in" style="padding-bottom: 80px;">
        <!-- Top Action Toolbar -->
        <div class="no-print" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; flex-wrap: wrap; gap: 10px;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <button id="btn-back-resumes" class="btn-icon" style="background: var(--bg-tertiary); border: 1px solid var(--border); border-radius: 10px; width: 38px; height: 38px; cursor: pointer; color: var(--text-primary); display: flex; align-items: center; justify-content: center;">
              <i class="fas fa-arrow-left"></i>
            </button>
            <h2 style="font-size: 1.15rem; font-weight: 700; margin: 0; color: var(--text-primary);">
              ${t('resumes.preview', { th: 'ตัวอย่างเรซูเม่', en: 'Resume Preview' })}
            </h2>
          </div>

          <div style="display: flex; align-items: center; gap: 8px;">
            <!-- Theme Chooser -->
            <div class="theme-chooser" style="display: flex; gap: 5px; background: var(--bg-secondary); padding: 4px; border-radius: 12px; border: 1px solid var(--border);">
              <button class="theme-btn ${currentTheme === 'blue' ? 'active' : ''}" data-theme="blue" title="Blue Theme" style="width: 26px; height: 26px; border-radius: 50%; background: #2563EB; border: 2px solid ${currentTheme === 'blue' ? '#fff' : 'transparent'}; box-shadow: ${currentTheme === 'blue' ? '0 0 0 2px #2563EB' : 'none'}; cursor: pointer;"></button>
              <button class="theme-btn ${currentTheme === 'green' ? 'active' : ''}" data-theme="green" title="Green Theme" style="width: 26px; height: 26px; border-radius: 50%; background: #059669; border: 2px solid ${currentTheme === 'green' ? '#fff' : 'transparent'}; box-shadow: ${currentTheme === 'green' ? '0 0 0 2px #059669' : 'none'}; cursor: pointer;"></button>
              <button class="theme-btn ${currentTheme === 'dark' ? 'active' : ''}" data-theme="dark" title="Dark Theme" style="width: 26px; height: 26px; border-radius: 50%; background: #1E293B; border: 2px solid ${currentTheme === 'dark' ? '#fff' : 'transparent'}; box-shadow: ${currentTheme === 'dark' ? '0 0 0 2px #1E293B' : 'none'}; cursor: pointer;"></button>
            </div>

            <!-- Print Button -->
            <button id="btn-print-resume" style="padding: 8px 14px; border-radius: 10px; border: 1px solid var(--border); background: var(--bg-secondary); color: var(--text-primary); font-size: 0.85rem; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 6px;">
              <i class="fas fa-print" style="color: var(--primary);"></i>
              <span>${t('common.print', { th: 'พิมพ์ / PDF', en: 'Print / PDF' })}</span>
            </button>

            <!-- Edit Button (if owner or HR) -->
            ${canEdit ? `
              <button id="btn-edit-current-resume" data-id="${resume.id}" style="padding: 8px 14px; border-radius: 10px; border: none; background: var(--primary); color: #fff; font-size: 0.85rem; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 6px;">
                <i class="fas fa-edit"></i>
                <span>${t('common.edit', { th: 'แก้ไข', en: 'Edit' })}</span>
              </button>
            ` : ''}
          </div>
        </div>

        <!-- A4 RESUME PREVIEW CONTAINER -->
        <div id="resume-a4-preview-container" class="resume-a4" style="background: #ffffff; color: #1E293B; border-radius: 16px; border: 1px solid var(--border); box-shadow: 0 4px 20px var(--shadow); overflow: hidden; max-width: 800px; margin: 0 auto;">
          <!-- A4 Header Banner -->
          <div style="background: ${themeStyles.headerBg}; color: #ffffff; padding: 24px 20px; display: flex; align-items: center; gap: 18px; border-bottom: 4px solid ${themeStyles.primary};">
            <span style="font-size: 3.2rem; line-height: 1; width: 72px; height: 72px; background: rgba(255,255,255,0.15); border-radius: 18px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
              ${p.photo || '👨‍💻'}
            </span>
            <div style="flex: 1;">
              <h1 style="margin: 0; font-size: 1.45rem; font-weight: 800; color: #ffffff; letter-spacing: -0.3px;">
                ${name}
              </h1>
              <p style="margin: 3px 0 8px; font-size: 0.95rem; color: #E0E7FF; font-weight: 600;">
                ${resume.title || ''}
              </p>
              <!-- Contact chips -->
              <div style="display: flex; flex-wrap: wrap; gap: 12px; font-size: 0.78rem; color: #E2E8F0;">
                ${p.email ? `<span><i class="fas fa-envelope"></i> ${p.email}</span>` : ''}
                ${p.phone ? `<span><i class="fas fa-phone"></i> ${p.phone}</span>` : ''}
                ${p.address ? `<span><i class="fas fa-map-marker-alt"></i> ${p.address}</span>` : ''}
                ${p.linkedin ? `<span><i class="fab fa-linkedin"></i> LinkedIn</span>` : ''}
                ${p.portfolio ? `<span><i class="fas fa-globe"></i> Portfolio</span>` : ''}
              </div>
            </div>
          </div>

          <!-- A4 Body -->
          <div style="padding: 22px 20px;">
            <!-- Summary -->
            ${summary ? `
              <div style="margin-bottom: 20px;">
                <h4 style="margin: 0 0 8px; font-size: 0.95rem; font-weight: 700; color: ${themeStyles.primary}; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid ${themeStyles.light}; padding-bottom: 4px;">
                  <i class="fas fa-user-tie" style="margin-right: 6px;"></i>${t('resumes.summary', { th: 'ประวัติโดยย่อ', en: 'Professional Summary' })}
                </h4>
                <p style="margin: 0; font-size: 0.88rem; line-height: 1.5; color: #475569;">
                  ${summary}
                </p>
              </div>
            ` : ''}

            <!-- Work Experience -->
            ${Array.isArray(resume.experience) && resume.experience.length > 0 ? `
              <div style="margin-bottom: 20px;">
                <h4 style="margin: 0 0 12px; font-size: 0.95rem; font-weight: 700; color: ${themeStyles.primary}; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid ${themeStyles.light}; padding-bottom: 4px;">
                  <i class="fas fa-briefcase" style="margin-right: 6px;"></i>${t('resumes.experience', { th: 'ประสบการณ์การทำงาน', en: 'Work Experience' })}
                </h4>
                <div style="display: flex; flex-direction: column; gap: 14px;">
                  ${resume.experience.map(exp => `
                    <div style="position: relative; padding-left: 16px; border-left: 2px solid ${themeStyles.primary};">
                      <div style="display: flex; justify-content: space-between; align-items: baseline; flex-wrap: wrap;">
                        <h5 style="margin: 0; font-size: 0.92rem; font-weight: 700; color: #1E293B;">
                          ${exp.title} &bull; <span style="font-weight: 600; color: ${themeStyles.primary};">${exp.company}</span>
                        </h5>
                        <span style="font-size: 0.78rem; font-weight: 600; color: #64748B;">
                          ${exp.startDate} - ${exp.current ? (t('resumes.present', { th: 'ปัจจุบัน', en: 'Present' })) : (exp.endDate || '')}
                        </span>
                      </div>
                      ${exp.description ? `
                        <p style="margin: 4px 0 0; font-size: 0.82rem; color: #475569; line-height: 1.4;">
                          ${exp.description}
                        </p>
                      ` : ''}
                    </div>
                  `).join('')}
                </div>
              </div>
            ` : ''}

            <!-- Education -->
            ${Array.isArray(resume.education) && resume.education.length > 0 ? `
              <div style="margin-bottom: 20px;">
                <h4 style="margin: 0 0 12px; font-size: 0.95rem; font-weight: 700; color: ${themeStyles.primary}; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid ${themeStyles.light}; padding-bottom: 4px;">
                  <i class="fas fa-graduation-cap" style="margin-right: 6px;"></i>${t('resumes.education', { th: 'ประวัติการศึกษา', en: 'Education' })}
                </h4>
                <div style="display: flex; flex-direction: column; gap: 10px;">
                  ${resume.education.map(edu => `
                    <div style="display: flex; justify-content: space-between; align-items: baseline; flex-wrap: wrap; background: ${themeStyles.light}; padding: 8px 12px; border-radius: 8px;">
                      <div>
                        <span style="font-weight: 700; font-size: 0.88rem; color: #1E293B;">${edu.degree} (${edu.field})</span>
                        <div style="font-size: 0.8rem; color: #64748B;">${edu.institution}</div>
                      </div>
                      <div style="text-align: right; font-size: 0.8rem; color: #64748B;">
                        <span>${edu.year || ''}</span>
                        ${edu.gpa ? ` &bull; <strong>GPA ${edu.gpa}</strong>` : ''}
                      </div>
                    </div>
                  `).join('')}
                </div>
              </div>
            ` : ''}

            <!-- Two-Column Grid for Skills & Languages/Certs -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 18px;">
              <!-- Skills -->
              <div>
                <h4 style="margin: 0 0 10px; font-size: 0.9rem; font-weight: 700; color: ${themeStyles.primary}; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid ${themeStyles.light}; padding-bottom: 4px;">
                  <i class="fas fa-tools" style="margin-right: 6px;"></i>${t('resumes.skills', { th: 'ทักษะความสามารถ', en: 'Skills' })}
                </h4>
                <div style="display: flex; flex-wrap: wrap; gap: 6px;">
                  ${Array.isArray(resume.skills) && resume.skills.length > 0 ? resume.skills.map(s => `
                    <span style="font-size: 0.78rem; font-weight: 600; background: ${themeStyles.light}; color: ${themeStyles.primary}; padding: 4px 9px; border-radius: 6px; border: 1px solid ${themeStyles.badgeBg};">
                      ${s.name} ${s.level ? `(${s.level})` : ''}
                    </span>
                  `).join('') : '<span style="font-size: 0.8rem; color: #94A3B8;">-</span>'}
                </div>
              </div>

              <!-- Languages -->
              <div>
                <h4 style="margin: 0 0 10px; font-size: 0.9rem; font-weight: 700; color: ${themeStyles.primary}; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid ${themeStyles.light}; padding-bottom: 4px;">
                  <i class="fas fa-language" style="margin-right: 6px;"></i>${t('resumes.languages', { th: 'ภาษา', en: 'Languages' })}
                </h4>
                <div style="display: flex; flex-direction: column; gap: 5px;">
                  ${Array.isArray(resume.languages) && resume.languages.length > 0 ? resume.languages.map(l => `
                    <div style="display: flex; justify-content: space-between; font-size: 0.82rem;">
                      <span style="font-weight: 600; color: #1E293B;">${l.name}</span>
                      <span style="color: #64748B;">${l.level}</span>
                    </div>
                  `).join('') : '<span style="font-size: 0.8rem; color: #94A3B8;">-</span>'}
                </div>
              </div>
            </div>

            <!-- Certificates & Additional Info -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; border-top: 1px solid #E2E8F0; padding-top: 14px;">
              <div>
                <h5 style="margin: 0 0 6px; font-size: 0.85rem; font-weight: 700; color: #64748B; text-transform: uppercase;">
                  ${t('resumes.certificates', { th: 'ใบรับรองวิชาชีพ', en: 'Certificates' })}
                </h5>
                ${Array.isArray(resume.certificates) && resume.certificates.length > 0 ? resume.certificates.map(c => `
                  <div style="font-size: 0.8rem; color: #334155; margin-bottom: 3px;">
                    &bull; <strong>${c.name}</strong> - ${c.issuer} (${c.year})
                  </div>
                `).join('') : '<span style="font-size: 0.8rem; color: #94A3B8;">-</span>'}
              </div>

              <div>
                <h5 style="margin: 0 0 6px; font-size: 0.85rem; font-weight: 700; color: #64748B; text-transform: uppercase;">
                  ${t('resumes.additionalDetails', { th: 'ข้อมูลเพิ่มเติม', en: 'Additional Details' })}
                </h5>
                <div style="font-size: 0.8rem; color: #334155; line-height: 1.5;">
                  <div>${t('resumes.expectedSalary', { th: 'เงินเดือนที่ต้องการ:', en: 'Salary:' })} <strong>฿${Number(resume.expectedSalary || 0).toLocaleString()}</strong></div>
                  <div>${t('resumes.availableDate', { th: 'เริ่มงานได้:', en: 'Available:' })} <strong>${formatDate(resume.availableDate)}</strong></div>
                  <div>${t('resumes.relocate', { th: 'ย้ายที่อยู่/เดินทาง:', en: 'Relocate:' })} <strong>${resume.relocate ? '✅ ' + t('common.yes', { th: 'ยินดี', en: 'Yes' }) : '❌ ' + t('common.no', { th: 'ไม่สะดวก', en: 'No' })}</strong></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // --- EVENT LISTENERS & LIFECYCLE ---

  function afterRender(params) {
    // HR Search input
    const searchInput = document.getElementById('hr-resume-search-input');
    const clearSearchBtn = document.getElementById('btn-clear-resume-search');

    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        searchKeyword = e.target.value;
        const main = document.getElementById('app-content');
        if (main) {
          main.innerHTML = render(params);
          afterRender(params);
          const inp = document.getElementById('hr-resume-search-input');
          if (inp) {
            inp.focus();
            inp.setSelectionRange(inp.value.length, inp.value.length);
          }
        }
      });
    }

    if (clearSearchBtn) {
      clearSearchBtn.addEventListener('click', () => {
        searchKeyword = '';
        const main = document.getElementById('app-content');
        if (main) {
          main.innerHTML = render(params);
          afterRender(params);
        }
      });
    }

    // HR Resume card click -> view
    const cards = document.querySelectorAll('.resume-card[data-id]');
    cards.forEach(c => {
      c.addEventListener('click', () => {
        const id = c.getAttribute('data-id');
        if (id) {
          if (window.App && window.App.navigate) {
            window.App.navigate('resumes/' + id);
          } else {
            window.location.hash = `#resumes/${id}`;
          }
        }
      });
    });

    // Applicant action buttons
    document.querySelectorAll('.btn-view-resume').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-id');
        if (id) {
          if (window.App && window.App.navigate) {
            window.App.navigate('resumes/' + id);
          } else {
            window.location.hash = `#resumes/${id}`;
          }
        }
      });
    });

    document.querySelectorAll('.btn-edit-resume').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-id');
        if (id) {
          if (window.App && window.App.navigate) {
            window.App.navigate('resumes/' + id + '/edit');
          } else {
            window.location.hash = `#resumes/${id}/edit`;
          }
        }
      });
    });

    document.querySelectorAll('.btn-delete-resume').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-id');
        const confirmMsg = t('resumes.confirmDelete', { th: 'คุณแน่ใจหรือไม่ว่าต้องการลบเรซูเม่นี้?', en: 'Are you sure you want to delete this resume?' });
        if (confirm(confirmMsg)) {
          if (window.Data && window.Data.deleteResume) {
            window.Data.deleteResume(id);
            if (window.App && window.App.showToast) {
              window.App.showToast(t('resumes.deleteSuccess', { th: 'ลบเรซูเม่เรียบร้อยแล้ว', en: 'Resume deleted successfully' }), 'info');
            }
            const main = document.getElementById('app-content');
            if (main) {
              main.innerHTML = render(params);
              afterRender(params);
            }
          }
        }
      });
    });

    // Create buttons
    const btnCreateHead = document.getElementById('btn-create-resume-header');
    const btnCreateFirst = document.getElementById('btn-create-first-resume');
    const fabCreate = document.getElementById('fab-create-resume');

    const goCreate = () => {
      if (window.App && window.App.navigate) {
        window.App.navigate('resumes/new');
      } else {
        window.location.hash = '#resumes/new';
      }
    };

    if (btnCreateHead) btnCreateHead.addEventListener('click', goCreate);
    if (btnCreateFirst) btnCreateFirst.addEventListener('click', goCreate);
    if (fabCreate) fabCreate.addEventListener('click', goCreate);
  }

  function afterRenderCreate() {
    bindWizardEvents();
  }

  function afterRenderEdit(param) {
    bindWizardEvents();
  }

  // Unified Wizard Event Handlers
  function bindWizardEvents() {
    // Cancel wizard
    const btnCancel = document.getElementById('btn-cancel-wizard');
    if (btnCancel) {
      btnCancel.addEventListener('click', () => {
        if (confirm(t('resumes.confirmCancelWizard', { th: 'ต้องการออกจากการสร้างเรซูเม่หรือไม่? ข้อมูลที่ไม่ได้บันทึกอาจสูญหาย', en: 'Leave wizard? Unsaved changes will be lost.' }))) {
          if (window.App && window.App.navigate) {
            window.App.navigate('resumes');
          } else {
            window.location.hash = '#resumes';
          }
        }
      });
    }

    // Step 1: Avatar click & Next
    if (wizardStep === 1) {
      const avatarOptions = document.querySelectorAll('.avatar-option');
      avatarOptions.forEach(opt => {
        opt.addEventListener('click', () => {
          const emoji = opt.getAttribute('data-emoji');
          document.getElementById('wiz-photo').value = emoji;
          avatarOptions.forEach(o => {
            o.style.borderColor = 'var(--border)';
            o.style.background = 'var(--bg-primary)';
          });
          opt.style.borderColor = 'var(--primary)';
          opt.style.background = 'var(--primary-light)';
        });
      });

      const formStep1 = document.getElementById('wizard-form-step-1');
      if (formStep1) {
        formStep1.addEventListener('submit', (e) => {
          e.preventDefault();
          wizardData.title = document.getElementById('wiz-resume-title')?.value.trim() || 'My Resume';
          wizardData.personal = {
            photo: document.getElementById('wiz-photo')?.value || '👨‍💻',
            name: document.getElementById('wiz-name-th')?.value.trim() || '',
            nameEn: document.getElementById('wiz-name-en')?.value.trim() || '',
            email: document.getElementById('wiz-email')?.value.trim() || '',
            phone: document.getElementById('wiz-phone')?.value.trim() || '',
            address: document.getElementById('wiz-address')?.value.trim() || '',
            linkedin: document.getElementById('wiz-linkedin')?.value.trim() || '',
            portfolio: document.getElementById('wiz-portfolio')?.value.trim() || '',
            summary: document.getElementById('wiz-summary-th')?.value.trim() || '',
            summaryEn: document.getElementById('wiz-summary-en')?.value.trim() || ''
          };

          wizardStep = 2;
          refreshWizardDom();
        });
      }
    }

    // Step 2: Education
    if (wizardStep === 2) {
      const btnBack2 = document.getElementById('btn-step2-back');
      const btnNext2 = document.getElementById('btn-step2-next');
      const btnShowAddEdu = document.getElementById('btn-show-add-edu');
      const btnCancelAddEdu = document.getElementById('btn-cancel-add-edu');
      const formContainer = document.getElementById('add-edu-form-container');
      const btnSaveEduEntry = document.getElementById('btn-save-edu-entry');

      if (btnBack2) {
        btnBack2.addEventListener('click', () => {
          wizardStep = 1;
          refreshWizardDom();
        });
      }

      if (btnNext2) {
        btnNext2.addEventListener('click', () => {
          wizardStep = 3;
          refreshWizardDom();
        });
      }

      if (btnShowAddEdu && formContainer) {
        btnShowAddEdu.addEventListener('click', () => {
          formContainer.style.display = 'block';
        });
      }

      if (btnCancelAddEdu && formContainer) {
        btnCancelAddEdu.addEventListener('click', () => {
          formContainer.style.display = 'none';
        });
      }

      if (btnSaveEduEntry) {
        btnSaveEduEntry.addEventListener('click', () => {
          const degEl = document.getElementById('edu-degree');
          const degree = degEl?.value || 'ปริญญาตรี';
          const degreeEn = degEl?.options[degEl.selectedIndex]?.getAttribute('data-en') || 'Bachelor';
          const field = document.getElementById('edu-field')?.value.trim() || '';
          const institution = document.getElementById('edu-institution')?.value.trim() || '';
          const year = parseInt(document.getElementById('edu-year')?.value, 10) || 2022;
          const gpa = parseFloat(document.getElementById('edu-gpa')?.value) || 3.5;

          if (!field || !institution) {
            if (window.App && window.App.showToast) {
              window.App.showToast(t('resumes.errorRequiredFields', { th: 'กรุณากรอกสาขาวิชาและสถาบันการศึกษา', en: 'Field and Institution required' }), 'error');
            }
            return;
          }

          if (!Array.isArray(wizardData.education)) wizardData.education = [];
          wizardData.education.push({ degree, degreeEn, field, fieldEn: field, institution, institutionEn: institution, year, gpa });
          refreshWizardDom();
        });
      }

      // Remove edu
      document.querySelectorAll('.btn-remove-edu').forEach(btn => {
        btn.addEventListener('click', () => {
          const idx = parseInt(btn.getAttribute('data-index'), 10);
          if (!isNaN(idx) && wizardData.education) {
            wizardData.education.splice(idx, 1);
            refreshWizardDom();
          }
        });
      });
    }

    // Step 3: Experience
    if (wizardStep === 3) {
      const btnBack3 = document.getElementById('btn-step3-back');
      const btnNext3 = document.getElementById('btn-step3-next');
      const btnShowAddExp = document.getElementById('btn-show-add-exp');
      const btnCancelAddExp = document.getElementById('btn-cancel-add-exp');
      const formContainer = document.getElementById('add-exp-form-container');
      const btnSaveExpEntry = document.getElementById('btn-save-exp-entry');
      const chkCurrent = document.getElementById('exp-current');
      const inputEnd = document.getElementById('exp-end');

      if (chkCurrent && inputEnd) {
        chkCurrent.addEventListener('change', () => {
          inputEnd.disabled = chkCurrent.checked;
          if (chkCurrent.checked) inputEnd.value = '';
        });
      }

      if (btnBack3) {
        btnBack3.addEventListener('click', () => {
          wizardStep = 2;
          refreshWizardDom();
        });
      }

      if (btnNext3) {
        btnNext3.addEventListener('click', () => {
          wizardStep = 4;
          refreshWizardDom();
        });
      }

      if (btnShowAddExp && formContainer) {
        btnShowAddExp.addEventListener('click', () => {
          formContainer.style.display = 'block';
        });
      }

      if (btnCancelAddExp && formContainer) {
        btnCancelAddExp.addEventListener('click', () => {
          formContainer.style.display = 'none';
        });
      }

      if (btnSaveExpEntry) {
        btnSaveExpEntry.addEventListener('click', () => {
          const title = document.getElementById('exp-title')?.value.trim() || '';
          const company = document.getElementById('exp-company')?.value.trim() || '';
          const startDate = document.getElementById('exp-start')?.value || '';
          const current = chkCurrent?.checked || false;
          const endDate = current ? '' : (document.getElementById('exp-end')?.value || '');
          const description = document.getElementById('exp-desc')?.value.trim() || '';

          if (!title || !company) {
            if (window.App && window.App.showToast) {
              window.App.showToast(t('resumes.errorExpRequired', { th: 'กรุณากรอกตำแหน่งงานและชื่อบริษัท', en: 'Job title and company required' }), 'error');
            }
            return;
          }

          if (!Array.isArray(wizardData.experience)) wizardData.experience = [];
          wizardData.experience.push({ title, company, companyEn: company, startDate, endDate, current, description, descriptionEn: description });
          refreshWizardDom();
        });
      }

      // Remove exp
      document.querySelectorAll('.btn-remove-exp').forEach(btn => {
        btn.addEventListener('click', () => {
          const idx = parseInt(btn.getAttribute('data-index'), 10);
          if (!isNaN(idx) && wizardData.experience) {
            wizardData.experience.splice(idx, 1);
            refreshWizardDom();
          }
        });
      });
    }

    // Step 4: Skills & Langs & Certs
    if (wizardStep === 4) {
      const btnBack4 = document.getElementById('btn-step4-back');
      const btnNext4 = document.getElementById('btn-step4-next');
      const btnAddSkill = document.getElementById('btn-add-skill');
      const btnAddLang = document.getElementById('btn-add-lang');
      const btnAddCert = document.getElementById('btn-add-cert');

      if (btnBack4) {
        btnBack4.addEventListener('click', () => {
          wizardStep = 3;
          refreshWizardDom();
        });
      }

      if (btnNext4) {
        btnNext4.addEventListener('click', () => {
          wizardStep = 5;
          refreshWizardDom();
        });
      }

      // Add Skill
      if (btnAddSkill) {
        btnAddSkill.addEventListener('click', () => {
          const nameInput = document.getElementById('wiz-skill-name');
          const levelSelect = document.getElementById('wiz-skill-level');
          const name = nameInput?.value.trim();
          const level = levelSelect?.value || 'intermediate';

          if (name) {
            if (!Array.isArray(wizardData.skills)) wizardData.skills = [];
            wizardData.skills.push({ name, level });
            refreshWizardDom();
          }
        });
      }

      // Remove Skill
      document.querySelectorAll('.btn-remove-skill').forEach(btn => {
        btn.addEventListener('click', () => {
          const idx = parseInt(btn.getAttribute('data-index'), 10);
          if (!isNaN(idx) && wizardData.skills) {
            wizardData.skills.splice(idx, 1);
            refreshWizardDom();
          }
        });
      });

      // Add Language
      if (btnAddLang) {
        btnAddLang.addEventListener('click', () => {
          const nameInput = document.getElementById('wiz-lang-name');
          const levelSelect = document.getElementById('wiz-lang-level');
          const name = nameInput?.value.trim();
          const level = levelSelect?.value || 'good';

          if (name) {
            if (!Array.isArray(wizardData.languages)) wizardData.languages = [];
            wizardData.languages.push({ name, nameEn: name, level });
            refreshWizardDom();
          }
        });
      }

      // Remove Language
      document.querySelectorAll('.btn-remove-lang').forEach(btn => {
        btn.addEventListener('click', () => {
          const idx = parseInt(btn.getAttribute('data-index'), 10);
          if (!isNaN(idx) && wizardData.languages) {
            wizardData.languages.splice(idx, 1);
            refreshWizardDom();
          }
        });
      });

      // Add Cert
      if (btnAddCert) {
        btnAddCert.addEventListener('click', () => {
          const name = document.getElementById('wiz-cert-name')?.value.trim();
          const issuer = document.getElementById('wiz-cert-issuer')?.value.trim();
          const year = parseInt(document.getElementById('wiz-cert-year')?.value, 10) || 2024;

          if (name && issuer) {
            if (!Array.isArray(wizardData.certificates)) wizardData.certificates = [];
            wizardData.certificates.push({ name, issuer, year });
            refreshWizardDom();
          }
        });
      }

      // Remove Cert
      document.querySelectorAll('.btn-remove-cert').forEach(btn => {
        btn.addEventListener('click', () => {
          const idx = parseInt(btn.getAttribute('data-index'), 10);
          if (!isNaN(idx) && wizardData.certificates) {
            wizardData.certificates.splice(idx, 1);
            refreshWizardDom();
          }
        });
      });
    }

    // Step 5: Submit
    if (wizardStep === 5) {
      const btnBack5 = document.getElementById('btn-step5-back');
      if (btnBack5) {
        btnBack5.addEventListener('click', () => {
          wizardStep = 4;
          refreshWizardDom();
        });
      }

      const formStep5 = document.getElementById('wizard-form-step-5');
      if (formStep5) {
        formStep5.addEventListener('submit', (e) => {
          e.preventDefault();

          wizardData.expectedSalary = parseInt(document.getElementById('wiz-salary')?.value, 10) || 45000;
          wizardData.availableDate = document.getElementById('wiz-available-date')?.value || '2026-11-01';
          wizardData.relocate = document.getElementById('wiz-relocate')?.checked || false;
          wizardData.updatedAt = new Date().toISOString();

          // Save via Data
          if (window.Data && window.Data.saveResume) {
            window.Data.saveResume(wizardData);
          }

          if (window.App && window.App.showToast) {
            window.App.showToast(t('resumes.saveSuccess', { th: 'บันทึกเรซูเม่เรียบร้อยแล้ว!', en: 'Resume saved successfully!' }), 'success');
          }

          // Navigate to preview page
          if (window.App && window.App.navigate) {
            window.App.navigate('resumes/' + wizardData.id);
          } else {
            window.location.hash = `#resumes/${wizardData.id}`;
          }
        });
      }
    }
  }

  function refreshWizardDom() {
    const main = document.getElementById('app-content');
    if (main) {
      main.innerHTML = renderWizard();
      bindWizardEvents();
    }
  }

  function afterRenderView(param) {
    const id = typeof param === 'object' && param ? param.id : param;

    // Back button
    const backBtn = document.getElementById('btn-back-resumes');
    if (backBtn) {
      backBtn.addEventListener('click', () => {
        if (window.App && window.App.navigate) {
          window.App.navigate('resumes');
        } else {
          window.location.hash = '#resumes';
        }
      });
    }

    // Print button
    const printBtn = document.getElementById('btn-print-resume');
    if (printBtn) {
      printBtn.addEventListener('click', () => {
        window.print();
      });
    }

    // Edit button
    const editBtn = document.getElementById('btn-edit-current-resume');
    if (editBtn) {
      editBtn.addEventListener('click', () => {
        const resumeId = editBtn.getAttribute('data-id') || id;
        if (window.App && window.App.navigate) {
          window.App.navigate('resumes/' + resumeId + '/edit');
        } else {
          window.location.hash = `#resumes/${resumeId}/edit`;
        }
      });
    }

    // Theme selector buttons
    document.querySelectorAll('.theme-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const selected = btn.getAttribute('data-theme');
        if (selected && selected !== currentTheme) {
          currentTheme = selected;
          const main = document.getElementById('app-content');
          if (main) {
            main.innerHTML = renderView(id);
            afterRenderView(id);
          }
        }
      });
    });
  }

  // Public module API
  return {
    render,
    afterRender,
    renderCreate,
    afterRenderCreate,
    renderView,
    afterRenderView,
    renderEdit,
    afterRenderEdit
  };
})();
