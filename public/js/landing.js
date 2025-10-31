(function() {
    const words = [
        'información',
        'seguridad',
        'productos',
        'opciones',
        'oportunidades',
        'servicios',
        'soluciones',
        'herramientas'
    ];

    let currentIndex = 0;
    const rotatingWord = document.getElementById('rotatingWord');

    function rotateWord() {
        // Fade out
        rotatingWord.classList.add('fade-out');

        setTimeout(() => {
            // Change word
            currentIndex = (currentIndex + 1) % words.length;
            rotatingWord.textContent = words[currentIndex];

            // Fade in
            rotatingWord.classList.remove('fade-out');
        }, 500); // Match transition duration
    }

    // Rotate every 3 seconds
    setInterval(rotateWord, 3000);
})();
