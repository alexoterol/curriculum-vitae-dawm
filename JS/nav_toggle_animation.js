// Añade un evento al botón de alternancia del menú de navegación
document.querySelector('.nav__toggle').addEventListener('click', function() {
    const nav = document.querySelector('.nav');
    nav.classList.toggle('nav--open');
    this.setAttribute('aria-expanded', nav.classList.contains('nav--open'));
});

// Cierra el menú al hacer clic en cualquier enlace del menú
document.querySelectorAll('.nav__link').forEach(function(link) {
    link.addEventListener('click', function() {
        const nav = document.querySelector('.nav');
        const toggle = document.querySelector('.nav__toggle');
        nav.classList.remove('nav--open');
        if (toggle) toggle.setAttribute('aria-expanded', 'false');
    });
});
