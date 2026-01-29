// Load shared navbar component
async function loadNavbar() {
    const navbarPlaceholder = document.getElementById('navbar-placeholder');
    if (navbarPlaceholder) {
        try {
            const response = await fetch('navbar.html');
            const html = await response.text();
            navbarPlaceholder.innerHTML = html;
            initNavbarHandlers();
        } catch (error) {
            console.error('Error loading navbar:', error);
        }
    } else {
        // Navbar is already in the page (e.g., index.html), just init handlers
        initNavbarHandlers();
    }
}

// Initialize navbar event handlers
function initNavbarHandlers() {
    // Smooth scrolling for navigation links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });

    // Mobile menu toggle
    const hamburger = document.querySelector('.hamburger');
    const navMenu = document.querySelector('.nav-menu');

    if (hamburger && navMenu) {
        hamburger.addEventListener('click', () => {
            hamburger.classList.toggle('active');
            navMenu.classList.toggle('active');
        });

        // Close mobile menu when clicking on a link
        document.querySelectorAll('.nav-menu a').forEach(link => {
            link.addEventListener('click', () => {
                hamburger.classList.remove('active');
                navMenu.classList.remove('active');
            });
        });
    }

    // Re-initialize language after navbar loads
    initLanguage();
}

// Navbar background on scroll
window.addEventListener('scroll', () => {
    const navbar = document.querySelector('.navbar');
    if (navbar) {
        if (window.scrollY > 50) {
            navbar.style.background = 'rgba(255, 255, 255, 0.98)';
            navbar.style.boxShadow = '0 2px 20px rgba(0, 0, 0, 0.1)';
        } else {
            navbar.style.background = 'rgba(255, 255, 255, 0.95)';
            navbar.style.boxShadow = 'none';
        }
    }
});

// Load navbar when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadNavbar);
} else {
    loadNavbar();
}

// Arc-style Intersection Observer for fade-in animations
const fadeObserverOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -80px 0px'
};

const fadeObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            // Unobserve after animation to prevent re-triggering
            fadeObserver.unobserve(entry.target);
        }
    });
}, fadeObserverOptions);

// Staggered animation for grouped elements
function initScrollAnimations() {
    // Section headers
    document.querySelectorAll('.section-header').forEach(el => {
        el.classList.add('fade-in');
        fadeObserver.observe(el);
    });

    // Service cards with stagger
    document.querySelectorAll('.service-card').forEach((el, index) => {
        el.classList.add('fade-in', `fade-in-delay-${Math.min(index + 1, 5)}`);
        fadeObserver.observe(el);
    });

    // Why items with stagger
    document.querySelectorAll('.why-item').forEach((el, index) => {
        el.classList.add('fade-in', `fade-in-delay-${Math.min(index + 1, 5)}`);
        fadeObserver.observe(el);
    });

    // Who cards with stagger
    document.querySelectorAll('.who-card').forEach((el, index) => {
        el.classList.add('fade-in', `fade-in-delay-${Math.min(index + 1, 5)}`);
        fadeObserver.observe(el);
    });

    // Investor service items with stagger
    document.querySelectorAll('.investor-service-item, .software-service-item').forEach((el, index) => {
        el.classList.add('fade-in', `fade-in-delay-${Math.min((index % 3) + 1, 5)}`);
        fadeObserver.observe(el);
    });

    // Contact info
    document.querySelectorAll('.contact-info, .contact-form').forEach(el => {
        el.classList.add('fade-in');
        fadeObserver.observe(el);
    });

    // About content paragraphs
    document.querySelectorAll('.about-content p, .team-content p, .team-content h3, .team-list').forEach((el, index) => {
        el.classList.add('fade-in', `fade-in-delay-${Math.min((index % 3) + 1, 3)}`);
        fadeObserver.observe(el);
    });

    // Hero content with special animation
    const heroContent = document.querySelector('.hero-content');
    if (heroContent) {
        heroContent.style.opacity = '0';
        heroContent.style.transform = 'translateY(40px)';
        setTimeout(() => {
            heroContent.style.transition = 'opacity 0.8s cubic-bezier(0.4, 0, 0.2, 1), transform 0.8s cubic-bezier(0.4, 0, 0.2, 1)';
            heroContent.style.opacity = '1';
            heroContent.style.transform = 'translateY(0)';
        }, 100);
    }

    // Footer content
    document.querySelectorAll('.footer-brand, .link-group').forEach((el, index) => {
        el.classList.add('fade-in', `fade-in-delay-${Math.min(index + 1, 5)}`);
        fadeObserver.observe(el);
    });
}

// Initialize animations when DOM is ready
document.addEventListener('DOMContentLoaded', initScrollAnimations);

// Email function - calls JavaScript backend with fallback endpoints
async function sendEmail(formData) {
    console.log('Form data:', formData);

    // Try multiple endpoints in case of ad blocker issues
    const endpoints = ['/contact', '/submit-form', '/api/contact', '/send-email'];

    for (const endpoint of endpoints) {
        try {
            console.log('Attempting to send to:', window.location.origin + endpoint);

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            console.log(`Response from ${endpoint}:`, response.status);

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `Server error: ${response.status}`);
            }

            console.log(`✅ Success using endpoint: ${endpoint}`);
            return response.json();

        } catch (error) {
            console.warn(`❌ Failed with ${endpoint}:`, error.message);

            // If this is the last endpoint, throw the error
            if (endpoint === endpoints[endpoints.length - 1]) {
                throw new Error('All contact endpoints blocked. Please disable ad blocker or try again later.');
            }
            // Otherwise, continue to next endpoint
        }
    }
}

// Form submission
const contactForm = document.querySelector('.contact-form');
if (contactForm) {
    contactForm.addEventListener('submit', async function(e) {
        e.preventDefault();

        // Get form data
        const formData = new FormData(this);
        const data = Object.fromEntries(formData);

        const button = this.querySelector('button[type="submit"]');
        const originalText = button.textContent;

        button.textContent = 'Sending...';
        button.disabled = true;

        try {
            // Send email via new JavaScript backend
            const result = await sendEmail(data);

            if (result.success) {
                // Show success message
                button.textContent = 'Message Sent!';
                button.style.background = '#10b981';

                // Reset form
                this.reset();

                // Reset button after 3 seconds
                setTimeout(() => {
                    button.textContent = originalText;
                    button.disabled = false;
                    button.style.background = '';
                }, 3000);
            } else {
                throw new Error(result.error || 'Unknown error occurred');
            }

        } catch (error) {
            console.error('Error sending email:', error);

            // Show error message
            button.textContent = 'Error - Try Again';
            button.style.background = '#dc2626';

            // Reset button after 3 seconds
            setTimeout(() => {
                button.textContent = originalText;
                button.disabled = false;
                button.style.background = '';
            }, 3000);
        }
    });
}

// Stats counter animation
function animateStats() {
    const stats = document.querySelectorAll('.stat-number');
    
    stats.forEach(stat => {
        const finalValue = parseInt(stat.textContent.replace(/\D/g, ''));
        const suffix = stat.textContent.replace(/\d/g, '');
        let currentValue = 0;
        const increment = finalValue / 100;
        
        const timer = setInterval(() => {
            currentValue += increment;
            if (currentValue >= finalValue) {
                currentValue = finalValue;
                clearInterval(timer);
            }
            stat.textContent = Math.floor(currentValue) + suffix;
        }, 20);
    });
}

// Trigger stats animation when hero section is visible
const heroObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            animateStats();
            heroObserver.unobserve(entry.target);
        }
    });
}, { threshold: 0.5 });

document.addEventListener('DOMContentLoaded', () => {
    const heroSection = document.querySelector('.hero');
    if (heroSection) {
        heroObserver.observe(heroSection);
    }
});

// Video play and unmute/mute toggle
document.addEventListener('DOMContentLoaded', () => {
    const video = document.getElementById('hero-video');
    const playBtn = document.getElementById('video-play-btn');
    const unmuteBtn = document.getElementById('video-unmute-btn');

    if (video && playBtn) {
        // Check if autoplay failed
        const playPromise = video.play();
        if (playPromise !== undefined) {
            playPromise.catch(() => {
                // Autoplay was prevented, show play button
                playBtn.classList.add('visible');
            });
        }

        // Play button click handler
        playBtn.addEventListener('click', () => {
            video.play();
            playBtn.classList.remove('visible');
        });

        // Also hide play button if video starts playing
        video.addEventListener('playing', () => {
            playBtn.classList.remove('visible');
        });

        // Show play button when video ends
        video.addEventListener('ended', () => {
            playBtn.classList.add('visible');
        });
    }

    if (video && unmuteBtn) {
        const iconMuted = unmuteBtn.querySelector('.icon-muted');
        const iconUnmuted = unmuteBtn.querySelector('.icon-unmuted');

        unmuteBtn.addEventListener('click', () => {
            video.muted = !video.muted;
            if (video.muted) {
                iconMuted.style.display = 'block';
                iconUnmuted.style.display = 'none';
                unmuteBtn.setAttribute('aria-label', 'Unmute video');
            } else {
                iconMuted.style.display = 'none';
                iconUnmuted.style.display = 'block';
                unmuteBtn.setAttribute('aria-label', 'Mute video');
            }
        });
    }
});

// Parallax effect for hero section
window.addEventListener('scroll', () => {
    const scrolled = window.pageYOffset;
    const heroVisual = document.querySelector('.hero-visual');
    if (heroVisual) {
        heroVisual.style.transform = `translateY(${scrolled * 0.1}px)`;
    }
});

// Newsletter form handler
document.addEventListener('DOMContentLoaded', () => {
    const newsletterForm = document.getElementById('newsletterForm');
    const newsletterMessage = document.getElementById('newsletter-message');

    if (newsletterForm) {
        newsletterForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const name = document.getElementById('newsletter-name').value.trim();
            const email = document.getElementById('newsletter-email').value.trim();

            if (!name || !email) {
                return;
            }

            // Get current language for messages
            const currentLang = localStorage.getItem('selectedLanguage') || 'en';
            const lang = window.translations?.[currentLang]?.newsletter || {
                success: 'Thank you for subscribing!',
                error: 'Failed to subscribe. Please try again.',
                alreadySubscribed: 'This email is already subscribed.'
            };

            try {
                const response = await fetch('/api/newsletter/subscribe', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ name, email })
                });

                const data = await response.json();

                if (response.ok) {
                    newsletterMessage.textContent = lang.success;
                    newsletterMessage.className = 'newsletter-message success';
                    newsletterForm.reset();
                } else if (response.status === 409) {
                    newsletterMessage.textContent = lang.alreadySubscribed;
                    newsletterMessage.className = 'newsletter-message error';
                } else {
                    newsletterMessage.textContent = lang.error;
                    newsletterMessage.className = 'newsletter-message error';
                }
            } catch (error) {
                console.error('Newsletter subscription error:', error);
                newsletterMessage.textContent = lang.error;
                newsletterMessage.className = 'newsletter-message error';
            }
        });
    }
});

// Add CSS for mobile menu
const style = document.createElement('style');
style.textContent = `
    @media (max-width: 768px) {
        .nav-menu {
            position: fixed;
            left: -100%;
            top: 70px;
            flex-direction: column;
            background-color: rgba(255, 255, 255, 0.98);
            width: 100%;
            text-align: center;
            transition: 0.3s;
            box-shadow: 0 10px 27px rgba(0, 0, 0, 0.05);
            backdrop-filter: blur(10px);
            padding: 2rem 0;
        }

        .nav-menu.active {
            left: 0;
        }

        .hamburger.active span:nth-child(2) {
            opacity: 0;
        }

        .hamburger.active span:nth-child(1) {
            transform: translateY(8px) rotate(45deg);
        }

        .hamburger.active span:nth-child(3) {
            transform: translateY(-8px) rotate(-45deg);
        }
    }
`;
document.head.appendChild(style);

// Multilingual Support
const translations = {
    en: {
        nav: {
            tagline: "The Americas Consulting Company",
            home: "Home",
            services: "Services",
            degenScout: "Investigate",
            training: "Training",
            contact: "Contact"
        },
        hero: {
            welcome: "Software Development & Staffing Agency",
            americas: "The Americas",
            company: "Consulting Company!",
            subtitle: "We are a software development company and staffing agency. Since 1992, we have been helping companies to hire talented, hard-to-find specialists. We aim to work with 10 new companies from the US and UK and help them hire excellent talent at fair rates in LATAM, by using our new job board. We cannot take more than 10 clients this year.",
            rebrand: "(If you were looking for Ethernity.live, you are in the right place, we just rebranded)",
            cta: "Schedule a Free Introductory Call"
        },
        cta: {
            quote: "Request Your Free, No-Obligation Quote Today"
        },
        why: {
            title: "Why Work With Us",
            listen: "We listen",
            listenSub: "to you",
            experienced: "Experienced",
            experiencedSub: "knowledgeable team",
            local: "Global view",
            localSub: "Local connections",
            personalized: "Personalized",
            personalizedSub: "flexible service",
            agile: "Agile",
            agileSub: "unbureaucratic service"
        },
        who: {
            title: "Who We Help",
            subtitle: "From startups to enterprise, we are your partner for success",
            investors: "Investors",
            investorsDesc: "Invest, Pay, Immigrate, Build with low risk",
            earlyStage: "Early Stage",
            earlyStageDesc: "Build great things with foundational talent to bring your vision to life.",
            growth: "Growth Phase",
            growthDesc: "Scale your business smartly while keeping costs under control.",
            established: "Established",
            establishedDesc: "Complete major projects without sacrificing your core team focus. Receive crypto payments. Modernize your business.",
            vcpe: "VC/PE Portfolio",
            vcpeDesc: "We help your portfolio companies succeed with lean, effective teams."
        },
        profile: {
            companyOverview: "Company Overview",
            description: "Software consulting, cybersecurity and staffing company specializing in blockchain, AI, and legacy systems development, modernization and hardening. Serving international clients from Latin America since 1992.",
            dunsLabel: "D-U-N-S Number",
            ungmLabel: "UNGM ID",
            phoneLabel: "Phone",
            websiteLabel: "Website",
            proficiencies: "Proficiencies"
        },
        investorServices: {
            title: "Personal and Investor Services",
            item1: "Blockchain training for investing.",
            item2: "Blockchain training for payments and receivables.",
            item3: "Blockchain risk assessment dossiers.",
            item4: "Blockchain tutorials for investing.",
            item5: "Blockchain tutorials for payments and receivables.",
            item6: "Blockchain asset tracing.",
            item7: "Immigration to Uruguay, including banking and real estate.",
            item8: "Document translation.",
            item9: "Company opening and bank accounts opening in Uruguay."
        },
        aiServices: {
            title: "AI Services",
            n8n: "n8n process automation."
        },
        training: {
            title: "Training"
        },
        blockchainServices: {
            title: "Blockchain Services",
            moreRecommendations: "See more recommendations"
        },
        softwareServices: {
            title: "Software services",
            aiAgents: "AI Agents to automate your processes.",
            item1: "Staffing. We specialise in hard-to-find developers.",
            developerTraining: "Training for Developers.",
            rwaTokenization: "Real World Assets Tokenization.",
            item2: "Blockchain development, blockend, backend and frontend.",
            item3: "Documentation writing and translation.",
            item4: "Web and Mobile development.",
            item5: "Legacy development (mainly AS/400, PickBASIC and Tandem non-stop)."
        },
        cybersecurityServices: {
            title: "Cybersecurity Services",
            redTeam: "Red Team Service",
            blueTeam: "Blue Team Service",
            blockchainAudit: "Blockchain Audit Service",
            securityOfficer: "External Security Officer"
        },
        services: {
            title: "How You Can Hire",
            subtitle: "Flexible talent solutions that adapt to your business needs",
            directHire: "Direct Hire",
            directHireDesc: "Permanent employees in 1 week. Fast placements that make a lasting impact.",
            directHireItem2: "Specialized, hard-to-find roles",
            directHireItem3: "Cultural fit assessment",
            directHireItem4: "Seamless onboarding",
            nearshore: "Nearshore Staffing",
            nearshoreDesc: "Expand your team with LATAM talent at a fraction of the cost.",
            nearshoreItem1: "Full-time dedicated teams",
            nearshoreItem2: "Project-based resources",
            nearshoreItem3: "Time zone alignment",
            nearshoreItem4: "Cost-effective scaling"
        },
        contact: {
            title: "Let's Talk",
            subtitle: "Tell us about your challenge, and we'll design a roadmap that works for you.",
            email: "Email",
            phone: "Phone",
            office: "Office",
            data: "Data",
            namePlaceholder: "Name",
            emailPlaceholder: "Email Address",
            companyPlaceholder: "Company",
            serviceInterest: "Service Interest",
            hrConsulting: "HR Strategy & Consulting",
            technology: "Technology Solutions",
            performance: "Performance Optimization",
            messagePlaceholder: "Tell us about your project...",
            send: "Send Message"
        },
        about: {
            title: "About Us",
            p1: "We started in 1992 as a staffing and training agency focused on the IBM AS/400 system (lately called iSeries and now IBM i), working mainly for international clients, and some local mid-size companies.",
            p1b: "We are proud to share that one of the first systems we created, the 'Modulo' as it is called, has been operating at Avon Cosmetics since 1993.",
            p2: "In 1994, we added staffing and training for Synon/2E (now CA-2E) and external Security Officer service for AS/400 and iSeries.",
            p3: "In 1997, we attended \"The Java Workshop\" by Sun Microsystems and saw the future unfold before us. We bought \"The Java Tutorial\" and started learning. This was our first contact with open systems, which we liked very much. In 1998, we began selling Java training.",
            p4: "In 1998, we began selling Java training and TCP/IP training for the new IBM iSeries. Shortly after, we created Security Watch, one of the first firewalls for the IBM iSeries, and sold it shortly thereafter.",
            p5: "In 1999, we created the conceptual project \"Telepuert@\", and based on it, we created \"Ubicat\" (a product similar to Google Earth) and sold it shortly thereafter. We used Java for both the desktop and the web version.",
            p6: "In 2004, we started using Red Hat Linux and developing Java applications that ran on both Windows and Linux. Soon, we added training for multiplatform Java apps.",
            p7: "In 2013, we learnt about Bitcoin and began writing crypto Python apps for international crypto startups. We switched to using Ubuntu and Debian Linux. We also started teaching crypto and Bitcoin.",
            p7b: "With the emergence of cryptocurrencies, cybercrime expanded at an unprecedented pace, significantly increasing the criticality of robust cybersecurity practices. The risk extended beyond direct theft of digital assets to the large-scale compromise and illicit trade of sensitive client data on darknet marketplaces. In response, in 2015 we began providing cybersecurity services to our clients, primarily operating in a Red Team capacity to identify and exploit vulnerabilities, while also delivering Blue Team support when required to strengthen defenses and improve incident response capabilities.",
            p8a: "In 2017, we learnt about Ethereum and the Solidity Language. We wrote a book, \"",
            p8b: "\", which was published in 2018 by Packt Publishing of London. We began offering staffing and software development services for international crypto startups.",
            p9: "In 2018, we created the software infrastructure for a crypto bank. We sold it in 2025.",
            p10: "In 2020, we learnt about NFTs and began providing staffing services and apps.",
            p11: "In 2023, we learnt about Solana and started providing staffing services to crypto startups and scale-ups.",
            p11b: "Since 2024, we provide Agentic AI services, helping clients tame unstructured data and wasted knowledge kept in documents.",
            p12: "Now, in 2025, we have enhanced our service portfolio and begun providing services for crypto investors."
        },
        team: {
            title: "Our Team",
            location: "We are located in Uruguay, Argentina and España.",
            pioneers: "Since 2013, we have been pioneers in remote work.",
            customerSuccess: "Customer Success:",
            softwareTeam: "Delivery Team:",
            softwareDevelopers: "Software developers:",
            softwarePool: "Plus a pool of 10 part-time developers that we call on-demand.",
            ibmiDevelopers: "IBM i developers:",
            ibmiPool: "Plus a pool of 10 part-time developers that we call on-demand.",
            cybersecurity: "Cybersecurity",
            securityPool: "Plus a pool of 5 security consultants that we call on-demand.",
            investorServices: "Investor Services",
            investorPool: "Plus a pool of 4 lawyers and accountants that we call on-demand."
        },
        newsletter: {
            title: "Subscribe to our newsletter",
            namePlaceholder: "Your name",
            emailPlaceholder: "Your email",
            subscribe: "Subscribe",
            success: "Thank you for subscribing!",
            error: "Failed to subscribe. Please try again.",
            alreadySubscribed: "This email is already subscribed."
        },
        footer: {
            tagline: "The Americas Consulting Company",
            description: "Transforming organizations through strategic talent, technology, and services.",
            quickLinks: "Quick Links",
            home: "Home",
            why: "Why Work With Us",
            who: "Who We Help",
            investorServices: "Personal and Investor Services",
            softwareServices: "Software Services",
            services: "How You Can Hire",
            about: "About Us",
            contact: "Contact",
            getInTouch: "Get In Touch",
            emailUs: "Email Us",
            callUs: "Call Us",
            socialNetworks: "Social Networks",
            linkedinEN: "LinkedIn (EN)",
            linkedinES: "LinkedIn (ES)",
            instagramEN: "Instagram (EN)",
            instagramES: "Instagram (ES)",
            facebookES: "Facebook (ES)",
            copyright: "© 2024 The Americas Consulting Company. All rights reserved."
        },
        developerTraining: {
            backLink: "← Back to Software Services",
            title: "Training for Developers",
            placeholder: "Content coming soon...",
            contactEmail: "Contact us by email",
            contactWhatsapp: "Contact us by WhatsApp"
        },
        legacyDevelopment: {
            backLink: "← Back to Software Services",
            title: "Legacy Development",
            placeholder: "Content coming soon...",
            contactEmail: "Contact us by email",
            contactWhatsapp: "Contact us by WhatsApp"
        },
        blockchainTraining: {
            title: "ProFactory Academy",
            backLink: "← Back to Personal and Investor Services",
            placeholder: "Content will be added soon...",
            instructorTitle: "Our Academy Director and Lead Instructor",
            instructorName: "Fatima Maldonado - Developer, Author and Consultant",
            courseTitle: "Blockchain and Bitcoin Course, by Zoom:",
            intro1: "Learn about Blockchain and Bitcoin",
            intro2: "How to invest and send money",
            intro3: "How to avoid scams",
            duration: "In 20 classes, plus one free hands-on practice class on our phones",
            topicsTitle: "Topics we will learn:",
            topic1: "Address",
            topic2: "Crypto transaction",
            topic3: "Public keys",
            topic4: "Private keys",
            topic5: "Seed phrases",
            topic6: "Wallet",
            topic7: "Miner fee",
            topic8: "Transaction pool",
            topic9: "Operations",
            topic10: "Blocks",
            topic11: "New coin generation",
            topic12: "Concatenation",
            topic13: "Fork",
            topic14: "Confirmations",
            topic15: "Scams and Hacks",
            topic16: "Install and use a wallet on my phone",
            schedulesTitle: "Classes starting soon:",
            schedule1: "January 05 morning (Monday to Friday 9 to 10)",
            schedule2: "January 05 afternoon (Monday to Friday 13 to 14)",
            schedule3: "January 05 evening (Monday to Friday 19 to 20)",
            registerButton: "Register by email",
            registerWhatsapp: "Register by WhatsApp",
            styleTitle: "Our Style",
            styleText: "Our courses are created and taught with our unique 'Circular Method' that allows all students to understand complex contents and put them into practice. As these are premium, instructor-led courses, we only run one commission per month.",
            testimonialTitle: "Student Testimonial",
            academyTitle: "Our Academy",
            academyText: "We started teaching technical courses in 1992, and in 2008 we created ProFactory, our own Technical School. In 2016, we moved teaching on-line to better acommodate students from different locations.",
            instructorBio: "Fatima started collecting punched cards from the street in 1970, from a nearby computing center. In 1975 she became a gamer. In 1983 she started programming the BASIC language. Switched to IBM systems in 1987. Then to the Internet in 1997, and to Java in 1998. Then to Linux in 2002. In 2013 she started working with Bitcoin, helping create the Bitcoin community in South America. In 2017 she switched to Ethereum, and in 2023 to Solana."
        },
        recommendations: {
            title: "Recommendations",
            backLink: "← Back to Blockchain Services",
            linkedinText: "You can see these recommendations live on",
            linkedinLink: "LinkedIn"
        },
        aiAgents: {
            heroTitle: "AI Agents",
            heroSubtitle: "To Automate Your Processes",
            heroDescription: "AI agents can automate your processes and lower costs.",
            paragraph1: "Much of the early work building out AI capabilities focused on training and implementing AI models and ecosystems. Agents shift that focus to putting AI to work, taking the output of trained models, the inferencing process that passes new data to models to evaluate, and using it to act.",
            paragraph2: "In chat-based interactions, the user must build context for the model by creating the prompt and pulling together supplemental information to frame the answers it generates. Agentic approaches shift from prompt engineering to context engineering, or the process of ensuring the best possible context is established for a model to work.",
            paragraph3: "We can design and build AI agents that run on your premises or your cloud, on your data. We can also write the MCP (Model Context Protocol) connectors to access such data.",
            callout: "You will get a turnkey AI agent that works for you.",
            useCasesTitle: "Agent use cases",
            useCase1: "Routing",
            useCase2: "Automation of repetitive, routine interactions",
            useCase3: "Drive engagement",
            useCase4: "Learn from customer inputs and historical exchanges, learn from your data"
        },
        blockchainTutorials: {
            backLink: "← Back to Personal and Investor Services",
            title: "Blockchain Tutorials for Investing",
            placeholder: "Content coming soon...",
            ebookAnnouncement: "Our next eBook (work in progress) explain how to install a trustable wallet, buy Bitcoin, Ethereum or crypto dollars, and hold them to get a profit in the future."
        },
        signedNodeJs: {
            backLink: "← Back to Software Services",
            title: "Creation of signed packages infrastructure for node.js",
            description: "There have been a lot of supply-chain attacks on projects, by way of creating fake or tainted node.js packages. The base for this attack is complete anonimity without even signature for the packages. We plan to use our experience in blockchain technologies, to create a new infrastructure for node.js where packages must be signed by developers and developer teams. Authorized signatures will be elected by the user and developer community."
        },
        immigration: {
            backLink: "← Back to Personal and Investor Services",
            title: "Immigration to Uruguay",
            placeholder: "Content coming soon...",
            contactEmail: "Contact us by email",
            contactWhatsapp: "Contact us by WhatsApp",
            licensingTitle: "Licensing and Regulatory Advisory",
            licensingDesc: "Support for licence application and regulatory compliance in the Uruguayan market.",
            personalTitle: "Personal Paperwork",
            personalDesc: "Help with inmigration and personal account opening.",
            realEstateTitle: "Real Estate",
            realEstateDesc: "Introduction to selected, trusted local real estate agents.",
            corporateTitle: "Corporate Services",
            corporateDesc: "Entity incorporation, company secretarial, and directorship services to establish and maintain regulated structures.",
            tokenisationTitle: "Tokenisation and Secure Minting",
            tokenisationDesc: "ERC-20 or ERC-3643 token issuance, identity-linked minting and burning, and 24/7 operational support."
        },
        explorer: {
            back: "Back to Home",
            title: "Investigate",
            subtitle: "Enter a wallet address or contract address to view blockchain data",
            search: "Investigate",
            emptyState: "Enter an address above to get started",
            loading: "Loading blockchain data...",
            addressInfo: "Address Information",
            address: "Address",
            network: "Network",
            balance: "Balance",
            transactions: "Transactions",
            moreInfo: "More Information",
            viewOnExplorer: "View detailed transaction history, token transfers, and more on the block explorer:",
            openExplorer: "Open in Explorer",
            evmAddressDetected: "EVM (Ethereum compatible) Address Detected",
            addressDetected: "Address Detected",
            validation: "Validation",
            valid: "Valid",
            type: "Type",
            compatibleNetworks: "Compatible Networks",
            chainsQueried: "chains queried",
            smartContract: "Smart Contract",
            eoaUser: "EOA (User)",
            blockchain: "Blockchain",
            addressType: "Address Type",
            networks: "Networks",
            fullAddress: "Full Address",
            viewOnExplorerBtn: "View on",
            explorer: "Explorer",
            active: "Active",
            noActivity: "No Activity",
            error: "Error",
            pleaseEnterAddress: "Please enter an address",
            invalidAddress: "Invalid address",
            unknownFormat: "Unknown format",
            fetchError: "Failed to fetch blockchain data. Please try again.",
            txHashDetected: "This appears to be a transaction hash, not a wallet address. Please enter a wallet or contract address instead.",
            txDetected: "Transaction Detected",
            pendingTx: "Pending Transaction",
            txStatus: "Status",
            txDetails: "Transaction Details",
            txHash: "Transaction Hash",
            block: "Block",
            timestamp: "Timestamp",
            txParties: "Sender & Recipient",
            from: "From",
            to: "To",
            txValue: "Value & Gas",
            value: "Value",
            txFee: "Transaction Fee",
            gasPrice: "Gas Price",
            gasUsed: "Gas Used",
            tokenTransfer: "Transfer Detected",
            stablecoinTransfer: "Stablecoin Transfer",
            tokenAmount: "Amount",
            tokenFrom: "From",
            tokenTo: "To",
            viewOnDegenScout: "Investigate",
            viewDetails: "View Details"
        },
        investigate: {
            back: "Back",
            title: "Investigate Address",
            subtitle: "Detailed analysis of the blockchain address",
            addressInfo: "Address Information",
            address: "Address",
            blockchain: "Blockchain",
            analysis: "Analysis",
            placeholder: "Content coming soon...",
            loadingTransactions: "Loading USDT/USDC transactions...",
            stablecoinTransactions: "USDT/USDC Transactions",
            noTransactions: "No USDT/USDC transactions found",
            invalidParams: "Invalid address or blockchain parameter",
            errorLoading: "Error loading transactions. Please try again.",
            date: "Date",
            time: "Time",
            amount: "Amount",
            from: "From",
            to: "To",
            of: "of",
            yearlySummary: "Yearly Summary",
            received: "Received",
            sent: "Sent",
            loadingBitcoin: "Loading Bitcoin transactions...",
            currentBtcPrice: "Current BTC Price",
            total: "Total",
            noTxFound: "No transactions found",
            pendingConfirmation: "Pending confirmation"
        }
    },
    es: {
        nav: {
            tagline: "The Americas Consulting Company",
            home: "Inicio",
            services: "Servicios",
            degenScout: "Investigar",
            training: "Capacitación",
            contact: "Contacto"
        },
        hero: {
            welcome: "Desarrollo de Software y Agencia de Personal",
            americas: "The Americas",
            company: "Consulting Company!",
            subtitle: "Somos una empresa de desarrollo de software y agencia de personal. Desde 1992, hemos ayudado a empresas a contratar especialistas talentosos y difíciles de encontrar. Nuestro objetivo es trabajar con 10 nuevas empresas de EE.UU. y Reino Unido y ayudarlas a contratar excelente talento a tarifas justas en LATAM, utilizando nuestra nueva bolsa de trabajo. No podemos aceptar más de 10 clientes este año.",
            rebrand: "(Si estabas buscando Ethernity.live, estás en el lugar correcto, cambiamos de marca)",
            cta: "Agende una Llamada Introductoria Gratuita"
        },
        cta: {
            quote: "Solicite Su Cotización Gratuita y Sin Compromiso Hoy"
        },
        why: {
            title: "Por Qué Trabajar Con Nosotros",
            listen: "Escuchamos",
            listenSub: "a Usted",
            experienced: "Experiencia",
            experiencedSub: "equipo capacitado",
            local: "Visión global",
            localSub: "Conexiones locales",
            personalized: "Personalizado",
            personalizedSub: "servicio flexible",
            agile: "Ágil",
            agileSub: "servicio sin burocracia"
        },
        who: {
            title: "A Quién Ayudamos",
            subtitle: "Desde startups hasta empresas establecidas, somos su socio para el éxito",
            investors: "Inversores",
            investorsDesc: "Invierta, Pague, Inmigre, Desarrolle con bajo riesgo",
            earlyStage: "Etapa Inicial",
            earlyStageDesc: "Construya grandes cosas con el talento adecuado para dar vida a su visión",
            growth: "Fase de Crecimiento",
            growthDesc: "Escale su negocio inteligentemente mientras mantiene los costos bajo control.",
            established: "Establecidas",
            establishedDesc: "Complete proyectos importantes sin sacrificar el foco de su equipo principal. Reciba pagos en cripto. Modernice su negocio.",
            vcpe: "Portafolio VC/PE",
            vcpeDesc: "Le ayudamos a que las empresas de su portafolio tengan éxito con equipos efectivos y eficientes."
        },
        profile: {
            companyOverview: "Resumen de la Empresa",
            description: "Empresa de consultoría de software, ciberseguridad y personal especializada en blockchain, IA y desarrollo, modernización y hardening de sistemas legacy. Sirviendo a clientes internacionales desde América Latina desde 1992.",
            dunsLabel: "Número D-U-N-S",
            ungmLabel: "ID UNGM",
            phoneLabel: "Teléfono",
            websiteLabel: "Sitio Web",
            proficiencies: "Competencias"
        },
        investorServices: {
            title: "Servicios Personales y para Inversores",
            item1: "Capacitación en blockchain para invertir.",
            item2: "Capacitación en blockchain para pagos y cobranzas.",
            item3: "Dossieres de evaluación de riesgo blockchain.",
            item4: "Tutoriales de blockchain para invertir.",
            item5: "Tutoriales de blockchain para pagos y cobranzas.",
            item6: "Rastreo de activos blockchain.",
            item7: "Inmigración a Uruguay, incluyendo banca y bienes raíces.",
            item8: "Traducción de documentos.",
            item9: "Apertura de empresas y cuentas bancarias en Uruguay."
        },
        aiServices: {
            title: "Servicios de IA",
            n8n: "Automatización de procesos con n8n."
        },
        training: {
            title: "Capacitación"
        },
        blockchainServices: {
            title: "Servicios de Blockchain",
            moreRecommendations: "Ver más recomendaciones"
        },
        softwareServices: {
            title: "Servicios de Software",
            aiAgents: "Agentes de IA para automatizar sus procesos.",
            item1: "Staffing. Nos especializamos en desarrolladores difíciles de encontrar.",
            developerTraining: "Capacitación para Desarrolladores.",
            rwaTokenization: "Tokenización de Activos del Mundo Real.",
            item2: "Desarrollo blockchain, blockend, backend y frontend.",
            item3: "Redacción y traducción de documentación.",
            item4: "Desarrollo Web y Mobile.",
            item5: "Desarrollo legacy (principalmente AS/400, PickBASIC y Tandem non-stop)."
        },
        cybersecurityServices: {
            title: "Servicios de Ciberseguridad",
            redTeam: "Servicio de Red Team",
            blueTeam: "Servicio de Blue Team",
            blockchainAudit: "Servicio de Auditoría Blockchain",
            securityOfficer: "Security Officer Externo"
        },
        services: {
            title: "Cómo Puede Contratar",
            subtitle: "Soluciones de talento flexibles que se adaptan a las necesidades de su negocio",
            directHire: "Contratación Directa",
            directHireDesc: "Empleados permanentes en 1 semana. Colocaciones rápidas que generan un impacto duradero.",
            directHireItem2: "Roles especializados, difíciles de encontrar",
            directHireItem3: "Evaluación de ajuste cultural",
            directHireItem4: "Onboarding sin problemas",
            nearshore: "Staffing Nearshore",
            nearshoreDesc: "Expanda su equipo con talento LATAM a una fracción del costo.",
            nearshoreItem1: "Equipos dedicados full-time",
            nearshoreItem2: "Recursos basados en proyectos",
            nearshoreItem3: "Alineación de zona horaria",
            nearshoreItem4: "Escalamiento rentable"
        },
        contact: {
            title: "Hablemos",
            subtitle: "Cuéntenos su desafío y diseñaremos una hoja de ruta que funcione para usted.",
            email: "Email",
            phone: "Teléfono",
            office: "Oficina",
            data: "Datos",
            namePlaceholder: "Nombre",
            emailPlaceholder: "Dirección de Email",
            companyPlaceholder: "Empresa",
            serviceInterest: "Interés de Servicio",
            hrConsulting: "Estrategia de RRHH y Consultoría",
            technology: "Soluciones Tecnológicas",
            performance: "Optimización de Rendimiento",
            messagePlaceholder: "Contanos sobre tu proyecto...",
            send: "Enviar Mensaje"
        },
        about: {
            title: "Acerca de Nosotros",
            p1: "Comenzamos en 1992 como una agencia de staffing y capacitación enfocada en el sistema IBM AS/400 (posteriormente llamado iSeries y ahora IBM i), trabajando principalmente para clientes internacionales y algunas empresas medianas locales.",
            p1b: "Nos llena de orgullo compartir que uno de los primeros sistemas que creamos, el 'Modulo' como se le llama, está funcionando desde 1993 en Avon Cosmetics.",
            p2: "En 1994, agregamos staffing y capacitación para Synon/2E (ahora CA-2E) y servicio externo de Security Officer para AS/400 e iSeries.",
            p3: "En 1997, asistimos a \"The Java Workshop\" de Sun Microsystems y vimos el futuro desplegarse ante nosotros. Compramos \"The Java Tutorial\" y comenzamos a aprender. Este fue nuestro primer contacto con sistemas abiertos, que nos gustaron mucho. En 1998, comenzamos a vender capacitación en Java.",
            p4: "En 1998, comenzamos a vender capacitación en Java y TCP/IP para el nuevo IBM iSeries. Poco después, creamos Security Watch, uno de los primeros firewalls para IBM iSeries, y lo vendimos poco después.",
            p5: "En 1999, creamos el proyecto conceptual \"Telepuert@\", y basándonos en él, creamos \"Ubicat\" (un producto similar a Google Earth) y lo vendimos poco después. Usamos Java tanto para la versión de escritorio como para la web.",
            p6: "En 2004, comenzamos a usar Red Hat Linux y a desarrollar aplicaciones Java que corrían tanto en Windows como en Linux. Pronto, agregamos capacitación para aplicaciones Java multiplataforma.",
            p7: "En 2013, aprendimos sobre Bitcoin y comenzamos a escribir aplicaciones crypto en Python para startups crypto internacionales. Cambiamos a usar Ubuntu y Debian Linux. También comenzamos a enseñar crypto y Bitcoin.",
            p7b: "Con la aparición de las criptomonedas, el cibercrimen se expandió a un ritmo sin precedentes, aumentando significativamente la criticidad de prácticas robustas de ciberseguridad. El riesgo se extendió más allá del robo directo de activos digitales hacia el compromiso a gran escala y el comercio ilícito de datos sensibles de clientes en mercados de la darknet. En respuesta, en 2015 comenzamos a brindar servicios de ciberseguridad a nuestros clientes, operando principalmente en capacidad de Red Team para identificar y explotar vulnerabilidades, mientras también brindábamos soporte de Blue Team cuando era necesario para fortalecer defensas y mejorar capacidades de respuesta a incidentes.",
            p8a: "En 2017, aprendimos sobre Ethereum y el lenguaje Solidity. Escribimos un libro, \"",
            p8b: "\", que fue publicado en 2018 por Packt Publishing de Londres. Comenzamos a ofrecer servicios de staffing y desarrollo de software para startups crypto internacionales.",
            p9: "En 2018, creamos la infraestructura de software para un banco crypto. Lo vendimos en 2025.",
            p10: "En 2020, aprendimos sobre NFTs y comenzamos a brindar servicios de staffing y aplicaciones.",
            p11: "En 2023, aprendimos sobre Solana y comenzamos a brindar servicios de staffing para startups y scale-ups crypto.",
            p11b: "Desde 2024, brindamos servicios de IA Agéntica, ayudando a clientes a domesticar datos no estructurados y conocimiento desperdiciado guardado en documentos.",
            p12: "Ahora, en 2025, hemos mejorado nuestro portafolio de servicios y comenzado a brindar servicios para inversores crypto."
        },
        team: {
            title: "Nuestro Equipo",
            location: "Estamos ubicados en Uruguay, Argentina y España.",
            pioneers: "Desde 2013, hemos sido pioneros en trabajo remoto.",
            customerSuccess: "Atención al Cliente:",
            softwareTeam: "Equipo de Delivery:",
            softwareDevelopers: "Desarrolladores de software:",
            softwarePool: "Más un pool de 10 desarrolladores part-time que llamamos on-demand.",
            ibmiDevelopers: "Desarrolladores IBM i:",
            ibmiPool: "Más un pool de 10 desarrolladores part-time que llamamos on-demand.",
            cybersecurity: "Ciberseguridad",
            securityPool: "Más un pool de 5 consultores de seguridad que llamamos on-demand.",
            investorServices: "Servicios para Inversores",
            investorPool: "Más un pool de 4 abogados y contadores que llamamos on-demand."
        },
        newsletter: {
            title: "Suscríbete a nuestro boletín",
            namePlaceholder: "Tu nombre",
            emailPlaceholder: "Tu correo electrónico",
            subscribe: "Suscribirse",
            success: "¡Gracias por suscribirte!",
            error: "Error al suscribirse. Por favor, inténtalo de nuevo.",
            alreadySubscribed: "Este correo ya está suscrito."
        },
        footer: {
            tagline: "The Americas Consulting Company",
            description: "Transformando organizaciones a través de talento estratégico, tecnología y servicios.",
            quickLinks: "Enlaces Rápidos",
            home: "Inicio",
            why: "Por Qué Trabajar Con Nosotros",
            who: "A Quién Ayudamos",
            investorServices: "Servicios Personales y para Inversores",
            softwareServices: "Servicios de Software",
            services: "Cómo Podés Contratar",
            about: "Acerca de Nosotros",
            contact: "Contacto",
            getInTouch: "Ponete en Contacto",
            emailUs: "Envianos un Email",
            callUs: "Llamanos",
            socialNetworks: "Redes Sociales",
            linkedinEN: "LinkedIn (EN)",
            linkedinES: "LinkedIn (ES)",
            instagramEN: "Instagram (EN)",
            instagramES: "Instagram (ES)",
            facebookES: "Facebook (ES)",
            copyright: "© 2024 The Americas Consulting Company. Todos los derechos reservados."
        },
        developerTraining: {
            backLink: "← Volver a Servicios de Software",
            title: "Capacitación para Desarrolladores",
            placeholder: "Contenido próximamente...",
            contactEmail: "Contáctenos por email",
            contactWhatsapp: "Contáctenos por WhatsApp"
        },
        legacyDevelopment: {
            backLink: "← Volver a Servicios de Software",
            title: "Desarrollo Legacy",
            placeholder: "Contenido próximamente...",
            contactEmail: "Contáctenos por email",
            contactWhatsapp: "Contáctenos por WhatsApp"
        },
        blockchainTraining: {
            title: "ProFactory Academy",
            backLink: "← Volver a Servicios Personales y para Inversores",
            placeholder: "El contenido se agregará pronto...",
            instructorTitle: "Nuestra Directora de la Academia e Instructora Principal",
            instructorName: "Fatima Maldonado - Desarrolladora, Autora y Consultora",
            courseTitle: "Curso de Blockchain y Bitcoin, por Zoom:",
            intro1: "Aprendé sobre Blockchain y Bitcoin",
            intro2: "Cómo invertir y enviar dinero",
            intro3: "Cómo evitar estafas",
            duration: "En 20 clases, más una clase gratuita de práctica en nuestros teléfonos",
            topicsTitle: "Temas que aprenderemos:",
            topic1: "Address o dirección",
            topic2: "Transaction crypto",
            topic3: "Claves públicas",
            topic4: "Claves privadas",
            topic5: "Palabras clave",
            topic6: "Wallet o billetera",
            topic7: "Fee para el minero",
            topic8: "Pool de transacciones",
            topic9: "Operaciónes",
            topic10: "Bloques",
            topic11: "Generación de nueva moneda",
            topic12: "Concatenación",
            topic13: "Bifurcación",
            topic14: "Confirmaciones",
            topic15: "Trampas y Hackeos",
            topic16: "Instalar y usar una wallet en mi teléfono",
            schedulesTitle: "Comisiones que inician en breve:",
            schedule1: "Enero 05 mañana (Lunes a Viernes de 9 a 10)",
            schedule2: "Enero 05 tarde (Lunes a Viernes de 13 a 14)",
            schedule3: "Enero 05 noche (Lunes a Viernes de 19 a 20)",
            registerButton: "Inscríbase por email",
            registerWhatsapp: "Inscríbase por Whatsapp",
            styleTitle: "Nuestro Estilo",
            styleText: "Nuestros cursos son creados y dictados con nuestro exclusivo 'Método Circular' que permite a todos los estudiantes comprender contenidos complejos y ponerlos en práctica. Como estos son cursos premium con instructor, solo dictamos una comisión por mes.",
            testimonialTitle: "Testimonio de Estudiante",
            academyTitle: "Nuestra Academia",
            academyText: "Comenzamos a enseñar cursos técnicos en 1992, y en 2008 creamos ProFactory, nuestra propia Escuela Técnica. En 2016, pasamos a la enseñanza en línea para acomodar mejor a estudiantes de diferentes ubicaciones.",
            instructorBio: "Fatima comenzó a coleccionar tarjetas perforadas de la calle en 1970, de un centro de cómputos cercano. En 1975 se convirtió en gamer. En 1983 comenzó a programar en lenguaje BASIC. Cambió a sistemas IBM en 1987. Luego a Internet en 1997, y a Java en 1998. Luego a Linux en 2002. En 2013 comenzó a trabajar con Bitcoin, ayudando a crear la comunidad Bitcoin en Sudamérica. En 2017 cambió a Ethereum, y en 2023 a Solana."
        },
        recommendations: {
            title: "Recomendaciones",
            backLink: "← Volver a Servicios de Blockchain",
            linkedinText: "Puedes ver estas recomendaciones en vivo en",
            linkedinLink: "LinkedIn"
        },
        aiAgents: {
            heroTitle: "Agentes de IA",
            heroSubtitle: "Para Automatizar Sus Procesos",
            heroDescription: "Los agentes de IA pueden automatizar sus procesos y reducir costos.",
            paragraph1: "Gran parte del trabajo inicial en la construcción de capacidades de IA se centró en el entrenamiento e implementación de modelos y ecosistemas de IA. Los agentes cambian ese enfoque hacia poner la IA a trabajar, tomando la salida de los modelos entrenados, el proceso de inferencia que pasa nuevos datos a los modelos para evaluar, y usándolo para actuar.",
            paragraph2: "En las interacciones basadas en chat, el usuario debe construir el contexto para el modelo creando el prompt y reuniendo información complementaria para enmarcar las respuestas que genera. Los enfoques agénticos cambian de la ingeniería de prompts a la ingeniería de contexto, o el proceso de asegurar que se establezca el mejor contexto posible para que un modelo funcione.",
            paragraph3: "Podemos diseñar y construir agentes de IA que se ejecuten en sus instalaciones o en su nube, con sus datos. También podemos escribir los conectores MCP (Model Context Protocol) para acceder a dichos datos.",
            callout: "Obtendrá un agente de IA llave en mano que trabaja para usted.",
            useCasesTitle: "Casos de uso de agentes",
            useCase1: "Enrutamiento",
            useCase2: "Automatización de interacciones repetitivas y rutinarias",
            useCase3: "Impulsar el compromiso",
            useCase4: "Aprender de las entradas de clientes e intercambios históricos, aprender de sus datos"
        },
        blockchainTutorials: {
            backLink: "← Volver a Servicios Personales y para Inversores",
            title: "Tutoriales de Blockchain para Inversión",
            placeholder: "Contenido próximamente...",
            ebookAnnouncement: "Nuestro próximo eBook (en progreso) explica cómo instalar una billetera confiable, comprar Bitcoin, Ethereum o criptodólares, y mantenerlos para obtener ganancias en el futuro."
        },
        signedNodeJs: {
            backLink: "← Volver a Servicios de Software",
            title: "Creación de infraestructura de paquetes firmados para node.js",
            description: "Ha habido muchos ataques a la cadena de suministro en proyectos, mediante la creación de paquetes de node.js falsos o contaminados. La base de este ataque es el anonimato completo sin siquiera firma para los paquetes. Planeamos usar nuestra experiencia en tecnologías blockchain para crear una nueva infraestructura para node.js donde los paquetes deben ser firmados por desarrolladores y equipos de desarrolladores. Las firmas autorizadas serán elegidas por la comunidad de usuarios y desarrolladores."
        },
        immigration: {
            backLink: "← Volver a Servicios Personales y para Inversores",
            title: "Inmigración a Uruguay",
            placeholder: "Contenido próximamente...",
            contactEmail: "Contáctenos por email",
            contactWhatsapp: "Contáctenos por WhatsApp",
            licensingTitle: "Asesoría en Licencias y Regulación",
            licensingDesc: "Apoyo para la solicitud de licencias y cumplimiento regulatorio en el mercado uruguayo.",
            personalTitle: "Trámites Personales",
            personalDesc: "Ayuda con inmigración y apertura de cuentas personales.",
            realEstateTitle: "Bienes Raíces",
            realEstateDesc: "Introducción a agentes inmobiliarios locales seleccionados y de confianza.",
            corporateTitle: "Servicios Corporativos",
            corporateDesc: "Constitución de entidades, servicios de secretaría corporativa y directorios para establecer y mantener estructuras reguladas.",
            tokenisationTitle: "Tokenización y Acuñación Segura",
            tokenisationDesc: "Emisión de tokens ERC-20 o ERC-3643, acuñación y quema vinculada a identidad, y soporte operativo 24/7."
        },
        explorer: {
            back: "Volver al Inicio",
            title: "Investigar",
            subtitle: "Ingrese una dirección de billetera o contrato para ver datos de blockchain",
            search: "Investigar",
            emptyState: "Ingrese una dirección arriba para comenzar",
            loading: "Cargando datos de blockchain...",
            addressInfo: "Información de la Dirección",
            address: "Dirección",
            network: "Red",
            balance: "Saldo",
            transactions: "Transacciones",
            moreInfo: "Más Información",
            viewOnExplorer: "Ver historial detallado de transacciones, transferencias de tokens y más en el explorador de bloques:",
            openExplorer: "Abrir en Explorador",
            evmAddressDetected: "Dirección EVM (compatible con Ethereum) Detectada",
            addressDetected: "Dirección Detectada",
            validation: "Validación",
            valid: "Válido",
            type: "Tipo",
            compatibleNetworks: "Redes Compatibles",
            chainsQueried: "cadenas consultadas",
            smartContract: "Contrato Inteligente",
            eoaUser: "EOA (Usuario)",
            blockchain: "Blockchain",
            addressType: "Tipo de Dirección",
            networks: "Redes",
            fullAddress: "Dirección Completa",
            viewOnExplorerBtn: "Ver en",
            explorer: "Explorador",
            active: "Activo",
            noActivity: "Sin Actividad",
            error: "Error",
            pleaseEnterAddress: "Por favor ingrese una dirección",
            invalidAddress: "Dirección inválida",
            unknownFormat: "Formato desconocido",
            fetchError: "Error al obtener datos de blockchain. Por favor intente de nuevo.",
            txHashDetected: "Esto parece ser un hash de transacción, no una dirección de billetera. Por favor ingrese una dirección de billetera o contrato.",
            txDetected: "Transacción Detectada",
            pendingTx: "Transacción Pendiente",
            txStatus: "Estado",
            txDetails: "Detalles de la Transacción",
            txHash: "Hash de Transacción",
            block: "Bloque",
            timestamp: "Fecha y Hora",
            txParties: "Remitente y Destinatario",
            from: "Desde",
            to: "Hacia",
            txValue: "Valor y Gas",
            value: "Valor",
            txFee: "Comisión de Transacción",
            gasPrice: "Precio del Gas",
            gasUsed: "Gas Utilizado",
            tokenTransfer: "Transferencia Detectada",
            stablecoinTransfer: "Transferencia de Stablecoin",
            tokenAmount: "Monto",
            tokenFrom: "Desde",
            tokenTo: "Hacia",
            viewOnDegenScout: "Investigar",
            viewDetails: "Ver Detalles"
        },
        investigate: {
            back: "Volver",
            title: "Investigar Dirección",
            subtitle: "Análisis detallado de la dirección blockchain",
            addressInfo: "Información de la Dirección",
            address: "Dirección",
            blockchain: "Blockchain",
            analysis: "Análisis",
            placeholder: "Contenido próximamente...",
            loadingTransactions: "Cargando transacciones USDT/USDC...",
            stablecoinTransactions: "Transacciones USDT/USDC",
            noTransactions: "No se encontraron transacciones USDT/USDC",
            invalidParams: "Dirección o parámetro de blockchain inválido",
            errorLoading: "Error al cargar transacciones. Por favor, intente de nuevo.",
            date: "Fecha",
            time: "Hora",
            amount: "Monto",
            from: "Desde",
            to: "Hacia",
            of: "de",
            yearlySummary: "Resumen Anual",
            received: "Recibido",
            sent: "Enviado",
            loadingBitcoin: "Cargando transacciones de Bitcoin...",
            currentBtcPrice: "Precio Actual de BTC",
            total: "Total",
            noTxFound: "No se encontraron transacciones",
            pendingConfirmation: "Confirmación pendiente"
        }
    }
};

// Make translations globally accessible for other scripts
window.translations = translations;

// Get nested property from object using dot notation
function getNestedProperty(obj, path) {
    return path.split('.').reduce((current, prop) => current?.[prop], obj);
}

// Change language function
function changeLanguage(lang) {
    // Save language preference
    localStorage.setItem('preferredLanguage', lang);

    // Update HTML lang attribute
    document.documentElement.lang = lang;

    // Update all elements with data-i18n attribute
    document.querySelectorAll('[data-i18n]').forEach(element => {
        const key = element.getAttribute('data-i18n');
        const translation = getNestedProperty(translations[lang], key);
        if (translation) {
            element.textContent = translation;
        }
    });

    // Update all placeholders with data-i18n-placeholder attribute
    document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
        const key = element.getAttribute('data-i18n-placeholder');
        const translation = getNestedProperty(translations[lang], key);
        if (translation) {
            element.placeholder = translation;
        }
    });

    // Update language selector buttons
    document.querySelectorAll('.lang-btn').forEach(btn => {
        if (btn.dataset.lang === lang) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
}

// Initialize language switching
function initLanguage() {
    // Get saved language or default to English
    const savedLang = localStorage.getItem('preferredLanguage') || 'en';
    changeLanguage(savedLang);

    // Add click event listeners to language buttons
    document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            changeLanguage(btn.dataset.lang);
        });
    });
}

// Initialize language on page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initLanguage);
} else {
    initLanguage();
}

// Hero Carousel
function initCarousel() {
    const slides = document.querySelectorAll('.carousel-slide');
    const indicators = document.querySelectorAll('.carousel-indicator');

    if (slides.length === 0) return;

    let currentSlide = 0;
    let autoPlayInterval;
    const autoPlayDelay = 5000; // 5 seconds

    function goToSlide(index) {
        // Remove active from current slide and indicator
        slides[currentSlide].classList.remove('active');
        indicators[currentSlide].classList.remove('active');

        // Update current slide
        currentSlide = index;
        if (currentSlide >= slides.length) currentSlide = 0;
        if (currentSlide < 0) currentSlide = slides.length - 1;

        // Add active to new slide and indicator
        slides[currentSlide].classList.add('active');
        indicators[currentSlide].classList.add('active');
    }

    function nextSlide() {
        goToSlide(currentSlide + 1);
    }

    function startAutoPlay() {
        autoPlayInterval = setInterval(nextSlide, autoPlayDelay);
    }

    function stopAutoPlay() {
        clearInterval(autoPlayInterval);
    }

    // Click handlers for indicators
    indicators.forEach((indicator, index) => {
        indicator.addEventListener('click', () => {
            stopAutoPlay();
            goToSlide(index);
            startAutoPlay();
        });
    });

    // Pause on hover
    const heroSection = document.querySelector('.hero-carousel');
    if (heroSection) {
        heroSection.addEventListener('mouseenter', stopAutoPlay);
        heroSection.addEventListener('mouseleave', startAutoPlay);
    }

    // Start auto-play
    startAutoPlay();
}

// Initialize carousel when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCarousel);
} else {
    initCarousel();
}
