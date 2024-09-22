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
document.addEventListener("DOMContentLoaded", function() {
  const links = document.querySelectorAll(".navbar-nav .nav-link");
  const body = document.body;

  // Initially set the original color class
  body.classList.add("original-color");

  links.forEach(link => {
      link.addEventListener("click", function(event) {
          event.preventDefault(); // Prevent the default link behavior
          const href = this.getAttribute("href");

          // Start fade out
          body.classList.add("fade-out");
          body.classList.remove("fade-in");

          // Wait for the fade-out transition to finish
          setTimeout(() => {
              window.location.href = href; // Redirect to the new page
          }, 900); // Set to 5000 milliseconds (5 seconds)
      });
  });

  // Fade in effect on page load
  body.classList.add("visible");
  

  // Change text color back to original after 1 secon

document.getElementById('startButton').addEventListener('click', function() {
    const hiddenContent = document.querySelector('.hidden-content');
    const info_section = document.querySelector('.info_section');
    const footer_section = document.querySelector('.footer_section');
    const clickSound = document.getElementById('clickSound');
    
    // Show the hidden content with a transition
    hiddenContent.classList.add('show');
    info_section.classList.add('show');
    footer_section.classList.add('show');
    clickSound.play();

    // Change text color back to original immediately
    document.body.classList.remove('original-color'); // Remove the original color class
    document.body.style.color = 'black'; // Reset color to the default
    document.body.classList.add('fade-out');
    // Start fade out effect
    
    // Redirect after 3 seconds
    setTimeout(() => {
        window.location.href = 'realizanbernie.github.io'; // Replace with your target URL
    }, 8000); // 3000 milliseconds (3 seconds)
    body.classList.remove("original-color"); // Remove the original color class
    body.style.color = "black"; // Reset color to the default
}, 0)
});
