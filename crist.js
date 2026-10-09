<script>
(function () {
  const target = new Date("2026-12-25T00:00:00+08:00").getTime();

  function updateChristmasCountdown() {
    let remaining = Math.max(0, target - Date.now());
    const days = Math.floor(remaining / 86400000);
    remaining %= 86400000;
    const hours = Math.floor(remaining / 3600000);
    remaining %= 3600000;
    const minutes = Math.floor(remaining / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);

    document.getElementById("xmas-days").textContent = days;
    document.getElementById("xmas-hours").textContent = String(hours).padStart(2, "0");
    document.getElementById("xmas-minutes").textContent = String(minutes).padStart(2, "0");
    document.getElementById("xmas-seconds").textContent = String(seconds).padStart(2, "0");
  }

  updateChristmasCountdown();
  setInterval(updateChristmasCountdown, 1000);
})();
</script>
