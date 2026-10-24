/**
 * HR Recruitment Application - Data Management Layer
 * Handles LocalStorage persistence, CRUD operations, models, and sample data.
 */

(function () {
  'use strict';

  const STORAGE_KEYS = {
    USERS: 'hrApp_users',
    JOBS: 'hrApp_jobs',
    CANDIDATES: 'hrApp_candidates',
    INTERVIEWS: 'hrApp_interviews',
    RESUMES: 'hrApp_resumes',
    CURRENT_USER: 'hrApp_currentUser',
    LANG: 'hrApp_lang',
    THEME: 'hrApp_theme'
  };

  function getStorage(key, defaultValue = []) {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : defaultValue;
    } catch (e) {
      console.error('Error reading from localStorage:', key, e);
      return defaultValue;
    }
  }

  function setStorage(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      console.error('Error writing to localStorage:', key, e);
      return false;
    }
  }

  function generateUniqueId(prefix = 'id') {
    if (window.App && typeof window.App.generateId === 'function') {
      return window.App.generateId(prefix);
    }
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  }

  const Data = {
    // -------------------------------------------------------------------------
    // Jobs CRUD
    // -------------------------------------------------------------------------
    getJobs() {
      return getStorage(STORAGE_KEYS.JOBS, []);
    },

    getJob(id) {
      if (!id) return null;
      const jobs = this.getJobs();
      return jobs.find(j => String(j.id) === String(id)) || null;
    },

    saveJob(job) {
      if (!job) return null;
      const jobs = this.getJobs();
      const now = new Date().toISOString();

      if (job.id) {
        const index = jobs.findIndex(j => String(j.id) === String(job.id));
        if (index !== -1) {
          const updatedJob = {
            ...jobs[index],
            ...job,
            updatedAt: now
          };
          jobs[index] = updatedJob;
          setStorage(STORAGE_KEYS.JOBS, jobs);
          return updatedJob;
        }
      }

      // Create new job
      const newJob = {
        vacancies: 1,
        salaryMin: 0,
        salaryMax: 0,
        status: 'open',
        workMode: 'onsite',
        employmentType: 'fulltime',
        level: 'mid',
        requirements: [],
        requirementsEn: [],
        benefits: [],
        benefitsEn: [],
        ...job,
        id: job.id || generateUniqueId('j'),
        createdAt: job.createdAt || now,
        updatedAt: now
      };

      jobs.unshift(newJob);
      setStorage(STORAGE_KEYS.JOBS, jobs);
      return newJob;
    },

    deleteJob(id) {
      if (!id) return false;
      const jobs = this.getJobs();
      const filtered = jobs.filter(j => String(j.id) !== String(id));
      if (filtered.length === jobs.length) return false;
      setStorage(STORAGE_KEYS.JOBS, filtered);
      return true;
    },

    getJobsByStatus(status) {
      const jobs = this.getJobs();
      if (!status || status === 'all') return jobs;
      return jobs.filter(j => j.status === status);
    },

    // -------------------------------------------------------------------------
    // Candidates CRUD
    // -------------------------------------------------------------------------
    getCandidates(jobId = null) {
      const candidates = getStorage(STORAGE_KEYS.CANDIDATES, []);
      if (jobId) {
        return candidates.filter(c => String(c.jobId) === String(jobId));
      }
      return candidates;
    },

    getCandidate(id) {
      if (!id) return null;
      const candidates = this.getCandidates();
      return candidates.find(c => String(c.id) === String(id)) || null;
    },

    saveCandidate(cand) {
      if (!cand) return null;
      const candidates = this.getCandidates();
      const now = new Date().toISOString();

      if (cand.id) {
        const index = candidates.findIndex(c => String(c.id) === String(cand.id));
        if (index !== -1) {
          const updated = {
            ...candidates[index],
            ...cand,
            updatedAt: now
          };
          candidates[index] = updated;
          setStorage(STORAGE_KEYS.CANDIDATES, candidates);
          return updated;
        }
      }

      const newCand = {
        scores: { qualification: 0, experience: 0, skills: 0 },
        notes: [],
        timeline: [
          { action: 'applied', at: now, by: cand.userId || 'system' }
        ],
        source: 'direct',
        status: 'new',
        ...cand,
        id: cand.id || generateUniqueId('c'),
        appliedAt: cand.appliedAt || now,
        updatedAt: now
      };

      candidates.unshift(newCand);
      setStorage(STORAGE_KEYS.CANDIDATES, candidates);
      return newCand;
    },

    deleteCandidate(id) {
      if (!id) return false;
      const candidates = this.getCandidates();
      const filtered = candidates.filter(c => String(c.id) !== String(id));
      if (filtered.length === candidates.length) return false;
      setStorage(STORAGE_KEYS.CANDIDATES, filtered);
      return true;
    },

    getCandidatesByStatus(status) {
      const candidates = this.getCandidates();
      if (!status || status === 'all') return candidates;
      return candidates.filter(c => c.status === status);
    },

    // -------------------------------------------------------------------------
    // Interviews CRUD
    // -------------------------------------------------------------------------
    getInterviews(filters = null) {
      let interviews = getStorage(STORAGE_KEYS.INTERVIEWS, []);
      if (!filters) return interviews;

      return interviews.filter(item => {
        if (filters.candidateId && String(item.candidateId) !== String(filters.candidateId)) {
          return false;
        }
        if (filters.jobId && String(item.jobId) !== String(filters.jobId)) {
          return false;
        }
        if (filters.date && item.date !== filters.date) {
          return false;
        }
        if (filters.status && filters.status !== 'all' && item.status !== filters.status) {
          return false;
        }
        return true;
      });
    },

    getInterview(id) {
      if (!id) return null;
      const list = this.getInterviews();
      return list.find(i => String(i.id) === String(id)) || null;
    },

    saveInterview(interview) {
      if (!interview) return null;
      const list = this.getInterviews();
      const now = new Date().toISOString();

      if (interview.id) {
        const index = list.findIndex(i => String(i.id) === String(interview.id));
        if (index !== -1) {
          const updated = {
            ...list[index],
            ...interview,
            updatedAt: now
          };
          list[index] = updated;
          setStorage(STORAGE_KEYS.INTERVIEWS, list);
          return updated;
        }
      }

      const newInterview = {
        type: 'video',
        duration: 60,
        interviewers: [],
        status: 'scheduled',
        evaluation: null,
        notes: '',
        location: '',
        ...interview,
        id: interview.id || generateUniqueId('i'),
        createdAt: now,
        updatedAt: now
      };

      list.unshift(newInterview);
      setStorage(STORAGE_KEYS.INTERVIEWS, list);
      return newInterview;
    },

    deleteInterview(id) {
      if (!id) return false;
      const list = this.getInterviews();
      const filtered = list.filter(i => String(i.id) !== String(id));
      if (filtered.length === list.length) return false;
      setStorage(STORAGE_KEYS.INTERVIEWS, filtered);
      return true;
    },

    // -------------------------------------------------------------------------
    // Resumes CRUD
    // -------------------------------------------------------------------------
    getResumes(userId = null) {
      const resumes = getStorage(STORAGE_KEYS.RESUMES, []);
      if (userId) {
        return resumes.filter(r => String(r.userId) === String(userId));
      }
      return resumes;
    },

    getResume(id) {
      if (!id) return null;
      const resumes = this.getResumes();
      return resumes.find(r => String(r.id) === String(id)) || null;
    },

    saveResume(resume) {
      if (!resume) return null;
      const resumes = this.getResumes();
      const now = new Date().toISOString();

      if (resume.id) {
        const index = resumes.findIndex(r => String(r.id) === String(resume.id));
        if (index !== -1) {
          const updated = {
            ...resumes[index],
            ...resume,
            updatedAt: now
          };
          resumes[index] = updated;
          setStorage(STORAGE_KEYS.RESUMES, resumes);
          return updated;
        }
      }

      const newResume = {
        personal: {},
        education: [],
        experience: [],
        skills: [],
        languages: [],
        certificates: [],
        expectedSalary: 0,
        availableDate: '',
        relocate: false,
        ...resume,
        id: resume.id || generateUniqueId('r'),
        createdAt: resume.createdAt || now,
        updatedAt: now
      };

      resumes.unshift(newResume);
      setStorage(STORAGE_KEYS.RESUMES, resumes);
      return newResume;
    },

    deleteResume(id) {
      if (!id) return false;
      const resumes = this.getResumes();
      const filtered = resumes.filter(r => String(r.id) !== String(id));
      if (filtered.length === resumes.length) return false;
      setStorage(STORAGE_KEYS.RESUMES, filtered);
      return true;
    },

    // -------------------------------------------------------------------------
    // Users CRUD
    // -------------------------------------------------------------------------
    getUsers() {
      return getStorage(STORAGE_KEYS.USERS, []);
    },

    getUser(id) {
      if (!id) return null;
      const users = this.getUsers();
      return users.find(u => String(u.id) === String(id)) || null;
    },

    getUserByEmail(email) {
      if (!email) return null;
      const users = this.getUsers();
      const lower = email.trim().toLowerCase();
      return users.find(u => u.email && u.email.trim().toLowerCase() === lower) || null;
    },

    saveUser(user) {
      if (!user) return null;
      const users = this.getUsers();
      const now = new Date().toISOString();

      if (user.id) {
        const index = users.findIndex(u => String(u.id) === String(user.id));
        if (index !== -1) {
          const updated = {
            ...users[index],
            ...user,
            updatedAt: now
          };
          users[index] = updated;
          setStorage(STORAGE_KEYS.USERS, users);
          return updated;
        }
      }

      const newUser = {
        role: 'applicant',
        avatar: '👤',
        lang: 'th',
        ...user,
        id: user.id || generateUniqueId('u'),
        createdAt: now
      };

      users.push(newUser);
      setStorage(STORAGE_KEYS.USERS, users);
      return newUser;
    },

    deleteUser(id) {
      if (!id) return false;
      const users = this.getUsers();
      const filtered = users.filter(u => String(u.id) !== String(id));
      if (filtered.length === users.length) return false;
      setStorage(STORAGE_KEYS.USERS, filtered);
      return true;
    },

    // -------------------------------------------------------------------------
    // Dashboard & Stats Helpers
    // -------------------------------------------------------------------------
    getStats() {
      const jobs = this.getJobs();
      const candidates = this.getCandidates();
      const interviews = this.getInterviews();

      return {
        totalJobs: jobs.length,
        openJobs: jobs.filter(j => j.status === 'open').length,
        totalCandidates: candidates.length,
        newCandidates: candidates.filter(c => c.status === 'new').length,
        interviewsScheduled: interviews.filter(i => i.status === 'scheduled').length,
        hired: candidates.filter(c => c.status === 'hired').length
      };
    },

    // -------------------------------------------------------------------------
    // Sample Data Initialization
    // -------------------------------------------------------------------------
    initSampleData() {
      const sampleUsers = [
        {
          id: 'u1',
          name: 'สมศรี จันทร์สุข',
          nameEn: 'Somsri Chansuk',
          email: 'hr@company.com',
          password: '1234',
          role: 'hr',
          department: 'ฝ่ายทรัพยากรบุคคล',
          departmentEn: 'Human Resources',
          avatar: '👩‍💼',
          lang: 'th',
          phone: '081-111-2233',
          createdAt: '2026-01-15T09:00:00'
        },
        {
          id: 'u2',
          name: 'เดวิด มิลเลอร์',
          nameEn: 'David Miller',
          email: 'david@company.com',
          password: '1234',
          role: 'hr',
          department: 'ฝ่ายสรรหาบุคลากร',
          departmentEn: 'Talent Acquisition',
          avatar: '👨‍💼',
          lang: 'en',
          phone: '082-222-3344',
          createdAt: '2026-02-01T10:00:00'
        },
        {
          id: 'u3',
          name: 'สมชาย ใจดี',
          nameEn: 'Somchai Jaidee',
          email: 'somchai@email.com',
          password: '1234',
          role: 'applicant',
          department: '',
          departmentEn: '',
          avatar: '👨‍💻',
          lang: 'th',
          phone: '081-234-5678',
          createdAt: '2026-09-15T08:30:00'
        },
        {
          id: 'u4',
          name: 'สุนิสา แก้วมณี',
          nameEn: 'Sunisa Kaewmanee',
          email: 'sunisa@email.com',
          password: '1234',
          role: 'applicant',
          department: '',
          departmentEn: '',
          avatar: '👩‍💻',
          lang: 'th',
          phone: '089-876-5432',
          createdAt: '2026-09-20T14:15:00'
        },
        {
          id: 'u5',
          name: 'จอห์น สมิธ',
          nameEn: 'John Smith',
          email: 'john@email.com',
          password: '1234',
          role: 'applicant',
          department: '',
          departmentEn: '',
          avatar: '👨‍🦱',
          lang: 'en',
          phone: '090-123-4567',
          createdAt: '2026-09-25T11:00:00'
        }
      ];

      const sampleJobs = [
        {
          id: 'j1',
          title: 'นักพัฒนาซอฟต์แวร์อาวุโส',
          titleEn: 'Senior Software Developer',
          department: 'เทคโนโลยีสารสนเทศ',
          departmentEn: 'Information Technology',
          level: 'senior',
          employmentType: 'fulltime',
          vacancies: 2,
          salaryMin: 60000,
          salaryMax: 90000,
          location: 'กรุงเทพมหานคร',
          locationEn: 'Bangkok',
          workMode: 'hybrid',
          description: 'ร่วมเป็นผู้นำทีมวิศวกรรมซอฟต์แวร์ในการออกแบบและพัฒนาระบบ Enterprise Web Application ที่มีเสถียรภาพและรองรับการขยายตัวสูง มีโอกาสได้วางโครงสร้างสถาปัตยกรรมคลาวด์และโค้ชชิ่งนักพัฒนารุ่นใหม่ในบรรยากาศการทำงานแบบ Agile',
          descriptionEn: 'Lead our software engineering team to architect, develop, and scale enterprise web applications. You will spearhead cloud modernization initiatives, mentor junior engineers, and deliver robust software in a collaborative Agile environment.',
          requirements: [
            'ประสบการณ์ด้านการพัฒนาเว็บด้วย JavaScript/TypeScript อย่างน้อย 5 ปี',
            'เชี่ยวชาญเทคโนโลยี Node.js, Express, React หรือ Vue',
            'มีความรู้ด้านการออกแบบ RESTful API และ Microservices Architecture',
            'มีประสบการณ์กับระบบฐานข้อมูล SQL (PostgreSQL/MySQL) และ NoSQL (MongoDB)',
            'คุ้นเคยกับการใช้งาน Docker, Kubernetes และ CI/CD Pipeline',
            'มีทักษะการแก้ปัญหาและการสื่อสารร่วมงานที่ดีเยี่ยม'
          ],
          requirementsEn: [
            '5+ years of software development experience with JavaScript/TypeScript',
            'Strong proficiency in Node.js, Express, React, or Vue',
            'Solid understanding of RESTful APIs and Microservices Architecture',
            'Hands-on experience with SQL (PostgreSQL/MySQL) and NoSQL (MongoDB)',
            'Familiarity with Docker, Kubernetes, and modern CI/CD pipelines',
            'Excellent problem-solving mindset and team communication skills'
          ],
          benefits: [
            'กองทุนสำรองเลี้ยงชีพสูงสุด 10%',
            'ประกันสุขภาพกลุ่ม ครอบคลุมผู้ป่วยใน/นอก และทันตกรรม',
            'โบนัสตามผลประกอบการประจำปี',
            'นโยบายทำงานแบบ Hybrid สัปดาห์ละ 2-3 วัน',
            'งบประมาณสำหรับการเรียนรู้และพัฒนาทักษะ 20,000 บาท/ปี',
            'วันหยุดพักผ่อนประจำปีเริ่มต้น 15 วัน'
          ],
          benefitsEn: [
            'Provident Fund up to 10% matching',
            'Comprehensive group medical, dental, and life insurance',
            'Annual performance-based bonus',
            'Hybrid work arrangement (2-3 days work from home)',
            'Annual learning & development stipend of 20,000 THB',
            'Annual paid leave starting from 15 days'
          ],
          deadline: '2026-11-30',
          status: 'open',
          createdAt: '2026-10-01T09:00:00',
          createdBy: 'u1'
        },
        {
          id: 'j2',
          title: 'เจ้าหน้าที่ทรัพยากรบุคคล',
          titleEn: 'HR Officer',
          department: 'ฝ่ายทรัพยากรบุคคล',
          departmentEn: 'Human Resources',
          level: 'mid',
          employmentType: 'fulltime',
          vacancies: 1,
          salaryMin: 30000,
          salaryMax: 45000,
          location: 'กรุงเทพมหานคร',
          locationEn: 'Bangkok',
          workMode: 'onsite',
          description: 'ดูแลกระบวนการสรรหาและคัดเลือกบุคลากรตั้งแต่ต้นจนจบ การจัดปฐมนิเทศพนักงานใหม่ งานด้านแรงงานสัมพันธ์ และประสานงานกิจกรรมเสริมสร้างวัฒนธรรมองค์กร',
          descriptionEn: 'Manage end-to-end talent recruitment processes, new hire onboarding, employee engagement initiatives, and support human resources operations in line with corporate standards.',
          requirements: [
            'วุฒิปริญญาตรี สาขาการบริหารทรัพยากรบุคคล รัฐศาสตร์ จิตวิทยา หรือสาขาที่เกี่ยวข้อง',
            'ประสบการณ์ด้านการสรรหาและงาน HR อย่างน้อย 2-3 ปี',
            'มีความรู้เรื่องกฎหมายแรงงานไทยและแนวปฏิบัติประกันสังคม',
            'มีมนุษยสัมพันธ์ดีเยี่ยมและทักษะการเจรจาต่อรอง',
            'สามารถใช้โปรแกรม HRIS และ Microsoft 365 ได้คล่องแคล่ว'
          ],
          requirementsEn: [
            'Bachelor’s degree in HR, Political Science, Psychology, or related fields',
            '2-3 years of proven experience in recruitment and HR operations',
            'Good understanding of Thai Labor Law and Social Security regulations',
            'Strong interpersonal, communication, and negotiation abilities',
            'Proficiency with HRIS systems and modern office productivity suites'
          ],
          benefits: [
            'ประกันสังคมและประกันกลุ่มสุขภาพ',
            'ตรวจสุขภาพประจำปี',
            'เบี้ยขยันและโบนัสประจำปี',
            'เครื่องแบบพนักงานและสวัสดิการเงินช่วยเหลือกรณีพิเศษ',
            'การฝึกอบรมพัฒนาทักษะวิชาชีพสม่ำเสมอ'
          ],
          benefitsEn: [
            'Social Security and group medical insurance',
            'Annual comprehensive health checkup',
            'Diligence allowance and annual bonus',
            'Uniforms and welfare assistance funds',
            'Continuous professional training and certification support'
          ],
          deadline: '2026-11-15',
          status: 'open',
          createdAt: '2026-10-05T10:00:00',
          createdBy: 'u1'
        },
        {
          id: 'j3',
          title: 'ผู้จัดการฝ่ายการตลาด',
          titleEn: 'Marketing Manager',
          department: 'ฝ่ายการตลาด',
          departmentEn: 'Marketing',
          level: 'manager',
          employmentType: 'fulltime',
          vacancies: 1,
          salaryMin: 70000,
          salaryMax: 100000,
          location: 'กรุงเทพมหานคร',
          locationEn: 'Bangkok',
          workMode: 'hybrid',
          description: 'วางแผนและขับเคลื่อนกลยุทธ์การตลาดแบบครบวงจร (Omnichannel Marketing) ทั้งการสร้างแบรนด์ การตลาดดิจิทัล และแคมเปญกระตุ้นยอดขาย พร้อมบริหารจัดการทีมการตลาดและงบประมาณอย่างมีประสิทธิภาพ',
          descriptionEn: 'Plan and execute omnichannel marketing strategies covering brand equity, digital campaigns, performance marketing, and market expansion. Lead, coach, and inspire our growing marketing team.',
          requirements: [
            'ประสบการณ์ด้านการตลาดหรือการบริหารแบรนด์อย่างน้อย 5 ปี (มีประสบการณ์ระดับหัวหน้างาน 2 ปีขึ้นไป)',
            'เชี่ยวชาญด้าน Digital Marketing, SEO, SEM, Social Media Ads และ CRM',
            'มีความสามารถในการวิเคราะห์ข้อมูลตลาด (Data-driven decision making)',
            'ทักษะความเป็นผู้นำและการสื่อสารทั้งภาษาไทยและภาษาอังกฤษในระดับดีมาก',
            'มีผลงานความสำเร็จในการสร้างการเติบโตของแบรนด์หรือยอดขาย'
          ],
          requirementsEn: [
            '5+ years marketing experience with at least 2 years in a leadership role',
            'Deep expertise in Digital Marketing, SEO/SEM, Paid Ads, and CRM tools',
            'Proven track record of data-driven growth and market penetration',
            'Exceptional leadership and bilingual communication (Thai & English)',
            'Experience managing multi-million Baht marketing budgets'
          ],
          benefits: [
            'กองทุนสำรองเลี้ยงชีพและประกันกลุ่มผู้บริหาร',
            'ค่าน้ำมันและค่าเดินทางตามจริง',
            'โทรศัพท์มือถือพร้อมแพ็กเกจอินเทอร์เน็ตรายเดือน',
            'โบนัสตามผลงานและส่วนแบ่งกำไร (Profit Sharing)',
            'ความยืดหยุ่นในการทำงานแบบ Hybrid'
          ],
          benefitsEn: [
            'Provident fund and executive healthcare package',
            'Travel and fuel allowance',
            'Corporate smartphone with unlimited data plan',
            'Performance bonus and profit sharing incentives',
            'Flexible hybrid workplace policy'
          ],
          deadline: '2026-12-15',
          status: 'open',
          createdAt: '2026-10-10T11:00:00',
          createdBy: 'u2'
        },
        {
          id: 'j4',
          title: 'นักบัญชี',
          titleEn: 'Accountant',
          department: 'ฝ่ายการเงินและบัญชี',
          departmentEn: 'Finance & Accounting',
          level: 'mid',
          employmentType: 'fulltime',
          vacancies: 1,
          salaryMin: 35000,
          salaryMax: 50000,
          location: 'กรุงเทพมหานคร',
          locationEn: 'Bangkok',
          workMode: 'onsite',
          description: 'รับผิดชอบงานบันทึกบัญชีรายรับ-รายจ่าย ปิดงบการเงินประจำเดือน จัดทำรายงานภาษีมูลค่าเพิ่ม (ภ.พ.30) ภาษีหัก ณ ที่จ่าย และประสานงานกับผู้สอบบัญชีภายนอก',
          descriptionEn: 'Responsible for general ledger entries, monthly financial close, withholding tax filings, VAT submissions, balance sheet reconciliations, and coordinating with external auditors.',
          requirements: [
            'วุฒิปริญญาตรี สาขาการบัญชี (มีคุณสมบัติขึ้นทะเบียนผู้ทำบัญชีตาม พ.ร.บ. บัญชี)',
            'ประสบการณ์ด้านการทำบัญชีและภาษีอากร 3 ปีขึ้นไป',
            'มีความละเอียดรอบคอบ ซื่อสัตย์ และเก็บรักษาความลับได้ดี',
            'สามารถใช้งานโปรแกรมบัญชีสำเร็จรูป (เช่น SAP, Express, หรือ PEAK) ได้เป็นอย่างดี'
          ],
          requirementsEn: [
            'Bachelor’s degree in Accounting (CPD certified or eligible)',
            '3+ years accounting and taxation experience in private companies',
            'High attention to detail, integrity, and strong analytical mindset',
            'Proficiency in ERP/accounting software (SAP, Express, or PEAK)'
          ],
          benefits: [
            'ประกันสังคมและประกันอุบัติเหตุกลุ่ม',
            'ค่าใบประกอบวิชาชีพผู้ทำบัญชี (CPD Allowance)',
            'โบนัสประจำปีและเงินปรับประจำปี',
            'อาหารกลางวันฟรีสัปดาห์ละ 2 วัน'
          ],
          benefitsEn: [
            'Social Security and group accident insurance',
            'CPD license monthly allowance',
            'Annual bonus and salary review',
            'Complimentary lunch twice a week'
          ],
          deadline: '2026-12-31',
          status: 'draft',
          createdAt: '2026-10-18T14:00:00',
          createdBy: 'u1'
        },
        {
          id: 'j5',
          title: 'พนักงานขาย',
          titleEn: 'Sales Representative',
          department: 'ฝ่ายขาย',
          departmentEn: 'Sales',
          level: 'junior',
          employmentType: 'fulltime',
          vacancies: 3,
          salaryMin: 22000,
          salaryMax: 35000,
          location: 'กรุงเทพมหานคร',
          locationEn: 'Bangkok',
          workMode: 'remote',
          description: 'ติดต่อประสานงานและนำเสนอโซลูชันแก่ลูกค้ากลุ่มองค์กร (B2B) ขยายฐานลูกค้าใหม่ ติดตามการปิดการขาย และสร้างความสัมพันธ์อันดีระยะยาวกับลูกค้า',
          descriptionEn: 'Generate leads, pitch technology solutions to corporate B2B clients, negotiate deals, and maintain strong customer relationships to achieve sales targets.',
          requirements: [
            'วุฒิปริญญาตรีทุกสาขา หรือมีใจรักงานบริการและงานขาย',
            'ทักษะการเจรจาต่อรองและการโน้มน้าวใจเป็นเลิศ',
            'มีความกระตือรือร้นและมุ่งมั่นต่อเป้าหมายยอดขาย',
            'สามารถทำงานจากที่บ้านและเดินทางพบลูกค้าได้เมื่อจำเป็น'
          ],
          requirementsEn: [
            'Bachelor’s degree in any field, passion for B2B sales',
            'Strong interpersonal, negotiation, and presentation skills',
            'Self-motivated, proactive, and target-driven personality',
            'Ability to work remotely and visit client offices as needed'
          ],
          benefits: [
            'เงินเดือนประจำพร้อมค่าคอมมิชชั่นตามผลงานแบบไม่จำกัดเพดาน',
            'ค่าน้ำมันและค่าโทรศัพท์',
            'ประกันสุขภาพกลุ่ม',
            'โปรแกรมรางวัลท่องเที่ยวต่างประเทศสำหรับพนักงานขายดีเด่น'
          ],
          benefitsEn: [
            'Base salary plus uncapped performance commission',
            'Fuel and mobile phone allowance',
            'Group medical insurance',
            'Annual overseas incentive travel trip for top performers'
          ],
          deadline: '2026-10-15',
          status: 'closed',
          createdAt: '2026-09-01T09:00:00',
          createdBy: 'u2'
        }
      ];

      const sampleResumes = [
        {
          id: 'r1',
          userId: 'u3',
          personal: {
            name: 'สมชาย ใจดี',
            nameEn: 'Somchai Jaidee',
            email: 'somchai@email.com',
            phone: '081-234-5678',
            address: 'กรุงเทพมหานคร ประเทศไทย',
            photo: '👨‍💻',
            linkedin: 'linkedin.com/in/somchai-dev',
            portfolio: 'github.com/somchai-j',
            summary: 'นักพัฒนาซอฟต์แวร์ประสบการณ์ 5 ปี เชี่ยวชาญการสร้าง Web Application ประสิทธิภาพสูงด้วย Node.js, TypeScript และ React ให้ความสำคัญกับ Clean Code สถาปัตยกรรมที่ยืดหยุ่น และการส่งมอบงานตรงเวลาตามแนวทาง Agile',
            summaryEn: 'Full-stack software developer with 5+ years of experience crafting resilient web solutions using TypeScript, Node.js, and React. Passionate about clean architecture, test automation, and scalable cloud engineering.'
          },
          education: [
            {
              degree: 'ปริญญาตรี',
              degreeEn: 'Bachelor of Science',
              field: 'วิทยาการคอมพิวเตอร์',
              fieldEn: 'Computer Science',
              institution: 'จุฬาลงกรณ์มหาวิทยาลัย',
              institutionEn: 'Chulalongkorn University',
              year: 2021,
              gpa: 3.65
            }
          ],
          experience: [
            {
              title: 'Senior Software Engineer',
              company: 'บริษัท สยาม ซอฟต์แวร์ โซลูชั่นส์ จำกัด',
              companyEn: 'Siam Software Solutions Co., Ltd.',
              startDate: '2023-01',
              endDate: '',
              current: true,
              description: 'รับผิดชอบระบบ Payment Gateway และ Microservices รองรับทราฟฟิกกว่า 100,000 ธุรกรรมต่อวัน ปรับปรุงประสิทธิภาพของระบบ API ให้เร็วขึ้น 40%',
              descriptionEn: 'Architected high-throughput payment services and microservices handling 100k daily transactions. Improved API response latency by 40% using Redis caching and database indexing.'
            },
            {
              title: 'Full Stack Developer',
              company: 'บริษัท ดิจิทัล เวฟ จำกัด',
              companyEn: 'Digital Wave Tech Ltd.',
              startDate: '2021-06',
              endDate: '2022-12',
              current: false,
              description: 'พัฒนา Frontend ด้วย React และ Redux เชื่อมต่อ RESTful API บน Express/PostgreSQL',
              descriptionEn: 'Built responsive client portals with React/Redux and engineered robust backend services using Express and PostgreSQL.'
            }
          ],
          skills: [
            { name: 'JavaScript / TypeScript', level: 'expert' },
            { name: 'Node.js & Express', level: 'expert' },
            { name: 'React.js', level: 'expert' },
            { name: 'PostgreSQL & MongoDB', level: 'intermediate' },
            { name: 'Docker & CI/CD', level: 'intermediate' },
            { name: 'AWS Cloud Services', level: 'intermediate' }
          ],
          languages: [
            { name: 'ไทย', nameEn: 'Thai', level: 'native' },
            { name: 'อังกฤษ', nameEn: 'English', level: 'good' }
          ],
          certificates: [
            { name: 'AWS Certified Solutions Architect – Associate', issuer: 'Amazon Web Services', year: 2024 },
            { name: 'Certified ScrumMaster (CSM)', issuer: 'Scrum Alliance', year: 2023 }
          ],
          expectedSalary: 75000,
          availableDate: '2026-11-15',
          relocate: true,
          createdAt: '2026-10-01T08:00:00',
          updatedAt: '2026-10-01T08:00:00'
        },
        {
          id: 'r2',
          userId: 'u4',
          personal: {
            name: 'สุนิสา แก้วมณี',
            nameEn: 'Sunisa Kaewmanee',
            email: 'sunisa@email.com',
            phone: '089-876-5432',
            address: 'กรุงเทพมหานคร ประเทศไทย',
            photo: '👩‍💻',
            linkedin: 'linkedin.com/in/sunisa-hr',
            portfolio: '',
            summary: 'ผู้เชี่ยวชาญด้านการบริหารทรัพยากรบุคคลและงานสรรหาบุคลากรประสบการณ์กว่า 3 ปี มีความเข้าใจกระบวนการคัดกรอง Talent การสัมภาษณ์เชิงพฤติกรรม และกฎหมายแรงงาน พร้อมทักษะการสร้างความผูกพันในองค์กร',
            summaryEn: 'Dedicated HR specialist with 3+ years in recruitment, competency-based interviewing, onboarding, and employee relations. Enthusiastic about creating supportive workplace cultures.'
          },
          education: [
            {
              degree: 'ปริญญาตรี',
              degreeEn: 'Bachelor of Business Administration',
              field: 'การจัดการทรัพยากรมนุษย์',
              fieldEn: 'Human Resource Management',
              institution: 'มหาวิทยาลัยธรรมศาสตร์',
              institutionEn: 'Thammasat University',
              year: 2023,
              gpa: 3.52
            }
          ],
          experience: [
            {
              title: 'Recruitment Specialist',
              company: 'บริษัท ทาเลนต์ คอนเนค จำกัด',
              companyEn: 'Talent Connect Co., Ltd.',
              startDate: '2023-03',
              endDate: '',
              current: true,
              description: 'สรรหาบุคลากรสายเทคและการตลาด ปิดตำแหน่งงานได้ตรงเวลาเฉลี่ย 92% ดูแลการสัมภาษณ์รอบแรกและประสานงานสัญญางาน',
              descriptionEn: 'Spearheaded tech and commercial recruitment cycles with a 92% on-time hire rate. Conducted behavioral screenings and administered employment offers.'
            }
          ],
          skills: [
            { name: 'Talent Sourcing & Screening', level: 'expert' },
            { name: 'Behavioral Interviewing', level: 'expert' },
            { name: 'Thai Labor Law Compliance', level: 'intermediate' },
            { name: 'HRIS & ATS Management', level: 'expert' },
            { name: 'Employee Onboarding', level: 'expert' }
          ],
          languages: [
            { name: 'ไทย', nameEn: 'Thai', level: 'native' },
            { name: 'อังกฤษ', nameEn: 'English', level: 'fluent' }
          ],
          certificates: [
            { name: 'Professional in Human Resources (PHR)', issuer: 'HRCI Thailand Chapter', year: 2024 }
          ],
          expectedSalary: 42000,
          availableDate: '2026-11-01',
          relocate: false,
          createdAt: '2026-10-02T10:00:00',
          updatedAt: '2026-10-02T10:00:00'
        },
        {
          id: 'r3',
          userId: 'u5',
          personal: {
            name: 'จอห์น สมิธ',
            nameEn: 'John Smith',
            email: 'john@email.com',
            phone: '090-123-4567',
            address: 'Bangkok / Sydney',
            photo: '👨‍🦱',
            linkedin: 'linkedin.com/in/johnsmith-marketing',
            portfolio: 'johnsmithmarketing.com',
            summary: 'Experienced Marketing Strategist with over 6 years executing high-ROI growth marketing and digital brand awareness campaigns across APAC. Skilled in performance advertising, data analytics, and team leadership.',
            summaryEn: 'Experienced Marketing Strategist with over 6 years executing high-ROI growth marketing and digital brand awareness campaigns across APAC. Skilled in performance advertising, data analytics, and team leadership.'
          },
          education: [
            {
              degree: 'ปริญญาตรี',
              degreeEn: 'Bachelor of Commerce',
              field: 'การตลาดและการจัดการ',
              fieldEn: 'Marketing & Management',
              institution: 'มหาวิทยาลัยซิดนีย์',
              institutionEn: 'University of Sydney',
              year: 2020,
              gpa: 3.7
            }
          ],
          experience: [
            {
              title: 'Senior Growth Marketing Specialist',
              company: 'APAC Digital Partners',
              companyEn: 'APAC Digital Partners Pty Ltd',
              startDate: '2022-02',
              endDate: '',
              current: true,
              description: 'Managed over $500k USD annual ad budget, boosting organic web traffic by 180% and customer acquisitions by 65%.',
              descriptionEn: 'Managed over $500k USD annual ad budget, boosting organic web traffic by 180% and customer acquisitions by 65%.'
            },
            {
              title: 'Digital Marketing Executive',
              company: 'Pacific Media Group',
              companyEn: 'Pacific Media Group',
              startDate: '2020-03',
              endDate: '2022-01',
              current: false,
              description: 'Created social media ad strategies and coordinated influencer outreach campaigns.',
              descriptionEn: 'Created social media ad strategies and coordinated influencer outreach campaigns.'
            }
          ],
          skills: [
            { name: 'Growth Hacking & Strategy', level: 'expert' },
            { name: 'SEO & SEM (Google Ads)', level: 'expert' },
            { name: 'Meta & TikTok Ads', level: 'expert' },
            { name: 'Google Analytics 4 & Looker Studio', level: 'expert' },
            { name: 'HubSpot / Salesforce Marketing Cloud', level: 'intermediate' }
          ],
          languages: [
            { name: 'อังกฤษ', nameEn: 'English', level: 'native' },
            { name: 'ไทย', nameEn: 'Thai', level: 'basic' }
          ],
          certificates: [
            { name: 'Google Ads Search & Display Certified', issuer: 'Google Skillshop', year: 2024 },
            { name: 'HubSpot Inbound Marketing Certified', issuer: 'HubSpot Academy', year: 2023 }
          ],
          expectedSalary: 85000,
          availableDate: '2026-12-01',
          relocate: true,
          createdAt: '2026-10-04T09:00:00',
          updatedAt: '2026-10-04T09:00:00'
        },
        {
          id: 'r4',
          userId: 'u3',
          personal: {
            name: 'สมชาย ใจดี (Cloud Specialist)',
            nameEn: 'Somchai Jaidee (Cloud Specialist)',
            email: 'somchai.cloud@email.com',
            phone: '081-234-5678',
            address: 'กรุงเทพมหานคร',
            photo: '👨‍💻',
            linkedin: 'linkedin.com/in/somchai-dev',
            portfolio: '',
            summary: 'ประวัติย่อฉบับเสริม เน้นความเชี่ยวชาญด้าน Cloud Infrastructure, DevOps และความมั่นคงปลอดภัยบนระบบคลาวด์',
            summaryEn: 'Specialized profile emphasizing Cloud Infrastructure, DevOps pipelines, and cloud security architecture.'
          },
          education: [
            {
              degree: 'ปริญญาตรี',
              degreeEn: 'Bachelor of Science',
              field: 'วิทยาการคอมพิวเตอร์',
              fieldEn: 'Computer Science',
              institution: 'จุฬาลงกรณ์มหาวิทยาลัย',
              institutionEn: 'Chulalongkorn University',
              year: 2021,
              gpa: 3.65
            }
          ],
          experience: [
            {
              title: 'DevOps & Cloud Engineer',
              company: 'บริษัท คลาวด์ เนทีฟ จำกัด',
              companyEn: 'Cloud Native Co., Ltd.',
              startDate: '2022-01',
              endDate: '2022-12',
              current: false,
              description: 'ดูแลการติดตั้ง Kubernetes Cluster และตั้งค่า CI/CD Automation',
              descriptionEn: 'Maintained Kubernetes clusters and built streamlined CI/CD pipelines.'
            }
          ],
          skills: [
            { name: 'Kubernetes & Docker', level: 'expert' },
            { name: 'Terraform (IaC)', level: 'intermediate' },
            { name: 'AWS & GCP', level: 'expert' }
          ],
          languages: [
            { name: 'ไทย', nameEn: 'Thai', level: 'native' },
            { name: 'อังกฤษ', nameEn: 'English', level: 'good' }
          ],
          certificates: [
            { name: 'Certified Kubernetes Administrator (CKA)', issuer: 'Linux Foundation', year: 2024 }
          ],
          expectedSalary: 80000,
          availableDate: '2026-12-01',
          relocate: false,
          createdAt: '2026-10-08T11:00:00',
          updatedAt: '2026-10-08T11:00:00'
        }
      ];

      const sampleCandidates = [
        {
          id: 'c1',
          userId: 'u3',
          jobId: 'j1',
          status: 'interview_scheduled',
          appliedAt: '2026-10-05T14:30:00',
          resumeId: 'r1',
          scores: { qualification: 5, experience: 4, skills: 5 },
          notes: [
            { text: 'มีประสบการณ์ตรงกับ React และ Node.js สื่อสารดีมาก มีผลงานโอเพนซอร์ส', by: 'u1', at: '2026-10-06T10:00:00' }
          ],
          timeline: [
            { action: 'applied', at: '2026-10-05T14:30:00', by: 'u3' },
            { action: 'screening', at: '2026-10-06T10:00:00', by: 'u1' },
            { action: 'qualified', at: '2026-10-09T14:00:00', by: 'u1' },
            { action: 'interview_scheduled', at: '2026-10-12T11:00:00', by: 'u1' }
          ],
          source: 'linkedin'
        },
        {
          id: 'c2',
          userId: 'u4',
          jobId: 'j2',
          status: 'screening',
          appliedAt: '2026-10-08T09:15:00',
          resumeId: 'r2',
          scores: { qualification: 4, experience: 3, skills: 4 },
          notes: [
            { text: 'ประวัติการทำงานด้านสรรหาดี เอกสารครบถ้วน รอผลตรวจประวัติเบื้องต้น', by: 'u1', at: '2026-10-09T14:00:00' }
          ],
          timeline: [
            { action: 'applied', at: '2026-10-08T09:15:00', by: 'u4' },
            { action: 'screening', at: '2026-10-09T14:00:00', by: 'u1' }
          ],
          source: 'jobboard'
        },
        {
          id: 'c3',
          userId: 'u5',
          jobId: 'j3',
          status: 'qualified',
          appliedAt: '2026-10-11T16:45:00',
          resumeId: 'r3',
          scores: { qualification: 5, experience: 5, skills: 4 },
          notes: [
            { text: 'Strong background in digital marketing and SEA expansion. Recommended for interview.', by: 'u2', at: '2026-10-12T15:30:00' }
          ],
          timeline: [
            { action: 'applied', at: '2026-10-11T16:45:00', by: 'u5' },
            { action: 'screening', at: '2026-10-12T15:30:00', by: 'u2' },
            { action: 'qualified', at: '2026-10-14T10:00:00', by: 'u2' }
          ],
          source: 'direct'
        },
        {
          id: 'c4',
          userId: 'u3',
          jobId: 'j3',
          status: 'new',
          appliedAt: '2026-10-19T08:20:00',
          resumeId: 'r1',
          scores: { qualification: 3, experience: 2, skills: 3 },
          notes: [],
          timeline: [
            { action: 'applied', at: '2026-10-19T08:20:00', by: 'u3' }
          ],
          source: 'direct'
        },
        {
          id: 'c5',
          userId: 'u4',
          jobId: 'j1',
          status: 'new',
          appliedAt: '2026-10-21T11:00:00',
          resumeId: 'r2',
          scores: { qualification: 2, experience: 2, skills: 2 },
          notes: [],
          timeline: [
            { action: 'applied', at: '2026-10-21T11:00:00', by: 'u4' }
          ],
          source: 'referral'
        },
        {
          id: 'c6',
          userId: 'u5',
          jobId: 'j1',
          status: 'screening',
          appliedAt: '2026-10-14T13:10:00',
          resumeId: 'r3',
          scores: { qualification: 4, experience: 4, skills: 4 },
          notes: [
            { text: 'Has coding exposure and marketing analytics. Need technical interview.', by: 'u1', at: '2026-10-15T09:00:00' }
          ],
          timeline: [
            { action: 'applied', at: '2026-10-14T13:10:00', by: 'u5' },
            { action: 'screening', at: '2026-10-15T09:00:00', by: 'u1' }
          ],
          source: 'linkedin'
        },
        {
          id: 'c7',
          userId: 'u4',
          jobId: 'j5',
          status: 'hired',
          appliedAt: '2026-09-05T10:00:00',
          resumeId: 'r2',
          scores: { qualification: 5, experience: 5, skills: 5 },
          notes: [
            { text: 'สัมภาษณ์รอบสุดท้ายผ่านแล้ว ตอบคำถามดีเยี่ยม ได้รับการตอบรับข้อเสนอและเซ็นสัญญาแล้ว', by: 'u2', at: '2026-09-25T16:00:00' }
          ],
          timeline: [
            { action: 'applied', at: '2026-09-05T10:00:00', by: 'u4' },
            { action: 'screening', at: '2026-09-08T11:00:00', by: 'u2' },
            { action: 'interview_scheduled', at: '2026-09-12T14:00:00', by: 'u2' },
            { action: 'interviewed', at: '2026-09-18T10:00:00', by: 'u2' },
            { action: 'offered', at: '2026-09-22T15:00:00', by: 'u1' },
            { action: 'hired', at: '2026-09-28T09:00:00', by: 'u1' }
          ],
          source: 'referral'
        },
        {
          id: 'c8',
          userId: 'u3',
          jobId: 'j5',
          status: 'rejected',
          appliedAt: '2026-09-10T15:00:00',
          resumeId: 'r1',
          scores: { qualification: 2, experience: 1, skills: 2 },
          notes: [
            { text: 'ทักษะไม่ตรงกับความต้องการของตำแหน่งงานขาย Candidate ต้องการตำแหน่งสาย Tech', by: 'u2', at: '2026-09-15T11:00:00' }
          ],
          timeline: [
            { action: 'applied', at: '2026-09-10T15:00:00', by: 'u3' },
            { action: 'screening', at: '2026-09-12T14:00:00', by: 'u2' },
            { action: 'rejected', at: '2026-09-15T11:00:00', by: 'u2' }
          ],
          source: 'jobboard'
        }
      ];

      const sampleInterviews = [
        {
          id: 'i1',
          candidateId: 'c1',
          jobId: 'j1',
          type: 'video',
          date: '2026-10-26',
          time: '10:00',
          duration: 60,
          interviewers: ['สมศรี จันทร์สุข', 'เดวิด มิลเลอร์'],
          location: 'Google Meet (meet.google.com/xyz-rec)',
          notes: 'เตรียมคำถามด้าน System Design, React Performance และ Microservices',
          status: 'scheduled',
          evaluation: null
        },
        {
          id: 'i2',
          candidateId: 'c3',
          jobId: 'j3',
          type: 'onsite',
          date: '2026-10-28',
          time: '14:00',
          duration: 45,
          interviewers: ['เดวิด มิลเลอร์'],
          location: 'ห้องประชุม A ชั้น 12 อาคารสำนักงานใหญ่',
          notes: 'ผู้สมัครเตรียมสไลด์นำเสนอแผนการตลาด 90 วันแรก (90-day Marketing Plan)',
          status: 'scheduled',
          evaluation: null
        },
        {
          id: 'i3',
          candidateId: 'c7',
          jobId: 'j5',
          type: 'video',
          date: '2026-09-18',
          time: '10:00',
          duration: 60,
          interviewers: ['เดวิด มิลเลอร์', 'สมศรี จันทร์สุข'],
          location: 'Zoom Meeting',
          notes: 'จำลองสถานการณ์การขายและประเมินทักษะการเจรจาต่อรอง',
          status: 'completed',
          evaluation: {
            technical: 5,
            communication: 5,
            attitude: 5,
            cultureFit: 4,
            growthPotential: 5,
            result: 'pass',
            comments: 'ยอดเยี่ยมมาก บุคลิกภาพดี มีทัศนคติเชิงบวก ตอบคำถามสถานการณ์ได้อย่างคล่องแคล่ว เหมาะสมกับตำแหน่งอย่างยิ่ง'
          }
        },
        {
          id: 'i4',
          candidateId: 'c8',
          jobId: 'j5',
          type: 'phone',
          date: '2026-09-14',
          time: '13:30',
          duration: 30,
          interviewers: ['เดวิด มิลเลอร์'],
          location: 'โทรศัพท์สายตรง',
          notes: 'สัมภาษณ์คัดกรองเบื้องต้นทางโทรศัพท์',
          status: 'completed',
          evaluation: {
            technical: 2,
            communication: 3,
            attitude: 3,
            cultureFit: 3,
            growthPotential: 2,
            result: 'fail',
            comments: 'ผู้สมัครมีความประสงค์จะทำงานสายพัฒนาซอฟต์แวร์มากกว่างานขาย จึงไม่ผ่านเกณฑ์การคัดเลือก'
          }
        },
        {
          id: 'i5',
          candidateId: 'c6',
          jobId: 'j1',
          type: 'panel',
          date: '2026-10-18',
          time: '11:00',
          duration: 60,
          interviewers: ['สมศรี จันทร์สุข', 'Tech Lead'],
          location: 'ห้องประชุม C',
          notes: 'ขอยกเลิกนัดเนื่องจากผู้สัมภาษณ์ติดภารกิจด่วน จะประสานงานนัดหมายใหม่อีกครั้ง',
          status: 'cancelled',
          evaluation: null
        }
      ];

      setStorage(STORAGE_KEYS.USERS, sampleUsers);
      setStorage(STORAGE_KEYS.JOBS, sampleJobs);
      setStorage(STORAGE_KEYS.RESUMES, sampleResumes);
      setStorage(STORAGE_KEYS.CANDIDATES, sampleCandidates);
      setStorage(STORAGE_KEYS.INTERVIEWS, sampleInterviews);

      console.log('Sample data initialized successfully.');
    },

    resetSampleData() {
      localStorage.removeItem(STORAGE_KEYS.USERS);
      localStorage.removeItem(STORAGE_KEYS.JOBS);
      localStorage.removeItem(STORAGE_KEYS.CANDIDATES);
      localStorage.removeItem(STORAGE_KEYS.INTERVIEWS);
      localStorage.removeItem(STORAGE_KEYS.RESUMES);
      this.initSampleData();
    }
  };

  // Check if data exists on load; if not, call initSampleData()
  try {
    const existingJobs = localStorage.getItem(STORAGE_KEYS.JOBS);
    const existingUsers = localStorage.getItem(STORAGE_KEYS.USERS);
    if (!existingJobs || !existingUsers) {
      Data.initSampleData();
    }
  } catch (err) {
    console.error('Error auto-initializing sample data:', err);
  }

  window.Data = Data;
})();
