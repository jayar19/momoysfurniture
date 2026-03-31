document.addEventListener('DOMContentLoaded', () => {
  const nav = document.querySelector('nav');
  const navContainer = nav?.querySelector('.nav-container');
  const navLinks = nav?.querySelector('.nav-links');

  if (!nav || !navContainer || !navLinks) return;

  let toggleButton = navContainer.querySelector('.nav-toggle');
  if (!toggleButton) {
    toggleButton = document.createElement('button');
    toggleButton.type = 'button';
    toggleButton.className = 'nav-toggle';
    toggleButton.setAttribute('aria-label', 'Toggle navigation menu');
    toggleButton.setAttribute('aria-expanded', 'false');
    toggleButton.innerHTML = `
      <span class="nav-toggle-line"></span>
      <span class="nav-toggle-line"></span>
      <span class="nav-toggle-line"></span>
    `;
    navContainer.insertBefore(toggleButton, navLinks);
  }

  const closeMenu = () => {
    nav.classList.remove('nav-open');
    document.body.classList.remove('nav-open');
    toggleButton.setAttribute('aria-expanded', 'false');
  };

  const openMenu = () => {
    nav.classList.add('nav-open');
    document.body.classList.add('nav-open');
    toggleButton.setAttribute('aria-expanded', 'true');
  };

  toggleButton.addEventListener('click', () => {
    if (nav.classList.contains('nav-open')) {
      closeMenu();
      return;
    }
    openMenu();
  });

  navLinks.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', closeMenu);
  });

  window.addEventListener('resize', () => {
    if (window.innerWidth > 768) {
      closeMenu();
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeMenu();
    }
  });
});
