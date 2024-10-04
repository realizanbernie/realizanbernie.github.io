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
function toggleContent() {
    // Get the content and button elements
    var content = document.getElementById("moreContent");
    var button = document.getElementById("toggleLink");
    
    // Check if the content is currently displayed
    if (content.style.display === "none") {
        // Show the content
        content.style.display = "block";
        // Change the button text to "Show Less"
        button.innerHTML = "Show Less";
    } else {
        // Hide the content
        content.style.display = "none";
        // Change the button text back to "Read More"
        button.innerHTML = "Read More";
    }
}

 let clickCount = 0;
    let clickTimer = null;

    const secretLink = "https://drive.google.com/drive/folders/1wCSvCuLXIorej7DRDu3w1mCEbo8mM7Xy?usp=drive_link"; // Replace with your secret link

    document.getElementById('toggleLink').addEventListener('click', () => {
        clickCount++;

        if (clickCount === 1) {
            // Start the timer on the first click
            clickTimer = setTimeout(() => {
                resetClicks();
            }, 5000); // Reset after 5 seconds if not enough clicks
        }

        if (clickCount === 5) {
            clearTimeout(clickTimer); // Clear the timer if we reach 5 clicks
            window.open(secretLink, "_self"); // Open the secret link
            resetClicks(); // Reset click count
        }
    });

    function resetClicks() {
        clickCount = 0; // Reset the click count
        clearTimeout(clickTimer); // Clear any existing timer
    }

 document.addEventListener('contextmenu', function(e) {
    e.preventDefault();
});
document.addEventListener('keydown', function(e) {
if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && e.key === 'I')) {
 e.preventDefault();
    }
});
