const app = document.getElementById("app");
const toastRegion = document.getElementById("toast-region");

function initialState(version) {
  const selectedVersion = version === "v2" ? "v2" : "v1";
  return {
    version: selectedVersion,
    stage: selectedVersion === "v2" ? "v2-auth" : "portal",
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
    verifiedCountry: "",
    applicantId: "",
    externalUserId: "ollylife-demo-" + crypto.randomUUID(),
    firstName: "",
    lastName: "",
    dob: "",
    cardholderId: "",
    walletBalance: 0,
    commissionBalance: 3250,
    cardLimit: 2,
    cards: [],
    transactions: [],
    deliveryRecipient: null,
    deliveryRecipientSelection: "billing",
    apiTrace: [],
    topupOpen: false,
    cardTopupOpen: false,
    cardCancelOpen: false,
    cardActionMenuOpen: false,
    selectedCardId: "",
    walletView: "overview",
    authMethod: "sso",
    twoFactorCode: "",
    completingKyc: false,
    memberVerified: false,
    memberId: "",
    memberFullName: "",
    memberOtpSent: false,
    memberOtpRequestId: "",
    memberOtpCode: "",
    registeredAddress: {
      country: "",
      state: "",
      city: "",
      addressLine1: "",
      addressLine2: "",
      postalCode: "",
    },
    accountReady: false,
    topupRequest: null,
    sumsubConfigured: false,
    sumsubLaunching: false,
    sumsubStarted: false,
    timer: null,
  };
}

let state = initialState("v1");

const countryDirectory = [
  ["Afghanistan", "+93"], ["Albania", "+355"], ["Algeria", "+213"], ["Andorra", "+376"], ["Angola", "+244"],
  ["Argentina", "+54"], ["Armenia", "+374"], ["Australia", "+61"], ["Austria", "+43"], ["Azerbaijan", "+994"],
  ["Bahrain", "+973"], ["Bangladesh", "+880"], ["Belarus", "+375"], ["Belgium", "+32"], ["Belize", "+501"],
  ["Bhutan", "+975"], ["Bolivia", "+591"], ["Bosnia and Herzegovina", "+387"], ["Botswana", "+267"], ["Brazil", "+55"],
  ["Brunei", "+673"], ["Bulgaria", "+359"], ["Cambodia", "+855"], ["Cameroon", "+237"], ["Canada", "+1"],
  ["Chile", "+56"], ["China", "+86"], ["Colombia", "+57"], ["Costa Rica", "+506"], ["Croatia", "+385"],
  ["Cyprus", "+357"], ["Czech Republic", "+420"], ["Denmark", "+45"], ["Dominican Republic", "+1"], ["Ecuador", "+593"],
  ["Egypt", "+20"], ["Estonia", "+372"], ["Ethiopia", "+251"], ["Fiji", "+679"], ["Finland", "+358"],
  ["France", "+33"], ["Georgia", "+995"], ["Germany", "+49"], ["Ghana", "+233"], ["Greece", "+30"],
  ["Hong Kong", "+852"], ["Hungary", "+36"], ["Iceland", "+354"], ["India", "+91"], ["Indonesia", "+62"],
  ["Iran", "+98"], ["Iraq", "+964"], ["Ireland", "+353"], ["Israel", "+972"], ["Italy", "+39"],
  ["Japan", "+81"], ["Jordan", "+962"], ["Kazakhstan", "+7"], ["Kenya", "+254"], ["Kuwait", "+965"],
  ["Kyrgyzstan", "+996"], ["Laos", "+856"], ["Latvia", "+371"], ["Lebanon", "+961"], ["Lithuania", "+370"],
  ["Luxembourg", "+352"], ["Macao", "+853"], ["Malaysia", "+60"], ["Maldives", "+960"], ["Malta", "+356"],
  ["Mauritius", "+230"], ["Mexico", "+52"], ["Moldova", "+373"], ["Monaco", "+377"], ["Mongolia", "+976"],
  ["Morocco", "+212"], ["Myanmar", "+95"], ["Nepal", "+977"], ["Netherlands", "+31"], ["New Zealand", "+64"],
  ["Nigeria", "+234"], ["North Macedonia", "+389"], ["Norway", "+47"], ["Oman", "+968"], ["Pakistan", "+92"],
  ["Panama", "+507"], ["Papua New Guinea", "+675"], ["Paraguay", "+595"], ["Peru", "+51"], ["Philippines", "+63"],
  ["Poland", "+48"], ["Portugal", "+351"], ["Qatar", "+974"], ["Romania", "+40"], ["Russia", "+7"],
  ["Saudi Arabia", "+966"], ["Serbia", "+381"], ["Singapore", "+65"], ["Slovakia", "+421"], ["Slovenia", "+386"],
  ["South Africa", "+27"], ["South Korea", "+82"], ["Spain", "+34"], ["Sri Lanka", "+94"], ["Sweden", "+46"],
  ["Switzerland", "+41"], ["Taiwan", "+886"], ["Tajikistan", "+992"], ["Thailand", "+66"], ["Türkiye", "+90"],
  ["Ukraine", "+380"], ["United Arab Emirates", "+971"], ["United Kingdom", "+44"], ["United States", "+1"], ["Uruguay", "+598"],
  ["Uzbekistan", "+998"], ["Venezuela", "+58"], ["Vietnam", "+84"], ["Zambia", "+260"], ["Zimbabwe", "+263"]
];

const v2ProgrammeFees = {
  currency: "SGD",
  minimumInitialCardBalance: 20,
  cardCreation: {
    VIRTUAL: 10,
    PHYSICAL: 10,
  },
};

function populateRegistrationLookups() {
  const phoneCodes = document.getElementById("phone-code-v2");
  const countries = document.getElementById("registration-country");
  if (phoneCodes) {
    countryDirectory.forEach(function (entry) {
      const option = document.createElement("option");
      option.value = entry[1];
      option.textContent = entry[1] + " · " + entry[0];
      phoneCodes.appendChild(option);
    });
  }
  if (countries) {
    countryDirectory.forEach(function (entry) {
      const option = document.createElement("option");
      option.value = entry[0];
      option.textContent = entry[0];
      countries.appendChild(option);
    });
  }
}

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

const v1Journey = [
  ["1. OlyLife", "portal"],
  ["2. Invite", "inbox"],
  ["3. Register", "registration"],
  ["4. Verify", "kyc"],
  ["5. Ready", "success"],
  ["6. SSO", "returning"],
];

const v2Journey = [
  ["1. VCCHUB", "v2-auth"],
  ["2. Member check", "v2-member-check"],
  ["3. Register", "registration"],
  ["4. Verify", "kyc"],
  ["5. Ready", "v2-success"],
  ["6. OlyLife top up", "v2-topup"],
];

function activeJourney() {
  return state.version === "v2" ? v2Journey : v1Journey;
}

function currentJourneyRank() {
  if (state.version === "v1") return stageRank[state.stage] || 0;
  const v2Ranks = {
    "v2-auth": 0,
    "v2-member-check": 1,
    registration: 2,
    kyc: 3,
    "v2-success": 4,
    login: 4,
    twofa: 4,
    wallet: 4,
    "v2-topup": 5,
  };
  return v2Ranks[state.stage] || 0;
}

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
  const rank = currentJourneyRank();
  const journey = activeJourney();
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
    '<div class="version-switch" aria-label="Demo version"><button data-version="v1" class="' + (state.version === "v1" ? "active" : "") + '">V1</button><button data-version="v2" class="' + (state.version === "v2" ? "active" : "") + '">V2</button></div>' +
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
  if (typeof payload.cardLimit === "number") state.cardLimit = payload.cardLimit;
  if (payload.card && payload.card.id) state.selectedCardId = payload.card.id;
  if (payload.cardholder) {
    state.cardholderId = payload.cardholder.id || state.cardholderId;
    state.firstName = payload.cardholder.firstName || state.firstName;
    state.lastName = payload.cardholder.lastName || state.lastName;
    state.dob = payload.cardholder.dob || state.dob;
    state.memberId = payload.cardholder.memberId || state.memberId;
    if (payload.cardholder.registeredAddress) state.registeredAddress = payload.cardholder.registeredAddress;
  }
}

function activeCards() {
  return state.cards.filter(function (card) { return card.status !== "CANCELLED"; });
}

function selectedCard() {
  return state.cards.find(function (card) { return card.id === state.selectedCardId; })
    || activeCards()[0]
    || state.cards[0]
    || null;
}

function selectCardFromTarget(target) {
  if (target && target.dataset.cardId) state.selectedCardId = target.dataset.cardId;
  return selectedCard();
}

function fillDynamicAccountData() {
  const activeCardCount = activeCards().length;
  const availableCardSlots = Math.max(0, state.cardLimit - activeCardCount);
  fillAll("[data-wallet-balance]", formatMoney(state.walletBalance));
  fillAll("[data-commission-balance]", formatMoney(state.commissionBalance));
  fillAll("[data-card-balance]", formatMoney(state.cards.reduce(function (total, card) { return total + Number(card.balance || 0); }, 0)));
  fillAll("[data-card-slots]", String(availableCardSlots) + " of " + String(state.cardLimit));
  fillAll("[data-active-card-count]", String(activeCardCount));
  fillAll("[data-first-name]", state.firstName || "Pending live verification");
  fillAll("[data-last-name]", state.lastName || "Pending live verification");
  fillAll("[data-dob]", state.dob || "Pending live verification");
  fillAll("[data-cardholder-id]", state.cardholderId || "Pending");
  fillAll("[data-member-id]", state.memberId || "Pending");
  fillAll("[data-cardholder-name]", ((state.firstName + " " + state.lastName).trim() || "—"));
  const currentCard = selectedCard();
  fillAll("[data-card-last4]", currentCard ? currentCard.last4 : "—");
  fillAll("[data-card-type]", currentCard ? (currentCard.type === "PHYSICAL" ? "Physical" : "Virtual") : "—");
  fillAll("[data-selected-card-balance]", formatMoney(currentCard ? Number(currentCard.balance || 0) : 0));
  document.querySelectorAll("[data-card-status]").forEach(function (element) {
    const isCancelled = currentCard && currentCard.status === "CANCELLED";
    element.className = isCancelled ? "event-cancelled" : "event-ok";
    element.textContent = isCancelled ? "● Cancelled" : "● Active";
  });
  document.querySelectorAll("[data-first-name-value]").forEach(function (input) { input.value = state.firstName; });
  document.querySelectorAll("[data-last-name-value]").forEach(function (input) { input.value = state.lastName; });
  document.querySelectorAll("[data-dob-value]").forEach(function (input) { input.value = state.dob; });
  document.querySelectorAll("[data-phone-value]").forEach(function (input) { input.value = state.phoneCode + state.phone.replace(/\s/g, ""); });
  document.querySelectorAll("[data-member-id-value]").forEach(function (input) { input.value = state.memberId; });
  document.querySelectorAll("[data-member-full-name-value]").forEach(function (input) { input.value = state.memberFullName; });
  document.querySelectorAll("[data-member-first-name-value]").forEach(function (input) { input.value = state.firstName; });
  document.querySelectorAll("[data-member-last-name-value]").forEach(function (input) { input.value = state.lastName; });
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
    const activeCardCount = state.cards.filter(function (card) { return card.status !== "CANCELLED"; }).length;
    fillAll("[data-wallet-count]", state.stage === "returning" ? String(activeCardCount) : "—");
    fillAll("[data-wallet-note]", state.stage === "returning" ? (activeCardCount ? String(activeCardCount) + " active card" + (activeCardCount === 1 ? "" : "s") : "Top up before creating a card") : "Activate to unlock");
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
    populateRegistrationLookups();
    state.username = state.email;
    document.getElementById("username").value = state.email;
    const v1PhoneCode = document.getElementById("phone-code-v1");
    const v2PhoneCode = document.getElementById("phone-code-v2");
    v1PhoneCode.hidden = state.version === "v2";
    v2PhoneCode.hidden = state.version !== "v2";
    (state.version === "v2" ? v2PhoneCode : v1PhoneCode).value = state.phoneCode;
    document.getElementById("phone").value = state.phone;
    document.getElementById("password").value = state.password;
    document.getElementById("confirm-password").value = state.confirmPassword;
    document.getElementById("terms").checked = state.terms;
    Object.keys(state.errors).forEach(function (key) {
      const error = document.querySelector('[data-error="' + key + '"]');
      if (error) error.textContent = state.errors[key];
    });
    if (state.version === "v2") {
      const subtitle = document.querySelector("[data-registration-subtitle]");
      const context = document.querySelector("[data-registration-context]");
      const usernameHelp = document.querySelector("[data-username-help]");
      const emailHelp = document.querySelector("[data-email-help]");
      document.querySelectorAll("[data-v2-registration]").forEach(function (element) { element.hidden = false; });
      if (subtitle) subtitle.textContent = "OlyLife has confirmed this member email. Complete the VCCHUB account details below to continue.";
      if (context) context.textContent = "Wallet information";
      if (usernameHelp) usernameHelp.textContent = "Your VCCHUB username is the email address confirmed by OlyLife.";
      if (emailHelp) emailHelp.textContent = "Locked to the email address verified with OlyLife.";
      document.getElementById("registration-country").value = state.registeredAddress.country;
      document.getElementById("registration-state").value = state.registeredAddress.state;
      document.getElementById("registration-city").value = state.registeredAddress.city;
      document.getElementById("registration-postal").value = state.registeredAddress.postalCode;
      document.getElementById("registration-address-1").value = state.registeredAddress.addressLine1;
      document.getElementById("registration-address-2").value = state.registeredAddress.addressLine2;
      fillAll("[data-ready-step-copy]", "Ready to sign in");
    }
    updatePasswordMeter();
  }

  if (state.stage === "kyc") {
    if (state.version === "v2") fillAll("[data-ready-step-copy]", "Ready to sign in");
    prepareSumsub();
  }

  if (state.stage === "twofa") {
    fillAll("[data-twofa-method]", state.authMethod === "sso" ? "OlyLife secure SSO" : "Direct VCCHUB login");
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
    if (state.cardTopupOpen) {
      app.appendChild(document.getElementById("card-topup-drawer-template").content.cloneNode(true));
      fillDynamicAccountData();
    }
    if (state.cardCancelOpen) {
      app.appendChild(document.getElementById("card-cancel-modal-template").content.cloneNode(true));
      fillDynamicAccountData();
      setTimeout(function () {
        const firstDigit = document.querySelector("[data-cancel-2fa]");
        if (firstDigit) firstDigit.focus();
      }, 0);
    }
  }

  if (state.stage === "v2-member-check") {
    const emailForm = document.getElementById("v2-member-form");
    const otpForm = document.getElementById("v2-member-otp-form");
    const email = document.getElementById("v2-member-email");
    const otp = document.getElementById("v2-member-otp");
    if (emailForm) emailForm.hidden = state.memberOtpSent;
    if (otpForm) otpForm.hidden = !state.memberOtpSent;
    fillAll("[data-member-otp-email]", state.email);
    if (email) email.value = state.email;
    if (otp) otp.value = state.memberOtpCode;
    setTimeout(function () {
      if (state.memberOtpSent && otp) otp.focus();
      else if (email) email.focus();
    }, 0);
  }

  if (state.stage === "v2-topup") {
    fillAll("[data-wallet-card-count]", String(state.cards.filter(function (card) { return card.status !== "CANCELLED"; }).length));
    const request = state.topupRequest;
    const requestForm = document.querySelector("[data-topup-request-form]");
    const submitted = document.querySelector("[data-topup-submitted]");
    const emptyReview = document.querySelector("[data-approval-empty]");
    const reviewDetails = document.querySelector("[data-approval-details]");
    const reviewActions = document.querySelector("[data-approval-actions]");
    const reviewResult = document.querySelector("[data-approval-result]");
    const newRequest = document.querySelector("[data-approval-new]");
    const badge = document.querySelector("[data-approval-badge]");
    if (requestForm) requestForm.hidden = Boolean(request);
    if (submitted) submitted.hidden = !request || request.status !== "PENDING_APPROVAL";
    if (emptyReview) emptyReview.hidden = Boolean(request);
    if (reviewDetails) reviewDetails.hidden = !request;
    if (request) {
      fillAll("[data-request-id]", request.id);
      fillAll("[data-request-amount]", formatMoney(request.amount));
      fillAll("[data-request-time]", request.requestedAt);
      fillAll("[data-request-reviewer]", request.reviewedBy || "OlyLife Admin / Support");
      if (badge) {
        badge.className = "approval-badge " + request.status.toLowerCase();
        badge.textContent = request.status === "PENDING_APPROVAL" ? "Pending approval" : request.status === "APPROVED" ? "Approved" : "Rejected";
      }
      if (reviewActions) reviewActions.hidden = request.status !== "PENDING_APPROVAL";
      if (newRequest) newRequest.hidden = request.status === "PENDING_APPROVAL";
      if (reviewResult) {
        reviewResult.hidden = request.status === "PENDING_APPROVAL";
        reviewResult.className = "approval-result " + request.status.toLowerCase();
        reviewResult.innerHTML = request.status === "APPROVED"
          ? "<strong>✓ Approved and completed</strong><span>Commission was deducted and the VCCHUB wallet was credited.</span>"
          : "<strong>Request rejected</strong><span>No commission was deducted and the wallet balance was unchanged.</span>";
      }
    } else if (badge) {
      badge.className = "approval-badge waiting";
      badge.textContent = "Waiting for request";
    }
    const trace = document.querySelector("[data-api-trace]");
    if (trace && state.apiTrace.length) {
      trace.hidden = false;
      trace.innerHTML = "<strong>Latest API flow</strong>" + state.apiTrace.map(function (item) { return "<span>✓ " + escapeHtml(item) + "</span>"; }).join("");
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
  const activeCardCount = activeCards().length;
  const availableCardSlots = Math.max(0, state.cardLimit - activeCardCount);
  const addButton = document.getElementById("add-card-button");
  if (addButton) {
    addButton.disabled = state.walletBalance <= 0 || availableCardSlots === 0;
    addButton.textContent = availableCardSlots === 0 ? "Card limit reached" : "＋ Add Card";
  }
  document.querySelectorAll("[data-v1-only]").forEach(function (element) {
    element.hidden = state.version === "v2";
  });
  document.querySelectorAll("[data-v2-only]").forEach(function (element) {
    element.hidden = state.version !== "v2";
  });
  const balanceTiles = document.querySelector(".balance-tiles");
  if (balanceTiles) balanceTiles.classList.toggle("v2-balance-tiles", state.version === "v2");
  const rule = document.getElementById("card-rule");
  if (rule) {
    rule.classList.toggle("ready", state.walletBalance > 0);
    const totalCardBalance = state.cards.reduce(function (total, card) { return total + Number(card.balance || 0); }, 0);
    const lastActionWasCancellation = state.apiTrace.some(function (item) { return item.includes("permanently cancel card"); });
    const currentCard = selectedCard();
    if (lastActionWasCancellation && currentCard && currentCard.status === "CANCELLED") {
      const releasedType = currentCard.type === "PHYSICAL" ? "physical" : "virtual";
      rule.textContent = "Card cancelled. Its remaining balance was returned to the VCCHUB wallet and the " + releasedType + " card slot is available again.";
    } else if (state.cards.length && totalCardBalance > 0) {
      rule.textContent = "Card funded successfully. Use the card action menu to add more funds from the wallet.";
    } else if (state.cards.length) {
      rule.textContent = "Card created successfully. Use the card action menu to assign wallet funds to the card.";
    } else if (state.walletBalance > 0) {
      rule.textContent = "Wallet funded. Card creation is now available.";
    } else {
      rule.textContent = state.version === "v2"
        ? "Wallet top-ups are initiated from OlyLife. Add funds there before creating a card."
        : "Top up the wallet from your OlyLife commission before creating a card.";
    }
  }
  const empty = document.querySelector("[data-empty-cards]");
  if (empty) empty.hidden = state.cards.length > 0;
  const rows = document.querySelector("[data-card-rows]");
  if (rows) {
    rows.innerHTML = state.cards.map(function (card) {
      const isCancelled = card.status === "CANCELLED";
      const cardId = escapeHtml(card.id || "");
      const menuOpen = state.cardActionMenuOpen && state.selectedCardId === card.id;
      const statusClass = isCancelled ? "event-cancelled" : "event-ok";
      const statusText = isCancelled ? "● Cancelled" : "● Active";
      const typeLabel = card.type === "PHYSICAL" ? "Physical" : "Virtual";
      const cardholderName = card.cardholderName || ((state.firstName + " " + state.lastName).trim() || "—");
      return '<div class="console-card-row" data-card-row data-card-id="' + cardId + '">' +
        '<span>' + escapeHtml(cardholderName) + '</span>' +
        '<span>' + typeLabel + '</span>' +
        '<span>•••• <b>' + escapeHtml(card.last4 || "—") + '</b></span>' +
        '<span>' + escapeHtml(card.currency || "SGD") + '</span>' +
        '<span class="' + statusClass + '">' + statusText + '</span>' +
        '<span>' + formatMoney(Number(card.balance || 0)) + '</span>' +
        '<span class="console-card-action">' +
          '<button class="card-more-button" data-action="toggle-card-menu" data-card-id="' + cardId + '" aria-label="Card actions for •••• ' + escapeHtml(card.last4 || "") + '" aria-expanded="' + String(menuOpen) + '">•••</button>' +
          '<span class="card-action-popover" data-card-action-menu' + (menuOpen ? '' : ' hidden') + '>' +
            '<button data-action="view-card" data-card-id="' + cardId + '">View card</button>' +
            '<button data-action="view-card-transactions" data-card-id="' + cardId + '">View transactions</button>' +
            (isCancelled
              ? '<button disabled>Card cancelled</button>'
              : '<button class="primary" data-action="open-card-topup" data-card-id="' + cardId + '">Top up</button>' +
                '<button class="danger" data-action="open-card-cancel" data-card-id="' + cardId + '">Cancel card</button>') +
          '</span>' +
        '</span>' +
      '</div>';
    }).join("");
  }
  const trace = document.querySelector("[data-api-trace]");
  if (trace && state.apiTrace.length) {
    trace.hidden = false;
    trace.innerHTML = "<strong>Latest API flow</strong>" + state.apiTrace.map(function (item) { return "<span>✓ " + escapeHtml(item) + "</span>"; }).join("");
  }
  fillDynamicAccountData();
  configureCardAddressFields();
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

function registeredAddressForApi() {
  const lines = [state.registeredAddress.addressLine1, state.registeredAddress.addressLine2].filter(Boolean);
  return {
    country: state.registeredAddress.country,
    state: state.registeredAddress.state,
    city: state.registeredAddress.city,
    address: lines.join(", "),
    addressLine1: state.registeredAddress.addressLine1,
    addressLine2: state.registeredAddress.addressLine2,
    postalCode: state.registeredAddress.postalCode,
  };
}

function configureCardAddressFields() {
  if (state.walletView !== "card-form") return;
  const isV2 = state.version === "v2";
  const formNote = document.querySelector("[data-card-form-note]");
  if (formNote) formNote.textContent = isV2
    ? "Cardholder and registered address information are carried over automatically. Choose whether to create a virtual or physical card."
    : "Cardholder information came from verified Sumsub document data and VCCHUB registration. Choose a card type and provide the required address details.";
  document.querySelectorAll("[data-v2-cardholder-field]").forEach(function (element) { element.hidden = !isV2; });
  const title = document.querySelector("[data-address-section-title]");
  const copy = document.querySelector("[data-address-section-copy]");
  const fields = {
    "billing-country": state.registeredAddress.country,
    "billing-state": state.registeredAddress.state,
    "billing-city": state.registeredAddress.city,
    "billing-address": [state.registeredAddress.addressLine1, state.registeredAddress.addressLine2].filter(Boolean).join(", "),
    "billing-postal": state.registeredAddress.postalCode,
  };
  if (title) title.textContent = isV2 ? "Registered Address" : "Billing Address";
  if (copy) {
    copy.hidden = !isV2;
    copy.textContent = isV2 ? "Carried over from VCCHUB registration. Contact support if this address needs to be updated." : "";
  }
  Object.keys(fields).forEach(function (id) {
    const input = document.getElementById(id);
    if (!input) return;
    if (isV2) input.value = fields[id];
    input.disabled = isV2 && input.tagName === "SELECT";
    input.readOnly = isV2 && input.tagName !== "SELECT";
  });
  const physicalCopy = document.querySelector("[data-physical-card-copy]");
  if (physicalCopy) physicalCopy.textContent = isV2
    ? "Delivered to the default OlyLife office address held by VCCHUB."
    : "Delivered to an address you confirm below.";
}

function updateCardTypeForm() {
  const usedTypes = new Set(activeCards().map(function (card) { return card.type; }));
  const cardTypeInputs = Array.from(document.querySelectorAll('input[name="card-type"]'));
  cardTypeInputs.forEach(function (input) {
    const unavailable = usedTypes.has(input.value);
    input.disabled = unavailable;
    const option = input.closest(".card-type-option");
    if (option) {
      option.classList.toggle("unavailable", unavailable);
      option.title = unavailable ? "An active " + input.value.toLowerCase() + " card already exists." : "";
    }
  });
  let selected = document.querySelector('input[name="card-type"]:checked');
  if (selected && selected.disabled) {
    selected.checked = false;
    selected = cardTypeInputs.find(function (input) { return !input.disabled; }) || null;
    if (selected) selected.checked = true;
  }
  const deliverySection = document.getElementById("delivery-section");
  const officeSection = document.getElementById("default-office-delivery-section");
  if (!selected || !deliverySection) return;
  const isPhysical = selected.value === "PHYSICAL";
  const confirmDelivery = document.getElementById("confirm-delivery");
  const feeSection = document.querySelector("[data-v2-card-fee]");
  if (feeSection) feeSection.hidden = state.version !== "v2";
  if (state.version === "v2" && selected) {
    const fee = v2ProgrammeFees.cardCreation[selected.value] || 0;
    const initialBalanceInput = document.getElementById("initial-card-balance");
    const initialCardBalance = Math.max(0, Number(initialBalanceInput && initialBalanceInput.value) || 0);
    const requiredWalletBalance = fee + initialCardBalance;
    fillAll("[data-fee-wallet-before]", formatMoney(state.walletBalance));
    fillAll("[data-card-creation-fee]", formatMoney(fee));
    fillAll("[data-fee-wallet-after]", formatMoney(Math.max(0, state.walletBalance - requiredWalletBalance)));
    const calculation = document.querySelector("[data-card-creation-calculation]");
    if (calculation) {
      calculation.textContent = initialCardBalance < v2ProgrammeFees.minimumInitialCardBalance
        ? "Enter an initial card balance of at least " + formatMoney(v2ProgrammeFees.minimumInitialCardBalance) + "."
        : "VCCHUB will deduct " + formatMoney(fee) + " fee plus " + formatMoney(initialCardBalance) + " initial funding from Wallet. Total Wallet deduction: " + formatMoney(requiredWalletBalance) + ".";
    }
  }
  if (state.version === "v2") {
    deliverySection.hidden = true;
    if (officeSection) officeSection.hidden = !isPhysical;
    if (confirmDelivery) confirmDelivery.required = false;
    return;
  }
  if (officeSection) officeSection.hidden = true;
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
  const status = document.getElementById("sumsub-config-status");
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
        : "Add the Sumsub values to the secure server environment.";
    }
    if (config.configured && !state.sumsubStarted && !state.sumsubLaunching) {
      await launchSumsub();
    }
  } catch (error) {
    if (mode) mode.textContent = "Server unavailable";
    showSumsubError("Unable to reach the secure Sumsub configuration endpoint. Reload and try again.");
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
    state.verifiedCountry = applicant.country || "";
    const account = await postJson("/api/vcchub/cardholders", {
      externalUserId: state.externalUserId,
      applicantId: state.applicantId,
      firstName: state.firstName,
      lastName: state.lastName,
      dob: state.dob,
      country: state.verifiedCountry,
      email: state.email,
      phone: state.phoneCode + state.phone.replace(/\s/g, ""),
      memberId: state.memberId,
      registeredAddress: registeredAddressForApi(),
      source: applicant.source,
    });
    syncAccountPayload(account);
    state.accountReady = true;
    state.stage = state.version === "v2" ? "v2-success" : "success";
    state.completingKyc = false;
    render();
    showToast("Wallet account ready", "Verified Sumsub identity data created a zero-balance VCCHUB wallet.");
  } catch (error) {
    state.completingKyc = false;
    setSdkEvent(error.message);
    const statusButton = document.getElementById("check-status");
    if (statusButton) statusButton.hidden = false;
  }
}

async function launchSumsub() {
  if (state.sumsubStarted || state.sumsubLaunching) return;
  if (!state.sumsubConfigured) {
    showSumsubError("Configure the Sumsub Sandbox credentials first.");
    return;
  }
  state.sumsubLaunching = true;
  const setupError = document.getElementById("sumsub-error");
  if (setupError) setupError.hidden = true;
  const retryButton = document.getElementById("retry-sumsub");
  if (retryButton) retryButton.hidden = true;
  const sdkBuilder = await waitForSumsubSdk();
  if (!sdkBuilder) {
    state.sumsubLaunching = false;
    showSumsubError("The Sumsub WebSDK could not be loaded. Check the network connection and reload.");
    const retry = document.getElementById("retry-sumsub");
    if (retry) retry.hidden = false;
    return;
  }
  setLiveStep(1);
  try {
    const access = await requestSumsubToken();
    document.getElementById("sumsub-setup").hidden = true;
    document.getElementById("sumsub-session").hidden = false;
    state.sumsubStarted = true;
    setLiveStep(2);
    const sdk = sdkBuilder
      .init(access.token, function () {
        return requestSumsubToken().then(function (next) {
          return next.token;
        });
      })
      .withConf({
        lang: navigator.language || "en",
        theme: "light",
      })
      .withOptions({ addViewportTag: false, adaptIframeHeight: true })
      .on("idCheck.onReady", function () {
        setSdkEvent("Sumsub Sandbox is ready. Sumsub will collect and verify the document’s issuing country during verification.");
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
    state.sumsubLaunching = false;
  } catch (error) {
    state.sumsubLaunching = false;
    setLiveStep(0);
    const retry = document.getElementById("retry-sumsub");
    if (retry) retry.hidden = false;
    showSumsubError(error.message);
  }
}

async function waitForSumsubSdk() {
  const timeoutAt = Date.now() + 10000;
  while (!window.snsWebSdk && Date.now() < timeoutAt) {
    await new Promise(function (resolve) { setTimeout(resolve, 100); });
  }
  return window.snsWebSdk;
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
  state.phoneCode = document.getElementById(state.version === "v2" ? "phone-code-v2" : "phone-code-v1").value.trim();
  state.phone = document.getElementById("phone").value.trim();
  if (state.version === "v2") {
    state.registeredAddress = {
      country: document.getElementById("registration-country").value.trim(),
      state: document.getElementById("registration-state").value.trim(),
      city: document.getElementById("registration-city").value.trim(),
      postalCode: document.getElementById("registration-postal").value.trim(),
      addressLine1: document.getElementById("registration-address-1").value.trim(),
      addressLine2: document.getElementById("registration-address-2").value.trim(),
    };
  }
  state.password = document.getElementById("password").value;
  state.confirmPassword = document.getElementById("confirm-password").value;
  state.terms = document.getElementById("terms").checked;
}

function validateRegistration() {
  const errors = {};
  if (state.username !== state.email || !state.username.includes("@")) errors.username = "Username must match the confirmed email address.";
  if (!/^\+\d{1,4}$/.test(state.phoneCode) || state.phone.replace(/\D/g, "").length < 7) errors.phone = "Choose a valid country code and enter a valid phone number.";
  if (state.version === "v2") {
    const requiredAddress = ["country", "state", "city", "postalCode", "addressLine1"];
    if (requiredAddress.some(function (field) { return !state.registeredAddress[field]; })) {
      errors.registeredAddress = "Complete all required registered address fields.";
    }
  }
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
  } else if (event.target.id === "v2-member-otp") {
    event.target.value = event.target.value.replace(/\D/g, "").slice(0, 6);
    state.memberOtpCode = event.target.value;
    const error = document.getElementById("v2-member-otp-error");
    if (error) error.textContent = "";
  } else if (event.target.id === "card-topup-amount") {
    const total = document.querySelector("[data-card-topup-total]");
    if (total) total.textContent = formatMoney(Math.max(0, Number(event.target.value) || 0));
    const error = document.getElementById("card-topup-error");
    if (error) error.textContent = "";
  } else if (event.target.id === "initial-card-balance") {
    updateCardTypeForm();
  } else if (event.target.matches("[data-cancel-2fa]")) {
    event.target.value = event.target.value.replace(/\D/g, "").slice(0, 1);
    const error = document.getElementById("card-cancel-error");
    if (error) error.textContent = "";
    if (event.target.value) {
      const inputs = Array.from(document.querySelectorAll("[data-cancel-2fa]"));
      const next = inputs[inputs.indexOf(event.target) + 1];
      if (next) next.focus();
    }
  }
});

document.addEventListener("submit", async function (event) {
  if (event.target.id === "v2-member-form") {
    event.preventDefault();
    const input = document.getElementById("v2-member-email");
    const error = document.getElementById("v2-member-error");
    const submit = event.target.querySelector('[type="submit"]');
    const email = input.value.trim();
    error.textContent = "";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      error.textContent = "Enter a valid email address.";
      input.focus();
      return;
    }
    submit.disabled = true;
    submit.textContent = "Sending verification code…";
    try {
      const payload = await postJson("/api/vcchub/email-otp/request", { email: email, purpose: "WALLET_SIGNUP" });
      state.email = email;
      state.username = email;
      state.memberOtpSent = true;
      state.memberOtpRequestId = payload.requestId;
      state.memberOtpCode = "";
      render();
      showToast("Verification code sent", "Enter the six-digit code sent by VCCHUB. Use 123456 for this demo.");
    } catch (requestError) {
      error.textContent = requestError.message;
      submit.disabled = false;
      submit.textContent = "Send email verification code →";
      input.focus();
    }
  }
  if (event.target.id === "v2-member-otp-form") {
    event.preventDefault();
    const input = document.getElementById("v2-member-otp");
    const error = document.getElementById("v2-member-otp-error");
    const status = document.getElementById("v2-member-status");
    const submit = event.target.querySelector('[type="submit"]');
    const code = input.value.replace(/\D/g, "");
    error.textContent = "";
    status.hidden = true;
    status.className = "member-api-status";
    if (code.length !== 6) {
      error.textContent = "Enter the six-digit verification code.";
      input.focus();
      return;
    }
    submit.disabled = true;
    submit.textContent = "Verifying email…";
    try {
      await postJson("/api/vcchub/email-otp/verify", {
        requestId: state.memberOtpRequestId,
        email: state.email,
        code: code,
        purpose: "WALLET_SIGNUP",
      });
      status.hidden = false;
      status.className = "member-api-status success";
      status.innerHTML = "<strong>✓ Email verified</strong><span>VCCHUB is now checking your membership with OlyLife.</span>";
      submit.textContent = "Checking with OlyLife…";
      const response = await fetch("/api/ollylife/members/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: state.email, requestedBy: "VCCHUB", emailVerified: true }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.exists) throw new Error(payload.error || "We could not find an OlyLife member with this email address.");
      state.email = payload.member.email;
      state.username = payload.member.email;
      state.phoneCode = payload.member.phoneCode || state.phoneCode;
      state.phone = payload.member.phone || state.phone;
      state.memberId = payload.member.id || "";
      state.memberFullName = payload.member.fullName || "";
      state.memberVerified = true;
      status.innerHTML = "<strong>✓ OlyLife member confirmed</strong><span>" + escapeHtml(state.memberId) + " · " + escapeHtml(state.memberFullName) + " · " + escapeHtml(state.email) + "</span>";
      submit.textContent = "Member confirmed";
      setTimeout(function () {
        state.stage = "registration";
        render();
        showToast("Membership confirmed", "Continue creating the VCCHUB wallet account.");
      }, 650);
    } catch (requestError) {
      const isOtpError = /code|expired|request/i.test(requestError.message);
      if (isOtpError) {
        error.textContent = requestError.message;
        input.focus();
      } else {
        status.hidden = false;
        status.className = "member-api-status error";
        status.innerHTML = "<strong>OlyLife member not found</strong><span>" + escapeHtml(requestError.message) + " Re-enter the email or contact OlyLife support.</span>";
      }
      submit.disabled = false;
      submit.textContent = "Verify code & check membership →";
    }
  }
  if (event.target.id === "v2-login-form") {
    event.preventDefault();
    const loginUsername = document.getElementById("v2-login-email").value.trim();
    const loginPassword = document.getElementById("v2-login-password").value;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(loginUsername)) {
      showToast("Sign in failed", "Enter a valid VCCHUB username.");
      return;
    }
    if (state.accountReady && loginUsername.toLowerCase() !== state.username.toLowerCase()) {
      showToast("Sign in failed", "Use the email address registered as your VCCHUB username.");
      return;
    }
    if (state.password && loginPassword !== state.password) {
      showToast("Sign in failed", "The password does not match the registered VCCHUB account.");
      return;
    }
    state.email = loginUsername;
    state.username = loginUsername;
    state.authMethod = "password";
    state.twoFactorCode = "";
    state.stage = "twofa";
    render();
    showToast("Password accepted", "Complete two-factor verification to continue.");
  }
  if (event.target.id === "v2-topup-form") {
    event.preventDefault();
    const amountInput = document.getElementById("v2-topup-amount");
    const consent = document.getElementById("v2-topup-consent");
    const error = document.getElementById("v2-topup-error");
    const submit = event.target.querySelector('[type="submit"]');
    const amount = Number(amountInput.value);
    error.textContent = "";
    if (!Number.isFinite(amount) || amount <= 0) {
      error.textContent = "Enter an amount greater than zero.";
      amountInput.focus();
      return;
    }
    if (amount > state.commissionBalance) {
      error.textContent = "The amount exceeds your available OlyLife commission balance.";
      amountInput.focus();
      return;
    }
    if (!consent.checked) {
      error.textContent = "Confirm the commission deduction to continue.";
      consent.focus();
      return;
    }
    submit.disabled = true;
    submit.textContent = "Submitting for approval…";
    try {
      const result = await postJson("/api/ollylife/topups/requests", {
        externalUserId: state.externalUserId,
        memberId: state.memberId,
        email: state.email,
        amount: amount,
        commissionBalance: state.commissionBalance,
        walletBalance: state.walletBalance,
      });
      state.topupRequest = result.request;
      state.apiTrace = [
        "OlyLife member: top-up request submitted",
        "OlyLife: request placed in Admin / Support approval queue",
        "Commission and wallet balances remain unchanged while pending",
      ];
      render();
      showToast("Approval requested", formatMoney(amount) + " is waiting for OlyLife Admin / Support review.");
    } catch (requestError) {
      submit.disabled = false;
      submit.textContent = "Submit for approval →";
      error.textContent = requestError.message;
    }
  }
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
      const initialCardBalance = state.version === "v2"
        ? Number(document.getElementById("initial-card-balance").value)
        : 0;
      const useDefaultOlyLifeOfficeAddress = state.version === "v2" && cardType === "PHYSICAL";
      const billingAddress = state.version === "v2" ? registeredAddressForApi() : addressFrom("billing");
      const recipientSelection = state.version === "v1" ? document.querySelector('input[name="delivery-recipient"]:checked') : null;
      const deliveryRecipient = cardType === "PHYSICAL" && state.version === "v1"
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
        cards: state.cards,
        cardLimit: state.cardLimit,
        cardholder: {
          firstName: state.firstName,
          lastName: state.lastName,
          dob: state.dob,
          email: state.email,
          phone: state.phoneCode + state.phone.replace(/\s/g, ""),
          memberId: state.memberId,
          registeredAddress: registeredAddressForApi(),
        },
        cardType: cardType,
        billingAddress: billingAddress,
        deliveryAddress: deliveryAddress,
        deliveryRecipient: deliveryRecipient,
        useDefaultOlyLifeOfficeAddress: useDefaultOlyLifeOfficeAddress,
        applyConfiguredWalletFee: state.version === "v2",
        enforceMinimumInitialCardBalance: state.version === "v2",
        initialCardBalance: initialCardBalance,
        deliveryAddressConfirmed: cardType !== "PHYSICAL" || useDefaultOlyLifeOfficeAddress || document.getElementById("confirm-delivery").checked,
      });
      syncAccountPayload(result);
      state.apiTrace = [
        "VCCHUB validated funded wallet and active cardholder",
        state.version === "v2" ? "VCCHUB reused the registered member address" : "VCCHUB saved the billing address",
        cardType === "PHYSICAL"
          ? (useDefaultOlyLifeOfficeAddress ? "VCCHUB applied the default OlyLife office delivery address" : "VCCHUB confirmed the physical card delivery address")
          : "VCCHUB prepared instant virtual card issuance",
        state.version === "v2" ? "VCCHUB deducted the OlyLife-configured card creation fee from Wallet" : "VCCHUB applied the configured card fee treatment",
        state.version === "v2" ? "VCCHUB funded the new card with " + formatMoney(initialCardBalance) + " from Wallet" : "VCCHUB created the card with a zero balance",
        "VCCHUB created the " + cardType.toLowerCase() + " card",
      ];
      state.walletView = "overview";
      render();
      showToast(
        cardType === "PHYSICAL" ? "Physical card ordered" : "Virtual card created",
        cardType === "PHYSICAL"
          ? (useDefaultOlyLifeOfficeAddress ? "The card will be delivered to the default OlyLife office address with " + formatMoney(initialCardBalance) + " loaded. The SGD 10.00 creation fee was also deducted from Wallet." : "The card is active and its delivery address has been confirmed.")
          : (state.version === "v2" ? "The card is active with " + formatMoney(initialCardBalance) + " loaded. The SGD 10.00 creation fee was also deducted from Wallet." : "The new card is active with a card balance of SGD 0.00."),
      );
    } catch (error) {
      submit.disabled = false;
      submit.textContent = state.version === "v2" ? "Create card & fund →" : "Create card →";
      showToast("Card creation failed", error.message);
    }
  }
});

document.addEventListener("click", async function (event) {
  const target = event.target.closest("[data-action], [data-jump], [data-version]");
  if (!target) return;

  if (target.dataset.version) {
    event.preventDefault();
    if (target.dataset.version === state.version) return;
    state = initialState(target.dataset.version);
    render();
    showToast(state.version === "v2" ? "Version 2 selected" : "Version 1 selected", state.version === "v2" ? "VCCHUB-first onboarding is ready." : "OlyLife-first invitation flow is ready.");
    return;
  }

  if (target.dataset.jump) {
    event.preventDefault();
    state.modalOpen = false;
    state.topupOpen = false;
    state.stage = target.dataset.jump;
    if (state.version === "v2" && ["registration", "kyc", "v2-success", "v2-topup"].includes(state.stage)) {
      state.memberVerified = true;
      state.memberId = state.memberId || "OL-208418";
      state.memberFullName = state.memberFullName || "Olivia Chen";
    }
    if (state.version === "v2" && ["kyc", "v2-success", "v2-topup"].includes(state.stage) && !state.registeredAddress.addressLine1) {
      state.registeredAddress = {
        country: "Singapore",
        state: "Singapore",
        city: "Singapore",
        addressLine1: "10 Anson Road",
        addressLine2: "#12-01",
        postalCode: "079903",
      };
    }
    if (state.version === "v2" && ["v2-success", "v2-topup"].includes(state.stage)) {
      state.accountReady = true;
      state.firstName = state.firstName || "Olivia";
      state.lastName = state.lastName || "Chen";
      state.dob = state.dob || "1990-08-18";
      state.cardholderId = state.cardholderId || "ch_demo208418";
    }
    if (state.stage === "kyc") state.kycStep = 0;
    render();
    return;
  }
  const action = target.dataset.action;
  if (action === "v2-start-signup") {
    state.memberOtpSent = false;
    state.memberOtpRequestId = "";
    state.memberOtpCode = "";
    state.stage = "v2-member-check";
    render();
  } else if (action === "v2-change-member-email") {
    state.memberOtpSent = false;
    state.memberOtpRequestId = "";
    state.memberOtpCode = "";
    state.memberVerified = false;
    render();
  } else if (action === "v2-resend-member-otp") {
    target.disabled = true;
    try {
      const payload = await postJson("/api/vcchub/email-otp/request", { email: state.email, purpose: "WALLET_SIGNUP" });
      state.memberOtpRequestId = payload.requestId;
      state.memberOtpCode = "";
      render();
      showToast("New code sent", "Enter 123456 to continue in this demo.");
    } catch (requestError) {
      target.disabled = false;
      showToast("Could not resend code", requestError.message);
    }
  } else if (action === "v2-back-auth" || action === "v2-return-signin") {
    state.stage = "v2-auth";
    render();
  } else if (action === "approve-v2-topup") {
    if (!state.topupRequest || state.topupRequest.status !== "PENDING_APPROVAL") return;
    target.disabled = true;
    target.textContent = "Approving & processing…";
    try {
      const amount = state.topupRequest.amount;
      const result = await postJson("/api/vcchub/wallet/topups", {
        externalUserId: state.externalUserId,
        memberId: state.memberId,
        email: state.email,
        amount: amount,
        commissionBalance: state.commissionBalance,
        walletBalance: state.walletBalance,
        cards: state.cards,
        cardLimit: state.cardLimit,
        cardholder: state.cardholderId ? {
          id: state.cardholderId,
          firstName: state.firstName,
          lastName: state.lastName,
          dob: state.dob,
          email: state.email,
          phone: state.phoneCode + state.phone.replace(/\s/g, ""),
        } : null,
        topupRequestId: state.topupRequest.id,
        approvalStatus: "APPROVED",
        approvedBy: "OlyLife Admin / Support",
      });
      syncAccountPayload(result);
      state.topupRequest = {
        ...state.topupRequest,
        status: "APPROVED",
        reviewedBy: "OlyLife Admin / Support",
        reviewedAt: new Date().toLocaleString("en-SG", { dateStyle: "medium", timeStyle: "short" }),
      };
      state.apiTrace = result.apiTrace || [];
      render();
      showToast("Top-up approved", formatMoney(amount) + " was deducted from commission and credited to the VCCHUB wallet.");
    } catch (requestError) {
      target.disabled = false;
      target.textContent = "Approve & process →";
      showToast("Approval could not be processed", requestError.message);
    }
  } else if (action === "reject-v2-topup") {
    if (!state.topupRequest || state.topupRequest.status !== "PENDING_APPROVAL") return;
    state.topupRequest = {
      ...state.topupRequest,
      status: "REJECTED",
      reviewedBy: "OlyLife Admin / Support",
      reviewedAt: new Date().toLocaleString("en-SG", { dateStyle: "medium", timeStyle: "short" }),
    };
    state.apiTrace = [
      "OlyLife Admin / Support: top-up request rejected",
      "OlyLife: commission balance unchanged",
      "VCCHUB: wallet balance unchanged",
    ];
    render();
    showToast("Top-up rejected", "No commission was deducted and no wallet funds were added.");
  } else if (action === "new-v2-topup-request") {
    state.topupRequest = null;
    state.apiTrace = [];
    render();
  } else if (action === "v2-topup-home") {
    event.preventDefault();
    state.stage = "v2-topup";
    render();
  } else if (action === "add-recipient") {
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
    state.stage = state.version === "v2" ? "v2-auth" : (state.authMethod === "password" ? "login" : "returning");
    render();
  } else if (action === "open-topup") {
    state.cardActionMenuOpen = false;
    state.cardTopupOpen = false;
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
    target.textContent = "Checking OlyLife balance…";
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
      showToast("Wallet topped up", formatMoney(amount) + " was moved from OlyLife commission to VCCHUB.");
    } catch (requestError) {
      target.disabled = false;
      target.textContent = "Check balance & top up →";
      error.textContent = requestError.message;
    }
  } else if (action === "toggle-card-menu") {
    const isSameCard = state.selectedCardId === target.dataset.cardId;
    state.selectedCardId = target.dataset.cardId || state.selectedCardId;
    state.cardActionMenuOpen = isSameCard ? !state.cardActionMenuOpen : true;
    render();
  } else if (action === "view-card") {
    const card = selectCardFromTarget(target);
    state.cardActionMenuOpen = false;
    render();
    showToast("Card details", card ? "Selected card •••• " + card.last4 + ". The full card details view is outside this demo scope." : "The full card details view is outside this demo scope.");
  } else if (action === "view-card-transactions") {
    const card = selectCardFromTarget(target);
    state.cardActionMenuOpen = false;
    render();
    const cardTransactions = card ? state.transactions.filter(function (transaction) { return !transaction.cardId || transaction.cardId === card.id; }) : [];
    showToast("Card transactions", cardTransactions.length ? String(cardTransactions.length) + " transaction(s) recorded for card •••• " + card.last4 + "." : "No transactions yet for this card.");
  } else if (action === "open-card-topup") {
    const card = selectCardFromTarget(target);
    if (!card) return;
    if (card.status !== "ACTIVE") {
      showToast("Card unavailable", "A cancelled card cannot be topped up.");
      return;
    }
    state.cardActionMenuOpen = false;
    state.topupOpen = false;
    state.cardTopupOpen = true;
    render();
  } else if (action === "open-card-cancel") {
    const card = selectCardFromTarget(target);
    if (!card || card.status !== "ACTIVE") return;
    state.cardActionMenuOpen = false;
    state.topupOpen = false;
    state.cardTopupOpen = false;
    state.cardCancelOpen = true;
    render();
  } else if (action === "close-card-cancel") {
    state.cardCancelOpen = false;
    render();
  } else if (action === "card-cancel-backdrop" && event.target === target) {
    state.cardCancelOpen = false;
    render();
  } else if (action === "confirm-card-cancel") {
    const code = Array.from(document.querySelectorAll("[data-cancel-2fa]"))
      .map(function (input) { return input.value; })
      .join("");
    const error = document.getElementById("card-cancel-error");
    if (code !== "123456") {
      error.textContent = code.length < 6 ? "Enter all six digits." : "The 2FA code is incorrect. Please try again.";
      const firstDigit = document.querySelector("[data-cancel-2fa]");
      if (firstDigit) firstDigit.focus();
      return;
    }
    target.disabled = true;
    target.textContent = "Cancelling card…";
    try {
      const card = selectedCard();
      if (!card) throw new Error("Card not found.");
      const refundedAmount = Number(card.balance || 0);
      const result = await postJson("/api/vcchub/cards/cancel", {
        externalUserId: state.externalUserId,
        cardId: card.id,
        twoFactorCode: code,
        walletBalance: state.walletBalance,
        commissionBalance: state.commissionBalance,
        cards: state.cards,
        cardLimit: state.cardLimit,
        transactions: state.transactions,
        cardholder: {
          id: state.cardholderId,
          firstName: state.firstName,
          lastName: state.lastName,
          dob: state.dob,
          email: state.email,
          phone: state.phoneCode + state.phone.replace(/\s/g, ""),
        },
      });
      syncAccountPayload(result);
      state.apiTrace = result.apiTrace || [];
      state.cardCancelOpen = false;
      state.cardActionMenuOpen = false;
      render();
      showToast("Card cancelled", formatMoney(refundedAmount) + " was returned to the VCCHUB wallet. You can now create another " + (card.type === "PHYSICAL" ? "physical" : "virtual") + " card.");
    } catch (requestError) {
      target.disabled = false;
      target.textContent = "Confirm cancellation";
      error.textContent = requestError.message;
    }
  } else if (action === "close-card-topup") {
    state.cardTopupOpen = false;
    render();
  } else if (action === "card-topup-backdrop" && event.target === target) {
    state.cardTopupOpen = false;
    render();
  } else if (action === "confirm-card-topup") {
    const amountInput = document.getElementById("card-topup-amount");
    const passwordInput = document.getElementById("card-topup-password");
    const error = document.getElementById("card-topup-error");
    const amount = Number(amountInput.value);
    if (!Number.isFinite(amount) || amount <= 0) {
      error.textContent = "Enter an amount greater than zero.";
      return;
    }
    if (amount > state.walletBalance) {
      error.textContent = "The amount exceeds the available wallet balance.";
      return;
    }
    if (!passwordInput.value) {
      error.textContent = "Enter your VCCHUB password.";
      passwordInput.focus();
      return;
    }
    if (state.password && passwordInput.value !== state.password) {
      error.textContent = "The VCCHUB password is incorrect.";
      passwordInput.focus();
      return;
    }
    target.disabled = true;
    target.textContent = "Processing top up…";
    try {
      const card = selectedCard();
      if (!card) throw new Error("Card not found.");
      const result = await postJson("/api/vcchub/cards/topups", {
        externalUserId: state.externalUserId,
        cardId: card.id,
        amount: amount,
        walletBalance: state.walletBalance,
        commissionBalance: state.commissionBalance,
        cards: state.cards,
        transactions: state.transactions,
        cardholder: {
          id: state.cardholderId,
          firstName: state.firstName,
          lastName: state.lastName,
          dob: state.dob,
          email: state.email,
          phone: state.phoneCode + state.phone.replace(/\s/g, ""),
        },
      });
      syncAccountPayload(result);
      state.apiTrace = result.apiTrace || [];
      state.cardTopupOpen = false;
      render();
      showToast("Card topped up", formatMoney(amount) + " was transferred from the VCCHUB wallet to card •••• " + card.last4 + ".");
    } catch (requestError) {
      target.disabled = false;
      target.textContent = "Confirm top up";
      error.textContent = requestError.message;
    }
  } else if (action === "add-card") {
    if (!state.cardholderId) {
      showToast("Cardholder required", "Complete the live Sumsub verification before creating a card.");
    } else if (state.walletBalance <= 0) {
      showToast("Top up required", "Add funds from the OlyLife commission balance first.");
    } else if (activeCards().length >= state.cardLimit) {
      showToast("Card limit reached", "Cancel an active card to release a slot before creating another card.");
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
    state = initialState(state.version);
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
  if (event.key === "Backspace" && event.target.matches("[data-cancel-2fa]") && !event.target.value) {
    const inputs = Array.from(document.querySelectorAll("[data-cancel-2fa]"));
    const previous = inputs[inputs.indexOf(event.target) - 1];
    if (previous) previous.focus();
  }
  if (event.key === "Escape" && (state.modalOpen || state.topupOpen || state.cardTopupOpen || state.cardCancelOpen)) {
    state.modalOpen = false;
    state.topupOpen = false;
    state.cardTopupOpen = false;
    state.cardCancelOpen = false;
    state.cardActionMenuOpen = false;
    render();
  }
});

render();
