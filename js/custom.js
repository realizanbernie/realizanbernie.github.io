// get current year
(function () {
    var year = new Date().getFullYear();
    document.querySelector("#currentYear").innerHTML = year;
})();
// modify
   // script.js
document.addEventListener("DOMContentLoaded", function() {
    const links = document.querySelectorAll('.navbar-nav .nav-link');

    links.forEach(link => {
        link.addEventListener('click', function(event) {
            event.preventDefault(); // Prevent the default link behavior
            const href = this.getAttribute('href');

            // Add the fade-out class to the body
            document.body.classList.add('fade-out');

            // Wait for the transition to finish before navigating
            setTimeout(() => {
                window.location.href = href; // Navigate to the new page
            }, 500); // Match this duration with your CSS transition duration
        });
    });
});

let holdTimer;

        document.getElementById('toggleLink').addEventListener('mousedown', function() {
            holdTimer = setTimeout(function() {
                window.open('https://drive.google.com/drive/folders/1wCSvCuLXIorej7DRDu3w1mCEbo8mM7Xy?usp=drive_link', '_self'); // Replace with your secret link
            }, 5000); // 5 seconds
        });

        document.getElementById('toggleLink').addEventListener('mouseup', function() {
            clearTimeout(holdTimer);
        });

        document.getElementById('toggleLink').addEventListener('mouseleave', function() {
            clearTimeout(holdTimer);
        });
