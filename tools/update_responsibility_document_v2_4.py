from __future__ import annotations

from pathlib import Path

from docx import Document

from update_responsibility_document_v2_2 import insert_heading, insert_paragraph, insert_table, update_cell
from update_responsibility_document_v2_3 import find_paragraph, find_table, find_row
from build_responsibility_document import format_table


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "deliverables" / "OlyLife_VCCHUB_Implementation_Responsibility_Specification_V2.3.docx"
OUTPUT = ROOT / "deliverables" / "OlyLife_VCCHUB_Implementation_Responsibility_Specification_V2.4.docx"


HEADERS = ["ID", "Mandatory test and lead", "Execution / test data", "Pass criteria and required evidence"]
WIDTHS = [620, 2050, 3240, 3450]


def set_row(table, first_cell: str, values) -> None:
    row = find_row(table, first_cell)
    for index, value in enumerate(values):
        update_cell(row.cells[index], value)


def update_version(doc: Document) -> None:
    control = doc.tables[0]
    update_cell(control.rows[0].cells[3], "Draft - V2.4 mandatory UAT suite")
    update_cell(control.rows[2].cells[1], "0.15 (V2.4 mandatory UAT and international-name tests)")
    update_cell(control.rows[2].cells[3], "3 September 2026")

    find_paragraph(doc, "PARTNER IMPLEMENTATION SPECIFICATION").text = (
        "PARTNER IMPLEMENTATION SPECIFICATION · VERSION 2.4"
    )
    find_paragraph(doc, "OlyLife–VCCHUB Wallet Activation").text = (
        "OlyLife–VCCHUB Wallet Activation & Card Program (Version 2.4)"
    )
    purpose = find_paragraph(doc, "Purpose")
    purpose.text = (
        "Purpose  Define who must build, expose, consume, operate and test each component of the Version 2 journey, "
        "where an OlyLife member starts in VCCHUB. This V2.4 edition adds the proposed mandatory end-to-end UAT suite, "
        "including Korean and Japanese non-Latin-script identity and PhotonPay cardholder-name compatibility tests. "
        "V2.3 remains retained as the preceding reference. Final production configuration and contractual approvals "
        "remain subject to joint sign-off."
    )


def add_test_group(doc: Document, anchor, heading: str, rows) -> None:
    insert_heading(doc, anchor, heading, level=3)
    insert_table(doc, anchor, HEADERS, rows, WIDTHS, body_size=7.4, first_col_bold=True)


def add_mandatory_uat_suite(doc: Document) -> None:
    anchor = find_paragraph(doc, "9. Confirmed decisions and remaining build sign-off")
    anchor.paragraph_format.page_break_before = True
    insert_heading(doc, anchor, "8.2 Proposed mandatory end-to-end UAT test suite", level=2, page_break=True)
    insert_paragraph(
        doc,
        anchor,
        "Every case below is a MUST-pass go-live test unless both parties approve a written exception with owner, risk, "
        "expiry date and compensating control. Execute positive, negative, retry and duplicate variants in production-like "
        "sandboxes. Evidence must include request_id/event_id, redacted request and response, source and target records, "
        "timestamps, actor, screenshots where relevant and final ledger reconciliation.",
        italic=True,
        after=8,
    )

    add_test_group(
        doc,
        anchor,
        "8.2.1 Member validation, registration and access",
        [
            ["UAT-01", "Eligible member check — Joint", "Enter an email matching one active, eligible OlyLife member and call OLY-01.", "VCCHUB receives one unambiguous match with Member ID, First Name, Last Name and matched email; registration opens and the request_id is traceable."],
            ["UAT-02", "Unknown/ineligible member — Joint", "Test unknown, inactive and ineligible emails without disclosing account details.", "No VCCHUB account is created. The user can retry or contact OlyLife support; response and UI remain privacy-safe."],
            ["UAT-03", "Validation fault handling — Joint", "Return timeout/503, invalid signature, duplicate records and a matched record missing a required member field.", "VCCHUB never bypasses OLY-01. It shows a recoverable or correction-safe message, preserves request_id and creates no account."],
            ["UAT-04", "Registration carry-over — VCCHUB", "Continue from an eligible member; enter mobile, password, consent and complete address.", "Member ID and OlyLife name are carried read-only; username equals matched email; phone/address validation and consent evidence persist."],
            ["UAT-05", "Direct sign-in and 2FA — VCCHUB", "Test correct, incorrect, expired/replayed and rate-limited 2FA after username/password sign-in.", "Wallet access occurs only after valid 2FA. Invalid/replayed codes fail safely; lockout, recovery, logout and session expiry are evidenced."],
            ["UAT-06", "V2 route independence — VCCHUB", "Complete onboarding and login without a V1 invitation email, OlyLife-to-VCCHUB SSO or return-to-OlyLife control.", "The full V2 journey succeeds using VCCHUB sign-up, direct sign-in and 2FA only."],
        ],
    )

    add_test_group(
        doc,
        anchor,
        "8.2.2 Sumsub KYC and international cardholder names",
        [
            ["UAT-07", "Country/document discovery — Joint", "Start Sumsub without VCCHUB country preselection; test representative Singapore, China, Korea and Japan identity documents supported by the approved Sumsub level.", "Sumsub drives country/document selection, capture and liveness. VCCHUB receives the authoritative applicant ID, review status and supported document metadata."],
            ["UAT-08", "Verified identity extraction — VCCHUB", "Approve an applicant whose document contains known legal First Name, Last Name and DOB.", "VCCHUB retrieves the approved Sumsub values, never demo/mock names, normalizes DOB to ISO date and creates the cardholder only after approval."],
            ["UAT-09", "KYC exception lifecycle — Joint", "Exercise pending, action-required, rejected, resubmission, manual-review and duplicate-webhook paths.", "No wallet/cardholder is created before final approval; UI status, retry/review routing, webhook deduplication and audit evidence match Sumsub."],
            ["UAT-10", "Korean non-Latin name — Joint", "Use an authorised Korean sandbox test document containing Hangul and, where present, MRZ/verified Latin transliteration. Record Sumsub original-script and transliterated/legal fields plus DOB.", "No mojibake, truncation, swapped name order or invented name occurs. Original Hangul and verified Latin representation remain distinguishable and traceable through VCCHUB mapping."],
            ["UAT-11", "Japanese non-Latin name — Joint", "Use an authorised Japanese sandbox test document containing Kanji/Kana and, where present, passport Roman letters or Sumsub-verified transliteration. Record all returned name representations and DOB.", "No mojibake, truncation, swapped name order or invented transliteration occurs. Original and verified Latin representations remain distinguishable and traceable."],
            ["UAT-12", "PhotonPay charset/name acceptance — VCCHUB + PhotonPay", "For Korean and Japanese approved applicants, call the PhotonPay sandbox cardholder/card-creation flow for both configured BINs using the agreed name field and UTF-8 encoding. Test documented maximum lengths and physical-card embossing constraints.", "PhotonPay acceptance, stored/returned name and card outcome are evidenced per endpoint and BIN. If non-Latin input is unsupported, PhotonPay must document the rule and VCCHUB must use an approved Sumsub/MRZ Latin value without silent substitution, loss or invented transliteration."],
            ["UAT-13", "Name-source mismatch/manual review — Joint", "Create differences between OlyLife member name, Sumsub original-script name, verified Latin name and PhotonPay-permitted value.", "The agreed precedence and transliteration policy is applied; material mismatches go to review. Original values, selected cardholder value, reason and approver are audited."],
        ],
    )

    add_test_group(
        doc,
        anchor,
        "8.2.3 Wallet creation, OlyLife top-up and money integrity",
        [
            ["UAT-14", "Zero-balance wallet readiness — VCCHUB", "Complete KYC approval and allow VCCHUB internal cardholder/wallet creation.", "Exactly one cardholder and SGD 0.00 wallet are created with no card. Mapping IDs are returned by status/webhook and top-up eligibility is unambiguous."],
            ["UAT-15", "Ready event/status reconciliation — Joint", "Delay, duplicate and omit wallet.account_ready; query POST /wallet/status and replay where authorised.", "OlyLife converges on one mapping. event_id/request_id deduplication and resource_version handling prevent duplicate accounts or stale updates."],
            ["UAT-16", "Top-up origination/approval gate — OlyLife", "Submit a member top-up and leave it pending; attempt initiation from VCCHUB.", "No VCCHUB top-up action is exposed. While pending, commission and wallet balances remain unchanged and a complete approval record exists."],
            ["UAT-17", "Approved sufficient-balance top-up — Joint", "Approve a request with sufficient commission; OlyLife atomically debits once and calls POST /wallet/topup.", "VCCHUB credits exactly the approved principal once; both ledgers and returned/webhook balances reconcile to the shared identifiers."],
            ["UAT-18", "Rejection and insufficient commission — OlyLife", "Reject one request and approve another after commission becomes insufficient.", "Neither case changes commission or wallet balance; reason, reviewer, timestamp and final status are recorded."],
            ["UAT-19", "Duplicate/timeout/idempotency — Joint", "Retry the identical VCC-01 request after timeout and send the same request_id with a changed amount.", "Identical retry returns the original result with no second debit/credit. Changed payload is rejected as an integrity conflict."],
            ["UAT-20", "Credit failure and reversal — Joint", "Simulate successful OlyLife debit followed by final VCCHUB wallet-credit failure.", "Retry/reconciliation occurs with the same IDs; if unrecoverable, authorised reversal/repair restores commission exactly once and leaves auditable final states."],
            ["UAT-21", "Fee treatment — Joint + PhotonPay", "Execute wallet creation, card creation and funding operations under the agreed PhotonPay fee setup.", "VCCHUB deducts no programme/card fee from Wallet. PhotonPay/card-level charges, if applicable, match the commercial configuration and are separately evidenced."],
        ],
    )

    add_test_group(
        doc,
        anchor,
        "8.2.4 Card creation, funding, cancellation and entitlement",
        [
            ["UAT-22", "Card funding gate — VCCHUB", "Attempt virtual and physical card creation while Wallet balance is zero, then repeat after an approved Wallet top-up.", "Unfunded creation is blocked with no partial reservation. Funded creation proceeds only after authoritative Wallet checks."],
            ["UAT-23", "Virtual card/default BIN — VCCHUB", "Create a virtual card without presenting any BIN selector.", "The configured virtual BIN is selected automatically; one virtual slot is occupied and one independent card row/action menu is shown."],
            ["UAT-24", "Physical card/default office delivery — VCCHUB", "Create a physical card without collecting a member recipient address.", "The configured physical BIN and approved OlyLife office address/version are used; no member delivery-address input or fallback is permitted."],
            ["UAT-25", "Read-only cardholder/address mapping — VCCHUB", "Open card creation after registration/KYC for standard, Korean and Japanese approved applicants.", "Member ID, approved cardholder name/DOB, email/mobile and registered address display correctly and cannot be edited; transmitted PhotonPay values match the approved mapping."],
            ["UAT-26", "Two-card display and hidden limit — VCCHUB", "Create one virtual and one physical card and refresh/relogin.", "Both cards remain visible as separate rows with correct type/status/balance and independent actions. Internal remaining-slot count is correct but not displayed to the member."],
            ["UAT-27", "Per-type entitlement/policy version — VCCHUB", "Attempt a second active virtual card and a second active physical card; change policy for a subsequently created wallet.", "Second same-type creation is blocked. A new wallet receives the new policy version; existing wallets remain unchanged without an approved migration."],
            ["UAT-28", "Wallet-to-card top-up — VCCHUB", "Top up a selected card within Wallet balance, then attempt an amount above available Wallet balance and retry a prior request.", "Successful transfer debits Wallet and credits only the selected card exactly once. Insufficient and duplicate attempts create no incorrect posting."],
            ["UAT-29", "Authenticated cancellation/refund — VCCHUB", "Cancel one funded card using valid 2FA; also test invalid/replayed 2FA and repeat cancellation.", "Only valid 2FA cancels. Eligible card balance returns to Wallet exactly once; card is permanently Cancelled, event is emitted and only its type slot is released."],
            ["UAT-30", "Replacement after cancellation — VCCHUB", "After cancellation, create a replacement of the same type while the other type remains active.", "Replacement succeeds using the same type entitlement/default BIN; the other card, its balance and actions are unchanged."],
            ["UAT-31", "Issuer failure/partial-posting prevention — VCCHUB", "Force PhotonPay decline, timeout and unknown result during card issue and Wallet-to-card top-up.", "No unsupported active card or unmatched final debit remains. Retry/query/reversal uses stable IDs and reconciles to one final state."],
        ],
    )

    add_test_group(
        doc,
        anchor,
        "8.2.5 Webhooks, security, privacy and reconciliation",
        [
            ["UAT-32", "Webhook lifecycle/deduplication — Joint", "Deliver ready, wallet top-up, card-created, card-top-up and card-cancelled events normally, duplicated and out of order.", "OlyLife verifies signature/schema, stores event_id, applies only newer resource_version and returns durable acknowledgement without double processing."],
            ["UAT-33", "API/webhook security — Joint", "Test valid and invalid signature, expired timestamp, wrong company_id, schema error, unauthorised source, rate limit and key rotation.", "Invalid traffic is rejected and alerted without state change; valid rotated credentials work; secrets never appear in browser code, payload evidence or logs."],
            ["UAT-34", "PII and card-data protection — Joint", "Review UI, APIs, logs, exports, screenshots and support tooling across KYC and card flows.", "No password, signing key, raw biometric/document image, PAN or CVV is exposed outside approved controls; masking, retention and role access are evidenced."],
            ["UAT-35", "End-to-end reconciliation — Joint", "Reconcile a complete member journey using Member ID, wallet/cardholder/card IDs, request_id, event_id and both ledger references.", "OlyLife commission, VCCHUB Wallet, selected card balances and lifecycle states reconcile with no orphan, duplicate or unexplained amount."],
            ["UAT-36", "Concurrency and recovery — Joint", "Submit concurrent duplicate top-ups/card actions, restart a worker during processing and recover delayed provider responses.", "Exactly-once money effects and single-resource transitions hold; processing resumes or reconciles without manual data corruption."],
        ],
    )

    insert_heading(doc, anchor, "8.3 Test evidence, defect severity and go-live gate", level=2)
    insert_table(
        doc,
        anchor,
        ["Control", "Mandatory position"],
        [
            ["Evidence pack", "Joint trace matrix from UAT-01 to UAT-36 with environment/build, data set, expected/actual result, redacted evidence links, owner, execution date and sign-off."],
            ["International-name evidence", "For Korea and Japan, retain Sumsub applicant/review references, returned original and Latin name fields, mapping decision, exact redacted PhotonPay request/response, endpoint/BIN, display/embossing result and any documented charset/length rule."],
            ["Go-live blocker", "UAT-10, UAT-11, UAT-12 and UAT-13 are launch-blocking until PhotonPay compatibility or the approved Latin-name fallback is proven. No silent transliteration, replacement characters, truncation or mock names are acceptable."],
            ["Defect rule", "No open Severity 1 or 2 defect. Lower-severity exceptions require written risk acceptance, compensating control, owner and target release."],
            ["Sign-off", "OlyLife Product/Operations/Compliance and VCCHUB Product/Technology/Operations approve the final evidence pack; PhotonPay confirms issuer-specific charset, length and physical-card rules."],
        ],
        [2300, 7060],
        body_size=8.3,
        first_col_bold=True,
    )


def align_existing_sections(doc: Document) -> None:
    delivery = find_table(doc, "Phase", 3)
    set_row(
        delivery,
        "3. Sumsub & wallet creation",
        [
            "3. Sumsub & wallet creation",
            "OlyLife + VCCHUB",
            "Provisioned Sumsub access; approved identity mapping; Korean/Japanese original-script and verified Latin-name tests; zero-balance wallet; account-ready/status mapping.",
        ],
    )
    set_row(
        delivery,
        "6. Card services",
        [
            "6. Card services",
            "VCCHUB",
            "Funding gate; one active virtual plus one active physical card; prospective card-policy versioning; default BIN per type; PhotonPay charset/name and embossing compatibility; separate card rows/actions; read-only identity/address; OlyLife-office delivery; Wallet-to-card top-up; authenticated cancellation with Wallet refund and type-slot release; no VCCHUB Wallet-fee deduction.",
        ],
    )
    format_table(delivery, ["Phase", "Lead", "Exit criteria"], [1800, 1900, 5660], body_size=8.0, first_col_bold=True)

    decisions = find_table(doc, "Decision area", 2)
    set_row(
        decisions,
        "KYC",
        [
            "KYC",
            "Sumsub production level(s), verification rules, manual review, resubmission and retention/access. Confirm original-script, MRZ/verified Latin and no-surname mapping plus Korean/Japanese test data and name precedence.",
        ],
    )
    set_row(
        decisions,
        "Card servicing",
        [
            "Card servicing",
            "Confirmed: one active virtual and one active physical card per Wallet policy version; one default BIN per type; separate card rows/actions; cancellation with fresh 2FA, Wallet refund, permanent Cancelled status and release of only that type slot. Policy changes are prospective; existing-wallet migration is outside V2. PhotonPay must confirm supported cardholder charset/length, transliteration and physical-card embossing rules per configured BIN.",
        ],
    )
    format_table(decisions, ["Decision area", "Items to agree"], [2000, 7360], body_size=8.0, first_col_bold=True)

    ready = find_paragraph(doc, "Definition of ready")
    ready.text = (
        "Definition of ready  V2 development is ready when OLY-01 member validation, account mapping, OlyLife approval/debit, "
        "VCCHUB Wallet credit/status, Sumsub access, international-name mapping and PhotonPay compatibility evidence, office-address "
        "configuration, authenticated card cancellation and acceptance owners are documented and testable."
    )

    owners = find_table(doc, "Owner", 2)
    set_row(
        owners,
        "VCCHUB",
        [
            "VCCHUB",
            "Publish OLY-01 consumer requirements and VCC-01/02/VCC-WH schemas; implement V2 onboarding, member carry-over, registration address, Sumsub, direct 2FA, zero-balance Wallet creation, read-only card data, international-name mapping, PhotonPay charset validation, prospective card-policy versioning, one default BIN per type, separate per-card actions, OlyLife-office physical fulfilment and authenticated cancellation with Wallet refund/type-slot release.",
        ],
    )
    set_row(
        owners,
        "OlyLife",
        [
            "OlyLife",
            "Publish OLY-01 with Member ID/First Name/Last Name; provision Sumsub access and authorised Korean/Japanese test data; approve name precedence/transliteration and manual-review policy; implement top-up request/review/debit/reversal; provide the actual office address; and agree all programme/card fee charging directly with PhotonPay.",
        ],
    )
    set_row(
        owners,
        "Joint",
        [
            "Joint",
            "Run an interface/UAT workshop to close identifiers, authentication, status/error models, account mapping, Wallet-credit idempotency, reversal/reconciliation and all UAT-01 to UAT-36 evidence. Obtain PhotonPay confirmation for original/Latin name charset, length and embossing rules; confirm initial policy and default physical/virtual BINs before go-live.",
        ],
    )
    format_table(owners, ["Owner", "Next action"], [1800, 7560], body_size=8.1, first_col_bold=True)


def main() -> None:
    doc = Document(SOURCE)
    update_version(doc)
    align_existing_sections(doc)
    add_mandatory_uat_suite(doc)
    doc.core_properties.title = "OlyLife-VCCHUB Implementation Responsibility Specification - Version 2.4"
    doc.core_properties.subject = "V2 responsibilities, partner contracts, confirmed assumptions and mandatory end-to-end UAT"
    doc.core_properties.author = "Star SaaS Limited"
    doc.core_properties.last_modified_by = "Star SaaS Limited"
    doc.save(OUTPUT)
    print(OUTPUT)


if __name__ == "__main__":
    main()
