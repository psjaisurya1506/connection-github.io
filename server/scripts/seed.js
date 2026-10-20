// Usage: npm run seed   (add --reset to wipe all collections first)
require("dotenv").config({ quiet: true });
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const connectDB = require("../config/db");
const User = require("../models/User");
const Job = require("../models/Job");
const MentorshipRequest = require("../models/MentorshipRequest");
const Session = require("../models/Session");
const Message = require("../models/Message");
const Notification = require("../models/Notification");

const days = (n) => new Date(Date.now() + n * 864e5);

async function run() {
  await connectDB();
  if (process.argv.includes("--reset")) {
    await Promise.all([User, Job, MentorshipRequest, Session, Message, Notification].map((m) => m.deleteMany({})));
    console.log("Collections cleared");
  }
  if (await User.exists({ email: "admin@eec.edu" })) {
    console.log("Seed data already present. Use `npm run seed -- --reset` to start fresh.");
    return mongoose.disconnect();
  }

  const pw = "password123";
  const hashedPw = await bcrypt.hash(pw, 10);
  const mk = (d) => User.create({ password: hashedPw, isVerified: true, isActive: true, openToMentor: d.role === "alumni", ...d });

  const admin = await mk({ name: "EEC Admin", email: "admin@eec.edu", role: "admin", department: "Alumni Cell" });
  const alumni = await Promise.all([
    mk({ name: "Arjun Raj", email: "arjun@eec.edu", role: "alumni", department: "Computer Science", batch: "2020", headline: "Software Engineer", company: "Zoho", skills: ["React", "Node.js", "MongoDB"], experience: 5, bio: "Full-stack engineer. Happy to review projects and help with interview prep.", linkedin: "https://linkedin.com/in/example" }),
    mk({ name: "Priya Menon", email: "priya@eec.edu", role: "alumni", department: "Computer Science & Design", batch: "2019", headline: "Product Designer", company: "Freshworks", skills: ["UI/UX", "Figma", "Product"], experience: 6, bio: "I design SaaS products and mentor on portfolios and design thinking." }),
    mk({ name: "Sanjay Kumar", email: "sanjay@eec.edu", role: "alumni", department: "Information Technology", batch: "2018", headline: "Data Engineer", company: "Amazon", skills: ["Python", "SQL", "Spark", "AWS"], experience: 7, bio: "Building data pipelines at scale. Ask me about data careers and cloud." }),
    mk({ name: "Ananya S", email: "ananya@eec.edu", role: "alumni", department: "Electronics", batch: "2021", headline: "Embedded Engineer", company: "Bosch", skills: ["C++", "IoT", "Embedded"], experience: 4, bio: "Embedded systems and IoT." }),
  ]);
  const pending = await mk({ name: "Karthik P", email: "karthik@eec.edu", role: "alumni", department: "Mechanical", batch: "2020", headline: "Design Engineer", company: "L&T", skills: ["CAD"], isVerified: false });
  const students = await Promise.all([
    mk({ name: "Jaisurya P S", email: "jaisurya@eec.edu", role: "student", department: "Computer Science & Design", batch: "2024-2028", skills: ["React", "JavaScript"], bio: "Second-year student exploring full-stack development." }),
    mk({ name: "Rahul S", email: "rahul@eec.edu", role: "student", department: "Computer Science", batch: "2025-2029", skills: ["Python"] }),
    mk({ name: "Divya K", email: "divya@eec.edu", role: "student", department: "Information Technology", batch: "2026-2030" }),
  ]);
  const [arjun, priya, sanjay] = alumni;
  const [jai, rahul, divya] = students;

  const reqs = await MentorshipRequest.create([
    { student: jai._id, alumni: arjun._id, topic: "Full-stack career roadmap", message: "I'd love guidance on building a MERN portfolio.", status: "accepted" },
    { student: rahul._id, alumni: arjun._id, topic: "Internship advice", message: "How do I prepare for my first internship?", status: "pending" },
    { student: divya._id, alumni: arjun._id, topic: "Resume review", status: "pending" },
    { student: jai._id, alumni: priya._id, topic: "UI/UX basics", status: "pending" },
  ]);

  await Session.create({ mentor: arjun._id, student: jai._id, request: reqs[0]._id, proposedBy: arjun._id, title: "Alumni mentoring call", scheduledAt: days(1), durationMins: 45, meetingLink: "https://meet.google.com/example", status: "confirmed" });
  await Session.create({ mentor: arjun._id, student: jai._id, request: reqs[0]._id, proposedBy: jai._id, title: "Resume review", scheduledAt: days(3), status: "pending" });

  const convo = Message.convoId(jai._id, arjun._id);
  await Message.create([
    { conversationId: convo, sender: jai._id, receiver: arjun._id, text: "Hi Arjun, thanks for accepting my request!", readAt: new Date() },
    { conversationId: convo, sender: arjun._id, receiver: jai._id, text: "Happy to help. Share your GitHub and we can plan a roadmap." },
  ]);

  await Job.create([
    { postedBy: arjun._id, title: "Frontend Developer Intern", company: "Zoho", location: "Chennai", type: "internship", mode: "onsite", description: "Work with the Zoho Creator team on React components. 6-month internship with stipend.", skills: ["React", "JavaScript"], salary: "₹25,000 / month", applyLink: "https://careers.zoho.com", deadline: days(20) },
    { postedBy: priya._id, title: "Junior Product Designer", company: "Freshworks", location: "Chennai / Hybrid", type: "job", mode: "hybrid", description: "Design flows for CRM products with a senior design team. Portfolio required.", skills: ["Figma", "UI/UX"], salary: "₹6–9 LPA", applyLink: "https://www.freshworks.com/company/careers/" },
    { postedBy: sanjay._id, title: "Data Engineer Trainee", company: "Amazon", location: "Remote", type: "job", mode: "remote", description: "Pipeline development on AWS. Strong SQL and Python needed.", skills: ["Python", "SQL", "AWS"], salary: "₹12 LPA" },
    { postedBy: alumni[3]._id, title: "Embedded Systems Intern", company: "Bosch", location: "Coimbatore", type: "internship", mode: "onsite", description: "Firmware for automotive modules.", skills: ["C++", "Embedded"], applyLink: "careers@example.com" },
  ]);
  await Notification.create([
    { user: arjun._id, type: "request", text: "Rahul S sent you a mentorship request: Internship advice", link: "/alumni/requests" },
    { user: admin._id, type: "verification", text: `${pending.name} registered as alumni and needs verification`, link: "/admin/verification" },
  ]);

  console.log("\nSeed complete. Demo logins (password for all: password123)");
  console.log("  admin   admin@eec.edu");
  console.log("  alumni  arjun@eec.edu");
  console.log("  student jaisurya@eec.edu");
  await mongoose.disconnect();
}

run().catch((e) => { console.error(e); process.exit(1); });
