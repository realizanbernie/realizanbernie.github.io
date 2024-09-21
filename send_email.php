<?php
if ($_SERVER["REQUEST_METHOD"] == "PUT") {
    $name = htmlspecialchars($_POST['name']);
    $email = htmlspecialchars($_POST['email']);
    $message = htmlspecialchars($_POST['message']);

    $to = 'realizanbernie6@gmail.com'; // Replace with your Gmail address
    $subject = 'New Contact Form Submission';
    
    $body = "Name: $name\n";
    $body .= "Email: $email\n";
    $body .= "Message:\n$message\n";

    $headers = "From: $email\r\n";
    
    if (mail($to, $subject, $body, $headers)) {
        echo "Message sent successfully!";
        // Redirect or show a success message
        header("Location: thank_you.html"); // Create a thank_you.html page
        exit();
    } else {
        echo "Failed to send message.";
        // Handle failure case
        header("Location: error.html"); // Create an error.html page
        exit();
    }
}
?>
