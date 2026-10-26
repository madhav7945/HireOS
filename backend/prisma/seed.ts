import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding local SQLite database...');

  // Clean up
  await prisma.activity.deleteMany();
  await prisma.calendarEvent.deleteMany();
  await prisma.task.deleteMany();
  await prisma.department.deleteMany();
  await prisma.offer.deleteMany();
  await prisma.interviewMessage.deleteMany();
  await prisma.interview.deleteMany();
  await prisma.candidateScore.deleteMany();
  await prisma.candidate.deleteMany();
  await prisma.job.deleteMany();
  await prisma.user.deleteMany();
  await prisma.company.deleteMany();

  // 1. Create Company
  const company = await prisma.company.create({
    data: {
      id: 'comp-001',
      name: 'TechCorp Industries',
      domain: 'techcorp.io',
      logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Square_Inc_logo.svg/1200px-Square_Inc_logo.svg.png'
    }
  });

  // 2. Create User (HR)
  const user = await prisma.user.create({
    data: {
      id: 'demo-001',
      email: 'sarah@techcorp.io',
      fullName: 'Sarah Chen',
      companyId: company.id
    }
  });

  // 3. Create Departments
  const departments = ['Engineering', 'Product', 'Design', 'Sales', 'Marketing', 'Human Resources'];
  for (const dept of departments) {
    await prisma.department.create({
      data: {
        name: dept,
        companyId: company.id
      }
    });
  }

  // 4. Create Jobs
  const job1 = await prisma.job.create({
    data: {
      id: 'job-001',
      title: 'Senior React Developer',
      department: 'Engineering',
      description: 'Looking for a senior React engineer with 5+ years building scalable modern frontend architectures.',
      status: 'OPEN',
      companyId: company.id,
      weightTechnical: 30,
      weightExperience: 25,
      weightScreening: 15,
      weightEducation: 10,
      weightCommunication: 20,
      minExperienceYears: 5,
      requireWorkAuth: true
    }
  });

  const job2 = await prisma.job.create({
    data: {
      id: 'job-002',
      title: 'Lead Backend Engineer',
      department: 'Engineering',
      description: 'Seeking an experienced backend lead to drive distributed microservices, PostgreSQL, and high-throughput real-time systems.',
      status: 'OPEN',
      companyId: company.id,
      weightTechnical: 35,
      weightExperience: 25,
      weightScreening: 15,
      weightEducation: 10,
      weightCommunication: 15,
      minExperienceYears: 6,
      requireWorkAuth: true
    }
  });

  const job3 = await prisma.job.create({
    data: {
      id: 'job-003',
      title: 'Senior Product Designer',
      department: 'Design',
      description: 'Join our product team to craft intuitive design systems, wireframes, prototypes, and user flows.',
      status: 'OPEN',
      companyId: company.id,
      weightTechnical: 20,
      weightExperience: 30,
      weightScreening: 20,
      weightEducation: 10,
      weightCommunication: 20,
      minExperienceYears: 4,
      requireWorkAuth: false
    }
  });

  // 5. Create Candidates & Scores
  const c1 = await prisma.candidate.create({
    data: {
      id: 'cand-001',
      firstName: 'Alice',
      lastName: 'Smith',
      email: 'alice.smith@example.com',
      jobId: job1.id,
      stage: 'HR_REVIEW',
      resumeUrl: 'https://hireos.storage/resumes/alice_smith.pdf',
      parsedText: 'Senior Full Stack & React Developer with 6 years experience in React, TypeScript, Next.js, and state management.'
    }
  });

  await prisma.candidateScore.create({
    data: {
      candidateId: c1.id,
      technical: 92,
      experience: 88,
      screening: 95,
      education: 85,
      communication: 90,
      compositeScore: 90.5
    }
  });

  const interview1 = await prisma.interview.create({
    data: {
      id: 'int-001',
      candidateId: c1.id,
      isAiInterview: true,
      status: 'COMPLETED',
      magicToken: 'magic_ai_int_001',
      transcript: 'Candidate demonstrated deep understanding of React concurrent rendering, hooks composition, and memory optimization.',
      feedback: 'Outstanding technical acumen and crisp communication. Highly recommended for final HR review.'
    }
  });

  await prisma.interviewMessage.create({
    data: {
      interviewId: interview1.id,
      sender: 'ai',
      content: 'Welcome Alice! Could you walk me through your experience building real-time dashboards in React?'
    }
  });
  await prisma.interviewMessage.create({
    data: {
      interviewId: interview1.id,
      sender: 'candidate',
      content: 'Certainly! In my last role, I led the architecture of an analytics suite using React and WebSockets handling 50k events per second.'
    }
  });

  const c2 = await prisma.candidate.create({
    data: {
      id: 'cand-002',
      firstName: 'Bob',
      lastName: 'Jones',
      email: 'bob.jones@example.com',
      jobId: job3.id,
      stage: 'OFFER_SENT',
      resumeUrl: 'https://hireos.storage/resumes/bob_jones.pdf',
      parsedText: 'Product Designer with 5 years experience creating Figma design systems and leading mobile app redesigns.'
    }
  });

  await prisma.candidateScore.create({
    data: {
      candidateId: c2.id,
      technical: 85,
      experience: 90,
      screening: 92,
      education: 80,
      communication: 94,
      compositeScore: 88.2
    }
  });

  await prisma.offer.create({
    data: {
      id: 'offer-001',
      candidateId: c2.id,
      baseSalary: 145000,
      equity: 0.45,
      bonus: 15000,
      magicToken: 'offer_token_demo',
      status: 'PENDING'
    }
  });

  const c3 = await prisma.candidate.create({
    data: {
      id: 'cand-003',
      firstName: 'Carlos',
      lastName: 'Mendes',
      email: 'carlos.mendes@example.com',
      jobId: job2.id,
      stage: 'SHORTLISTED',
      resumeUrl: 'https://hireos.storage/resumes/carlos_mendes.pdf',
      parsedText: 'Backend Architect specializing in Go, Node.js, PostgreSQL, and event-driven architectures.'
    }
  });

  await prisma.candidateScore.create({
    data: {
      candidateId: c3.id,
      technical: 95,
      experience: 92,
      screening: 90,
      education: 85,
      communication: 88,
      compositeScore: 91.8
    }
  });

  // 6. Create Tasks
  await prisma.task.create({
    data: {
      text: 'Review Alice Smith AI Interview scorecard & feedback',
      companyId: company.id,
      done: false
    }
  });
  await prisma.task.create({
    data: {
      text: 'Sign off on formal offer letter for Bob Jones',
      companyId: company.id,
      done: false
    }
  });
  await prisma.task.create({
    data: {
      text: 'Calibrate knockout rules for Lead Backend requisition',
      companyId: company.id,
      done: true
    }
  });

  // 7. Create Calendar Events
  await prisma.calendarEvent.create({
    data: {
      title: 'Executive Debrief: Alice Smith',
      candidate: 'Alice Smith',
      role: 'Senior React Developer',
      date: new Date().toISOString().slice(0, 10),
      time: '14:00 - 14:45',
      type: 'Executive Review',
      interviewer: 'Sarah Chen',
      companyId: company.id
    }
  });
  await prisma.calendarEvent.create({
    data: {
      title: 'Offer Package Walkthrough',
      candidate: 'Bob Jones',
      role: 'Senior Product Designer',
      date: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
      time: '11:00 - 11:30',
      type: 'Offer Discussion',
      interviewer: 'Sarah Chen',
      companyId: company.id
    }
  });

  // 8. Create Activity Logs
  await prisma.activity.create({
    data: {
      action: 'Offer Generated',
      type: 'offer',
      icon: 'FileCheck',
      user: 'Sarah Chen',
      target: 'Bob Jones',
      module: 'Offers',
      companyId: company.id
    }
  });
  await prisma.activity.create({
    data: {
      action: 'AI Interview Completed',
      type: 'interview',
      icon: 'Bot',
      user: 'HireOS AI',
      target: 'Alice Smith (90.5%)',
      module: 'Interviews',
      companyId: company.id
    }
  });
  await prisma.activity.create({
    data: {
      action: 'Shortlisted by 5D AI Gate',
      type: 'candidate',
      icon: 'Award',
      user: 'AI Screener',
      target: 'Carlos Mendes (91.8%)',
      module: 'Pipeline',
      companyId: company.id
    }
  });

  console.log('Seeding complete! Local SQLite database ready.');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
