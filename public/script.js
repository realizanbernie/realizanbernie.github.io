"use strict";

(() => {
  const $ = (selector) => document.querySelector(selector);
  const PH_TZ = "Asia/Manila";
  const DAY_MS = 86_400_000;

  const el = {
    currentDate: $("#currentDate"),
    currentTime: $("#currentTime"),
    scene: $("#scene"),
    sceneEvent: $("#sceneEvent"),
    sceneEventLabel: $("#sceneEventLabel"),
    walker: $("#walker"),
    roadProgress: $("#roadProgress"),
    journeyCaption: $("#journeyCaption"),
    journeyPercent: $("#journeyPercent"),
    countTitle: $("#countTitle"),
    eventDateLine: $("#eventDateLine"),
    days: $("#days"),
    hours: $("#hours"),
    minutes: $("#minutes"),
    seconds: $("#seconds"),
    detailDate: $("#detailDate"),
    detailTime: $("#detailTime"),
    weatherValue: $("#weatherValue"),
    locationValue: $("#locationValue"),
    weatherNote: $("#weatherNote"),
    locateButton: $("#locateButton"),
    searchToggle: $("#searchToggle"),
    locationSearch: $("#locationSearch"),
    cityInput: $("#cityInput"),
    openCalendar: $("#openCalendar"),
    calendarButtonSub: $("#calendarButtonSub"),
    calendarModal: $("#calendarModal"),
    closeCalendar: $("#closeCalendar"),
    calendarHeading: $("#calendarHeading"),
    monthTitle: $("#monthTitle"),
    calendarGrid: $("#calendarGrid"),
    prevMonth: $("#prevMonth"),
    nextMonth: $("#nextMonth"),
    eventSelect: $("#eventSelect"),
    eventDetail: $("#eventDetail"),
    monthEvents: $("#monthEvents"),
    eventInfoButton: $("#eventInfoButton"),
    markerLeft: $("#markerLeft"),
    eventMarker: $("#eventMarker"),
    markerRight: $("#markerRight")
  };

  const required = [
    "currentDate", "currentTime", "scene", "walker", "roadProgress",
    "days", "hours", "minutes", "seconds", "calendarModal",
    "calendarGrid", "eventSelect"
  ];
  if (required.some((key) => !el[key])) {
    console.error("Holiday Journey: required HTML elements are missing.");
    return;
  }

  const pad = (value) => String(value).padStart(2, "0");
  const localDateKey = (date) =>
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

  const dateFromKey = (key) => {
    const [year, month, day] = key.split("-").map(Number);
    return new Date(year, month - 1, day, 0, 0, 0, 0);
  };

  const formatDate = (date, options = { year: "numeric", month: "long", day: "numeric" }) =>
    new Intl.DateTimeFormat("en-PH", options).format(date);

  const escapeHTML = (value) =>
    String(value).replace(/[&<>"']/g, (char) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[char]));

  let holidays = [];
  let selectedDate = new Date();
  selectedDate.setHours(0, 0, 0, 0);

  let selectedEventKey = "";
  let calendarMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
  let currentLocation = {
    name: "Cebu City",
    latitude: 10.3157,
    longitude: 123.8854
  };
  let weatherRequestId = 0;
  let lastFocusedElement = null;

  function nthWeekdayOfMonth(year, month, weekday, occurrence) {
    const first = new Date(year, month, 1);
    const offset = (weekday - first.getDay() + 7) % 7;
    return 1 + offset + (occurrence - 1) * 7;
  }

  function lastWeekdayOfMonth(year, month, weekday) {
    const last = new Date(year, month + 1, 0);
    return last.getDate() - ((last.getDay() - weekday + 7) % 7);
  }

  function easterSunday(year) {
    const a = year % 19;
    const b = Math.floor(year / 100);
    const c = year % 100;
    const d = Math.floor(b / 4);
    const e = b % 4;
    const f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4);
    const k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31);
    const day = ((h + l - 7 * m + 114) % 31) + 1;
    return new Date(year, month - 1, day);
  }

  function addDays(date, amount) {
    const result = new Date(date);
    result.setDate(result.getDate() + amount);
    return result;
  }

  function createHoliday(year, month, day, name, type, description = "") {
    const date = new Date(year, month - 1, day);
    return {
      key: localDateKey(date),
      name,
      type,
      description,
      date
    };
  }

  function holidaysForYear(year) {
    const list = [];
    const add = (month, day, name, type, description = "") =>
      list.push(createHoliday(year, month, day, name, type, description));

    add(1, 1, "New Year's Day", "regular", "Regular holiday");
    add(2, 25, "EDSA People Power Revolution Anniversary", "special", "Special working day in the 2026 proclamation");
    add(2, 14, "Valentine's Day", "observance", "Observance");
    add(4, 9, "Araw ng Kagitingan", "regular", "Regular holiday");
    add(5, 1, "Labor Day", "regular", "Regular holiday");
    add(6, 12, "Independence Day", "regular", "Regular holiday");
    add(8, 21, "Ninoy Aquino Day", "special", "Special non-working day in the 2026 proclamation");
    add(8, lastWeekdayOfMonth(year, 7, 1), "National Heroes Day", "regular", "Last Monday of August; regular holiday");
    add(11, 1, "All Saints' Day", "special", "Special non-working day in the 2026 proclamation");
    add(11, 2, "All Souls' Day", "special", "Special non-working day in the 2026 proclamation");
    add(11, 30, "Bonifacio Day", "regular", "Regular holiday");
    add(12, 8, "Feast of the Immaculate Conception of Mary", "special", "Special non-working day");
    add(12, 24, "Christmas Eve", "special", "Special non-working day");
    add(12, 25, "Christmas Day", "regular", "Regular holiday");
    add(12, 30, "Rizal Day", "regular", "Regular holiday");
    add(12, 31, "Last Day of the Year", "special", "Special non-working day in the 2026 proclamation");

    const easter = easterSunday(year);
    const maundyThursday = addDays(easter, -3);
    const goodFriday = addDays(easter, -2);
    const blackSaturday = addDays(easter, -1);

    for (const [date, name, type] of [
      [maundyThursday, "Maundy Thursday", "regular"],
      [goodFriday, "Good Friday", "regular"],
      [blackSaturday, "Black Saturday", "special"]
    ]) {
      list.push({
        key: localDateKey(date),
        name,
        type,
        description: type === "regular" ? "Regular holiday" : "Special non-working day",
        date
      });
    }

    // Chinese New Year is date-variable and must be checked against the annual proclamation.
    if (year === 2026) {
      add(2, 17, "Chinese New Year", "special", "Special non-working day");
    } else {
      add(2, 17, "Chinese New Year", "observance", "Date varies; verify the annual proclamation");
    }

    // Christmas Day and New Year's Day are countdown defaults, but observances repeat yearly.
    return list.sort((a, b) => a.date - b.date);
  }

  function buildHolidayList() {
    const year = selectedDate.getFullYear();
    holidays = [
      ...holidaysForYear(year - 1),
      ...holidaysForYear(year),
      ...holidaysForYear(year + 1)
    ];
  }

  function getNextHoliday() {
    const now = new Date();
    return holidays.find((item) => item.date.getTime() + DAY_MS > now.getTime()) || holidays[0];
  }

  function getChristmasEvent() {
    const now = new Date();
    let year = now.getFullYear();
    let date = new Date(year, 11, 25);
    if (date.getTime() <= now.getTime()) date = new Date(++year, 11, 25);
    return {
      key: `christmas-${year}`,
      name: "Christmas Day",
      type: "regular",
      description: "Regular holiday",
      date
    };
  }

  function getNewYearEvent() {
    const now = new Date();
    let year = now.getFullYear();
    let date = new Date(year, 0, 1);
    if (date.getTime() <= now.getTime()) date = new Date(++year, 0, 1);
    return {
      key: `newyear-${year}`,
      name: "New Year's Day",
      type: "regular",
      description: "Regular holiday",
      date
    };
  }

  function findEvent(key) {
    if (key.startsWith("christmas-")) {
      const year = Number(key.split("-")[1]);
      return { ...getChristmasEvent(), date: new Date(year, 11, 25), key };
    }
    if (key.startsWith("newyear-")) {
      const year = Number(key.split("-")[1]);
      return { ...getNewYearEvent(), date: new Date(year, 0, 1), key };
    }
    return holidays.find((item) => item.key === key);
  }

  function currentEvent() {
    return findEvent(selectedEventKey) || getNextHoliday();
  }

  function syncEventControls() {
    const event = currentEvent();
    if (!event) return;

    if (el.sceneEvent) el.sceneEvent.textContent = "COUNTDOWN EVENT";
    if (el.sceneEventLabel) el.sceneEventLabel.textContent = event.name;
    if (el.countTitle) el.countTitle.textContent = `COUNTDOWN TO ${event.name}`.toUpperCase();
    if (el.eventDateLine) {
      el.eventDateLine.textContent = formatDate(event.date, {
        weekday: "long", year: "numeric", month: "long", day: "numeric"
      });
    }
    if (el.calendarButtonSub) {
      el.calendarButtonSub.textContent = `${event.name} · ${formatDate(event.date)}`;
    }
    if (el.eventSelect && [...el.eventSelect.options].some((option) => option.value === event.key)) {
      el.eventSelect.value = event.key;
    }
    updateDetailDate();
  }

  function updateClock() {
    const now = new Date();
    el.currentDate.textContent = formatDate(now, {
      weekday: "short", year: "numeric", month: "short", day: "numeric"
    });
    el.currentTime.textContent = new Intl.DateTimeFormat("en-PH", {
      timeZone: PH_TZ,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true
    }).format(now);

    if (el.detailTime) {
      el.detailTime.textContent = new Intl.DateTimeFormat("en-PH", {
        timeZone: PH_TZ,
        hour: "2-digit",
        minute: "2-digit",
        hour12: true
      }).format(now);
    }
  }

  function updateDetailDate() {
    if (!el.detailDate) return;
    const event = currentEvent();
    el.detailDate.textContent = event
      ? formatDate(event.date, { month: "short", day: "numeric", year: "numeric" })
      : "--";
  }

  function updateCountdown() {
    const event = currentEvent();
    if (!event) return;

    const now = new Date();
    const remaining = Math.max(0, event.date.getTime() - now.getTime());
    const totalSeconds = Math.floor(remaining / 1000);

    el.days.textContent = Math.floor(totalSeconds / 86400);
    el.hours.textContent = pad(Math.floor((totalSeconds % 86400) / 3600));
    el.minutes.textContent = pad(Math.floor((totalSeconds % 3600) / 60));
    el.seconds.textContent = pad(totalSeconds % 60);

    const start = new Date(now.getFullYear(), 0, 1).getTime();
    const end = event.date.getTime();
    const span = Math.max(1, end - start);
    const progress = Math.max(0, Math.min(100, 100 - (remaining / span) * 100));
    const percentage = Math.round(progress);

    if (el.roadProgress) el.roadProgress.style.transform = `scaleX(${progress / 100})`;
    if (el.journeyPercent) el.journeyPercent.textContent = `${percentage}%`;
    if (el.walker) {
      const left = 7 + progress * 0.86;
      el.walker.style.left = `${left}%`;
      el.walker.style.transform = `translateX(-50%) ${Math.sin(Date.now() / 500) * 2}px`;
    }
    if (el.journeyCaption) {
      el.journeyCaption.textContent = remaining === 0
        ? `${event.name} is today`
        : `Walking toward ${event.name}`;
    }
  }

  function setSceneTime() {
    const hour = Number(new Intl.DateTimeFormat("en-PH", {
      timeZone: PH_TZ,
      hour: "2-digit",
      hourCycle: "h23"
    }).format(new Date()));

    el.scene.classList.remove(
      "pw-time-morning", "pw-time-afternoon", "pw-time-night", "pw-time-midnight"
    );

    if (hour >= 5 && hour < 11) el.scene.classList.add("pw-time-morning");
    else if (hour >= 11 && hour < 17) el.scene.classList.add("pw-time-afternoon");
    else if (hour >= 17 && hour < 22) el.scene.classList.add("pw-time-night");
    else el.scene.classList.add("pw-time-midnight");
  }

  function weatherDescription(code) {
    if (code === 0) return "Clear";
    if ([1, 2].includes(code)) return "Partly cloudy";
    if (code === 3) return "Cloudy";
    if ([45, 48].includes(code)) return "Fog";
    if ([51, 53, 55, 56, 57].includes(code)) return "Drizzle";
    if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return "Rain";
    if ([71, 73, 75, 77, 85, 86].includes(code)) return "Snow";
    if ([95, 96, 99].includes(code)) return "Thunderstorm";
    return "Conditions unavailable";
  }

  function updateSceneWeather(code) {
    const classes = [
      "pw-weather-clear", "pw-weather-cloudy", "pw-weather-rain",
      "pw-weather-storm", "pw-weather-fog", "pw-weather-snow"
    ];
    el.scene.classList.remove(...classes);

    let weatherClass = "pw-weather-clear";
    if ([1, 2, 3].includes(code)) weatherClass = "pw-weather-cloudy";
    else if ([45, 48].includes(code)) weatherClass = "pw-weather-fog";
    else if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) {
      weatherClass = "pw-weather-rain";
    } else if ([71, 73, 75, 77, 85, 86].includes(code)) {
      weatherClass = "pw-weather-snow";
    } else if ([95, 96, 99].includes(code)) {
      weatherClass = "pw-weather-storm";
    }
    el.scene.classList.add(weatherClass);
  }

  async function loadWeather() {
    const requestId = ++weatherRequestId;
    if (el.weatherValue) el.weatherValue.textContent = "Loading…";
    if (el.weatherNote) el.weatherNote.textContent = `Getting current weather for ${currentLocation.name}…`;

    try {
      const params = new URLSearchParams({
        latitude: String(currentLocation.latitude),
        longitude: String(currentLocation.longitude),
        current: "temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m",
        timezone: "auto"
      });
      const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
      if (!response.ok) throw new Error(`Weather service returned ${response.status}`);
      const data = await response.json();
      if (requestId !== weatherRequestId) return;

      const current = data.current;
      if (!current) throw new Error("Weather data is unavailable.");

      const description = weatherDescription(current.weather_code);
      if (el.weatherValue) {
        el.weatherValue.textContent = `${description}, ${Math.round(current.temperature_2m)}°C`;
      }
      if (el.weatherNote) {
        el.weatherNote.textContent =
          `Feels like ${Math.round(current.apparent_temperature)}°C · ` +
          `${Math.round(current.relative_humidity_2m)}% humidity · ` +
          `Wind ${Math.round(current.wind_speed_10m)} km/h`;
      }
      updateSceneWeather(current.weather_code);
    } catch (error) {
      if (requestId !== weatherRequestId) return;
      if (el.weatherValue) el.weatherValue.textContent = "Unavailable";
      if (el.weatherNote) {
        el.weatherNote.textContent = "Weather could not be loaded. Check your connection and try again.";
      }
      console.error("Weather lookup failed:", error);
    }
  }

  async function searchLocation(query) {
    const params = new URLSearchParams({
      name: query,
      count: "10",
      language: "en",
      format: "json"
    });
    const response = await fetch(`https://geocoding-api.open-meteo.com/v1/search?${params}`);
    if (!response.ok) throw new Error(`Location search returned ${response.status}`);
    const data = await response.json();
    const result = (data.results || []).find((item) => item.country_code === "PH");

    if (!result) throw new Error("No matching Philippine city or municipality was found.");

    currentLocation = {
      name: [result.name, result.admin1].filter(Boolean).join(", "),
      latitude: result.latitude,
      longitude: result.longitude
    };
    if (el.locationValue) el.locationValue.textContent = currentLocation.name;
    await loadWeather();
  }

  function setLocationFromCoordinates(latitude, longitude) {
    currentLocation = { name: "Your location", latitude, longitude };
    if (el.locationValue) el.locationValue.textContent = "Your location";
    loadWeather();

    const params = new URLSearchParams({
      latitude: String(latitude),
      longitude: String(longitude),
      count: "1",
      language: "en",
      format: "json"
    });

    fetch(`https://geocoding-api.open-meteo.com/v1/reverse?${params}`)
      .then((response) => response.ok ? response.json() : null)
      .then((data) => {
        const place = data?.results?.[0];
        if (!place) return;
        currentLocation.name = [place.name, place.admin1].filter(Boolean).join(", ");
        if (el.locationValue) el.locationValue.textContent = currentLocation.name;
        if (el.weatherNote) el.weatherNote.textContent = `Current conditions for ${currentLocation.name}.`;
      })
      .catch(() => {});
  }

  function getMonthEvents(year, month) {
    return holidays.filter((item) =>
      item.date.getFullYear() === year && item.date.getMonth() === month
    );
  }

  function renderCalendar() {
    if (!el.calendarGrid) return;

    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    if (el.monthTitle) {
      el.monthTitle.textContent = formatDate(calendarMonth, { month: "long", year: "numeric" });
    }

    const firstDay = new Date(year, month, 1);
    const gridStart = new Date(year, month, 1 - firstDay.getDay());
    const todayKey = localDateKey(new Date());
    const selectedKey = localDateKey(selectedDate);
    const cells = [];

    for (let index = 0; index < 42; index++) {
      const date = new Date(gridStart);
      date.setDate(gridStart.getDate() + index);
      const key = localDateKey(date);
      const holiday = holidays.find((item) => item.key === key);
      const classes = ["day"];

      if (date.getMonth() !== month) classes.push("outside");
      if (key === todayKey) classes.push("today");
      if (key === selectedKey) classes.push("selected");
      if (holiday) classes.push(`holiday-${holiday.type}`);

      const label = holiday
        ? `${formatDate(date)} — ${holiday.name}${holiday.description ? `, ${holiday.description}` : ""}`
        : formatDate(date);

      cells.push(
        `<button type="button" class="${classes.join(" ")}" data-date="${key}" ` +
        `aria-label="${escapeHTML(label)}" aria-pressed="${key === selectedKey}">` +
        `${date.getDate()}</button>`
      );
    }
    el.calendarGrid.innerHTML = cells.join("");

    const monthEvents = getMonthEvents(year, month);
    if (el.monthEvents) {
      el.monthEvents.innerHTML = monthEvents.length
        ? monthEvents.map((event) =>
          `<button type="button" class="event-option" data-event="${event.key}">` +
          `<span>${escapeHTML(event.name)}</span>` +
          `<small>${formatDate(event.date, { month: "short", day: "numeric" })}</small>` +
          `</button>`
        ).join("")
        : `<p class="source-note">No listed national holidays this month.</p>`;
    }

    renderEventSelector();
    renderEventDetail();
  }

  function renderEventSelector() {
    if (!el.eventSelect) return;

    const options = holidays.map((event) => {
      const label = `${formatDate(event.date, { month: "short", day: "numeric", year: "numeric" })} — ${event.name}`;
      return `<option value="${event.key}">${escapeHTML(label)}</option>`;
    }).join("");

    el.eventSelect.innerHTML = options;
    const event = currentEvent();
    if (event && [...el.eventSelect.options].some((option) => option.value === event.key)) {
      el.eventSelect.value = event.key;
    } else if (event) {
      const option = document.createElement("option");
      option.value = event.key;
      option.textContent = `${formatDate(event.date)} — ${event.name}`;
      el.eventSelect.prepend(option);
      el.eventSelect.value = event.key;
    }
  }

  function renderEventDetail() {
    if (!el.eventDetail) return;
    const event = currentEvent();
    if (!event) {
      el.eventDetail.textContent = "Choose a date or event to see details.";
      return;
    }

    const classification = {
      regular: "Regular holiday",
      special: "Special non-working / special day",
      working: "Special working day",
      local: "Local holiday",
      religious: "Religious observance",
      observance: "Observance — not necessarily a public holiday"
    }[event.type] || "Event";

    el.eventDetail.innerHTML =
      `<h3>${escapeHTML(event.name)}</h3>` +
      `<p>${escapeHTML(formatDate(event.date, {
        weekday: "long", year: "numeric", month: "long", day: "numeric"
      }))}</p>` +
      `<p class="classification">${escapeHTML(classification)}</p>` +
      (event.description ? `<p>${escapeHTML(event.description)}</p>` : "");
  }

  function selectEvent(key) {
    const event = findEvent(key);
    if (!event) return;

    selectedEventKey = event.key;
    selectedDate = new Date(event.date);
    selectedDate.setHours(0, 0, 0, 0);
    calendarMonth = new Date(event.date.getFullYear(), event.date.getMonth(), 1);

    buildHolidayList();
    syncEventControls();
    renderCalendar();
    updateCountdown();
  }

  function selectDate(key) {
    const date = dateFromKey(key);
    selectedDate = date;
    calendarMonth = new Date(date.getFullYear(), date.getMonth(), 1);

    const holiday = holidays.find((item) => item.key === key);
    if (holiday) {
      selectedEventKey = holiday.key;
    } else {
      selectedEventKey = `date-${key}`;
      holidays.push({
        key: selectedEventKey,
        name: "Selected date",
        type: "observance",
        description: "A date selected in the calendar.",
        date
      });
    }

    syncEventControls();
    renderCalendar();
    updateCountdown();
  }

  function openCalendar() {
    lastFocusedElement = document.activeElement;
    el.calendarModal.hidden = false;
    document.body.style.overflow = "hidden";
    renderCalendar();
    el.closeCalendar?.focus();
  }

  function closeCalendar() {
    el.calendarModal.hidden = true;
    document.body.style.overflow = "";
    if (lastFocusedElement instanceof HTMLElement) lastFocusedElement.focus();
  }

  function chooseMarkerEvent(event) {
    if (!event) return;
    if (!holidays.some((item) => item.key === event.key)) holidays.push(event);
    selectEvent(event.key);
  }

  el.openCalendar?.addEventListener("click", openCalendar);
  el.eventInfoButton?.addEventListener("click", openCalendar);
  el.closeCalendar?.addEventListener("click", closeCalendar);

  el.calendarModal.addEventListener("click", (event) => {
    if (event.target.matches("[data-close]")) closeCalendar();

    const dayButton = event.target.closest("[data-date]");
    if (dayButton) selectDate(dayButton.dataset.date);

    const eventButton = event.target.closest("[data-event]");
    if (eventButton) selectEvent(eventButton.dataset.event);
  });

  el.prevMonth?.addEventListener("click", () => {
    calendarMonth.setMonth(calendarMonth.getMonth() - 1);
    renderCalendar();
  });

  el.nextMonth?.addEventListener("click", () => {
    calendarMonth.setMonth(calendarMonth.getMonth() + 1);
    renderCalendar();
  });

  el.eventSelect.addEventListener("change", () => selectEvent(el.eventSelect.value));

  document.addEventListener("keydown", (event) => {
    if (el.calendarModal.hidden) return;
    if (event.key === "Escape") closeCalendar();

    if (event.key === "Tab") {
      const focusable = [...el.calendarModal.querySelectorAll(
        'button:not([disabled]), select:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )].filter((node) => node.offsetParent !== null);

      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  });

  el.searchToggle?.addEventListener("click", () => {
    const isOpening = el.locationSearch.hidden;
    el.locationSearch.hidden = !isOpening;
    el.searchToggle.setAttribute("aria-expanded", String(isOpening));
    if (isOpening) el.cityInput?.focus();
  });

  el.locationSearch?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const query = el.cityInput?.value.trim();
    if (!query) {
      el.cityInput?.focus();
      return;
    }

    if (el.weatherNote) el.weatherNote.textContent = `Searching for ${query}…`;
    try {
      await searchLocation(query);
    } catch (error) {
      if (el.weatherNote) el.weatherNote.textContent = error.message;
    }
  });

  el.locateButton?.addEventListener("click", () => {
    if (!navigator.geolocation) {
      if (el.weatherNote) el.weatherNote.textContent = "Geolocation is not supported by this browser.";
      return;
    }

    if (el.weatherNote) el.weatherNote.textContent = "Requesting your location…";
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => setLocationFromCoordinates(coords.latitude, coords.longitude),
      (error) => {
        const message = error.code === 1
          ? "Location permission was denied. Search for a city instead."
          : "Could not determine your location. Search for a city instead.";
        if (el.weatherNote) el.weatherNote.textContent = message;
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
    );
  });

  el.markerLeft?.addEventListener("click", () => {
    const event = holidays.find((item) => item.name === "All Saints' Day");
    chooseMarkerEvent(event);
  });

  el.markerRight?.addEventListener("click", () => chooseMarkerEvent(getNewYearEvent()));
  el.eventMarker?.addEventListener("click", () => openCalendar());

  buildHolidayList();

  const initialEvent = getNextHoliday();
  selectedEventKey = initialEvent.key;
  syncEventControls();
  updateClock();
  setSceneTime();
  updateCountdown();
  loadWeather();

  renderCalendar();

  window.setInterval(() => {
    updateClock();
    updateCountdown();
    setSceneTime();
  }, 1000);
})();