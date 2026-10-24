/**
 * HR Recruitment Application - Core Application Layer
 * Handles Routing, Authentication, i18n, Modal/Toast UI, and State Management.
 */

(function () {
  'use strict';

  // Storage keys
  const STORAGE_KEYS = {
    CURRENT_USER: 'hrApp_currentUser',
    LANG: 'hrApp_lang',
    THEME: 'hrApp_theme'
  };

  // =========================================================================
  // Comprehensive Translations (Thai & English)
  // =========================================================================
  const translations = {
    th: {
      nav: {
        dashboard: 'แดชบอร์ด',
        jobs: 'ตำแหน่งงาน',
        candidates: 'ผู้สมัคร',
        interviews: 'การสัมภาษณ์',
        resumes: 'เรซูเม่',
        reports: 'รายงาน',
        myApplications: 'งานที่สมัคร',
        myResumes: 'เรซูเม่ของฉัน',
        profile: 'โปรไฟล์',
        logout: 'ออกจากระบบ',
        settings: 'การตั้งค่า',
        switchRole: 'เปลี่ยนบทบาท'
      },
      login: {
        title: 'ระบบบริหารการสรรหาบุคลากร',
        subtitle: 'HR Recruitment & Talent Acquisition System',
        email: 'อีเมล',
        password: 'รหัสผ่าน',
        submit: 'เข้าสู่ระบบ',
        hr: 'เจ้าหน้าที่ HR',
        applicant: 'ผู้สมัครงาน',
        demoAccounts: 'บัญชีสำหรับทดสอบระบบ (คลิกเพื่อเข้าสู่ระบบ)',
        selectRole: 'เลือกประเภทผู้ใช้งาน',
        invalidCredentials: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง',
        loginAs: 'เข้าสู่ระบบในฐานะ',
        welcomeBack: 'ยินดีต้อนรับกลับมา'
      },
      dashboard: {
        title: 'แดชบอร์ดภาพรวม',
        openJobs: 'ตำแหน่งงานที่เปิดรับ',
        totalCandidates: 'ผู้สมัครทั้งหมด',
        interviews: 'นัดสัมภาษณ์ที่รออยู่',
        hired: 'รับเข้าทำงานแล้ว',
        recentActivity: 'ความเคลื่อนไหวล่าสุด',
        pipeline: 'สถานะขั้นตอนการสรรหา',
        quickActions: 'การดำเนินการด่วน',
        postJob: 'ประกาศรับสมัครงาน',
        scheduleInterview: 'นัดหมายสัมภาษณ์',
        reviewCandidates: 'คัดกรองผู้สมัคร',
        viewReports: 'ดูรายงานเชิงลึก',
        myAppsTitle: 'สถานะการสมัครงานของฉัน',
        recommendedJobs: 'ตำแหน่งงานแนะนำสำหรับคุณ',
        applicationStatus: 'สถานะใบสมัคร'
      },
      jobs: {
        title: 'จัดการตำแหน่งงาน',
        create: 'สร้างประกาศงานใหม่',
        edit: 'แก้ไขประกาศงาน',
        detail: 'รายละเอียดตำแหน่งงาน',
        department: 'แผนก / ฝ่าย',
        level: 'ระดับตำแหน่ง',
        type: 'รูปแบบการจ้าง',
        vacancies: 'จำนวนที่เปิดรับ',
        salary: 'ช่วงเงินเดือน (บาท)',
        location: 'สถานที่ปฏิบัติงาน',
        workMode: 'รูปแบบการทำงาน',
        description: 'รายละเอียดงานและความรับผิดชอบ',
        requirements: 'คุณสมบัติผู้สมัคร',
        benefits: 'สวัสดิการและสิทธิประโยชน์',
        deadline: 'วันสิ้นสุดการรับสมัคร',
        status: 'สถานะประกาศ',
        draft: 'แบบร่าง',
        open: 'เปิดรับสมัคร',
        closed: 'ปิดรับสมัคร',
        applyNow: 'สมัครงานตำแหน่งนี้',
        applied: 'สมัครแล้ว',
        deleteConfirm: 'คุณแน่ใจหรือไม่ว่าต้องการลบตำแหน่งงานนี้?',
        allDepartments: 'ทุกแผนก',
        allWorkModes: 'ทุกรูปแบบงาน',
        searchPlaceholder: 'ค้นหาชื่อตำแหน่ง, แผนก, หรือทักษะ...',
        filterBy: 'ตัวกรอง',
        noJobsFound: 'ไม่พบตำแหน่งงานที่ตรงกับเงื่อนไข',
        applicantsCount: 'ผู้สมัคร {count} คน',
        employmentTypes: {
          fulltime: 'งานประจำ (Full-time)',
          parttime: 'งานพาร์ทไทม์ (Part-time)',
          contract: 'สัญญาจ้าง (Contract)',
          internship: 'ฝึกงาน (Internship)'
        },
        levels: {
          junior: 'ระดับเริ่มต้น (Junior)',
          mid: 'ระดับกลาง (Mid-Level)',
          senior: 'ระดับอาวุโส (Senior)',
          lead: 'หัวหน้าทีม (Lead)',
          manager: 'ผู้จัดการ (Manager)'
        },
        workModes: {
          onsite: 'เข้าทำงานที่สำนักงาน (Onsite)',
          remote: 'ทำงานจากที่ใดก็ได้ (Remote)',
          hybrid: 'ผสมผสาน (Hybrid)'
        }
      },
      candidates: {
        title: 'การคัดกรองผู้สมัคร',
        profile: 'ข้อมูลผู้สมัคร',
        screening: 'การประเมินเบื้องต้น',
        status: 'สถานะผู้สมัคร',
        scores: 'คะแนนการประเมิน',
        notes: 'บันทึกของ HR',
        timeline: 'ลำดับเหตุการณ์การสมัคร',
        source: 'ช่องทางการสมัคร',
        kanban: 'มุมมองไปป์ไลน์ (Kanban)',
        list: 'มุมมองรายการ',
        scoreCandidate: 'ให้คะแนนผู้สมัคร',
        addNote: 'เพิ่มบันทึกความเห็น',
        changeStatus: 'เปลี่ยนสถานะ',
        viewResume: 'ดูเรซูเม่ฉบับเต็ม',
        allJobs: 'ทุกตำแหน่งงาน',
        qualificationScore: 'คุณสมบัติตรงตามเกณฑ์',
        experienceScore: 'ประสบการณ์ทำงาน',
        skillsScore: 'ทักษะความสามารถ',
        averageScore: 'คะแนนเฉลี่ย',
        notePlaceholder: 'เขียนบันทึกความเห็นเกี่ยวกับผู้สมัครคนนี้...',
        saveNote: 'บันทึกความเห็น',
        noCandidatesFound: 'ไม่พบข้อมูลผู้สมัครในส่วนนี้',
        statuses: {
          new: 'ใบสมัครใหม่',
          screening: 'กำลังคัดกรอง',
          qualified: 'ผ่านเกณฑ์เบื้องต้น',
          interview_scheduled: 'นัดสัมภาษณ์แล้ว',
          interviewed: 'สัมภาษณ์แล้ว',
          offered: 'ยื่นข้อเสนอจ้างงาน',
          hired: 'รับเข้าทำงาน',
          rejected: 'ไม่ผ่านการคัดเลือก'
        },
        sources: {
          direct: 'เว็บไซต์บริษัท',
          referral: 'คนรู้จักแนะนำ',
          jobboard: 'เว็บไซต์หางาน',
          linkedin: 'LinkedIn'
        }
      },
      interviews: {
        title: 'จัดการการสัมภาษณ์',
        schedule: 'นัดหมายสัมภาษณ์ใหม่',
        evaluation: 'แบบประเมินผลการสัมภาษณ์',
        calendar: 'ปฏิทินนัดหมาย',
        type: 'รูปแบบการสัมภาษณ์',
        date: 'วันที่สัมภาษณ์',
        time: 'เวลา',
        duration: 'ระยะเวลา (นาที)',
        interviewers: 'คณะผู้สัมภาษณ์',
        location: 'สถานที่ / ลิงก์ห้องประชุม',
        status: 'สถานะการสัมภาษณ์',
        noInterviews: 'ไม่มีนัดหมายสัมภาษณ์ในช่วงนี้',
        upcoming: 'การสัมภาษณ์ที่กำลังจะมาถึง',
        completed: 'สัมภาษณ์เสร็จสิ้นแล้ว',
        cancelled: 'ยกเลิกนัดหมาย',
        joinMeeting: 'เข้าร่วมห้องสัมภาษณ์ออนไลน์',
        saveEvaluation: 'บันทึกผลการประเมิน',
        interviewDetails: 'รายละเอียดการสัมภาษณ์',
        scheduledWith: 'สัมภาษณ์กับ',
        types: {
          phone: 'โทรศัพท์สัมภาษณ์',
          video: 'วิดีโอคอลออนไลน์',
          onsite: 'สัมภาษณ์ที่สำนักงาน',
          panel: 'สัมภาษณ์แบบกลุ่มกรรมการ'
        },
        eval: {
          technical: 'ความรู้และทักษะเฉพาะทาง',
          communication: 'การสื่อสารและการแสดงออก',
          attitude: 'ทัศนคติและแรงจูงใจ',
          cultureFit: 'ความเข้ากันได้กับวัฒนธรรมองค์กร',
          growthPotential: 'ศักยภาพในการเติบโตและการเรียนรู้',
          result: 'ผลสรุปการประเมิน',
          comments: 'ความเห็นและข้อเสนอแนะเพิ่มเติม',
          pass: 'ผ่านการคัดเลือก (Pass)',
          consider: 'พิจารณาเปรียบเทียบ (Consider)',
          fail: 'ไม่ผ่านเกณฑ์ (Fail)',
          evaluationForm: 'กรอกแบบประเมินผู้สมัคร',
          scoreOutOf5: 'คะแนน (เต็ม 5 ดาว)'
        }
      },
      resumes: {
        title: 'เครื่องมือสร้างเรซูเม่',
        create: 'สร้างเรซูเม่ใหม่',
        edit: 'แก้ไขข้อมูลเรซูเม่',
        preview: 'ดูตัวอย่างเรซูเม่',
        myResumes: 'เรซูเม่ทั้งหมดของฉัน',
        personal: 'ข้อมูลส่วนตัว',
        education: 'ประวัติการศึกษา',
        experience: 'ประสบการณ์การทำงาน',
        skills: 'ทักษะและความเชี่ยวชาญ',
        languages: 'ทักษะภาษา',
        certificates: 'ประกาศนียบัตร / อบรม',
        expectedSalary: 'เงินเดือนที่คาดหวัง (บาท)',
        availableDate: 'วันที่พร้อมเริ่มงาน',
        fullName: 'ชื่อ - นามสกุล',
        phone: 'เบอร์โทรศัพท์',
        email: 'อีเมลติดต่อ',
        address: 'ที่อยู่ปัจจุบัน',
        summary: 'บทสรุปความเป็นมืออาชีพ (Summary)',
        addEducation: '+ เพิ่มประวัติการศึกษา',
        addExperience: '+ เพิ่มประสบการณ์ทำงาน',
        addSkill: '+ เพิ่มทักษะ',
        addLanguage: '+ เพิ่มภาษา',
        addCertificate: '+ เพิ่มประกาศนียบัตร',
        degree: 'ระดับการศึกษา / วุฒิ',
        institution: 'สถานศึกษา / มหาวิทยาลัย',
        fieldOfStudy: 'สาขาวิชา',
        year: 'ปีที่สำเร็จการศึกษา',
        gpa: 'เกรดเฉลี่ย (GPA)',
        jobTitle: 'ตำแหน่งงาน',
        company: 'ชื่อบริษัท / องค์กร',
        startDate: 'เริ่มเมื่อ',
        endDate: 'สิ้นสุดเมื่อ',
        currentJob: 'ปัจจุบันกำลังทำงานที่นี่',
        skillName: 'ชื่อทักษะ',
        skillLevel: 'ระดับความชำนาญ',
        proficiency: 'ความสามารถ',
        downloadPdf: 'ดาวน์โหลด PDF',
        printResume: 'พิมพ์เรซูเม่',
        completeness: 'ความสมบูรณ์ของเรซูเม่',
        skillLevels: {
          beginner: 'ระดับเริ่มต้น (Beginner)',
          intermediate: 'ระดับปานกลาง (Intermediate)',
          advanced: 'ระดับสูง (Advanced)',
          expert: 'ระดับเชี่ยวชาญ (Expert)'
        },
        langLevels: {
          basic: 'พื้นฐาน (Basic)',
          good: 'ดี (Good)',
          fluent: 'คล่องแคล่ว (Fluent)',
          native: 'ภาษาแม่ (Native)'
        }
      },
      reports: {
        title: 'รายงานและการวิเคราะห์',
        summary: 'สรุปภาพรวมการสรรหา',
        timeToHire: 'ระยะเวลาเฉลี่ยในการจ้างงาน (Time to Hire)',
        sourceAnalysis: 'ประสิทธิภาพของช่องทางการสรรหา',
        byDepartment: 'สถิติการรับสมัครตามแผนก',
        conversionRate: 'อัตราการผ่านการคัดเลือก (Conversion Rate)',
        hiringFunnel: 'กรวยกระบวนการสรรหา (Hiring Funnel)',
        avgDaysToHire: 'จำนวนวันเฉลี่ยในการปิดรับสมัคร',
        candidateSources: 'สัดส่วนที่มาของผู้สมัคร',
        jobFillRate: 'อัตราการปิดรับตำแหน่งสำเร็จ',
        topSkills: 'ทักษะที่กำลังต้องการสูงสุด',
        monthlyTrend: 'แนวโน้มการสมัครงานรายเดือน'
      },
      common: {
        save: 'บันทึก',
        cancel: 'ยกเลิก',
        delete: 'ลบข้อมูล',
        edit: 'แก้ไข',
        search: 'ค้นหา',
        filter: 'กรองข้อมูล',
        noData: 'ไม่มีข้อมูล',
        confirm: 'ยืนยัน',
        back: 'ย้อนกลับ',
        next: 'ถัดไป',
        submit: 'ส่งข้อมูล',
        actions: 'จัดการ',
        status: 'สถานะ',
        date: 'วันที่',
        name: 'ชื่อ',
        email: 'อีเมล',
        phone: 'เบอร์โทร',
        viewAll: 'ดูทั้งหมด',
        loading: 'กำลังโหลด...',
        success: 'ทำรายการสำเร็จ',
        error: 'เกิดข้อผิดพลาด',
        all: 'ทั้งหมด',
        close: 'ปิด',
        add: 'เพิ่มใหม่',
        reset: 'รีเซ็ตข้อมูล',
        selectOption: 'เลือกรายการ...',
        required: 'จำเป็นต้องระบุ',
        viewDetails: 'ดูรายละเอียด',
        days: 'วัน',
        months: 'เดือน',
        years: 'ปี',
        baht: 'บาท',
        person: 'คน',
        positions: 'อัตรา'
      }
    },
    en: {
      nav: {
        dashboard: 'Dashboard',
        jobs: 'Jobs',
        candidates: 'Candidates',
        interviews: 'Interviews',
        resumes: 'Resumes',
        reports: 'Reports',
        myApplications: 'My Applications',
        myResumes: 'My Resumes',
        profile: 'Profile',
        logout: 'Log Out',
        settings: 'Settings',
        switchRole: 'Switch Role'
      },
      login: {
        title: 'HR Recruitment System',
        subtitle: 'Talent Acquisition & Pipeline Management',
        email: 'Email Address',
        password: 'Password',
        submit: 'Sign In',
        hr: 'HR Admin',
        applicant: 'Job Applicant',
        demoAccounts: 'Demo Accounts (Click to test)',
        selectRole: 'Select Role',
        invalidCredentials: 'Invalid email or password. Please try again.',
        loginAs: 'Sign in as',
        welcomeBack: 'Welcome Back'
      },
      dashboard: {
        title: 'Recruitment Dashboard',
        openJobs: 'Open Positions',
        totalCandidates: 'Total Candidates',
        interviews: 'Scheduled Interviews',
        hired: 'Hired Candidates',
        recentActivity: 'Recent Activities',
        pipeline: 'Recruitment Pipeline',
        quickActions: 'Quick Actions',
        postJob: 'Post New Job',
        scheduleInterview: 'Schedule Interview',
        reviewCandidates: 'Screen Candidates',
        viewReports: 'View Analytics',
        myAppsTitle: 'My Applications',
        recommendedJobs: 'Recommended Positions',
        applicationStatus: 'Application Status'
      },
      jobs: {
        title: 'Job Postings',
        create: 'Create Job Posting',
        edit: 'Edit Job Posting',
        detail: 'Job Details',
        department: 'Department',
        level: 'Career Level',
        type: 'Employment Type',
        vacancies: 'Vacancies',
        salary: 'Salary Range (THB)',
        location: 'Location',
        workMode: 'Work Mode',
        description: 'Job Description & Responsibilities',
        requirements: 'Requirements & Qualifications',
        benefits: 'Perks & Benefits',
        deadline: 'Application Deadline',
        status: 'Status',
        draft: 'Draft',
        open: 'Open',
        closed: 'Closed',
        applyNow: 'Apply Now',
        applied: 'Applied',
        deleteConfirm: 'Are you sure you want to delete this job posting?',
        allDepartments: 'All Departments',
        allWorkModes: 'All Work Modes',
        searchPlaceholder: 'Search jobs, departments, skills...',
        filterBy: 'Filter By',
        noJobsFound: 'No job postings found matching criteria',
        applicantsCount: '{count} Applicants',
        employmentTypes: {
          fulltime: 'Full-time',
          parttime: 'Part-time',
          contract: 'Contract',
          internship: 'Internship'
        },
        levels: {
          junior: 'Junior',
          mid: 'Mid-Level',
          senior: 'Senior',
          lead: 'Team Lead',
          manager: 'Manager'
        },
        workModes: {
          onsite: 'Onsite',
          remote: 'Remote',
          hybrid: 'Hybrid'
        }
      },
      candidates: {
        title: 'Candidate Screening',
        profile: 'Candidate Profile',
        screening: 'Initial Screening',
        status: 'Status',
        scores: 'Evaluation Scores',
        notes: 'HR Notes',
        timeline: 'Application Timeline',
        source: 'Acquisition Source',
        kanban: 'Pipeline Board (Kanban)',
        list: 'List View',
        scoreCandidate: 'Score Candidate',
        addNote: 'Add Note',
        changeStatus: 'Change Status',
        viewResume: 'View Resume',
        allJobs: 'All Positions',
        qualificationScore: 'Qualification Match',
        experienceScore: 'Relevant Experience',
        skillsScore: 'Technical Skills',
        averageScore: 'Average Score',
        notePlaceholder: 'Type feedback or internal notes here...',
        saveNote: 'Save Note',
        noCandidatesFound: 'No candidates found in this view',
        statuses: {
          new: 'New Application',
          screening: 'Screening',
          qualified: 'Qualified',
          interview_scheduled: 'Interview Scheduled',
          interviewed: 'Interviewed',
          offered: 'Offer Extended',
          hired: 'Hired',
          rejected: 'Rejected'
        },
        sources: {
          direct: 'Career Site',
          referral: 'Employee Referral',
          jobboard: 'Job Board',
          linkedin: 'LinkedIn'
        }
      },
      interviews: {
        title: 'Interview Management',
        schedule: 'Schedule Interview',
        evaluation: 'Interview Evaluation',
        calendar: 'Schedule Calendar',
        type: 'Interview Type',
        date: 'Date',
        time: 'Time',
        duration: 'Duration (mins)',
        interviewers: 'Interview Panel',
        location: 'Location / Meeting Link',
        status: 'Status',
        noInterviews: 'No interviews scheduled for this period',
        upcoming: 'Upcoming Interviews',
        completed: 'Completed Interviews',
        cancelled: 'Cancelled',
        joinMeeting: 'Join Online Meeting',
        saveEvaluation: 'Save Evaluation',
        interviewDetails: 'Interview Details',
        scheduledWith: 'Scheduled with',
        types: {
          phone: 'Phone Screening',
          video: 'Video Conference',
          onsite: 'Onsite Interview',
          panel: 'Panel Interview'
        },
        eval: {
          technical: 'Technical Competence',
          communication: 'Communication Skills',
          attitude: 'Attitude & Motivation',
          cultureFit: 'Culture Fit',
          growthPotential: 'Growth Potential',
          result: 'Final Verdict',
          comments: 'Comments & Recommendations',
          pass: 'Pass',
          consider: 'Consider',
          fail: 'Fail',
          evaluationForm: 'Candidate Evaluation Form',
          scoreOutOf5: 'Score (out of 5 stars)'
        }
      },
      resumes: {
        title: 'Resume Builder',
        create: 'Create Resume',
        edit: 'Edit Resume',
        preview: 'Resume Preview',
        myResumes: 'My Resumes',
        personal: 'Personal Information',
        education: 'Education',
        experience: 'Work Experience',
        skills: 'Skills & Proficiencies',
        languages: 'Languages',
        certificates: 'Certifications',
        expectedSalary: 'Expected Salary (THB)',
        availableDate: 'Earliest Start Date',
        fullName: 'Full Name',
        phone: 'Phone Number',
        email: 'Email Address',
        address: 'Current Address',
        summary: 'Professional Summary',
        addEducation: '+ Add Education',
        addExperience: '+ Add Experience',
        addSkill: '+ Add Skill',
        addLanguage: '+ Add Language',
        addCertificate: '+ Add Certificate',
        degree: 'Degree / Certificate',
        institution: 'University / Institute',
        fieldOfStudy: 'Field of Study',
        year: 'Graduation Year',
        gpa: 'GPA',
        jobTitle: 'Job Title',
        company: 'Company / Employer',
        startDate: 'Start Date',
        endDate: 'End Date',
        currentJob: 'I currently work here',
        skillName: 'Skill Name',
        skillLevel: 'Proficiency Level',
        proficiency: 'Proficiency',
        downloadPdf: 'Download PDF',
        printResume: 'Print Resume',
        completeness: 'Profile Completeness',
        skillLevels: {
          beginner: 'Beginner',
          intermediate: 'Intermediate',
          advanced: 'Advanced',
          expert: 'Expert'
        },
        langLevels: {
          basic: 'Basic',
          good: 'Good',
          fluent: 'Fluent',
          native: 'Native'
        }
      },
      reports: {
        title: 'Analytics & Reports',
        summary: 'Recruitment Overview',
        timeToHire: 'Average Time to Hire',
        sourceAnalysis: 'Channel Efficiency',
        byDepartment: 'Postings by Department',
        conversionRate: 'Funnel Conversion Rate',
        hiringFunnel: 'Recruitment Pipeline Funnel',
        avgDaysToHire: 'Average Days to Hire',
        candidateSources: 'Candidate Acquisition Breakdown',
        jobFillRate: 'Position Fill Rate',
        topSkills: 'Most In-Demand Skills',
        monthlyTrend: 'Monthly Application Trends'
      },
      common: {
        save: 'Save',
        cancel: 'Cancel',
        delete: 'Delete',
        edit: 'Edit',
        search: 'Search',
        filter: 'Filter',
        noData: 'No data available',
        confirm: 'Confirm',
        back: 'Back',
        next: 'Next',
        submit: 'Submit',
        actions: 'Actions',
        status: 'Status',
        date: 'Date',
        name: 'Name',
        email: 'Email',
        phone: 'Phone',
        viewAll: 'View All',
        loading: 'Loading...',
        success: 'Action successful',
        error: 'An error occurred',
        all: 'All',
        close: 'Close',
        add: 'Add New',
        reset: 'Reset',
        selectOption: 'Select option...',
        required: 'Required',
        viewDetails: 'View Details',
        days: 'days',
        months: 'months',
        years: 'years',
        baht: 'THB',
        person: 'person',
        positions: 'positions'
      }
    }
  };

  // =========================================================================
  // Core App Object
  // =========================================================================
  const App = {
    translations,
    currentUser: null,
    currentLang: 'th',
    currentTheme: 'light',
    currentRoute: { page: 'dashboard', action: null, id: null },

    /**
     * Initialize application
     */
    init() {
      // 1. Load language preference
      const savedLang = localStorage.getItem(STORAGE_KEYS.LANG) || 'th';
      this.currentLang = savedLang;
      document.documentElement.lang = savedLang;
      const langLabel = document.getElementById('lang-label');
      if (langLabel) {
        langLabel.textContent = savedLang === 'th' ? 'EN' : 'TH';
      }

      // 2. Load theme preference
      const savedTheme = localStorage.getItem(STORAGE_KEYS.THEME) || 'light';
      this.currentTheme = savedTheme;
      document.documentElement.setAttribute('data-theme', savedTheme);
      this.updateThemeIcon();

      // 3. Load logged-in user session
      try {
        const userJson = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
        if (userJson) {
          this.currentUser = JSON.parse(userJson);
        }
      } catch (e) {
        console.error('Failed to parse currentUser from storage:', e);
        this.currentUser = null;
      }

      // 4. Attach global listeners
      this.setupGlobalListeners();

      // 5. Auth gate & Initial render
      if (!this.currentUser) {
        this.showLoginScreen();
      } else {
        this.showMainApp();
        this.renderBottomNav();
        this.handleHashChange();
      }

      console.log('App initialized successfully. User:', this.currentUser ? this.currentUser.name : 'Guest');
    },

    /**
     * Set language ('th' | 'en')
     */
    setLang(lang) {
      if (lang !== 'th' && lang !== 'en') return;
      this.currentLang = lang;
      localStorage.setItem(STORAGE_KEYS.LANG, lang);
      document.documentElement.lang = lang;

      const langLabel = document.getElementById('lang-label');
      if (langLabel) {
        langLabel.textContent = lang === 'th' ? 'EN' : 'TH';
      }

      this.renderBottomNav();
      this.updatePageTitle();
      this.route(window.location.hash);
      this.showToast(lang === 'th' ? 'เปลี่ยนภาษาเป็นไทย' : 'Switched to English', 'info');
    },

    /**
     * Get current language
     */
    getLang() {
      return this.currentLang || 'th';
    },

    /**
     * Translate key with optional string parameter interpolation
     * E.g. App.t('jobs.applicantsCount', { count: 5 })
     */
    t(key, params = null) {
      if (!key) return '';
      const lang = this.getLang();
      const keys = key.split('.');

      // Traverse current language tree
      let val = this.translations[lang];
      for (const k of keys) {
        if (val && val[k] !== undefined) {
          val = val[k];
        } else {
          val = null;
          break;
        }
      }

      // Fallback to English
      if (val === null && lang !== 'en') {
        let fallback = this.translations['en'];
        for (const k of keys) {
          if (fallback && fallback[k] !== undefined) {
            fallback = fallback[k];
          } else {
            fallback = null;
            break;
          }
        }
        val = fallback;
      }

      // Fallback to key itself if not found
      if (val === null || typeof val !== 'string') {
        return key;
      }

      // Interpolate parameters {param}
      if (params && typeof params === 'object') {
        return val.replace(/\{(\w+)\}/g, (match, p) => {
          return params[p] !== undefined ? params[p] : match;
        });
      }

      return val;
    },

    /**
     * Format date string according to current language
     */
    formatDate(dateStr, includeTime = false) {
      if (!dateStr) return '-';
      try {
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return dateStr;

        const lang = this.getLang();
        const thaiMonths = [
          'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
          'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
        ];
        const enMonths = [
          'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
          'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
        ];

        const day = date.getDate();
        const monthIdx = date.getMonth();
        const year = date.getFullYear();

        let formatted = '';
        if (lang === 'th') {
          formatted = `${day} ${thaiMonths[monthIdx]} ${year + 543}`;
        } else {
          formatted = `${enMonths[monthIdx]} ${day}, ${year}`;
        }

        if (includeTime || dateStr.includes('T')) {
          const hours = String(date.getHours()).padStart(2, '0');
          const minutes = String(date.getMinutes()).padStart(2, '0');
          formatted += ` ${hours}:${minutes}${lang === 'th' ? ' น.' : ''}`;
        }

        return formatted;
      } catch (e) {
        return dateStr;
      }
    },

    /**
     * Generate unique identifier
     */
    generateId(prefix = 'id') {
      return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    },

    /**
     * Current user helpers
     */
    getCurrentUser() {
      return this.currentUser;
    },

    isHR() {
      return this.currentUser && this.currentUser.role === 'hr';
    },

    isApplicant() {
      return this.currentUser && this.currentUser.role === 'applicant';
    },

    /**
     * Log in user
     */
    login(user) {
      if (!user) return false;
      this.currentUser = user;
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
      this.showMainApp();
      this.renderBottomNav();
      this.navigate('dashboard');
      this.showToast(`${this.t('login.welcomeBack')}, ${this.getLocalizedName(user)}!`, 'success');
      return true;
    },

    /**
     * Log out current user
     */
    logout() {
      this.currentUser = null;
      localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
      this.closeUserMenu();
      this.showLoginScreen();
      this.showToast(this.t('nav.logout'), 'info');
    },

    /**
     * Localized name helper
     */
    getLocalizedName(item) {
      if (!item) return '';
      const isEn = this.getLang() === 'en';
      if (isEn && item.nameEn) return item.nameEn;
      if (isEn && item.titleEn) return item.titleEn;
      return item.name || item.title || '';
    },

    /**
     * Navigate to a hash route
     * Examples: App.navigate('jobs'), App.navigate('jobs/view/j1')
     */
    navigate(page, params = null) {
      let hash = `#${page}`;
      if (params && params.id) {
        if (!hash.includes(params.id)) {
          hash += `/${params.id}`;
        }
      }
      window.location.hash = hash;
    },

    /**
     * Hash Router logic
     */
    handleHashChange() {
      if (!this.currentUser) return;
      const hash = window.location.hash.replace(/^#\/?/, '');
      this.route(hash);
    },

    route(hash) {
      const parts = hash ? hash.split('/') : ['dashboard'];
      const page = parts[0] || 'dashboard';
      let action = null;
      let id = null;

      if (parts.length === 2) {
        if (parts[1] === 'new') {
          action = 'new';
        } else {
          // Either #jobs/view/id or #candidates/c1
          id = parts[1];
        }
      } else if (parts.length >= 3) {
        action = parts[1];
        id = parts[2];
      }

      this.currentRoute = { page, action, id };
      this.updateHeaderAndNav(page, action, id);
      this.renderModule(page, action, id);
    },

    /**
     * Dispatch route to corresponding module
     */
    renderModule(page, action, id) {
      const contentEl = document.getElementById('app-content');
      if (!contentEl) return;

      const moduleMap = {
        dashboard: { name: 'DashboardModule', titleKey: 'nav.dashboard' },
        jobs: { name: 'JobsModule', titleKey: 'nav.jobs' },
        candidates: { name: 'CandidatesModule', titleKey: this.isApplicant() ? 'nav.myApplications' : 'nav.candidates' },
        interviews: { name: 'InterviewsModule', titleKey: 'nav.interviews' },
        resumes: { name: 'ResumesModule', titleKey: this.isApplicant() ? 'nav.myResumes' : 'nav.resumes' },
        reports: { name: 'ReportsModule', titleKey: 'nav.reports' },
        profile: { name: 'ProfileModule', titleKey: 'nav.profile' }
      };

      const routeInfo = moduleMap[page] || moduleMap.dashboard;
      const moduleObj = window[routeInfo.name];

      // Reset scroll position
      contentEl.scrollTop = 0;

      // Handle Profile page directly if module not defined
      if (page === 'profile' && !moduleObj) {
        contentEl.innerHTML = this.renderProfileView();
        this.attachProfileListeners();
        return;
      }

      // Check if module is loaded
      if (!moduleObj) {
        contentEl.innerHTML = `
          <div class="empty-state">
            <div class="empty-state-icon"><i class="fas fa-spinner fa-spin"></i></div>
            <div class="empty-state-title">${this.t('common.loading')}</div>
            <div class="empty-state-text">Loading module [${routeInfo.name}]...</div>
          </div>
        `;
        return;
      }

      let html = '';
      try {
        if (action === 'new' && typeof moduleObj.renderCreate === 'function') {
          html = moduleObj.renderCreate();
          contentEl.innerHTML = html;
          if (typeof moduleObj.afterRenderCreate === 'function') {
            moduleObj.afterRenderCreate();
          }
        } else if (action === 'edit' && id && typeof moduleObj.renderEdit === 'function') {
          html = moduleObj.renderEdit(id);
          contentEl.innerHTML = html;
          if (typeof moduleObj.afterRenderEdit === 'function') {
            moduleObj.afterRenderEdit(id);
          }
        } else if ((action === 'view' || id) && typeof moduleObj.renderView === 'function') {
          const targetId = id || action;
          html = moduleObj.renderView(targetId);
          contentEl.innerHTML = html;
          if (typeof moduleObj.afterRenderView === 'function') {
            moduleObj.afterRenderView(targetId);
          }
        } else if (typeof moduleObj.render === 'function') {
          html = moduleObj.render();
          contentEl.innerHTML = html;
          if (typeof moduleObj.afterRender === 'function') {
            moduleObj.afterRender();
          }
        }
      } catch (err) {
        console.error('Error rendering module:', page, err);
        contentEl.innerHTML = `
          <div class="card p-4">
            <div class="text-danger font-bold mb-2"><i class="fas fa-exclamation-triangle"></i> ${this.t('common.error')}</div>
            <p class="text-sm text-muted">${err.message || 'Render failed'}</p>
          </div>
        `;
      }
    },

    /**
     * Update page title, back button, active nav, and context-aware FAB
     */
    updateHeaderAndNav(page, action, id) {
      const pageTitleEl = document.getElementById('page-title');
      const backBtn = document.getElementById('back-btn');
      const fabBtn = document.getElementById('fab');

      // 1. Page Title
      this.updatePageTitle();

      // 2. Back button visibility
      const isSubPage = !!(action || id);
      if (backBtn) {
        if (isSubPage) {
          backBtn.classList.remove('hidden');
        } else {
          backBtn.classList.add('hidden');
        }
      }

      // 3. Highlight active nav tab
      const navItems = document.querySelectorAll('.nav-item');
      navItems.forEach(item => {
        const itemPage = item.getAttribute('data-page');
        if (itemPage === page) {
          item.classList.add('active');
        } else {
          item.classList.remove('active');
        }
      });

      // 4. Context-aware FAB setup
      if (fabBtn) {
        if (this.isHR()) {
          if (page === 'jobs' && !action) {
            fabBtn.classList.remove('hidden');
            fabBtn.setAttribute('title', this.t('jobs.create'));
            fabBtn.onclick = () => this.navigate('jobs/new');
          } else if (page === 'interviews' && !action) {
            fabBtn.classList.remove('hidden');
            fabBtn.setAttribute('title', this.t('interviews.schedule'));
            fabBtn.onclick = () => this.navigate('interviews/new');
          } else {
            fabBtn.classList.add('hidden');
          }
        } else if (this.isApplicant()) {
          if (page === 'resumes' && !action) {
            fabBtn.classList.remove('hidden');
            fabBtn.setAttribute('title', this.t('resumes.create'));
            fabBtn.onclick = () => this.navigate('resumes/new');
          } else {
            fabBtn.classList.add('hidden');
          }
        } else {
          fabBtn.classList.add('hidden');
        }
      }
    },

    /**
     * Update the header title text based on current route
     */
    updatePageTitle() {
      const pageTitleEl = document.getElementById('page-title');
      if (!pageTitleEl) return;

      const { page, action, id } = this.currentRoute;
      let title = '';

      if (action === 'new') {
        if (page === 'jobs') title = this.t('jobs.create');
        else if (page === 'interviews') title = this.t('interviews.schedule');
        else if (page === 'resumes') title = this.t('resumes.create');
        else title = this.t('common.add');
      } else if (action === 'edit') {
        if (page === 'jobs') title = this.t('jobs.edit');
        else if (page === 'resumes') title = this.t('resumes.edit');
        else title = this.t('common.edit');
      } else if (id && action === 'view') {
        if (page === 'jobs') title = this.t('jobs.detail');
        else if (page === 'candidates') title = this.t('candidates.profile');
        else if (page === 'interviews') title = this.t('interviews.interviewDetails');
        else if (page === 'resumes') title = this.t('resumes.preview');
      } else {
        const titles = {
          dashboard: this.t('nav.dashboard'),
          jobs: this.t('nav.jobs'),
          candidates: this.isApplicant() ? this.t('nav.myApplications') : this.t('nav.candidates'),
          interviews: this.t('nav.interviews'),
          resumes: this.isApplicant() ? this.t('nav.myResumes') : this.t('nav.resumes'),
          reports: this.t('nav.reports'),
          profile: this.t('nav.profile')
        };
        title = titles[page] || this.t('login.title');
      }

      pageTitleEl.textContent = title;
    },

    /**
     * Bottom Navigation Rendering based on role
     */
    renderBottomNav() {
      const bottomNav = document.getElementById('bottom-nav');
      if (!bottomNav) return;

      if (!this.currentUser) {
        bottomNav.innerHTML = '';
        return;
      }

      let tabs = [];
      if (this.isHR()) {
        tabs = [
          { page: 'dashboard', icon: 'fa-chart-pie', label: this.t('nav.dashboard') },
          { page: 'jobs', icon: 'fa-briefcase', label: this.t('nav.jobs') },
          { page: 'candidates', icon: 'fa-user-tie', label: this.t('nav.candidates') },
          { page: 'interviews', icon: 'fa-calendar-check', label: this.t('nav.interviews') },
          { page: 'reports', icon: 'fa-chart-line', label: this.t('nav.reports') }
        ];
      } else {
        tabs = [
          { page: 'dashboard', icon: 'fa-home', label: this.t('nav.dashboard') },
          { page: 'jobs', icon: 'fa-briefcase', label: this.t('nav.jobs') },
          { page: 'candidates', icon: 'fa-paper-plane', label: this.t('nav.myApplications') },
          { page: 'resumes', icon: 'fa-file-alt', label: this.t('nav.myResumes') },
          { page: 'profile', icon: 'fa-user', label: this.t('nav.profile') }
        ];
      }

      const current = this.currentRoute.page;
      bottomNav.innerHTML = tabs.map(tab => `
        <a href="#${tab.page}" class="nav-item ${tab.page === current ? 'active' : ''}" data-page="${tab.page}">
          <i class="fas ${tab.icon}"></i>
          <span class="nav-label">${tab.label}</span>
        </a>
      `).join('');
    },

    /**
     * Modal Management
     */
    showModal(titleKey, bodyHtml, actions = []) {
      const overlay = document.getElementById('modal-overlay');
      const titleEl = document.getElementById('modal-title');
      const bodyEl = document.getElementById('modal-body');
      const footerEl = document.getElementById('modal-footer');
      if (!overlay || !titleEl || !bodyEl || !footerEl) return;

      const title = this.t(titleKey) !== titleKey ? this.t(titleKey) : titleKey;
      titleEl.textContent = title;
      bodyEl.innerHTML = bodyHtml;

      // Render action buttons
      footerEl.innerHTML = '';
      if (!actions || actions.length === 0) {
        const closeBtn = document.createElement('button');
        closeBtn.className = 'btn btn-secondary';
        closeBtn.textContent = this.t('common.close');
        closeBtn.onclick = () => this.closeModal();
        footerEl.appendChild(closeBtn);
      } else {
        actions.forEach(action => {
          const btn = document.createElement('button');
          btn.className = action.class || 'btn btn-primary';
          btn.textContent = action.label || this.t('common.confirm');
          btn.onclick = () => {
            if (typeof action.onClick === 'function') {
              action.onClick();
            } else {
              this.closeModal();
            }
          };
          footerEl.appendChild(btn);
        });
      }

      overlay.classList.remove('hidden');
    },

    closeModal() {
      const overlay = document.getElementById('modal-overlay');
      if (overlay) {
        overlay.classList.add('hidden');
      }
    },

    /**
     * Toast Notifications
     */
    showToast(message, type = 'info') {
      const container = document.getElementById('toast-container');
      if (!container) return;

      const iconMap = {
        success: 'fa-check-circle',
        error: 'fa-times-circle',
        warning: 'fa-exclamation-triangle',
        info: 'fa-info-circle'
      };

      const toast = document.createElement('div');
      toast.className = `toast toast-${type}`;
      toast.innerHTML = `
        <i class="fas ${iconMap[type] || 'fa-info-circle'} toast-icon"></i>
        <div class="toast-msg">${message}</div>
      `;

      toast.onclick = () => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(10px)';
        setTimeout(() => toast.remove(), 250);
      };

      container.appendChild(toast);

      setTimeout(() => {
        if (toast.parentNode) {
          toast.style.opacity = '0';
          toast.style.transform = 'translateY(10px)';
          setTimeout(() => toast.remove(), 250);
        }
      }, 3500);
    },

    /**
     * Screen State Transitions
     */
    showLoginScreen() {
      const loginScreen = document.getElementById('login-screen');
      const mainApp = document.getElementById('main-app');
      if (loginScreen) loginScreen.classList.remove('hidden');
      if (mainApp) mainApp.classList.add('hidden');
      this.renderLoginForm();
    },

    showMainApp() {
      const loginScreen = document.getElementById('login-screen');
      const mainApp = document.getElementById('main-app');
      if (loginScreen) loginScreen.classList.add('hidden');
      if (mainApp) mainApp.classList.remove('hidden');

      // Update avatar
      const userBtn = document.getElementById('user-menu-btn');
      if (userBtn && this.currentUser) {
        userBtn.innerHTML = this.currentUser.avatar || '👤';
      }
    },

    /**
     * Render Login Form & Demo Quick-Login
     */
    renderLoginForm() {
      const container = document.querySelector('.login-container');
      if (!container) return;

      container.innerHTML = `
        <div class="login-brand">
          <div class="login-logo-icon">
            <i class="fas fa-id-badge"></i>
          </div>
          <h2 class="login-title">${this.t('login.title')}</h2>
          <p class="login-subtitle">${this.t('login.subtitle')}</p>
        </div>

        <form id="login-form">
          <div class="form-group">
            <label class="form-label">${this.t('login.email')}</label>
            <input type="email" id="login-email" class="form-input" placeholder="hr@company.com" required value="hr@company.com">
          </div>
          <div class="form-group">
            <label class="form-label">${this.t('login.password')}</label>
            <input type="password" id="login-password" class="form-input" placeholder="1234" required value="1234">
          </div>
          <button type="submit" class="btn btn-primary btn-block btn-lg mt-2">
            <i class="fas fa-sign-in-alt"></i> ${this.t('login.submit')}
          </button>
        </form>

        <div class="demo-accounts-box">
          <div class="demo-title">
            <i class="fas fa-bolt text-warning"></i> ${this.t('login.demoAccounts')}
          </div>
          <div class="demo-buttons-grid">
            <button class="demo-btn" data-email="hr@company.com">
              <span class="avatar-sm">👩‍💼</span>
              <div>
                <span class="demo-name">สมศรี (HR)</span>
                <span class="demo-role">HR Admin</span>
              </div>
            </button>
            <button class="demo-btn" data-email="david@company.com">
              <span class="avatar-sm">👨‍💼</span>
              <div>
                <span class="demo-name">David (HR)</span>
                <span class="demo-role">HR Admin</span>
              </div>
            </button>
            <button class="demo-btn" data-email="somchai@email.com">
              <span class="avatar-sm">👨‍💻</span>
              <div>
                <span class="demo-name">สมชาย</span>
                <span class="demo-role">Developer</span>
              </div>
            </button>
            <button class="demo-btn" data-email="sunisa@email.com">
              <span class="avatar-sm">👩‍💻</span>
              <div>
                <span class="demo-name">สุนิสา</span>
                <span class="demo-role">HR Specialist</span>
              </div>
            </button>
            <button class="demo-btn" data-email="john@email.com">
              <span class="avatar-sm">👨‍🦱</span>
              <div>
                <span class="demo-name">John Smith</span>
                <span class="demo-role">Marketing</span>
              </div>
            </button>
          </div>
        </div>
      `;

      // Form submit handler
      const form = document.getElementById('login-form');
      if (form) {
        form.onsubmit = (e) => {
          e.preventDefault();
          const email = document.getElementById('login-email').value.trim();
          const password = document.getElementById('login-password').value.trim();

          const user = window.Data ? window.Data.getUserByEmail(email) : null;
          if (user && user.password === password) {
            this.login(user);
          } else {
            this.showToast(this.t('login.invalidCredentials'), 'error');
          }
        };
      }

      // Quick demo click handlers
      const demoBtns = container.querySelectorAll('.demo-btn');
      demoBtns.forEach(btn => {
        btn.onclick = () => {
          const email = btn.getAttribute('data-email');
          const user = window.Data ? window.Data.getUserByEmail(email) : null;
          if (user) {
            this.login(user);
          }
        };
      });
    },

    /**
     * User profile view helper (for applicant or profile route)
     */
    renderProfileView() {
      const u = this.currentUser;
      if (!u) return '';

      const isEn = this.getLang() === 'en';
      const name = isEn ? (u.nameEn || u.name) : u.name;
      const dept = isEn ? (u.departmentEn || u.department || 'General') : (u.department || 'ทั่วไป');
      const roleName = u.role === 'hr' ? this.t('login.hr') : this.t('login.applicant');

      return `
        <div class="card p-4 text-center">
          <div class="avatar-xl mx-auto mb-3" style="margin: 0 auto 12px; width: 80px; height: 80px; font-size: 2.8rem; background: var(--bg-tertiary); border-radius: 50%; display: flex; align-items: center; justify-content: center;">
            ${u.avatar || '👤'}
          </div>
          <h2 class="card-title text-center" style="font-size: 1.3rem;">${name}</h2>
          <div class="mt-1">
            <span class="badge ${u.role === 'hr' ? 'badge-qualified' : 'badge-new'}">${roleName}</span>
          </div>
          <div class="text-sm text-muted mt-2">${u.email}</div>
          ${u.phone ? `<div class="text-sm text-muted">${u.phone}</div>` : ''}
          ${u.role === 'hr' ? `<div class="text-xs text-muted mt-1"><i class="fas fa-building"></i> ${dept}</div>` : ''}
        </div>

        <div class="card p-4">
          <div class="card-header">
            <div class="card-title"><i class="fas fa-sliders-h"></i> ${this.t('nav.settings')}</div>
          </div>
          <div class="flex items-center justify-between mb-3">
            <span><i class="fas fa-globe"></i> ภาษา / Language</span>
            <button id="profile-lang-btn" class="btn btn-secondary btn-sm">
              ${this.currentLang === 'th' ? '🇹🇭 ภาษาไทย' : '🇬🇧 English'}
            </button>
          </div>
          <div class="flex items-center justify-between mb-3">
            <span><i class="fas fa-palette"></i> ธีม / Theme</span>
            <button id="profile-theme-btn" class="btn btn-secondary btn-sm">
              ${this.currentTheme === 'dark' ? '<i class="fas fa-moon"></i> Dark' : '<i class="fas fa-sun"></i> Light'}
            </button>
          </div>
          <button id="profile-logout-btn" class="btn btn-danger btn-block mt-3">
            <i class="fas fa-sign-out-alt"></i> ${this.t('nav.logout')}
          </button>
        </div>
      `;
    },

    attachProfileListeners() {
      const langBtn = document.getElementById('profile-lang-btn');
      if (langBtn) {
        langBtn.onclick = () => {
          this.setLang(this.currentLang === 'th' ? 'en' : 'th');
        };
      }

      const themeBtn = document.getElementById('profile-theme-btn');
      if (themeBtn) {
        themeBtn.onclick = () => {
          this.toggleTheme();
          this.route('profile');
        };
      }

      const logoutBtn = document.getElementById('profile-logout-btn');
      if (logoutBtn) {
        logoutBtn.onclick = () => this.logout();
      }
    },

    /**
     * User Menu Dropdown in Header
     */
    toggleUserMenu() {
      let menu = document.getElementById('user-dropdown-popover');
      if (menu) {
        menu.remove();
        return;
      }

      const u = this.currentUser;
      if (!u) return;

      const isEn = this.getLang() === 'en';
      const name = isEn ? (u.nameEn || u.name) : u.name;
      const roleName = u.role === 'hr' ? this.t('login.hr') : this.t('login.applicant');

      menu = document.createElement('div');
      menu.id = 'user-dropdown-popover';
      menu.className = 'user-menu-dropdown';
      menu.innerHTML = `
        <div class="user-menu-header">
          <div class="user-menu-name">${name}</div>
          <div class="user-menu-role">${u.email}</div>
          <div class="mt-1"><span class="badge ${u.role === 'hr' ? 'badge-qualified' : 'badge-new'}">${roleName}</span></div>
        </div>
        <div class="user-menu-item" id="menu-profile-btn">
          <i class="fas fa-user-circle"></i> ${this.t('nav.profile')}
        </div>
        <div class="user-menu-item" id="menu-switch-role-btn">
          <i class="fas fa-exchange-alt"></i> ${this.t('nav.switchRole')}
        </div>
        <div class="user-menu-item danger" id="menu-logout-btn">
          <i class="fas fa-sign-out-alt"></i> ${this.t('nav.logout')}
        </div>
      `;

      document.body.appendChild(menu);

      // Listeners
      document.getElementById('menu-profile-btn').onclick = () => {
        this.closeUserMenu();
        this.navigate('profile');
      };
      document.getElementById('menu-switch-role-btn').onclick = () => {
        this.closeUserMenu();
        this.logout();
      };
      document.getElementById('menu-logout-btn').onclick = () => {
        this.logout();
      };

      // Close on outside click
      const onDocClick = (e) => {
        if (!menu.contains(e.target) && e.target.id !== 'user-menu-btn' && !e.target.closest('#user-menu-btn')) {
          this.closeUserMenu();
          document.removeEventListener('click', onDocClick);
        }
      };
      setTimeout(() => document.addEventListener('click', onDocClick), 50);
    },

    closeUserMenu() {
      const menu = document.getElementById('user-dropdown-popover');
      if (menu) menu.remove();
    },

    /**
     * Theme Toggle
     */
    toggleTheme() {
      const next = this.currentTheme === 'light' ? 'dark' : 'light';
      this.currentTheme = next;
      localStorage.setItem(STORAGE_KEYS.THEME, next);
      document.documentElement.setAttribute('data-theme', next);
      this.updateThemeIcon();
    },

    updateThemeIcon() {
      const btn = document.getElementById('theme-toggle');
      if (!btn) return;
      btn.innerHTML = this.currentTheme === 'dark' ? '<i class="fas fa-sun text-warning"></i>' : '<i class="fas fa-moon"></i>';
    },

    /**
     * Set up all global event listeners
     */
    setupGlobalListeners() {
      // 1. Hash change routing
      window.addEventListener('hashchange', () => this.handleHashChange());

      // 2. Language toggle button in header
      const langToggle = document.getElementById('lang-toggle');
      if (langToggle) {
        langToggle.onclick = () => {
          this.setLang(this.currentLang === 'th' ? 'en' : 'th');
        };
      }

      // 3. Theme toggle button in header
      const themeToggle = document.getElementById('theme-toggle');
      if (themeToggle) {
        themeToggle.onclick = () => this.toggleTheme();
      }

      // 4. Back button in header
      const backBtn = document.getElementById('back-btn');
      if (backBtn) {
        backBtn.onclick = () => {
          const { page } = this.currentRoute;
          if (window.history.length > 1) {
            window.history.back();
          } else {
            this.navigate(page);
          }
        };
      }

      // 5. User menu button
      const userBtn = document.getElementById('user-menu-btn');
      if (userBtn) {
        userBtn.onclick = () => this.toggleUserMenu();
      }

      // 6. Modal close button & Backdrop click
      const modalOverlay = document.getElementById('modal-overlay');
      if (modalOverlay) {
        modalOverlay.onclick = (e) => {
          if (e.target === modalOverlay) {
            this.closeModal();
          }
        };
        const modalClose = modalOverlay.querySelector('.modal-close');
        if (modalClose) {
          modalClose.onclick = () => this.closeModal();
        }
      }
    }
  };

  // Expose App globally
  window.App = App;

  // Initialize once DOM is fully ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => App.init());
  } else {
    App.init();
  }
})();
