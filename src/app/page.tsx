"use client";

import { useEffect, useRef, useState, FormEvent } from "react";
import {
  Menu,
  X,
  ArrowUpRight,
  Palette,
  Code2,
  Layers,
  Shapes,
  Terminal,
  GitBranch,
  Sparkles,
  ExternalLink,
  Cpu,
  Music,
  Wallet,
  Layers3,
  Mail,
  MapPin,
  Send,
  Loader,
  Check,
} from "lucide-react";
import {
  Codepen,
  Figma,
  Github,
  Linkedin,
  Twitter,
  Dribbble,
  Facebook,
  Instagram,
  Youtube,
} from "@/components/icons";

export default function Home() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState("all");
  const [scrolled, setScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState("hero");
  const [typingText, setTypingText] = useState("");
  const [formStatus, setFormStatus] = useState<"idle" | "transmitting" | "sent">("idle");

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cursorRef = useRef<HTMLDivElement>(null);
  const cursorDotRef = useRef<HTMLDivElement>(null);
  const typingRef = useRef<HTMLSpanElement>(null);
  const tiltWrapperRef = useRef<HTMLDivElement>(null);
  const tiltCardRef = useRef<HTMLDivElement>(null);

  // --- 1. Interactive Canvas Background ---
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let particlesArray: Particle[] = [];
    const maxParticles = 65;
    let mouse = { x: 0, y: 0, radius: 180, active: false };

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    class Particle {
      x: number;
      y: number;
      size: number;
      speedX: number;
      speedY: number;
      colorBase: string;
      opacity: number;

      constructor() {
        this.x = Math.random() * canvas!.width;
        this.y = Math.random() * canvas!.height;
        this.size = Math.random() * 2.5 + 1;
        this.speedX = Math.random() * 0.8 - 0.4;
        this.speedY = Math.random() * 0.8 - 0.4;
        const colors = [
          "rgba(0, 243, 255, ",
          "rgba(255, 0, 123, ",
          "rgba(189, 0, 255, ",
          "rgba(0, 255, 136, ",
        ];
        this.colorBase = colors[Math.floor(Math.random() * colors.length)];
        this.opacity = Math.random() * 0.5 + 0.2;
      }

      update() {
        this.x += this.speedX;
        this.y += this.speedY;
        if (this.x > canvas!.width || this.x < 0) this.speedX = -this.speedX;
        if (this.y > canvas!.height || this.y < 0) this.speedY = -this.speedY;

        if (mouse.active) {
          let dx = mouse.x - this.x;
          let dy = mouse.y - this.y;
          let distance = Math.sqrt(dx * dx + dy * dy);
          if (distance < mouse.radius) {
            const force = (mouse.radius - distance) / mouse.radius;
            this.x += (dx / distance) * force * 0.6;
            this.y += (dy / distance) * force * 0.6;
          }
        }
      }

      draw() {
        ctx!.beginPath();
        ctx!.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx!.fillStyle = this.colorBase + this.opacity + ")";
        ctx!.fill();
      }
    }

    const initParticles = () => {
      particlesArray = [];
      for (let i = 0; i < maxParticles; i++) {
        particlesArray.push(new Particle());
      }
    };

    const connectParticles = () => {
      let maxDistance = 140;
      for (let a = 0; a < particlesArray.length; a++) {
        for (let b = a + 1; b < particlesArray.length; b++) {
          let dx = particlesArray[a].x - particlesArray[b].x;
          let dy = particlesArray[a].y - particlesArray[b].y;
          let distance = Math.sqrt(dx * dx + dy * dy);
          if (distance < maxDistance) {
            let opacity = (1 - distance / maxDistance) * 0.15;
            ctx!.strokeStyle = `rgba(189, 0, 255, ${opacity})`;
            ctx!.lineWidth = 0.8;
            ctx!.beginPath();
            ctx!.moveTo(particlesArray[a].x, particlesArray[a].y);
            ctx!.lineTo(particlesArray[b].x, particlesArray[b].y);
            ctx!.stroke();
          }
        }
        if (mouse.active) {
          let dx = particlesArray[a].x - mouse.x;
          let dy = particlesArray[a].y - mouse.y;
          let distance = Math.sqrt(dx * dx + dy * dy);
          if (distance < mouse.radius) {
            let opacity = (1 - distance / mouse.radius) * 0.25;
            ctx!.strokeStyle = `rgba(0, 243, 255, ${opacity})`;
            ctx!.lineWidth = 1;
            ctx!.beginPath();
            ctx!.moveTo(particlesArray[a].x, particlesArray[a].y);
            ctx!.lineTo(mouse.x, mouse.y);
            ctx!.stroke();
          }
        }
      }
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (mouse.active) {
        let radialGradient = ctx.createRadialGradient(mouse.x, mouse.y, 10, mouse.x, mouse.y, 400);
        radialGradient.addColorStop(0, "rgba(189, 0, 255, 0.12)");
        radialGradient.addColorStop(0.5, "rgba(0, 243, 255, 0.05)");
        radialGradient.addColorStop(1, "rgba(32, 32, 38, 0)");
        ctx.fillStyle = radialGradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      particlesArray.forEach((p) => {
        p.update();
        p.draw();
      });
      connectParticles();
      requestAnimationFrame(animate);
    };

    resizeCanvas();
    initParticles();
    animate();

    const handleMouseMove = (e: MouseEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      mouse.active = true;
    };
    const handleMouseOut = () => {
      mouse.active = false;
    };
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseout", handleMouseOut);
    window.addEventListener("resize", () => {
      resizeCanvas();
      initParticles();
    });

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseout", handleMouseOut);
    };
  }, []);

  // --- 2. Custom Cursor ---
  useEffect(() => {
    let cursorX = 0;
    let cursorY = 0;
    let targetX = 0;
    let targetY = 0;
    const lerpFactor = 0.12;

    const handleMouseMove = (e: MouseEvent) => {
      targetX = e.clientX;
      targetY = e.clientY;
      if (cursorDotRef.current) {
        cursorDotRef.current.style.left = `${targetX}px`;
        cursorDotRef.current.style.top = `${targetY}px`;
      }
    };

    const updateCursor = () => {
      cursorX += (targetX - cursorX) * lerpFactor;
      cursorY += (targetY - cursorY) * lerpFactor;
      if (cursorRef.current) {
        cursorRef.current.style.left = `${cursorX}px`;
        cursorRef.current.style.top = `${cursorY}px`;
      }
      requestAnimationFrame(updateCursor);
    };

    window.addEventListener("mousemove", handleMouseMove);
    updateCursor();

    const hoverElements = document.querySelectorAll("a, button, .project-card, .skill-card, .filter-btn");
    const addHover = () => {
      cursorRef.current?.classList.add("hover");
      cursorDotRef.current?.classList.add("hover");
    };
    const removeHover = () => {
      cursorRef.current?.classList.remove("hover");
      cursorDotRef.current?.classList.remove("hover");
    };
    hoverElements.forEach((el) => {
      el.addEventListener("mouseenter", addHover);
      el.addEventListener("mouseleave", removeHover);
    });

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  // --- 3. Dynamic Typing Effect ---
  useEffect(() => {
    const roles = ["CSE Student.", "Developer.", "Video Editor.", "Tech Enthusiast."];
    let roleIndex = 0;
    let charIndex = 0;
    let isDeleting = false;
    let typingSpeed = 100;

    const typeEffect = () => {
      const currentRole = roles[roleIndex];
      if (isDeleting) {
        setTypingText(currentRole.substring(0, charIndex - 1));
        charIndex--;
        typingSpeed = 50;
      } else {
        setTypingText(currentRole.substring(0, charIndex + 1));
        charIndex++;
        typingSpeed = 120;
      }

      if (!isDeleting && charIndex === currentRole.length) {
        isDeleting = true;
        typingSpeed = 2200;
      } else if (isDeleting && charIndex === 0) {
        isDeleting = false;
        roleIndex = (roleIndex + 1) % roles.length;
        typingSpeed = 500;
      }
      setTimeout(typeEffect, typingSpeed);
    };

    setTimeout(typeEffect, 1000);
  }, []);

  // --- 4. Header & Section Highlighting ---
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
      const sections = document.querySelectorAll("section");
      let currentSectionId = "hero";
      sections.forEach((section) => {
        const sectionTop = section.offsetTop - 150;
        const sectionHeight = section.clientHeight;
        if (window.scrollY >= sectionTop && window.scrollY < sectionTop + sectionHeight) {
          currentSectionId = section.getAttribute("id") || "hero";
        }
      });
      setActiveSection(currentSectionId);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // --- 5. Scroll Reveals ---
  useEffect(() => {
    const revealElements = document.querySelectorAll(".scroll-reveal");
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("active");
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -50px 0px" }
    );
    revealElements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  // --- 6. 3D Tilt Effect ---
  useEffect(() => {
    const wrapper = tiltWrapperRef.current;
    const card = tiltCardRef.current;
    if (!wrapper || !card) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = wrapper.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;
      const rotateX = -(y / (rect.height / 2)) * 12;
      const rotateY = (x / (rect.width / 2)) * 12;
      card.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
      card.style.transition = "none";
    };

    const handleMouseLeave = () => {
      card.style.transform = "rotateX(0deg) rotateY(0deg)";
      card.style.transition = "transform 0.5s ease";
    };

    wrapper.addEventListener("mousemove", handleMouseMove);
    wrapper.addEventListener("mouseleave", handleMouseLeave);
    return () => {
      wrapper.removeEventListener("mousemove", handleMouseMove);
      wrapper.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, []);

  // --- 7. Skill Card Dynamic Glow ---
  useEffect(() => {
    const skillCards = document.querySelectorAll(".skill-card");
    skillCards.forEach((card) => {
      const el = card as HTMLElement;
      const handleMouseMove = (e: MouseEvent) => {
        const rect = el.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const glowColor = el.getAttribute("data-glow-color") || "rgba(0, 243, 255, 0.35)";
        el.style.background = `radial-gradient(circle 80px at ${x}px ${y}px, ${glowColor}, rgba(255, 255, 255, 0.01) 90%)`;
        el.style.borderColor = `rgba(255, 255, 255, 0.25)`;
        el.style.boxShadow = `0 10px 20px rgba(0, 0, 0, 0.3), 0 0 15px ${glowColor.replace("0.4", "0.15")}`;
      };
      const handleMouseLeave = () => {
        el.style.background = "";
        el.style.borderColor = "";
        el.style.boxShadow = "";
      };
      el.addEventListener("mousemove", handleMouseMove);
      el.addEventListener("mouseleave", handleMouseLeave);
    });
  }, []);

  const handleFormSubmit = (e: FormEvent) => {
    e.preventDefault();
    setFormStatus("transmitting");
    setTimeout(() => {
      setFormStatus("sent");
      (e.target as HTMLFormElement).reset();
      setTimeout(() => setFormStatus("idle"), 3500);
    }, 2000);
  };

  const projects = [
    {
      id: 1,
      name: "DU_Conquer",
      category: "interactive",
      tags: ["C++", "Game Dev", "OOP"],
      desc: "An interactive C++ group project for the CSE-1202 course featuring complex console graphics and gameplay mechanics.",
      visual: "bg-gradient-cyan-purple",
      orbs: ["pink-orb", "cyan-orb"],
      icon: <Sparkles className="visual-icon" />,
      github: "https://github.com/farhanlabibahan/DU_Conquer",
    },
    {
      id: 2,
      name: "DUREDBUS App",
      category: "web-app",
      tags: ["Kotlin", "Android", "Firebase"],
      desc: "An Android application designed to track Dhaka University Red Bus routes, schedules, and book trips.",
      visual: "bg-gradient-pink-yellow",
      orbs: ["yellow-orb", "purple-orb"],
      icon: <Cpu className="visual-icon" />,
      github: "https://github.com/farhanlabibahan/DUREDBUS",
    },
    {
      id: 3,
      name: "Cinematic Editing",
      category: "creative",
      tags: ["DaVinci Resolve", "Color Grading", "Sound Design"],
      desc: "Premium video editing portfolio displaying color grading and cinematic sound design work.",
      visual: "bg-gradient-purple-green",
      orbs: ["green-orb", "blue-orb"],
      icon: <Palette className="visual-icon" />,
      github: "https://sites.google.com/view/farhanlabibahan",
    },
    {
      id: 4,
      name: "DU Navigators LFR",
      category: "interactive",
      tags: ["C++", "Robotics", "Embedded"],
      desc: "A custom Line Follower Robot control and navigation software engineered in C++ for robotics competitions.",
      visual: "bg-gradient-blue-pink",
      orbs: ["pink-orb", "blue-orb"],
      icon: <Music className="visual-icon" />,
      github: "https://github.com/farhanlabibahan/DU_Navigators",
    },
    {
      id: 5,
      name: "Banking Software",
      category: "web-app",
      tags: ["C++", "Data Structures", "Database"],
      desc: "A console-based simulated secure banking application for accounts management, deposits, and transaction tracking.",
      visual: "bg-gradient-green-cyan",
      orbs: ["green-orb", "cyan-orb"],
      icon: <Wallet className="visual-icon" />,
      github: "https://github.com/farhanlabibahan/BankingSoftware",
    },
    {
      id: 6,
      name: "Documentary & Trailer Editing",
      category: "creative",
      tags: ["CapCut", "YouTube", "Trailer Design"],
      desc: "Creative edits of game project trailers, short films, tour vlogs, and documentary clips.",
      visual: "bg-gradient-purple-pink",
      orbs: ["purple-orb", "pink-orb"],
      icon: <Layers3 className="visual-icon" />,
      github: "https://sites.google.com/view/farhanlabibahan",
    },
  ];

  const skills = [
    { name: "C / C++ Programming", icon: <Code2 />, color: "rgba(189, 0, 255, 0.4)" },
    { name: "Java Programming", icon: <Cpu />, color: "rgba(255, 0, 85, 0.4)" },
    { name: "Spring Boot", icon: <Terminal />, color: "rgba(0, 153, 255, 0.4)" },
    { name: "WordPress Development", icon: <Layers3 />, color: "rgba(0, 255, 136, 0.4)" },
    { name: "DaVinci Resolve", icon: <Palette />, color: "rgba(255, 179, 0, 0.4)" },
    { name: "CapCut & Video Editing", icon: <Music />, color: "rgba(0, 243, 255, 0.4)" },
    { name: "Git & Workflows", icon: <GitBranch />, color: "rgba(189, 0, 255, 0.4)" },
    { name: "UI / UX Design", icon: <Figma />, color: "rgba(0, 230, 255, 0.4)" },
  ];

  return (
    <>
      {/* Custom Neon Cursor */}
      <div className="custom-cursor" id="custom-cursor" ref={cursorRef}></div>
      <div className="custom-cursor-dot" id="custom-cursor-dot" ref={cursorDotRef}></div>

      {/* Canvas background */}
      <canvas id="bg-canvas" ref={canvasRef}></canvas>

      {/* Header Navigation */}
      <header className={`glass-header ${scrolled ? "scrolled" : ""}`}>
        <div className="logo">
          <span className="neon-text-purple">F</span>ARHAN<span className="neon-text-cyan">.</span>
        </div>
        <nav className="nav-links">
          <a href="#hero" className={`nav-link ${activeSection === "hero" ? "active" : ""}`}>Home</a>
          <a href="#about" className={`nav-link ${activeSection === "about" ? "active" : ""}`}>About</a>
          <a href="#projects" className={`nav-link ${activeSection === "projects" ? "active" : ""}`}>Projects</a>
          <a href="#experience" className={`nav-link ${activeSection === "experience" ? "active" : ""}`}>Experience</a>
          <a href="#contact" className={`nav-link ${activeSection === "contact" ? "active" : ""}`}>Contact</a>
        </nav>
        <div className="header-actions">
          <a href="#contact" className="btn btn-glow">Hire Me</a>
          <button className="mobile-menu-btn" aria-label="Toggle Menu" onClick={() => setMobileMenuOpen(true)}>
            <Menu />
          </button>
        </div>
      </header>

      {/* Mobile Nav Overlay */}
      <div className={`mobile-nav-overlay ${mobileMenuOpen ? "open" : ""}`}>
        <nav className="mobile-nav-links">
          <a href="#hero" className="mobile-link" onClick={() => setMobileMenuOpen(false)}>Home</a>
          <a href="#about" className="mobile-link" onClick={() => setMobileMenuOpen(false)}>About</a>
          <a href="#projects" className="mobile-link" onClick={() => setMobileMenuOpen(false)}>Projects</a>
          <a href="#experience" className="mobile-link" onClick={() => setMobileMenuOpen(false)}>Experience</a>
          <a href="#contact" className="mobile-link" onClick={() => setMobileMenuOpen(false)}>Contact</a>
          <a href="#contact" className="btn btn-glow mobile-btn" onClick={() => setMobileMenuOpen(false)}>Hire Me</a>
        </nav>
        <button className="mobile-close-btn" aria-label="Close Menu" onClick={() => setMobileMenuOpen(false)}>
          <X />
        </button>
      </div>

      <main>
        {/* Hero Section */}
        <section id="hero" className="hero-section">
          <div className="hero-content">
            <div className="badge-container animate-fade-in">
              <span className="neon-badge">
                <span className="pulse-dot"></span> Available for Freelance & Contract
              </span>
            </div>
            <h1 className="hero-title animate-title">
              Crafting <span className="neon-text-cyan font-accent">Immersive</span> Digital <span className="neon-text-pink">Experiences</span>
            </h1>
            <p className="hero-subtitle animate-fade-in-delayed">
              I am Farhan Labib Ahan, a <span className="dynamic-typing-text" id="typing-text">{typingText}</span>
              <br />bridging the gap between cutting-edge code and breathtaking aesthetics.
            </p>
            <div className="hero-buttons animate-fade-in-delayed-more">
              <a href="#projects" className="btn btn-primary btn-glow-pink">
                View Projects <ArrowUpRight />
              </a>
              <a href="#about" className="btn btn-secondary">
                About Me
              </a>
            </div>
          </div>

          <div className="hero-visual animate-scale-in">
            <div className="interactive-card-wrapper" ref={tiltWrapperRef}>
              <div className="glass-card main-hero-card" ref={tiltCardRef}>
                <div className="card-glow-element pink-glow"></div>
                <div className="card-glow-element cyan-glow"></div>

                <div className="card-header-bar">
                  <div className="window-dot red"></div>
                  <div className="window-dot yellow"></div>
                  <div className="window-dot green"></div>
                  <div className="card-title-bar">farhan_terminal.sh</div>
                </div>

                <div className="card-body terminal-body">
                  <p className="terminal-line"><span className="t-cyan">guest@farhan:~$</span> cat info.json</p>
                  <pre className="terminal-code"><code>{`{
  "name": "Farhan Labib Ahan",
  "role": "CSE Student & Creator",
  "skills": [
    "C++", "Java", "Spring Boot",
    "Video Editing", "DaVinci Resolve"
  ],
  "location": "Dhaka, Bangladesh",
  "status": "🟢 Building & Learning"
}`}</code></pre>
                  <p className="terminal-line"><span className="t-cyan">guest@farhan:~$</span> <span className="terminal-cursor">|</span></p>
                </div>
              </div>
            </div>
          </div>

          <div className="scroll-indicator">
            <a href="#about">
              <div className="mouse-wheel-container">
                <span className="mouse-wheel"></span>
              </div>
              <span className="scroll-text">Scroll Down</span>
            </a>
          </div>
        </section>

        {/* About Section */}
        <section id="about" className="about-section scroll-reveal">
          <div className="section-header">
            <span className="section-tag neon-text-purple">01 // IDENTITY</span>
            <h2 className="section-title">Behind the Glow</h2>
          </div>

          <div className="about-grid">
            <div className="about-bio glass-card">
              <div className="card-glow-element purple-glow"></div>
              <h3 className="neon-text-pink">Designing with Code & Visuals</h3>
              <p>
                I am a Computer Science & Engineering student at the University of Dhaka. I am a hardworking and dedicated learner who enjoys building projects, experimenting with new ideas, and improving skills through consistent practice.
              </p>
              <p>
                I am especially interested in combining creativity with technology—building useful applications, editing premium videos, and working on real-world projects that help me grow both technically and personally.
              </p>
              <div className="bio-stats">
                <div className="stat-item">
                  <span className="stat-num neon-text-cyan">2nd Yr</span>
                  <span className="stat-label">CSE Undergrad</span>
                </div>
                <div className="stat-item">
                  <span className="stat-num neon-text-pink">7</span>
                  <span className="stat-label">GitHub Repos</span>
                </div>
                <div className="stat-item">
                  <span className="stat-num neon-text-purple">23</span>
                  <span className="stat-label">Followers</span>
                </div>
              </div>
            </div>

            <div className="about-skills glass-card">
              <div className="card-glow-element cyan-glow"></div>
              <h3 className="neon-text-cyan">Tech Arsenal</h3>
              <div className="skills-grid">
                {skills.map((skill, index) => (
                  <div key={index} className="skill-card" data-glow-color={skill.color}>
                    <div className="skill-icon">{skill.icon}</div>
                    <span className="skill-name">{skill.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Projects Section */}
        <section id="projects" className="projects-section scroll-reveal">
          <div className="section-header">
            <span className="section-tag neon-text-pink">02 // PORTFOLIO</span>
            <h2 className="section-title">Selected Masterpieces</h2>
          </div>

          <div className="project-filters">
            {["all", "interactive", "web-app", "creative"].map((filter) => (
              <button
                key={filter}
                className={`filter-btn ${activeFilter === filter ? "active" : ""}`}
                onClick={() => setActiveFilter(filter)}
              >
                {filter === "all" ? "All" : filter === "web-app" ? "Web Apps" : filter.charAt(0).toUpperCase() + filter.slice(1)}
              </button>
            ))}
          </div>

          <div className="projects-grid">
            {projects.map((project) => (
              <div
                key={project.id}
                className={`project-card glass-card ${activeFilter === "all" || activeFilter === project.category ? "show" : "hide"}`}
              >
                <div className="project-image-container">
                  <div className={`abstract-project-visual ${project.visual}`}>
                    <div className="orb-container">
                      {project.orbs.map((orb, i) => (
                        <div key={i} className={`floating-orb ${orb}`}></div>
                      ))}
                    </div>
                    {project.icon}
                  </div>
                  <div className="project-overlay">
                    <div className="project-links">
                      <a href={project.github} target="_blank" rel="noopener noreferrer" className="project-link-btn" aria-label="View Live Project"><ExternalLink /></a>
                      {project.github.includes("github.com") && (
                        <a href={project.github} target="_blank" rel="noopener noreferrer" className="project-link-btn" aria-label="View Code Github"><Github /></a>
                      )}
                    </div>
                  </div>
                </div>
                <div className="project-info">
                  <div className="project-tags">
                    {project.tags.map((tag, i) => (
                      <span key={i} className="project-tag-item">{tag}</span>
                    ))}
                  </div>
                  <h3 className="project-name neon-text-cyan">{project.name}</h3>
                  <p className="project-desc">{project.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Experience Section */}
        <section id="experience" className="experience-section scroll-reveal">
          <div className="section-header">
            <span className="section-tag neon-text-cyan">03 // CHRONOLOGY</span>
            <h2 className="section-title">Professional Odyssey</h2>
          </div>

          <div className="timeline-container">
            <div className="timeline-line"></div>
            <div className="timeline-item">
              <div className="timeline-dot dot-cyan"></div>
              <div className="timeline-content glass-card">
                <div className="card-glow-element cyan-glow"></div>
                <div className="timeline-date neon-text-cyan">2023 - PRESENT</div>
                <h3 className="timeline-role">B.Sc. in Computer Science & Engineering (2nd Year)</h3>
                <h4 className="timeline-company">University of Dhaka</h4>
                <p className="timeline-desc">Studying core computer science courses including algorithms, object-oriented programming, and data communications, maintaining hands-on coding focus.</p>
              </div>
            </div>
            <div className="timeline-item">
              <div className="timeline-dot dot-pink"></div>
              <div className="timeline-content glass-card">
                <div className="card-glow-element pink-glow"></div>
                <div className="timeline-date neon-text-pink">2021 - 2023</div>
                <h3 className="timeline-role">Vice President (IT)</h3>
                <h4 className="timeline-company">Notre Dame Yoga & Meditation Club</h4>
                <p className="timeline-desc">Managed technological assets, designed and coordinated slide decks for club seminars, and assisted in visual overlay designs for media announcements.</p>
              </div>
            </div>
            <div className="timeline-item">
              <div className="timeline-dot dot-purple"></div>
              <div className="timeline-content glass-card">
                <div className="card-glow-element purple-glow"></div>
                <div className="timeline-date neon-text-purple">2021 - 2023</div>
                <h3 className="timeline-role">Higher Secondary Certificate (HSC)</h3>
                <h4 className="timeline-company">Notre Dame College, Dhaka</h4>
                <p className="timeline-desc">Completed high school studies focusing on science, mathematics, and physics with high distinction, paving the way for university CSE studies.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Contact Section */}
        <section id="contact" className="contact-section scroll-reveal">
          <div className="section-header">
            <span className="section-tag neon-text-pink">04 // COMMUNICATE</span>
            <h2 className="section-title">Initiate Transmission</h2>
          </div>

          <div className="contact-grid">
            <div className="contact-info glass-card">
              <div className="card-glow-element pink-glow"></div>
              <h3 className="neon-text-pink">Let's build something epic.</h3>
              <p>Have an interesting project, a job opportunity, or just want to nerd out about interactive coding? Drop a line and let's make it real.</p>

              <div className="contact-details">
                <div className="contact-detail-item">
                  <Mail className="neon-text-cyan" />
                  <div>
                    <span className="detail-label">Email</span>
                    <a href="mailto:farhanlabibahan@gmail.com" className="detail-val">farhanlabibahan@gmail.com</a>
                  </div>
                </div>
                <div className="contact-detail-item">
                  <MapPin className="neon-text-purple" />
                  <div>
                    <span className="detail-label">Location</span>
                    <span className="detail-val">Dhaka, Bangladesh</span>
                  </div>
                </div>
              </div>

              <div className="social-links">
                <a href="https://github.com/farhanlabibahan" target="_blank" rel="noopener noreferrer" className="social-icon-btn" aria-label="GitHub"><Github /></a>
                <a href="https://facebook.com/farhanlabibahan" target="_blank" rel="noopener noreferrer" className="social-icon-btn" aria-label="Facebook"><Facebook /></a>
                <a href="https://instagram.com/farhanlabib28" target="_blank" rel="noopener noreferrer" className="social-icon-btn" aria-label="Instagram"><Instagram /></a>
                <a href="https://youtube.com/@farhanlabibahan" target="_blank" rel="noopener noreferrer" className="social-icon-btn" aria-label="YouTube"><Youtube /></a>
              </div>
            </div>

            <div className="contact-form-container glass-card">
              <div className="card-glow-element cyan-glow"></div>
              <form className="contact-form" id="contact-form" onSubmit={handleFormSubmit}>
                <div className="form-group">
                  <label htmlFor="name">Name</label>
                  <input type="text" id="name" name="name" required placeholder="Farhan Ahan" />
                  <div className="input-glow-line"></div>
                </div>

                <div className="form-group">
                  <label htmlFor="email">Email Address</label>
                  <input type="email" id="email" name="email" required placeholder="farhan@example.com" />
                  <div className="input-glow-line"></div>
                </div>

                <div className="form-group">
                  <label htmlFor="message">Transmission Message</label>
                  <textarea id="message" name="message" rows={5} required placeholder="Enter message details..."></textarea>
                  <div className="input-glow-line"></div>
                </div>

                <button type="submit" className="btn btn-primary btn-glow btn-submit" disabled={formStatus !== "idle"}>
                  {formStatus === "idle" && (
                    <>Send Transmission <Send /></>
                  )}
                  {formStatus === "transmitting" && (
                    <>Transmitting... <Loader className="animate-spin" /></>
                  )}
                  {formStatus === "sent" && (
                    <>Transmission Sent! <Check /></>
                  )}
                </button>
              </form>
            </div>
          </div>
        </section>
      </main>

      <footer className="footer-container">
        <p>&copy; 2026 Farhan Labib Ahan. Constructed with neon particles and glass.</p>
        <p className="footer-sub">All rights reserved. Designed to inspire.</p>
      </footer>
    </>
  );
}
