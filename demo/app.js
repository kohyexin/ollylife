const app = document.getElementById("app");
const toastRegion = document.getElementById("toast-region");

function initialState() {
  return {
    stage: "portal",
    modalOpen: false,
    email: "olivia.chen@ollylife.com",
    username: "olivia.chen@ollylife.com",
    phoneCode: "+65",
    phone: "8123 4567",
    password: "",
    confirmPassword: "",
    terms: false,
    errors: {},
    kycStep: 0,
    country: "SGP",
    documentType: "NATIONAL_ID",
    applicantId: "",
    externalUserId: "ollylife-demo-" + crypto.randomUUID(),
    firstName: "",
    lastName: "",
    dob: "",
    cardholderId: "",
    walletBalance: 0,
    commissionBalance: 3250,
    cards: [],
    transactions: [],
    deliveryRecipient: null,
    deliveryRecipientSelection: "billing",
    apiTrace: [],
    topupOpen: false,
    walletView: "overview",
    authMethod: "sso",
    twoFactorCode: "",
    completingKyc: false,
    sumsubConfigured: false,
    sumsubStarted: false,
    timer: null,
  };
}

let state = initialState();

const stageRank = {
  portal: 0,
  sending: 1,
  inbox: 1,
  registration: 2,
  kyc: 3,
  success: 4,
  returning: 5,
  login: 5,
  twofa: 6,
  wallet: 7,
};

const journey = [
  ["1. Ollylife", "portal"],
  ["2. Invite", "inbox"],
  ["3. Register", "registration"],
  ["4. Verify", "kyc"],
  ["5. Ready", "success"],
  ["6. SSO", "returning"],
];

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function passwordStrength(value) {
  let score = 0;
  if (value.length >= 8) score++;
  if (/[a-z]/.test(value) && /[A-Z]/.test(value)) score++;
  if (/\d/.test(value)) score++;
  if (/[^A-Za-z0-9]/.test(value)) score++;
  return score;
}

function showToast(title, message) {
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.innerHTML =
    '<span class="toast-icon">✓</span><span><strong>' +
    escapeHtml(title) +
    '</strong><span>' +
    escapeHtml(message) +
    "</span></span>";
  toastRegion.appendChild(toast);
  setTimeout(function () {
    toast.remove();
  }, 3300);
}

function createDemoBar() {
  const bar = document.createElement("div");
  bar.className = "demo-bar";
  const rank = stageRank[state.stage] || 0;
  let progress = "";
  journey.forEach(function (item, index) {
    const status = index === rank ? "active" : index < rank ? "done" : "";
    progress +=
      '<button class="' +
      status +
      '" data-jump="' +
      item[1] +
      '" title="Jump to ' +
      item[0] +
      '">' +
      item[0].replace(". ", '. <span>') +
      "</span></button>";
  });
  bar.innerHTML =
    '<div class="demo-badge">Interactive client demo</div>' +
    '<nav class="demo-progress" aria-label="Demo stages">' +
    progress +
    "</nav>" +
    '<div class="demo-actions"><button class="bar-button" data-action="reset-demo">↺ Reset</button></div>';
  return bar;
}

function templateForStage() {
  if (state.stage === "returning") return "portal-template";
  return state.stage + "-template";
}

function fillAll(selector, value) {
  document.querySelectorAll(selector).forEach(function (element) {
    element.textContent = value;
  });
}

function formatMoney(value) {
  return "SGD " + Number(value || 0).toLocaleString("en-SG", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

async function postJson(url, body) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || "The API request failed.");
  return payload;
}

function syncAccountPayload(payload) {
  if (typeof payload.walletBalance === "number") state.walletBalance = payload.walletBalance;
  if (typeof payload.commissionBalance === "number") state.commissionBalance = payload.commissionBalance;
  if (Array.isArray(payload.cards)) state.cards = payload.cards;
  if (Array.isArray(payload.transactions)) state.transactions = payload.transactions;
  if (payload.cardholder) {
    state.cardholderId = payload.cardholder.id || state.cardholderId;
    state.firstName = payload.cardholder.firstName || state.firstName;
    state.lastName = payload.cardholder.lastName || state.lastName;
    state.dob = payload.cardholder.dob || state.dob;
  }
}

function fillDynamicAccountData() {
  fillAll("[data-wallet-balance]", formatMoney(state.walletBalance));
  fillAll("[data-commission-balance]", formatMoney(state.commissionBalance));
  fillAll("[data-card-balance]", formatMoney(state.cards.reduce(function (total, card) { return total + Number(card.balance || 0); }, 0)));
  fillAll("[data-first-name]", state.firstName || "Pending live verification");
  fillAll("[data-last-name]", state.lastName || "Pending live verification");
  fillAll("[data-dob]", state.dob || "Pending live verification");
  fillAll("[data-cardholder-id]", state.cardholderId || "Pending");
  fillAll("[data-cardholder-name]", ((state.firstName + " " + state.lastName).trim() || "—"));
  const firstCard = state.cards[0];
  fillAll("[data-card-last4]", firstCard ? firstCard.last4 : "—");
  fillAll("[data-card-type]", firstCard ? (firstCard.type === "PHYSICAL" ? "Physical" : "Virtual") : "—");
  document.querySelectorAll("[data-first-name-value]").forEach(function (input) { input.value = state.firstName; });
  document.querySelectorAll("[data-last-name-value]").forEach(function (input) { input.value = state.lastName; });
  document.querySelectorAll("[data-dob-value]").forEach(function (input) { input.value = state.dob; });
  document.querySelectorAll("[data-phone-value]").forEach(function (input) { input.value = state.phoneCode + state.phone.replace(/\s/g, ""); });
}

function render() {
  if (state.timer) clearTimeout(state.timer);
  app.dataset.externalUserId = state.externalUserId;
  const template = document.getElementById(templateForStage());
  if (!template) return;
  app.innerHTML = "";
  app.appendChild(template.content.cloneNode(true));
  app.prepend(createDemoBar());

  fillAll("[data-email-text]", state.email);
  document.querySelectorAll("[data-email-value]").forEach(function (input) {
    input.value = state.email;
  });
  fillDynamicAccountData();

  if (state.stage === "portal" || state.stage === "returning") {
    document.querySelector("[data-wallet-inactive]").hidden = state.stage === "returning";
    document.querySelector("[data-wallet-ready]").hidden = state.stage !== "returning";
    fillAll("[data-wallet-count]", state.stage === "returning" ? String(state.cards.length) : "—");
    fillAll("[data-wallet-note]", state.stage === "returning" ? (state.cards.length ? ((state.cards[0].type === "PHYSICAL" ? "Physical" : "Virtual") + " card active") : "Top up before creating a card") : "Activate to unlock");
    const portalCard = document.querySelector("[data-portal-card]");
    if (portalCard) portalCard.hidden = state.cards.length === 0;
    if (state.modalOpen) {
      const modal = document.getElementById("invite-modal-template").content.cloneNode(true);
      app.appendChild(modal);
      const input = document.getElementById("wallet-email");
      input.value = state.email;
      setTimeout(function () {
        input.focus();
      }, 0);
    }
  }

  if (state.stage === "sending") {
    state.timer = setTimeout(function () {
      state.stage = "inbox";
      render();
      showToast("Invitation sent", "VCCHUB delivered the registration email.");
    }, 1800);
  }

  if (state.stage === "registration") {
    state.username = state.email;
    document.getElementById("username").value = state.email;
    document.getElementById("phone-code").value = state.phoneCode;
    document.getElementById("phone").value = state.phone;
    document.getElementById("password").value = state.password;
    document.getElementById("confirm-password").value = state.confirmPassword;
    document.getElementById("terms").checked = state.terms;
    Object.keys(state.errors).forEach(function (key) {
      const error = document.querySelector('[data-error="' + key + '"]');
      if (error) error.textContent = state.errors[key];
    });
    updatePasswordMeter();
  }

  if (state.stage === "kyc") {
    prepareSumsub();
  }

  if (state.stage === "twofa") {
    fillAll("[data-twofa-method]", state.authMethod === "sso" ? "Ollylife secure SSO" : "Direct VCCHUB login");
    const code = document.getElementById("twofa-code");
    if (code) {
      code.value = state.twoFactorCode;
      setTimeout(function () { code.focus(); }, 0);
    }
  }

  if (state.stage === "wallet") {
    renderWallet();
    if (state.topupOpen) {
      app.appendChild(document.getElementById("topup-modal-template").content.cloneNode(true));
      fillDynamicAccountData();
    }
  }

  window.scrollTo({ top: 0, behavior: "smooth" });
}

function renderWallet() {
  const overview = document.querySelector("[data-wallet-overview]");
  const cardForm = document.querySelector("[data-card-form]");
  if (!overview || !cardForm) return;
  overview.hidden = state.walletView !== "overview";
  cardForm.hidden = state.walletView !== "card-form";
  const addButton = document.getElementById("add-card-button");
  if (addButton) {
    addButton.disabled = state.walletBalance <= 0 || state.cards.length > 0;
    addButton.textContent = state.cards.length ? "✓ Card created" : "＋ Add Card";
  }
  const rule = document.getElementById("card-rule");
  if (rule) {
    rule.classList.toggle("ready", state.walletBalance > 0);
    rule.textContent = state.cards.length
      ? "Card created successfully. Wallet funds remain separate until assigned to the card."
      : state.walletBalance > 0
        ? "Wallet funded. Card creation is now available."
        : "Top up the wallet from your Ollylife commission before creating a card.";
  }
  const empty = document.querySelector("[data-empty-cards]");
  const row = document.querySelector("[data-card-row]");
  if (empty) empty.hidden = state.cards.length > 0;
  if (row) row.hidden = state.cards.length === 0;
  const trace = document.querySelector("[data-api-trace]");
  if (trace && state.apiTrace.length) {
    trace.hidden = false;
    trace.innerHTML = "<strong>Latest API flow</strong>" + state.apiTrace.map(function (item) { return "<span>✓ " + escapeHtml(item) + "</span>"; }).join("");
  }
  fillDynamicAccountData();
  updateCardTypeForm();
}

function addressFrom(prefix) {
  return {
    country: document.getElementById(prefix + "-country").value,
    state: document.getElementById(prefix + "-state").value.trim(),
    city: document.getElementById(prefix + "-city").value.trim(),
    address: document.getElementById(prefix + "-address").value.trim(),
    postalCode: document.getElementById(prefix + "-postal").value.trim(),
  };
}

function updateCardTypeForm() {
  const selected = document.querySelector('input[name="card-type"]:checked');
  const deliverySection = document.getElementById("delivery-section");
  if (!selected || !deliverySection) return;
  const isPhysical = selected.value === "PHYSICAL";
  const confirmDelivery = document.getElementById("confirm-delivery");
  deliverySection.hidden = !isPhysical;
  if (confirmDelivery) confirmDelivery.required = isPhysical;
  renderRecipientOptions();
}

function renderRecipientOptions() {
  const billingName = document.querySelector("[data-billing-recipient-name]");
  if (billingName) billingName.textContent = (state.firstName + " " + state.lastName).trim() || "Registered cardholder";
  const customCard = document.getElementById("custom-recipient-card");
  if (!customCard) return;
  customCard.hidden = !state.deliveryRecipient;
  if (state.deliveryRecipient) {
    document.getElementById("custom-recipient-name").textContent = state.deliveryRecipient.firstName + " " + state.deliveryRecipient.lastName;
    document.getElementById("custom-recipient-summary").textContent = state.deliveryRecipient.phone + " · " + state.deliveryRecipient.address.address + ", " + state.deliveryRecipient.address.city + " " + state.deliveryRecipient.address.postalCode;
  }
  const billingRadio = document.querySelector('input[name="delivery-recipient"][value="billing"]');
  const customRadio = document.querySelector('input[name="delivery-recipient"][value="custom"]');
  if (billingRadio) billingRadio.checked = state.deliveryRecipientSelection !== "custom" || !state.deliveryRecipient;
  if (customRadio) customRadio.checked = state.deliveryRecipientSelection === "custom" && Boolean(state.deliveryRecipient);
}

function setRecipientField(id, value) {
  const input = document.getElementById(id);
  if (input) input.value = value || "";
}

function openRecipientEditor(source) {
  const editor = document.getElementById("recipient-editor");
  if (!editor) return;
  const isExisting = source === "custom" && state.deliveryRecipient;
  const billingAddress = source === "billing" ? addressFrom("billing") : null;
  const recipient = isExisting ? state.deliveryRecipient : null;
  document.getElementById("recipient-editor-title").textContent = source === "new" ? "Add new recipient" : "Modify recipient";
  setRecipientField("recipient-first-name", recipient ? recipient.firstName : (source === "billing" ? state.firstName : ""));
  setRecipientField("recipient-last-name", recipient ? recipient.lastName : (source === "billing" ? state.lastName : ""));
  setRecipientField("recipient-phone-code", recipient ? recipient.phoneCode : state.phoneCode);
  setRecipientField("recipient-phone", recipient ? recipient.phoneNumber : (source === "billing" ? state.phone : ""));
  setRecipientField("recipient-country", recipient ? recipient.address.country : (billingAddress ? billingAddress.country : "Singapore"));
  setRecipientField("recipient-state", recipient ? recipient.address.state : (billingAddress ? billingAddress.state : ""));
  setRecipientField("recipient-city", recipient ? recipient.address.city : (billingAddress ? billingAddress.city : ""));
  setRecipientField("recipient-postal", recipient ? recipient.address.postalCode : (billingAddress ? billingAddress.postalCode : ""));
  setRecipientField("recipient-address-1", recipient ? recipient.address.address : (billingAddress ? billingAddress.address : ""));
  setRecipientField("recipient-address-2", recipient ? recipient.address.addressLine2 : "");
  editor.hidden = false;
  document.getElementById("recipient-first-name").focus();
}

function saveRecipient() {
  const requiredIds = ["recipient-first-name", "recipient-last-name", "recipient-phone", "recipient-state", "recipient-city", "recipient-postal", "recipient-address-1"];
  const missing = requiredIds.find(function (id) { return !document.getElementById(id).value.trim(); });
  if (missing) {
    document.getElementById(missing).focus();
    showToast("Recipient details required", "Complete all required recipient and address fields.");
    return;
  }
  const phoneCode = document.getElementById("recipient-phone-code").value;
  const phoneNumber = document.getElementById("recipient-phone").value.trim();
  state.deliveryRecipient = {
    firstName: document.getElementById("recipient-first-name").value.trim(),
    lastName: document.getElementById("recipient-last-name").value.trim(),
    phoneCode: phoneCode,
    phoneNumber: phoneNumber,
    phone: phoneCode + phoneNumber.replace(/\s/g, ""),
    address: {
      country: document.getElementById("recipient-country").value,
      state: document.getElementById("recipient-state").value.trim(),
      city: document.getElementById("recipient-city").value.trim(),
      address: document.getElementById("recipient-address-1").value.trim(),
      addressLine2: document.getElementById("recipient-address-2").value.trim(),
      postalCode: document.getElementById("recipient-postal").value.trim(),
    },
  };
  state.deliveryRecipientSelection = "custom";
  document.getElementById("recipient-editor").hidden = true;
  renderRecipientOptions();
  showToast("Recipient saved", "The new delivery recipient is selected.");
}

function updatePasswordMeter() {
  const meter = document.querySelector(".password-meter");
  if (!meter) return;
  meter.className = "password-meter strength-" + passwordStrength(state.password);
}

function renderCountrySelection() {
  document.querySelectorAll("[data-country]").forEach(function (card) {
    card.classList.toggle("selected", card.dataset.country === state.country);
  });
}

function setLiveStep(activeIndex) {
  document.querySelectorAll("[data-live-step]").forEach(function (element, index) {
    element.classList.toggle("active", index === activeIndex);
    element.classList.toggle("done", index < activeIndex);
    const number = element.querySelector("span");
    if (number) number.textContent = index < activeIndex ? "✓" : String(index + 1);
  });
}

function showSumsubError(message) {
  const error = document.getElementById("sumsub-error");
  if (error) {
    error.hidden = false;
    error.textContent = message;
  }
}

async function prepareSumsub() {
  renderCountrySelection();
  const status = document.getElementById("sumsub-config-status");
  const button = document.getElementById("start-sumsub");
  const mode = document.getElementById("sumsub-mode");
  try {
    const response = await fetch("/api/config", { cache: "no-store" });
    const config = await response.json();
    state.sumsubConfigured = Boolean(config.configured);
    if (mode) mode.textContent = config.configured ? "Sandbox configured" : "Setup required";
    if (status) {
      status.querySelector(".status-dot").className = "status-dot " + (config.configured ? "ready" : "waiting");
      status.querySelector("strong").textContent = config.configured
        ? "Sumsub Sandbox is connected"
        : "Sumsub Sandbox credentials required";
      status.querySelector("small").textContent = config.configured
        ? "Verification level: " + config.levelName
        : "Add the three values to demo/.env.local, then restart the demo server.";
    }
    if (button) button.disabled = !config.configured;
  } catch (error) {
    if (mode) mode.textContent = "Server unavailable";
    showSumsubError("Start the demo with server.py so the secure Sumsub token endpoint is available.");
  }
}

async function requestSumsubToken() {
  const response = await fetch("/api/sumsub/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: state.email,
      phone: state.phoneCode + state.phone.replace(/\s/g, ""),
      externalUserId: state.externalUserId,
    }),
  });
  const payload = await response.json();
  if (!response.ok || !payload.token) {
    throw new Error(payload.error || "Unable to create a Sumsub access token.");
  }
  return payload;
}

function setSdkEvent(message) {
  const event = document.getElementById("sumsub-event");
  if (event) event.textContent = message;
}

function handleSumsubStatus(payload) {
  if (!payload) return;
  const reviewStatus = payload.reviewStatus || "";
  const answer = payload.reviewResult && payload.reviewResult.reviewAnswer;
  if (reviewStatus === "completed" && answer === "GREEN") {
    setLiveStep(3);
    setSdkEvent("Verification approved. Retrieving Sumsub document data and creating the VCCHUB cardholder…");
    completeVerifiedApplicant();
  } else if (reviewStatus === "completed" && answer === "RED") {
    setLiveStep(3);
    setSdkEvent("Sumsub returned a RED result. Review the rejection details in the SDK.");
    document.getElementById("check-status").hidden = false;
  } else if (reviewStatus === "pending") {
    setLiveStep(3);
    setSdkEvent("Documents submitted. Waiting for the sandbox review result…");
    document.getElementById("check-status").hidden = false;
  }
}

async function completeVerifiedApplicant() {
  if (state.completingKyc || state.cardholderId) return;
  state.completingKyc = true;
  try {
    const params = new URLSearchParams({ externalUserId: state.externalUserId });
    if (state.applicantId) params.set("applicantId", state.applicantId);
    const response = await fetch("/api/sumsub/applicant?" + params.toString(), { cache: "no-store" });
    const applicant = await response.json();
    if (!response.ok) throw new Error(applicant.error || "Unable to retrieve the verified Sumsub applicant.");
    const missing = ["firstName", "lastName", "dob"].filter(function (field) { return !applicant[field]; });
    if (missing.length) {
      throw new Error("Sumsub did not return all required cardholder fields: " + missing.join(", ") + ". Check the level’s document extraction settings.");
    }
    state.applicantId = applicant.applicantId || state.applicantId;
    state.firstName = applicant.firstName;
    state.lastName = applicant.lastName;
    state.dob = applicant.dob;
    const account = await postJson("/api/vcchub/cardholders", {
      externalUserId: state.externalUserId,
      applicantId: state.applicantId,
      firstName: state.firstName,
      lastName: state.lastName,
      dob: state.dob,
      email: state.email,
      phone: state.phoneCode + state.phone.replace(/\s/g, ""),
      source: applicant.source,
    });
    syncAccountPayload(account);
    state.stage = "success";
    state.completingKyc = false;
    render();
    showToast("Cardholder created", "Verified Sumsub identity data created a zero-balance VCCHUB wallet.");
  } catch (error) {
    state.completingKyc = false;
    setSdkEvent(error.message);
    const statusButton = document.getElementById("check-status");
    if (statusButton) statusButton.hidden = false;
  }
}

async function launchSumsub() {
  if (!state.sumsubConfigured) {
    showSumsubError("Configure the Sumsub Sandbox credentials first.");
    return;
  }
  if (!window.snsWebSdk) {
    showSumsubError("The Sumsub WebSDK could not be loaded. Check the network connection and reload.");
    return;
  }
  const button = document.getElementById("start-sumsub");
  button.disabled = true;
  button.textContent = "Creating secure session…";
  setLiveStep(1);
  try {
    const access = await requestSumsubToken();
    document.getElementById("sumsub-setup").hidden = true;
    document.getElementById("sumsub-session").hidden = false;
    state.sumsubStarted = true;
    setLiveStep(2);
    const sdk = window.snsWebSdk
      .init(access.token, function () {
        return requestSumsubToken().then(function (next) {
          return next.token;
        });
      })
      .withConf({
        lang: state.country === "CHN" ? "zh" : "en",
        country: state.country,
        theme: "light",
      })
      .withOptions({ addViewportTag: false, adaptIframeHeight: true })
      .on("idCheck.onReady", function () {
        setSdkEvent("Sumsub Sandbox is ready.");
      })
      .on("idCheck.onApplicantLoaded", function (payload) {
        state.applicantId = payload && payload.applicantId ? payload.applicantId : "";
        setSdkEvent("Applicant loaded. Complete the checks below.");
      })
      .on("idCheck.onApplicantSubmitted", function () {
        setLiveStep(3);
        setSdkEvent("Documents submitted. Waiting for the sandbox review result…");
        document.getElementById("check-status").hidden = false;
      })
      .on("idCheck.onApplicantStatusChanged", handleSumsubStatus)
      .on("idCheck.onApplicantVerificationCompleted", handleSumsubStatus)
      .on("idCheck.onError", function (error) {
        setSdkEvent("Sumsub error: " + (error && (error.error || error.code) ? error.error || error.code : "Unknown error"));
      })
      .build();
    sdk.launch("#sumsub-websdk-container");
  } catch (error) {
    setLiveStep(0);
    button.disabled = false;
    button.textContent = "Start Sumsub Sandbox verification →";
    showSumsubError(error.message);
  }
}

async function checkSumsubStatus() {
  if (!state.applicantId) {
    setSdkEvent("Applicant ID is not available yet. Complete the current SDK step first.");
    return;
  }
  setSdkEvent("Checking the latest Sumsub review status…");
  try {
    const response = await fetch("/api/sumsub/status?applicantId=" + encodeURIComponent(state.applicantId), { cache: "no-store" });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "Status check failed.");
    handleSumsubStatus(payload);
    if (payload.reviewStatus !== "completed") {
      setSdkEvent("Current Sumsub status: " + (payload.reviewStatus || "unknown") + ".");
    }
  } catch (error) {
    setSdkEvent(error.message);
  }
}

function collectRegistration() {
  state.username = state.email;
  state.phoneCode = document.getElementById("phone-code").value;
  state.phone = document.getElementById("phone").value.trim();
  state.password = document.getElementById("password").value;
  state.confirmPassword = document.getElementById("confirm-password").value;
  state.terms = document.getElementById("terms").checked;
}

function validateRegistration() {
  const errors = {};
  if (state.username !== state.email || !state.username.includes("@")) errors.username = "Username must match the confirmed email address.";
  if (state.phone.replace(/\D/g, "").length < 7) errors.phone = "Enter a valid phone number.";
  if (passwordStrength(state.password) < 3) errors.password = "Use 8+ characters with upper and lowercase letters and a number.";
  if (state.confirmPassword !== state.password) errors.confirmPassword = "Passwords do not match.";
  if (!state.terms) errors.terms = "Please accept the agreements to continue.";
  state.errors = errors;
  return Object.keys(errors).length === 0;
}

document.addEventListener("input", function (event) {
  if (event.target.id === "password") {
    state.password = event.target.value;
    updatePasswordMeter();
  } else if (event.target.id === "twofa-code") {
    event.target.value = event.target.value.replace(/\D/g, "").slice(0, 6);
    state.twoFactorCode = event.target.value;
    const error = document.getElementById("twofa-error");
    if (error) error.textContent = "";
  }
});

document.addEventListener("submit", async function (event) {
  if (event.target.id === "registration-form") {
    event.preventDefault();
    collectRegistration();
    if (!validateRegistration()) {
      render();
      showToast("Check your details", "A few required fields need attention.");
      return;
    }
    state.stage = "kyc";
    state.kycStep = 0;
    render();
    showToast("Account created", "Starting secure identity verification.");
  }
  if (event.target.id === "login-form") {
    event.preventDefault();
    const loginUsername = document.getElementById("login-email").value.trim();
    const loginPassword = document.getElementById("login-password").value;
    if (loginUsername.toLowerCase() !== state.username.toLowerCase()) {
      showToast("Login failed", "Use the email address registered as your VCCHUB username.");
      return;
    }
    if (state.password && loginPassword !== state.password) {
      showToast("Login failed", "The password does not match the registered VCCHUB account.");
      return;
    }
    state.authMethod = "password";
    state.twoFactorCode = "";
    state.stage = "twofa";
    render();
    showToast("Password accepted", "Complete two-factor verification to continue.");
  }
  if (event.target.id === "twofa-form") {
    event.preventDefault();
    const code = document.getElementById("twofa-code").value.replace(/\D/g, "");
    state.twoFactorCode = code;
    if (code !== "123456") {
      document.getElementById("twofa-error").textContent = "The verification code is incorrect. Please try again.";
      document.getElementById("twofa-code").focus();
      return;
    }
    state.stage = "wallet";
    state.walletView = "overview";
    render();
    showToast("2FA verified", "Welcome to your secure VCCHUB wallet.");
  }
  if (event.target.id === "card-form") {
    event.preventDefault();
    const submit = event.target.querySelector('[type="submit"]');
    submit.disabled = true;
    submit.textContent = "Creating card…";
    try {
      const cardType = document.querySelector('input[name="card-type"]:checked').value;
      const billingAddress = addressFrom("billing");
      const recipientSelection = document.querySelector('input[name="delivery-recipient"]:checked');
      const deliveryRecipient = cardType === "PHYSICAL"
        ? (recipientSelection && recipientSelection.value === "custom" && state.deliveryRecipient
          ? state.deliveryRecipient
          : {
              firstName: state.firstName,
              lastName: state.lastName,
              phone: state.phoneCode + state.phone.replace(/\s/g, ""),
              address: billingAddress,
            })
        : null;
      const deliveryAddress = deliveryRecipient ? deliveryRecipient.address : null;
      const result = await postJson("/api/vcchub/cards", {
        externalUserId: state.externalUserId,
        cardholderId: state.cardholderId,
        walletBalance: state.walletBalance,
        commissionBalance: state.commissionBalance,
        cardholder: {
          firstName: state.firstName,
          lastName: state.lastName,
          dob: state.dob,
          email: state.email,
          phone: state.phoneCode + state.phone.replace(/\s/g, ""),
        },
        cardType: cardType,
        billingAddress: billingAddress,
        deliveryAddress: deliveryAddress,
        deliveryRecipient: deliveryRecipient,
        deliveryAddressConfirmed: cardType !== "PHYSICAL" || document.getElementById("confirm-delivery").checked,
      });
      syncAccountPayload(result);
      state.apiTrace = [
        "VCCHUB validated funded wallet and active cardholder",
        "VCCHUB saved the billing address",
        cardType === "PHYSICAL" ? "VCCHUB confirmed the physical card delivery address" : "VCCHUB prepared instant virtual card issuance",
        "VCCHUB created the " + cardType.toLowerCase() + " card",
      ];
      state.walletView = "overview";
      render();
      showToast(cardType === "PHYSICAL" ? "Physical card ordered" : "Virtual card created", cardType === "PHYSICAL" ? "The card is active and its delivery address has been confirmed." : "The new card is active with a card balance of SGD 0.00.");
    } catch (error) {
      submit.disabled = false;
      submit.textContent = "Create card →";
      showToast("Card creation failed", error.message);
    }
  }
});

document.addEventListener("click", async function (event) {
  const target = event.target.closest("[data-action], [data-jump], [data-country], [data-document]");
  if (!target) return;

  if (target.dataset.jump) {
    event.preventDefault();
    state.modalOpen = false;
    state.topupOpen = false;
    state.stage = target.dataset.jump;
    if (state.stage === "kyc") state.kycStep = 0;
    render();
    return;
  }
  if (target.dataset.country) {
    state.country = target.dataset.country;
    state.documentType = "NATIONAL_ID";
    renderCountrySelection();
    return;
  }

  const action = target.dataset.action;
  if (action === "add-recipient") {
    openRecipientEditor("new");
  } else if (action === "modify-billing-recipient") {
    openRecipientEditor("billing");
  } else if (action === "edit-recipient") {
    openRecipientEditor("custom");
  } else if (action === "save-recipient") {
    saveRecipient();
  } else if (action === "cancel-recipient-edit") {
    const editor = document.getElementById("recipient-editor");
    if (editor) editor.hidden = true;
  } else if (action === "activate") {
    state.modalOpen = true;
    render();
  } else if (action === "close-modal") {
    state.modalOpen = false;
    render();
  } else if (action === "backdrop-close" && event.target === target) {
    state.modalOpen = false;
    state.topupOpen = false;
    render();
  } else if (action === "send-invite") {
    const input = document.getElementById("wallet-email");
    const value = input.value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      document.getElementById("email-error").textContent = "Enter a valid email address.";
      input.focus();
      return;
    }
    state.email = value;
    state.username = value;
    state.modalOpen = false;
    state.stage = "sending";
    render();
  } else if (action === "open-registration") {
    state.stage = "registration";
    render();
  } else if (action === "show-why") {
    showToast("Why activate?", "Unlock multicurrency balances, virtual cards, and secure SSO access.");
  } else if (action === "prevent") {
    event.preventDefault();
    showToast("Demo document", "The legal document would open here in production.");
  } else if (action === "start-sumsub") {
    await launchSumsub();
  } else if (action === "check-sumsub-status") {
    await checkSumsubStatus();
  } else if (action === "return-olly") {
    state.stage = "returning";
    render();
  } else if (action === "direct-login") {
    state.stage = "login";
    render();
  } else if (action === "open-sso") {
    state.authMethod = "sso";
    state.twoFactorCode = "";
    state.stage = "twofa";
    render();
    showToast("SSO connection verified", "Complete two-factor verification to open the wallet.");
  } else if (action === "resend-2fa") {
    state.twoFactorCode = "";
    const codeInput = document.getElementById("twofa-code");
    if (codeInput) {
      codeInput.value = "";
      codeInput.focus();
    }
    showToast("Code sent", "A new verification code has been sent to your registered email address.");
  } else if (action === "back-twofa") {
    state.twoFactorCode = "";
    state.stage = state.authMethod === "password" ? "login" : "returning";
    render();
  } else if (action === "open-topup") {
    state.topupOpen = true;
    render();
  } else if (action === "close-topup") {
    state.topupOpen = false;
    render();
  } else if (action === "confirm-topup") {
    const input = document.getElementById("topup-amount");
    const amount = Number(input.value);
    const error = document.getElementById("topup-error");
    if (!Number.isFinite(amount) || amount <= 0) {
      error.textContent = "Enter an amount greater than zero.";
      return;
    }
    target.disabled = true;
    target.textContent = "Checking Ollylife balance…";
    try {
      const result = await postJson("/api/ollylife/topups", {
        externalUserId: state.externalUserId,
        amount: amount,
        commissionBalance: state.commissionBalance,
        walletBalance: state.walletBalance,
        cards: state.cards,
        cardholder: state.cardholderId ? {
          id: state.cardholderId,
          firstName: state.firstName,
          lastName: state.lastName,
          dob: state.dob,
          email: state.email,
          phone: state.phoneCode + state.phone.replace(/\s/g, ""),
        } : null,
      });
      syncAccountPayload(result);
      state.apiTrace = result.apiTrace || [];
      state.topupOpen = false;
      render();
      showToast("Wallet topped up", formatMoney(amount) + " was moved from Ollylife commission to VCCHUB.");
    } catch (requestError) {
      target.disabled = false;
      target.textContent = "Check balance & top up →";
      error.textContent = requestError.message;
    }
  } else if (action === "add-card") {
    if (!state.cardholderId) {
      showToast("Cardholder required", "Complete the live Sumsub verification before creating a card.");
    } else if (state.walletBalance <= 0) {
      showToast("Top up required", "Add funds from the Ollylife commission balance first.");
    } else if (state.cards.length) {
      showToast("Card already created", "This demo wallet already has an active card.");
    } else {
      state.walletView = "card-form";
      render();
    }
  } else if (action === "cancel-card") {
    state.walletView = "overview";
    render();
  } else if (action === "reset-demo") {
    const previousUserId = state.externalUserId;
    try {
      await postJson("/api/demo/reset", { externalUserId: previousUserId });
    } catch (error) {
      // Resetting the browser state is still safe if the local demo API is unavailable.
    }
    state = initialState();
    render();
    showToast("Demo reset", "The wallet journey is ready to present again.");
  }
});

document.addEventListener("change", function (event) {
  if (event.target.name === "card-type") {
    updateCardTypeForm();
  } else if (event.target.name === "delivery-recipient") {
    state.deliveryRecipientSelection = event.target.value;
  }
});

document.addEventListener("keydown", function (event) {
  if (event.key === "Escape" && (state.modalOpen || state.topupOpen)) {
    state.modalOpen = false;
    state.topupOpen = false;
    render();
  }
});

render();
