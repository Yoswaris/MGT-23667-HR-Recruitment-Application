/**
 * HR Recruitment App - Reports Module
 * Handles HR Analytics (Recruitment Funnel, Source Donut, Department Bar Charts, Recent Hires)
 * and Applicant Profile/Settings.
 */

window.ReportsModule = (function () {
  'use strict';

  // Module state
  let activeDateFilter = 'all'; // 'month' | 'quarter' | 'year' | 'all'

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

  /**
   * Helper: Filter candidates and jobs based on date filter
   */
  function getFilteredData() {
    const allJobs = window.Data && window.Data.getJobs ? window.Data.getJobs() : [];
    const allCandidates = window.Data && window.Data.getCandidates ? window.Data.getCandidates() : [];
    const allInterviews = window.Data && window.Data.getInterviews ? window.Data.getInterviews() : [];

    // Filter by date range (October 2026 is sample data reference)
    let cands = allCandidates;
    let jobs = allJobs;

    if (activeDateFilter === 'month') {
      // Month of October 2026
      cands = allCandidates.filter(c => !c.appliedAt || c.appliedAt.startsWith('2026-10'));
      jobs = allJobs.filter(j => !j.createdAt || j.createdAt.startsWith('2026-10'));
    } else if (activeDateFilter === 'quarter') {
      // Last 3 months: Aug, Sep, Oct 2026
      cands = allCandidates.filter(c => !c.appliedAt || c.appliedAt.startsWith('2026-08') || c.appliedAt.startsWith('2026-09') || c.appliedAt.startsWith('2026-10'));
      jobs = allJobs.filter(j => !j.createdAt || j.createdAt.startsWith('2026-08') || j.createdAt.startsWith('2026-09') || j.createdAt.startsWith('2026-10'));
    } else if (activeDateFilter === 'year') {
      cands = allCandidates.filter(c => !c.appliedAt || c.appliedAt.startsWith('2026'));
      jobs = allJobs.filter(j => !j.createdAt || j.createdAt.startsWith('2026'));
    }

    return { jobs, cands, allInterviews };
  }

  /**
   * MAIN RENDER DISPATCHER
   */
  function render(params) {
    const isApplicant = window.App && typeof window.App.isApplicant === 'function' && window.App.isApplicant();
    if (isApplicant) {
      return renderApplicantProfilePage();
    }
    return renderHRReportsPage();
  }

  /**
   * 1. HR REPORTS & ANALYTICS PAGE
   */
  function renderHRReportsPage() {
    const isEn = window.App && typeof window.App.getLang === 'function' ? window.App.getLang() === 'en' : false;
    const { jobs, cands } = getFilteredData();

    // Stats Computation
    const openJobs = jobs.filter(j => j.status === 'open').length;
    const closedJobs = jobs.filter(j => j.status === 'closed').length;
    const draftJobs = jobs.filter(j => j.status === 'draft').length;
    const totalJobs = jobs.length;

    const totalCands = cands.length;

    // Time to Hire: Average days between appliedAt and hired date
    const hiredCands = cands.filter(c => c.status === 'hired');
    let avgDaysToHire = 18; // Default realistic baseline
    if (hiredCands.length > 0) {
      let totalDays = 0;
      let count = 0;
      hiredCands.forEach(c => {
        if (c.appliedAt) {
          const start = new Date(c.appliedAt).getTime();
          const end = c.timeline?.find(t => t.action === 'hired')?.at ? new Date(c.timeline.find(t => t.action === 'hired').at).getTime() : new Date('2026-10-22').getTime();
          const days = Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24)));
          totalDays += days;
          count++;
        }
      });
      if (count > 0) avgDaysToHire = Math.round(totalDays / count);
    }

    // Offer acceptance rate: Hired / (Offered + Hired)
    const offeredCount = cands.filter(c => c.status === 'offered').length;
    const hiredCount = hiredCands.length;
    const totalOffers = offeredCount + hiredCount;
    const offerAcceptanceRate = totalOffers > 0 ? Math.round((hiredCount / totalOffers) * 100) : 85;

    // Funnel Calculations
    const stageApplied = totalCands;
    const stageScreened = cands.filter(c => c.status !== 'new').length;
    const stageInterviewed = cands.filter(c => ['interview_scheduled', 'interviewed', 'offered', 'hired'].includes(c.status)).length;
    const stageOffered = totalOffers;
    const stageHired = hiredCount;

    const pctScreened = stageApplied > 0 ? Math.round((stageScreened / stageApplied) * 100) : 0;
    const pctInterviewed = stageApplied > 0 ? Math.round((stageInterviewed / stageApplied) * 100) : 0;
    const pctOffered = stageApplied > 0 ? Math.round((stageOffered / stageApplied) * 100) : 0;
    const pctHired = stageApplied > 0 ? Math.round((stageHired / stageApplied) * 100) : 0;

    // Sources Breakdown (Direct, Referral, Job Board, LinkedIn)
    const sourceCounts = {
      direct: cands.filter(c => c.source === 'direct').length,
      referral: cands.filter(c => c.source === 'referral').length,
      jobboard: cands.filter(c => c.source === 'jobboard').length,
      linkedin: cands.filter(c => c.source === 'linkedin').length
    };
    // Ensure non-zero total for visual display
    let srcTotal = sourceCounts.direct + sourceCounts.referral + sourceCounts.jobboard + sourceCounts.linkedin;
    if (srcTotal === 0) {
      sourceCounts.direct = 4;
      sourceCounts.referral = 2;
      sourceCounts.jobboard = 3;
      sourceCounts.linkedin = 2;
      srcTotal = 11;
    }

    const pctDirect = Math.round((sourceCounts.direct / srcTotal) * 100);
    const pctReferral = Math.round((sourceCounts.referral / srcTotal) * 100);
    const pctJobboard = Math.round((sourceCounts.jobboard / srcTotal) * 100);
    const pctLinkedin = 100 - (pctDirect + pctReferral + pctJobboard);

    // Conic Gradient for Pure CSS Donut Chart
    const deg1 = pctDirect * 3.6;
    const deg2 = deg1 + (pctReferral * 3.6);
    const deg3 = deg2 + (pctJobboard * 3.6);
    const donutGradient = `conic-gradient(#3B82F6 0deg ${deg1}deg, #10B981 ${deg1}deg ${deg2}deg, #F59E0B ${deg2}deg ${deg3}deg, #8B5CF6 ${deg3}deg 360deg)`;

    // Jobs by Department
    const deptCounts = {
      it: jobs.filter(j => (j.departmentEn || j.department || '').toLowerCase().includes('information') || (j.department || '').includes('สารสนเทศ')).length,
      hr: jobs.filter(j => (j.departmentEn || j.department || '').toLowerCase().includes('human') || (j.department || '').includes('บุคคล')).length,
      marketing: jobs.filter(j => (j.departmentEn || j.department || '').toLowerCase().includes('marketing') || (j.department || '').includes('ตลาด')).length,
      finance: jobs.filter(j => (j.departmentEn || j.department || '').toLowerCase().includes('finance') || (j.department || '').includes('บัญชี')).length,
      sales: jobs.filter(j => (j.departmentEn || j.department || '').toLowerCase().includes('sales') || (j.department || '').includes('ขาย')).length
    };
    const maxDept = Math.max(1, deptCounts.it, deptCounts.hr, deptCounts.marketing, deptCounts.finance, deptCounts.sales);

    return `
      <div class="reports-module animate-fade-in" style="padding-bottom: 84px;">
        <!-- Header & Title -->
        <div style="margin-bottom: 16px;">
          <h2 style="font-size: 1.35rem; font-weight: 700; margin: 0; color: var(--text-primary);">
            ${t('reports.title', { th: 'รายงานและสถิติวิเคราะห์', en: 'Reports & Analytics' })}
          </h2>
          <p style="margin: 3px 0 0; font-size: 0.85rem; color: var(--text-secondary);">
            ${t('reports.subtitle', { th: 'ข้อมูลเชิงลึกการสรรหาและตัวชี้วัดประสิทธิภาพ', en: 'Recruitment insights and performance KPIs' })}
          </p>
        </div>

        <!-- Date Range Filter Pills -->
        <div class="date-filter-bar" style="display: flex; gap: 6px; overflow-x: auto; padding-bottom: 8px; margin-bottom: 18px;">
          <button class="filter-pill ${activeDateFilter === 'month' ? 'active' : ''}" data-filter="month" style="padding: 7px 14px; border-radius: 20px; font-size: 0.82rem; font-weight: 600; cursor: pointer; border: 1px solid ${activeDateFilter === 'month' ? 'var(--primary)' : 'var(--border)'}; background: ${activeDateFilter === 'month' ? 'var(--primary)' : 'var(--bg-secondary)'}; color: ${activeDateFilter === 'month' ? '#fff' : 'var(--text-secondary)'}; white-space: nowrap; transition: all 0.15s;">
            ${t('reports.filterMonth', { th: 'เดือนนี้', en: 'This Month' })}
          </button>
          <button class="filter-pill ${activeDateFilter === 'quarter' ? 'active' : ''}" data-filter="quarter" style="padding: 7px 14px; border-radius: 20px; font-size: 0.82rem; font-weight: 600; cursor: pointer; border: 1px solid ${activeDateFilter === 'quarter' ? 'var(--primary)' : 'var(--border)'}; background: ${activeDateFilter === 'quarter' ? 'var(--primary)' : 'var(--bg-secondary)'}; color: ${activeDateFilter === 'quarter' ? '#fff' : 'var(--text-secondary)'}; white-space: nowrap; transition: all 0.15s;">
            ${t('reports.filterQuarter', { th: '3 เดือนล่าสุด', en: 'Last 3 Months' })}
          </button>
          <button class="filter-pill ${activeDateFilter === 'year' ? 'active' : ''}" data-filter="year" style="padding: 7px 14px; border-radius: 20px; font-size: 0.82rem; font-weight: 600; cursor: pointer; border: 1px solid ${activeDateFilter === 'year' ? 'var(--primary)' : 'var(--border)'}; background: ${activeDateFilter === 'year' ? 'var(--primary)' : 'var(--bg-secondary)'}; color: ${activeDateFilter === 'year' ? '#fff' : 'var(--text-secondary)'}; white-space: nowrap; transition: all 0.15s;">
            ${t('reports.filterYear', { th: 'ปีนี้ (2026)', en: 'This Year' })}
          </button>
          <button class="filter-pill ${activeDateFilter === 'all' ? 'active' : ''}" data-filter="all" style="padding: 7px 14px; border-radius: 20px; font-size: 0.82rem; font-weight: 600; cursor: pointer; border: 1px solid ${activeDateFilter === 'all' ? 'var(--primary)' : 'var(--border)'}; background: ${activeDateFilter === 'all' ? 'var(--primary)' : 'var(--bg-secondary)'}; color: ${activeDateFilter === 'all' ? '#fff' : 'var(--text-secondary)'}; white-space: nowrap; transition: all 0.15s;">
            ${t('reports.filterAll', { th: 'ทั้งหมด', en: 'All Time' })}
          </button>
        </div>

        <!-- SECTION 1: OVERVIEW CARDS (2x2 Grid) -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 22px;">
          <!-- Card 1: Total Positions -->
          <div class="card" style="background: var(--bg-secondary); border-radius: 16px; padding: 16px; border: 1px solid var(--border); box-shadow: 0 2px 8px var(--shadow);">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
              <span style="font-size: 0.78rem; font-weight: 600; color: var(--text-secondary);">${t('reports.totalJobs', { th: 'ตำแหน่งงาน', en: 'Total Positions' })}</span>
              <span style="width: 32px; height: 32px; border-radius: 10px; background: #DBEAFE; color: var(--primary); display: flex; align-items: center; justify-content: center; font-size: 0.9rem;">
                <i class="fas fa-briefcase"></i>
              </span>
            </div>
            <div style="font-size: 1.6rem; font-weight: 800; color: var(--text-primary); line-height: 1;">${totalJobs}</div>
            <div style="margin-top: 8px; font-size: 0.72rem; color: var(--text-secondary); display: flex; gap: 6px; flex-wrap: wrap;">
              <span style="color: var(--success); font-weight: 600;">${openJobs} ${t('jobs.status.open', { th: 'เปิดรับ', en: 'Open' })}</span> &bull;
              <span>${closedJobs} ${t('jobs.status.closed', { th: 'ปิดรับ', en: 'Closed' })}</span> &bull;
              <span>${draftJobs} ${t('jobs.status.draft', { th: 'แบบร่าง', en: 'Draft' })}</span>
            </div>
          </div>

          <!-- Card 2: Total Candidates -->
          <div class="card" style="background: var(--bg-secondary); border-radius: 16px; padding: 16px; border: 1px solid var(--border); box-shadow: 0 2px 8px var(--shadow);">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
              <span style="font-size: 0.78rem; font-weight: 600; color: var(--text-secondary);">${t('reports.totalCandidates', { th: 'ผู้สมัครทั้งหมด', en: 'Total Candidates' })}</span>
              <span style="width: 32px; height: 32px; border-radius: 10px; background: #EDE9FE; color: var(--purple); display: flex; align-items: center; justify-content: center; font-size: 0.9rem;">
                <i class="fas fa-user-friends"></i>
              </span>
            </div>
            <div style="font-size: 1.6rem; font-weight: 800; color: var(--text-primary); line-height: 1;">${totalCands}</div>
            <div style="margin-top: 8px; font-size: 0.72rem; color: var(--success); font-weight: 600; display: flex; align-items: center; gap: 4px;">
              <i class="fas fa-arrow-up"></i>
              <span>+14.2% ${t('reports.trendPeriod', { th: 'เทียบช่วงก่อนหน้า', en: 'vs last period' })}</span>
            </div>
          </div>

          <!-- Card 3: Avg Time to Hire -->
          <div class="card" style="background: var(--bg-secondary); border-radius: 16px; padding: 16px; border: 1px solid var(--border); box-shadow: 0 2px 8px var(--shadow);">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
              <span style="font-size: 0.78rem; font-weight: 600; color: var(--text-secondary);">${t('reports.timeToHire', { th: 'ระยะเวลาจ้างเฉลี่ย', en: 'Avg Time to Hire' })}</span>
              <span style="width: 32px; height: 32px; border-radius: 10px; background: #FEF3C7; color: var(--warning); display: flex; align-items: center; justify-content: center; font-size: 0.9rem;">
                <i class="fas fa-stopwatch"></i>
              </span>
            </div>
            <div style="font-size: 1.6rem; font-weight: 800; color: var(--text-primary); line-height: 1;">
              ${avgDaysToHire} <span style="font-size: 0.9rem; font-weight: 600; color: var(--text-secondary);">${t('reports.days', { th: 'วัน', en: 'days' })}</span>
            </div>
            <div style="margin-top: 8px; font-size: 0.72rem; color: var(--success); font-weight: 600; display: flex; align-items: center; gap: 4px;">
              <i class="fas fa-arrow-down"></i>
              <span>-2 ${t('reports.daysFaster', { th: 'วัน (เร็วขึ้น)', en: 'days faster' })}</span>
            </div>
          </div>

          <!-- Card 4: Offer Acceptance Rate -->
          <div class="card" style="background: var(--bg-secondary); border-radius: 16px; padding: 16px; border: 1px solid var(--border); box-shadow: 0 2px 8px var(--shadow);">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
              <span style="font-size: 0.78rem; font-weight: 600; color: var(--text-secondary);">${t('reports.acceptanceRate', { th: 'อัตราตอบรับงาน', en: 'Offer Accept Rate' })}</span>
              <span style="width: 32px; height: 32px; border-radius: 10px; background: #D1FAE5; color: var(--success); display: flex; align-items: center; justify-content: center; font-size: 0.9rem;">
                <i class="fas fa-check-circle"></i>
              </span>
            </div>
            <div style="font-size: 1.6rem; font-weight: 800; color: var(--text-primary); line-height: 1;">
              ${offerAcceptanceRate}%
            </div>
            <div style="margin-top: 8px; font-size: 0.72rem; color: var(--text-secondary);">
              <span>${hiredCount} ${t('reports.of', { th: 'จาก', en: 'of' })} ${totalOffers} ${t('reports.offers', { th: 'ข้อเสนอ', en: 'offers' })}</span>
            </div>
          </div>
        </div>

        <!-- SECTION 2: RECRUITMENT PIPELINE (Pure CSS Funnel Bar Chart) -->
        <div class="card" style="background: var(--bg-secondary); border-radius: 18px; padding: 18px; border: 1px solid var(--border); box-shadow: 0 2px 10px var(--shadow); margin-bottom: 22px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
            <h3 style="font-size: 1rem; font-weight: 700; margin: 0; color: var(--text-primary); display: flex; align-items: center; gap: 8px;">
              <i class="fas fa-filter" style="color: var(--primary);"></i>
              <span>${t('reports.pipelineTitle', { th: 'กระบวนการสรรหา (Recruitment Pipeline)', en: 'Recruitment Pipeline' })}</span>
            </h3>
            <span style="font-size: 0.75rem; color: var(--text-secondary); font-weight: 600;">100% &rarr; ${pctHired}%</span>
          </div>

          <div style="display: flex; flex-direction: column; gap: 12px;">
            <!-- Stage 1: Applied -->
            <div>
              <div style="display: flex; justify-content: space-between; font-size: 0.8rem; font-weight: 600; margin-bottom: 4px;">
                <span style="color: var(--text-primary);">${t('reports.stageApplied', { th: '1. ยื่นใบสมัคร (Applied)', en: '1. Applied' })}</span>
                <span style="color: var(--text-secondary);">${stageApplied} (${100}%)</span>
              </div>
              <div style="width: 100%; height: 16px; border-radius: 8px; background: var(--bg-tertiary); overflow: hidden;">
                <div class="funnel-bar" style="width: 100%; height: 100%; border-radius: 8px; background: linear-gradient(90deg, #3B82F6, #60A5FA); transition: width 0.6s ease;"></div>
              </div>
            </div>

            <!-- Stage 2: Screened -->
            <div>
              <div style="display: flex; justify-content: space-between; font-size: 0.8rem; font-weight: 600; margin-bottom: 4px;">
                <span style="color: var(--text-primary);">${t('reports.stageScreened', { th: '2. คัดกรองเบื้องต้น (Screened)', en: '2. Screened' })}</span>
                <span style="color: var(--text-secondary);">${stageScreened} (${pctScreened}%)</span>
              </div>
              <div style="width: 100%; height: 16px; border-radius: 8px; background: var(--bg-tertiary); overflow: hidden;">
                <div class="funnel-bar" style="width: ${Math.max(10, pctScreened)}%; height: 100%; border-radius: 8px; background: linear-gradient(90deg, #F59E0B, #FBBF24); transition: width 0.6s ease;"></div>
              </div>
            </div>

            <!-- Stage 3: Interviewed -->
            <div>
              <div style="display: flex; justify-content: space-between; font-size: 0.8rem; font-weight: 600; margin-bottom: 4px;">
                <span style="color: var(--text-primary);">${t('reports.stageInterviewed', { th: '3. สัมภาษณ์งาน (Interviewed)', en: '3. Interviewed' })}</span>
                <span style="color: var(--text-secondary);">${stageInterviewed} (${pctInterviewed}%)</span>
              </div>
              <div style="width: 100%; height: 16px; border-radius: 8px; background: var(--bg-tertiary); overflow: hidden;">
                <div class="funnel-bar" style="width: ${Math.max(10, pctInterviewed)}%; height: 100%; border-radius: 8px; background: linear-gradient(90deg, #8B5CF6, #A78BFA); transition: width 0.6s ease;"></div>
              </div>
            </div>

            <!-- Stage 4: Offered -->
            <div>
              <div style="display: flex; justify-content: space-between; font-size: 0.8rem; font-weight: 600; margin-bottom: 4px;">
                <span style="color: var(--text-primary);">${t('reports.stageOffered', { th: '4. ยื่นข้อเสนอ (Offered)', en: '4. Offered' })}</span>
                <span style="color: var(--text-secondary);">${stageOffered} (${pctOffered}%)</span>
              </div>
              <div style="width: 100%; height: 16px; border-radius: 8px; background: var(--bg-tertiary); overflow: hidden;">
                <div class="funnel-bar" style="width: ${Math.max(10, pctOffered)}%; height: 100%; border-radius: 8px; background: linear-gradient(90deg, #06B6D4, #22D3EE); transition: width 0.6s ease;"></div>
              </div>
            </div>

            <!-- Stage 5: Hired -->
            <div>
              <div style="display: flex; justify-content: space-between; font-size: 0.8rem; font-weight: 600; margin-bottom: 4px;">
                <span style="color: var(--text-primary);">${t('reports.stageHired', { th: '5. บรรจุงานสำเร็จ (Hired)', en: '5. Hired' })}</span>
                <span style="color: var(--success); font-weight: 700;">${stageHired} (${pctHired}%)</span>
              </div>
              <div style="width: 100%; height: 16px; border-radius: 8px; background: var(--bg-tertiary); overflow: hidden;">
                <div class="funnel-bar" style="width: ${Math.max(8, pctHired)}%; height: 100%; border-radius: 8px; background: linear-gradient(90deg, #10B981, #34D399); transition: width 0.6s ease;"></div>
              </div>
            </div>
          </div>
        </div>

        <!-- SECTION 3: CANDIDATES BY SOURCE (Pure CSS Conic-Gradient Donut) -->
        <div class="card" style="background: var(--bg-secondary); border-radius: 18px; padding: 18px; border: 1px solid var(--border); box-shadow: 0 2px 10px var(--shadow); margin-bottom: 22px;">
          <h3 style="font-size: 1rem; font-weight: 700; margin: 0 0 16px; color: var(--text-primary); display: flex; align-items: center; gap: 8px;">
            <i class="fas fa-chart-pie" style="color: var(--primary);"></i>
            <span>${t('reports.sourceAnalysis', { th: 'ช่องทางการสมัคร (Candidates by Source)', en: 'Candidate Sources' })}</span>
          </h3>

          <div style="display: flex; align-items: center; justify-content: space-around; flex-wrap: wrap; gap: 16px;">
            <!-- Pure CSS Donut Chart -->
            <div style="position: relative; width: 140px; height: 140px; border-radius: 50%; background: ${donutGradient}; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 14px rgba(0,0,0,0.08); flex-shrink: 0;">
              <!-- Mask inside to make donut -->
              <div style="width: 86px; height: 86px; border-radius: 50%; background: var(--bg-secondary); display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; box-shadow: inset 0 2px 6px rgba(0,0,0,0.06);">
                <span style="font-size: 1.35rem; font-weight: 800; color: var(--text-primary); line-height: 1;">${totalCands}</span>
                <span style="font-size: 0.68rem; color: var(--text-secondary); margin-top: 2px;">${t('reports.total', { th: 'คน', en: 'Total' })}</span>
              </div>
            </div>

            <!-- Legend items -->
            <div style="display: flex; flex-direction: column; gap: 8px; flex: 1; min-width: 140px;">
              <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.8rem;">
                <span style="display: flex; align-items: center; gap: 6px; color: var(--text-primary);">
                  <span style="width: 10px; height: 10px; border-radius: 3px; background: #3B82F6;"></span>
                  <span>${t('candidates.sources.direct', { th: 'สมัครโดยตรง', en: 'Direct Apply' })}</span>
                </span>
                <span style="font-weight: 700; color: var(--text-secondary);">${pctDirect}% (${sourceCounts.direct})</span>
              </div>

              <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.8rem;">
                <span style="display: flex; align-items: center; gap: 6px; color: var(--text-primary);">
                  <span style="width: 10px; height: 10px; border-radius: 3px; background: #10B981;"></span>
                  <span>${t('candidates.sources.referral', { th: 'คนในแนะนำ', en: 'Referral' })}</span>
                </span>
                <span style="font-weight: 700; color: var(--text-secondary);">${pctReferral}% (${sourceCounts.referral})</span>
              </div>

              <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.8rem;">
                <span style="display: flex; align-items: center; gap: 6px; color: var(--text-primary);">
                  <span style="width: 10px; height: 10px; border-radius: 3px; background: #F59E0B;"></span>
                  <span>${t('candidates.sources.jobboard', { th: 'เว็บหางาน', en: 'Job Board' })}</span>
                </span>
                <span style="font-weight: 700; color: var(--text-secondary);">${pctJobboard}% (${sourceCounts.jobboard})</span>
              </div>

              <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.8rem;">
                <span style="display: flex; align-items: center; gap: 6px; color: var(--text-primary);">
                  <span style="width: 10px; height: 10px; border-radius: 3px; background: #8B5CF6;"></span>
                  <span>${t('candidates.sources.linkedin', { th: 'LinkedIn', en: 'LinkedIn' })}</span>
                </span>
                <span style="font-weight: 700; color: var(--text-secondary);">${pctLinkedin}% (${sourceCounts.linkedin})</span>
              </div>
            </div>
          </div>
        </div>

        <!-- SECTION 4: JOBS BY DEPARTMENT (Pure CSS Horizontal Bar Charts) -->
        <div class="card" style="background: var(--bg-secondary); border-radius: 18px; padding: 18px; border: 1px solid var(--border); box-shadow: 0 2px 10px var(--shadow); margin-bottom: 22px;">
          <h3 style="font-size: 1rem; font-weight: 700; margin: 0 0 14px; color: var(--text-primary); display: flex; align-items: center; gap: 8px;">
            <i class="fas fa-layer-group" style="color: var(--primary);"></i>
            <span>${t('reports.byDepartment', { th: 'ตำแหน่งงานแบ่งตามแผนก', en: 'Openings by Department' })}</span>
          </h3>

          <div style="display: flex; flex-direction: column; gap: 12px;">
            <!-- IT -->
            <div>
              <div style="display: flex; justify-content: space-between; font-size: 0.8rem; font-weight: 600; margin-bottom: 4px;">
                <span style="color: var(--text-primary);">IT / เทคโนโลยีสารสนเทศ</span>
                <span style="color: var(--text-secondary);">${deptCounts.it} ${t('reports.positions', { th: 'ตำแหน่ง', en: 'positions' })}</span>
              </div>
              <div style="width: 100%; height: 12px; border-radius: 6px; background: var(--bg-tertiary); overflow: hidden;">
                <div style="width: ${Math.round((deptCounts.it / maxDept) * 100)}%; height: 100%; border-radius: 6px; background: #3B82F6; transition: width 0.5s;"></div>
              </div>
            </div>

            <!-- HR -->
            <div>
              <div style="display: flex; justify-content: space-between; font-size: 0.8rem; font-weight: 600; margin-bottom: 4px;">
                <span style="color: var(--text-primary);">HR / ฝ่ายทรัพยากรบุคคล</span>
                <span style="color: var(--text-secondary);">${deptCounts.hr} ${t('reports.positions', { th: 'ตำแหน่ง', en: 'positions' })}</span>
              </div>
              <div style="width: 100%; height: 12px; border-radius: 6px; background: var(--bg-tertiary); overflow: hidden;">
                <div style="width: ${Math.round((deptCounts.hr / maxDept) * 100)}%; height: 100%; border-radius: 6px; background: #8B5CF6; transition: width 0.5s;"></div>
              </div>
            </div>

            <!-- Marketing -->
            <div>
              <div style="display: flex; justify-content: space-between; font-size: 0.8rem; font-weight: 600; margin-bottom: 4px;">
                <span style="color: var(--text-primary);">Marketing / ฝ่ายการตลาด</span>
                <span style="color: var(--text-secondary);">${deptCounts.marketing} ${t('reports.positions', { th: 'ตำแหน่ง', en: 'positions' })}</span>
              </div>
              <div style="width: 100%; height: 12px; border-radius: 6px; background: var(--bg-tertiary); overflow: hidden;">
                <div style="width: ${Math.round((deptCounts.marketing / maxDept) * 100)}%; height: 100%; border-radius: 6px; background: #EC4899; transition: width 0.5s;"></div>
              </div>
            </div>

            <!-- Finance -->
            <div>
              <div style="display: flex; justify-content: space-between; font-size: 0.8rem; font-weight: 600; margin-bottom: 4px;">
                <span style="color: var(--text-primary);">Finance / การเงินและบัญชี</span>
                <span style="color: var(--text-secondary);">${deptCounts.finance} ${t('reports.positions', { th: 'ตำแหน่ง', en: 'positions' })}</span>
              </div>
              <div style="width: 100%; height: 12px; border-radius: 6px; background: var(--bg-tertiary); overflow: hidden;">
                <div style="width: ${Math.round((deptCounts.finance / maxDept) * 100)}%; height: 100%; border-radius: 6px; background: #10B981; transition: width 0.5s;"></div>
              </div>
            </div>

            <!-- Sales -->
            <div>
              <div style="display: flex; justify-content: space-between; font-size: 0.8rem; font-weight: 600; margin-bottom: 4px;">
                <span style="color: var(--text-primary);">Sales / ฝ่ายขาย</span>
                <span style="color: var(--text-secondary);">${deptCounts.sales} ${t('reports.positions', { th: 'ตำแหน่ง', en: 'positions' })}</span>
              </div>
              <div style="width: 100%; height: 12px; border-radius: 6px; background: var(--bg-tertiary); overflow: hidden;">
                <div style="width: ${Math.round((deptCounts.sales / maxDept) * 100)}%; height: 100%; border-radius: 6px; background: #F59E0B; transition: width 0.5s;"></div>
              </div>
            </div>
          </div>
        </div>

        <!-- SECTION 5: RECENT HIRES -->
        <div class="card" style="background: var(--bg-secondary); border-radius: 18px; padding: 18px; border: 1px solid var(--border); box-shadow: 0 2px 10px var(--shadow);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
            <h3 style="font-size: 1rem; font-weight: 700; margin: 0; color: var(--text-primary); display: flex; align-items: center; gap: 8px;">
              <i class="fas fa-user-check" style="color: var(--success);"></i>
              <span>${t('reports.recentHires', { th: 'พนักงานที่ได้รับการบรรจุล่าสุด', en: 'Recently Hired Candidates' })}</span>
            </h3>
            <span class="badge" style="background: #D1FAE5; color: #059669; padding: 3px 10px; border-radius: 12px; font-size: 0.75rem; font-weight: 700;">
              ${hiredCands.length} ${t('reports.hiredTotal', { th: 'คน', en: 'Hired' })}
            </span>
          </div>

          <div style="display: flex; flex-direction: column; gap: 10px;">
            ${hiredCands.length === 0 ? `
              <p style="text-align: center; color: var(--text-tertiary); font-size: 0.85rem; padding: 16px 0;">
                ${t('reports.noHiresYet', { th: 'ยังไม่มีพนักงานที่บรรจุในรอบนี้', en: 'No hires recorded in this period' })}
              </p>
            ` : hiredCands.map(c => renderRecentHireItem(c, isEn)).join('')}
          </div>
        </div>
      </div>
    `;
  }

  // Render recent hire item
  function renderRecentHireItem(cand, isEn) {
    let name = cand.name || 'Candidate #' + cand.id;
    let avatar = cand.avatar || '👨‍💻';
    let jobTitle = 'Software Engineer';
    let dept = 'IT Dept';
    let hireDate = '2026-10-18';

    if (cand.userId && window.Data && window.Data.getUser) {
      const u = window.Data.getUser(cand.userId);
      if (u) {
        name = isEn ? (u.nameEn || u.name) : (u.name || u.nameEn);
        if (u.avatar) avatar = u.avatar;
      }
    }

    if (cand.jobId && window.Data && window.Data.getJob) {
      const j = window.Data.getJob(cand.jobId);
      if (j) {
        jobTitle = isEn ? (j.titleEn || j.title) : (j.title || j.titleEn);
        dept = isEn ? (j.departmentEn || j.department) : (j.department || j.departmentEn);
      }
    }

    // Check timeline for hire date
    const hiredTimeline = cand.timeline?.find(t => t.action === 'hired');
    if (hiredTimeline?.at) hireDate = hiredTimeline.at.split('T')[0];

    return `
      <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 12px; background: var(--bg-primary); border-radius: 12px; border: 1px solid var(--border);">
        <div style="display: flex; align-items: center; gap: 10px;">
          <span style="font-size: 1.8rem; line-height: 1; width: 40px; height: 40px; background: var(--bg-tertiary); border-radius: 10px; display: flex; align-items: center; justify-content: center;">
            ${avatar}
          </span>
          <div>
            <h5 style="margin: 0; font-size: 0.9rem; font-weight: 700; color: var(--text-primary);">${name}</h5>
            <p style="margin: 2px 0 0; font-size: 0.78rem; color: var(--text-secondary);">${jobTitle} &bull; ${dept}</p>
          </div>
        </div>

        <div style="text-align: right;">
          <span style="font-size: 0.75rem; font-weight: 600; color: var(--success); display: block;">✅ Hired</span>
          <span style="font-size: 0.72rem; color: var(--text-tertiary);">${formatDate(hireDate)}</span>
        </div>
      </div>
    `;
  }

  /**
   * 2. APPLICANT PROFILE & SETTINGS PAGE
   */
  function renderApplicantProfilePage() {
    const isEn = window.App && typeof window.App.getLang === 'function' ? window.App.getLang() === 'en' : false;
    const curUser = window.App && window.App.getCurrentUser ? window.App.getCurrentUser() : null;
    const name = curUser ? (isEn ? (curUser.nameEn || curUser.name) : (curUser.name || curUser.nameEn)) : 'Applicant';
    const email = curUser?.email || 'applicant@email.com';
    const avatar = curUser?.avatar || '👨‍💻';

    return `
      <div class="applicant-profile-module animate-fade-in" style="padding-bottom: 84px;">
        <!-- Header -->
        <div style="margin-bottom: 18px;">
          <h2 style="font-size: 1.35rem; font-weight: 700; margin: 0; color: var(--text-primary);">
            ${t('profile.title', { th: 'โปรไฟล์และการตั้งค่า', en: 'Profile & Settings' })}
          </h2>
          <p style="margin: 3px 0 0; font-size: 0.85rem; color: var(--text-secondary);">
            ${t('profile.subtitle', { th: 'จัดการข้อมูลบัญชีและการตั้งค่าการใช้งาน', en: 'Manage your personal account and preferences' })}
          </p>
        </div>

        <!-- User Info Hero Card -->
        <div class="card" style="background: var(--bg-secondary); border-radius: 18px; padding: 20px; border: 1px solid var(--border); box-shadow: 0 4px 12px var(--shadow); margin-bottom: 20px; display: flex; align-items: center; gap: 16px;">
          <span id="user-profile-avatar-display" style="font-size: 2.8rem; line-height: 1; width: 64px; height: 64px; background: var(--bg-tertiary); border-radius: 18px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; cursor: pointer; border: 2px dashed var(--border);" title="${t('profile.changeAvatar', { th: 'กดเพื่อเปลี่ยนรูปแทนตัว', en: 'Click to change avatar' })}">
            ${avatar}
          </span>
          <div style="flex: 1;">
            <h3 style="margin: 0; font-size: 1.15rem; font-weight: 700; color: var(--text-primary);">
              ${name}
            </h3>
            <p style="margin: 2px 0 6px; font-size: 0.82rem; color: var(--text-secondary);">
              ${email}
            </p>
            <span style="font-size: 0.75rem; font-weight: 600; padding: 3px 10px; border-radius: 12px; background: #DBEAFE; color: var(--primary);">
              ${t('profile.applicantRole', { th: 'ผู้สมัครงาน (Job Seeker)', en: 'Job Applicant' })}
            </span>
          </div>
        </div>

        <!-- Edit Profile Form -->
        <form id="form-edit-applicant-profile" class="card" style="background: var(--bg-secondary); border-radius: 18px; padding: 20px; border: 1px solid var(--border); box-shadow: 0 2px 8px var(--shadow); margin-bottom: 20px;">
          <h4 style="margin: 0 0 16px; font-size: 0.95rem; font-weight: 700; color: var(--text-primary); display: flex; align-items: center; gap: 8px;">
            <i class="fas fa-user-edit" style="color: var(--primary);"></i>
            <span>${t('profile.personalInfo', { th: 'ข้อมูลส่วนตัว', en: 'Personal Information' })}</span>
          </h4>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px;">
            <div class="form-group">
              <label style="display: block; font-size: 0.82rem; font-weight: 600; color: var(--text-secondary); margin-bottom: 4px;">
                ${t('resumes.nameTh', { th: 'ชื่อ-นามสกุล (ภาษาไทย)', en: 'Name (Thai)' })}
              </label>
              <input type="text" id="prof-name-th" value="${curUser?.name || ''}" style="width: 100%; padding: 9px 12px; border-radius: 10px; border: 1px solid var(--border); background: var(--bg-primary); color: var(--text-primary); font-size: 0.88rem; outline: none;">
            </div>
            <div class="form-group">
              <label style="display: block; font-size: 0.82rem; font-weight: 600; color: var(--text-secondary); margin-bottom: 4px;">
                ${t('resumes.nameEn', { th: 'ชื่อ-นามสกุล (English)', en: 'Name (English)' })}
              </label>
              <input type="text" id="prof-name-en" value="${curUser?.nameEn || ''}" style="width: 100%; padding: 9px 12px; border-radius: 10px; border: 1px solid var(--border); background: var(--bg-primary); color: var(--text-primary); font-size: 0.88rem; outline: none;">
            </div>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px;">
            <div class="form-group">
              <label style="display: block; font-size: 0.82rem; font-weight: 600; color: var(--text-secondary); margin-bottom: 4px;">
                ${t('common.email', { th: 'อีเมล', en: 'Email' })}
              </label>
              <input type="email" readonly value="${curUser?.email || ''}" style="width: 100%; padding: 9px 12px; border-radius: 10px; border: 1px solid var(--border); background: var(--bg-tertiary); color: var(--text-secondary); font-size: 0.88rem; cursor: not-allowed;">
            </div>
            <div class="form-group">
              <label style="display: block; font-size: 0.82rem; font-weight: 600; color: var(--text-secondary); margin-bottom: 4px;">
                ${t('common.phone', { th: 'เบอร์โทรศัพท์', en: 'Phone' })}
              </label>
              <input type="tel" id="prof-phone" value="${curUser?.phone || '081-234-5678'}" style="width: 100%; padding: 9px 12px; border-radius: 10px; border: 1px solid var(--border); background: var(--bg-primary); color: var(--text-primary); font-size: 0.88rem; outline: none;">
            </div>
          </div>

          <button type="submit" style="width: 100%; padding: 11px; border-radius: 12px; border: none; background: var(--primary); color: #fff; font-weight: 600; font-size: 0.9rem; cursor: pointer; box-shadow: 0 2px 8px rgba(37,99,235,0.3);">
            <i class="fas fa-save" style="margin-right: 6px;"></i>
            ${t('profile.saveChanges', { th: 'บันทึกข้อมูลส่วนตัว', en: 'Save Profile Changes' })}
          </button>
        </form>

        <!-- Preferences & Settings -->
        <div class="card" style="background: var(--bg-secondary); border-radius: 18px; padding: 20px; border: 1px solid var(--border); box-shadow: 0 2px 8px var(--shadow); margin-bottom: 20px;">
          <h4 style="margin: 0 0 16px; font-size: 0.95rem; font-weight: 700; color: var(--text-primary); display: flex; align-items: center; gap: 8px;">
            <i class="fas fa-sliders-h" style="color: var(--primary);"></i>
            <span>${t('profile.preferences', { th: 'การตั้งค่าระบบและภาษา', en: 'Preferences & System' })}</span>
          </h4>

          <!-- Language Selector -->
          <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 14px; border-bottom: 1px solid var(--border); margin-bottom: 14px;">
            <div>
              <span style="display: block; font-size: 0.88rem; font-weight: 600; color: var(--text-primary);">${t('profile.language', { th: 'ภาษาการแสดงผล (Language)', en: 'Interface Language' })}</span>
              <span style="font-size: 0.75rem; color: var(--text-secondary);">${isEn ? 'English (Current)' : 'ภาษาไทย (ปัจจุบัน)'}</span>
            </div>
            <div style="display: flex; gap: 4px; background: var(--bg-tertiary); padding: 3px; border-radius: 10px;">
              <button id="btn-lang-th" class="${!isEn ? 'active' : ''}" style="border: none; background: ${!isEn ? 'var(--primary)' : 'transparent'}; color: ${!isEn ? '#fff' : 'var(--text-secondary)'}; padding: 5px 12px; border-radius: 8px; font-size: 0.8rem; font-weight: 600; cursor: pointer;">ไทย</button>
              <button id="btn-lang-en" class="${isEn ? 'active' : ''}" style="border: none; background: ${isEn ? 'var(--primary)' : 'transparent'}; color: ${isEn ? '#fff' : 'var(--text-secondary)'}; padding: 5px 12px; border-radius: 8px; font-size: 0.8rem; font-weight: 600; cursor: pointer;">EN</button>
            </div>
          </div>

          <!-- Notification Toggles (Cosmetic & Interactive) -->
          <div style="display: flex; flex-direction: column; gap: 12px;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div>
                <span style="display: block; font-size: 0.85rem; font-weight: 600; color: var(--text-primary);">${t('profile.notifEmail', { th: 'การแจ้งเตือนทางอีเมล', en: 'Email Notifications' })}</span>
                <span style="font-size: 0.75rem; color: var(--text-secondary);">${t('profile.notifEmailSub', { th: 'เมื่อสถานะการสมัครมีการอัปเดต', en: 'When application status changes' })}</span>
              </div>
              <input type="checkbox" checked style="width: 20px; height: 20px; accent-color: var(--primary); cursor: pointer;">
            </div>

            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div>
                <span style="display: block; font-size: 0.85rem; font-weight: 600; color: var(--text-primary);">${t('profile.notifInterview', { th: 'แจ้งเตือนนัดสัมภาษณ์ล่วงหน้า', en: 'Interview Reminders' })}</span>
                <span style="font-size: 0.75rem; color: var(--text-secondary);">${t('profile.notifInterviewSub', { th: 'แจ้งเตือนล่วงหน้า 24 ชม. ทาง SMS/อีเมล', en: '24 hours prior to scheduled session' })}</span>
              </div>
              <input type="checkbox" checked style="width: 20px; height: 20px; accent-color: var(--primary); cursor: pointer;">
            </div>

            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div>
                <span style="display: block; font-size: 0.85rem; font-weight: 600; color: var(--text-primary);">${t('profile.notifJobs', { th: 'แนะนำตำแหน่งงานใหม่', en: 'Recommended Job Alerts' })}</span>
                <span style="font-size: 0.75rem; color: var(--text-secondary);">${t('profile.notifJobsSub', { th: 'แจ้งเตือนงานที่ตรงกับทักษะของคุณ', en: 'Jobs matching your profile & skills' })}</span>
              </div>
              <input type="checkbox" style="width: 20px; height: 20px; accent-color: var(--primary); cursor: pointer;">
            </div>
          </div>
        </div>

        <!-- Logout Action -->
        <button id="btn-logout-account" style="width: 100%; padding: 13px; border-radius: 14px; border: 1px solid #FCA5A5; background: #FEE2E2; color: #DC2626; font-size: 0.95rem; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;">
          <i class="fas fa-sign-out-alt"></i>
          <span>${t('login.logout', { th: 'ออกจากระบบ (Log Out)', en: 'Log Out' })}</span>
        </button>
      </div>
    `;
  }

  // --- EVENT LISTENERS & LIFECYCLE ---

  function afterRender(params) {
    const isApplicant = window.App && typeof window.App.isApplicant === 'function' && window.App.isApplicant();

    if (isApplicant) {
      bindApplicantEvents();
    } else {
      bindHREvents(params);
    }
  }

  // Bind HR Events
  function bindHREvents(params) {
    // Date filter buttons
    const filterButtons = document.querySelectorAll('.filter-pill');
    filterButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const f = btn.getAttribute('data-filter');
        if (f && f !== activeDateFilter) {
          activeDateFilter = f;
          const main = document.getElementById('app-content');
          if (main) {
            main.innerHTML = render(params);
            afterRender(params);
          }
        }
      });
    });
  }

  // Bind Applicant Events
  function bindApplicantEvents() {
    // Language buttons
    const btnTh = document.getElementById('btn-lang-th');
    const btnEn = document.getElementById('btn-lang-en');

    if (btnTh) {
      btnTh.addEventListener('click', () => {
        if (window.App && window.App.setLang) {
          window.App.setLang('th');
        }
      });
    }

    if (btnEn) {
      btnEn.addEventListener('click', () => {
        if (window.App && window.App.setLang) {
          window.App.setLang('en');
        }
      });
    }

    // Save Profile Form
    const profForm = document.getElementById('form-edit-applicant-profile');
    if (profForm) {
      profForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const nameTh = document.getElementById('prof-name-th')?.value.trim();
        const nameEn = document.getElementById('prof-name-en')?.value.trim();
        const phone = document.getElementById('prof-phone')?.value.trim();

        const curUser = window.App && window.App.getCurrentUser ? window.App.getCurrentUser() : null;
        if (curUser) {
          if (nameTh) curUser.name = nameTh;
          if (nameEn) curUser.nameEn = nameEn;
          if (phone) curUser.phone = phone;

          // Save user
          if (window.Data && window.Data.saveUser) {
            window.Data.saveUser(curUser);
          }

          if (window.App && window.App.showToast) {
            window.App.showToast(t('profile.savedSuccess', { th: 'บันทึกข้อมูลส่วนตัวเรียบร้อยแล้ว', en: 'Profile saved successfully' }), 'success');
          }
        }
      });
    }

    // Logout
    const logoutBtn = document.getElementById('btn-logout-account');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        const confirmMsg = t('profile.confirmLogout', { th: 'คุณต้องการออกจากระบบหรือไม่?', en: 'Are you sure you want to log out?' });
        if (confirm(confirmMsg)) {
          if (window.App && window.App.logout) {
            window.App.logout();
          } else {
            window.location.hash = '#login';
          }
        }
      });
    }
  }

  // Public module API
  return {
    render,
    afterRender
  };
})();
