/**
 * Saiguru's JB Sports Academy
 * Interactive Front-End Controller
 * High elegance dynamic animation engine & branding scripts
 */

document.addEventListener('DOMContentLoaded', () => {
  'use strict';

  // --- 1. Dynamic copyright footer date ---
  const yearElement = document.getElementById('currentYear');
  if (yearElement) {
    yearElement.textContent = new Date().getFullYear();
  }

  // --- 2. High-converting feature: Pre-select sport and scroll to booking form ---
  const programCTAs = document.querySelectorAll('[href="#book-trial"]');
  const preferredSportDropdown = document.getElementById('preferredSport');
  
  programCTAs.forEach(cta => {
    cta.addEventListener('click', (e) => {
      // Find out which program tab was active to auto-assign the sport field
      const activeTabButton = document.querySelector('#program-tabs .active');
      if (activeTabButton && preferredSportDropdown) {
        const tabId = activeTabButton.id;
        
        if (tabId.includes('badminton')) {
          preferredSportDropdown.value = 'Badminton';
        } else if (tabId.includes('dance')) {
          preferredSportDropdown.value = 'Dance';
        } else if (tabId.includes('yoga')) {
          preferredSportDropdown.value = 'Yoga';
        } else if (tabId.includes('gymnastics')) {
          preferredSportDropdown.value = 'Gymnastics';
        } else if (tabId.includes('zumba')) {
          preferredSportDropdown.value = 'Zumba';
        }
      }
    });
  });

  // --- 3. Custom testimonial carousel navigator ---
  const testimonials = [
    {
      initials: 'RM',
      quote: '"The change in my 8-year-old son Kabir is amazing. Before joining the soccer academy, he spent hours glued to the iPad. Now he counts down the days to his training sessions! His health, focus, and stamina have completely sky-rocketed."',
      author: 'Rajesh Mehta',
      meta: 'Father of Kabir (Age 8)',
      stars: 5
    },
    {
      initials: 'JS',
      quote: '"Saiguru\'s coaches don’t just instruct sports; they teach values. My daughter Diya learned how to support her colleagues, accept defeats gracefully, and lead teams. Setting up a trial session was simple and extremely comforting."',
      author: 'Janvi Sharma',
      meta: 'Mother of Diya (Age 12)',
      stars: 5
    },
    {
      initials: 'AP',
      quote: '"The basketball classes are elite grade. The facilities are modern, air-conditioned, and coach-student feedback schedules are deep. It has instilled the grit, punctuality, and athletic focus my 14yo son desperately needed."',
      author: 'Amit Patel',
      meta: 'Father of Arnav (Age 14)',
      stars: 5
    },
    {
      initials: 'SN',
      quote: '"We registered our daughter and son for swimming classes. The individual focus is outstanding. The pool is crystal clean, temperature-controlled, and we as parents can sit right next to the glass deck to watch securely."',
      author: 'Sunita Negi',
      meta: 'Mother of Rohan (Age 6) & Sara (Age 9)',
      stars: 5
    },
    {
      initials: 'KK',
      quote: '"Outstanding sports setup! Saiguru has built standard professional layouts in Mumbai. My kid enrolled in multi-sports foundation, and now his structural physical agility coordination is top notch."',
      author: 'Karan Kapoor',
      meta: 'Father of Aryan (Age 5)',
      stars: 5
    }
  ];

  let currentStartIndex = 0;
  const prevBtn = document.getElementById('prev-btn');
  const nextBtn = document.getElementById('next-btn');
  const testimonialsContainer = document.getElementById('testimonials-container');

  function renderTestimonials() {
    if (!testimonialsContainer) return;
    
    // Determine screen density (show 3 on desktop, 2 on tablet, 1 on mobile)
    const width = window.innerWidth;
    let cardsToShow = 3;
    if (width < 768) {
      cardsToShow = 1;
    } else if (width < 1200) {
      cardsToShow = 2;
    }

    testimonialsContainer.innerHTML = '';
    
    for (let i = 0; i < cardsToShow; i++) {
      const idx = (currentStartIndex + i) % testimonials.length;
      const t = testimonials[idx];
      
      const starsHtml = '<i class="bi bi-star-fill text-warning"></i>'.repeat(t.stars);
      
      const cardHtml = `
        <div class="col-md-6 col-lg-4 testimonial-card-wrapper reveal-scale revealed">
          <div class="review-box-premium p-4 rounded-4 bg-white h-100 d-flex flex-column justify-content-between">
            <div>
              <div class="d-flex mb-3 gap-1 fs-5">
                ${starsHtml}
              </div>
              <p class="text-italic mb-4 text-navy-brand">
                ${t.quote}
              </p>
            </div>
            <div class="d-flex align-items-center gap-3 border-top border-light pt-3 mt-3">
              <div class="user-avatar-premium rounded-circle d-flex align-items-center justify-content-center">
                ${t.initials}
              </div>
              <div>
                <h6 class="text-navy-brand mb-0 text-uppercase font-display fw-bold" style="font-size: 0.95rem;">${t.author}</h6>
                <p class="text-xs text-caption-custom mb-0">${t.meta}</p>
              </div>
            </div>
          </div>
        </div>
      `;
      testimonialsContainer.insertAdjacentHTML('beforeend', cardHtml);
    }
  }

  if (prevBtn && nextBtn) {
    prevBtn.addEventListener('click', () => {
      currentStartIndex = (currentStartIndex - 1 + testimonials.length) % testimonials.length;
      renderTestimonials();
    });

    nextBtn.addEventListener('click', () => {
      currentStartIndex = (currentStartIndex + 1) % testimonials.length;
      renderTestimonials();
    });

    window.addEventListener('resize', renderTestimonials);
    renderTestimonials(); // Initial load
  }

  // --- 4. Form Submission & Validation Engine with high-integrity feedback ---
  const bookingForm = document.getElementById('trialBookingForm');
  const successDiv = document.getElementById('bookingSuccessWidget');
  const submitBtn = document.getElementById('submitFormBtn');
  const bookAnotherBtn = document.getElementById('bookAnotherBtn');

  if (bookingForm && successDiv) {
    bookingForm.addEventListener('submit', (event) => {
      event.preventDefault();
      
      if (!bookingForm.checkValidity()) {
        event.stopPropagation();
        bookingForm.classList.add('was-validated');
        return;
      }

      // Show sleek loading state on button
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = `SUBMITTING INQUIRY... <div class="spinner-border spinner-border-sm ms-2" style="color: white;" role="status"></div>`;
      }

      // Simulate API roundtrip validation
      setTimeout(() => {
        const parentNameValue = document.getElementById('parentName').value;
        const childAgeValue = document.getElementById('childAge').value;
        const sportSelectedValue = document.getElementById('preferredSport').value;
        const parentPhoneValue = document.getElementById('parentPhone').value;
        const parentEmailValue = document.getElementById('parentEmail').value;
        const specialNotesValue = document.getElementById('specialNotes') ? document.getElementById('specialNotes').value : '';
        
        const ticketParent = document.getElementById('ticketParentName');
        const ticketAge = document.getElementById('ticketChildAge');
        const ticketSport = document.getElementById('ticketSelectedSport');
        const ticketRef = document.getElementById('ticketRef');

        if (ticketParent) ticketParent.textContent = parentNameValue;
        if (ticketAge) ticketAge.textContent = childAgeValue;
        if (ticketSport) ticketSport.textContent = sportSelectedValue;
        
        // Generate random high-integrity pass code
        const hex = Math.floor(Math.random() * 0xFFFFF).toString(16).toUpperCase().padStart(5, '0');
        const ticketRefStr = `#JB-${hex}`;
        if (ticketRef) ticketRef.textContent = ticketRefStr;

        // Auto-configure the WhatsApp click URL based on configured academy phone
        let academyPhoneStr = "919876543210"; // Default fallback
        const phoneLink = document.querySelector('a[href^="tel:"]');
        if (phoneLink) {
          const hrefPhone = phoneLink.getAttribute('href').replace('tel:', '').trim();
          const digits = hrefPhone.replace(/[^0-9]/g, '');
          if (digits.length >= 10) {
            academyPhoneStr = digits;
            if (digits.length === 10) {
              academyPhoneStr = "91" + digits; // Add default India country code if exactly 10 digits
            }
          }
        }

        const messageText = `Hi! I just submitted an Inquiry!\n\n` +
          `• Ticket Ref: ${ticketRefStr}\n` +
          `• Name: ${parentNameValue}\n` +
          `• Phone: +91 ${parentPhoneValue}\n` +
          `• Subject: ${childAgeValue}\n` +
          `• Program: ${sportSelectedValue}\n` +
          `• Message: ${specialNotesValue || 'None'}\n\n` +
          `Please confirm you received it. Thanks!`;

        const whatsappBtn = document.getElementById('whatsappShareBtn');
        if (whatsappBtn) {
          whatsappBtn.setAttribute('href', `https://wa.me/${academyPhoneStr}?text=${encodeURIComponent(messageText)}`);
        }

        // Post the registration transaction payload up to the Parent Applet Container
        // to write to Firestore and append into Google Sheets in real-time
        try {
          window.parent.postMessage({
            type: 'BOOTSTRAP_BOOKING_SUBMIT',
            booking: {
              parentName: parentNameValue,
              parentPhone: parentPhoneValue,
              childAge: childAgeValue,
              preferredSport: sportSelectedValue,
              parentEmail: parentEmailValue,
              specialNotes: specialNotesValue,
              ticketRef: ticketRefStr,
              timestamp: new Date().toISOString()
            }
          }, '*');
        } catch (postErr) {
          console.error("Iframe tracking postMessage failed:", postErr);
        }

        // Reveal success screen
        bookingForm.classList.add('d-none');
        successDiv.classList.remove('d-none');
        
        document.getElementById('inquiry-box').scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 1100);

    }, false);

    // Revert form state back so parents can book for another athlete
    if (bookAnotherBtn) {
      bookAnotherBtn.addEventListener('click', () => {
        bookingForm.reset();
        bookingForm.classList.remove('was-validated');
        bookingForm.classList.remove('d-none');
        successDiv.classList.add('d-none');
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = `Submit Inquiry <i class="bi bi-chat-left-text-fill ms-2 fs-5"></i>`;
        }
      });
    }
  }

  // --- 5. Elegant Navigation Scroll Backdrop & Offset Interaction ---
  const navbar = document.getElementById('navbar-main');
  const navbarCollapse = document.getElementById('navbarNav');
  
  if (navbar) {
    window.addEventListener('scroll', () => {
      if (window.scrollY > 40) {
        navbar.classList.add('is-scrolled');
      } else {
        navbar.classList.remove('is-scrolled');
      }
    });
    
    // Auto-scrolled active state checking
    if (window.scrollY > 40) {
       navbar.classList.add('is-scrolled');
    }

    // Auto-collapse mobile menu on click
    if (navbarCollapse) {
      const navLinks = navbarCollapse.querySelectorAll('.nav-link');
      navLinks.forEach(link => {
        link.addEventListener('click', () => {
          if (window.innerWidth < 992) {
            const bsCollapse = bootstrap.Collapse.getInstance(navbarCollapse) || new bootstrap.Collapse(navbarCollapse, { toggle: false });
            bsCollapse.hide();
          }
        });
      });
    }
  }

  // --- 6. Quick Interactive Facility Card Highlight feedback ---
  const facilityCards = document.querySelectorAll('.bento-facility-card');
  facilityCards.forEach(card => {
    card.addEventListener('click', () => {
      const title = card.querySelector('h5').textContent;
      
      // Temporary athletic highlight ring
      card.style.borderColor = 'var(--brand-orange)';
      card.style.boxShadow = '0 0 25px rgba(255, 87, 34, 0.25)';
      
      setTimeout(() => {
        card.style.borderColor = 'var(--border-delicate)';
        card.style.boxShadow = 'none';
      }, 1200);
      
      console.log(`User clicked details for facility: ${title}`);
    });
  });

  // --- 7. Custom Webflow-style Scroll Reveal Motion Engine ---
  const revealElements = document.querySelectorAll('.reveal-fade-up, .reveal-fade-left, .reveal-fade-right, .reveal-scale, .reveal-cascade');
  
  if ('IntersectionObserver' in window) {
    const revealCallback = (entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('revealed');
          
          if (entry.target.classList.contains('reveal-cascade')) {
            const children = entry.target.querySelectorAll('.reveal-cascade-item');
            children.forEach((child, idx) => {
              setTimeout(() => {
                child.classList.add('revealed');
              }, idx * 100);
            });
          }
          
          observer.unobserve(entry.target);
        }
      });
    };
    
    const revealObserver = new IntersectionObserver(revealCallback, {
      root: null,
      threshold: 0.1,
      rootMargin: '0px 0px -40px 0px'
    });
    
    revealElements.forEach(el => revealObserver.observe(el));
  } else {
    // Fallback for older browsers
    revealElements.forEach(el => el.classList.add('revealed'));
  }

  // --- 8. Live Stats Counter Ticker Engine ---
  const statsElements = document.querySelectorAll('.counter-ticker');
  if ('IntersectionObserver' in window) {
    const statsObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const target = parseFloat(entry.target.getAttribute('data-target'));
          const isDecimal = entry.target.getAttribute('data-decimal') === 'true';
          const duration = 1800; // 1.8 seconds transition
          const startTime = performance.now();
          
          const animateCount = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Ease out cubic cubic-bezier
            const easeProgress = 1 - Math.pow(1 - progress, 3);
            const value = easeProgress * target;
            
            if (isDecimal) {
              entry.target.textContent = value.toFixed(1);
            } else {
              entry.target.textContent = Math.floor(value);
            }
            
            if (progress < 1) {
              requestAnimationFrame(animateCount);
            } else {
              entry.target.textContent = isDecimal ? target.toFixed(1) : target;
            }
          };
          
          requestAnimationFrame(animateCount);
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.3 });
    
    statsElements.forEach(el => statsObserver.observe(el));
  } else {
    statsElements.forEach(el => {
      el.textContent = el.getAttribute('data-target');
    });
  }

});
