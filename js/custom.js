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
          }, 0); // Set to 5000 milliseconds (5 seconds)
      });
  });

  // Fade in effect on page load
  body.classList.add("visible");

  // Change text color back to original after 1 second
  setTimeout(() => {
      body.classList.remove("original-color"); // Remove the original color class
      body.style.color = "black"; // Reset color to the default
  }, 200); // 1000 milliseconds (1 second)
});
